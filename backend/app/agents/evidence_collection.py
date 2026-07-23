"""
Evidence Collection Agent.
Automatically collects all dispute-related information from existing systems
and stores it in the Evidence Repository.
"""

import uuid
from datetime import datetime
from typing import Optional

from loguru import logger
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.existing import (
    Customer, Merchant, Transaction, Order, Payment,
    RefundHistory, Communication, Dispute, PolicyRepository,
)
from app.models.new import (
    EvidenceRepository as EvidenceRepoModel,
    CaseFile, AuditLog,
    EvidenceType, EvidenceSource, EvidenceStatus,
    CaseFileStatus,
)
from app.repositories.evidence_repository import EvidenceRepositoryDB
from app.utils.entity_extractor import update_evidence_from_text


class EvidenceCollectionAgent:
    """
    Agent responsible for collecting all evidence related to a dispute.
    Fetches data from existing tables and stores it in the evidence_repository.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = EvidenceRepositoryDB(db)

    def collect_all_evidence(self, dispute_id: int) -> Optional[CaseFile]:
        """
        Orchestrate the full evidence collection for a dispute.
        Creates a CaseFile and populates the EvidenceRepository.

        Args:
            dispute_id: Primary key of the dispute to investigate.

        Returns:
            The created CaseFile, or None if the dispute is not found.
        """
        # 1. Fetch the dispute
        dispute = self.repo.get_dispute_by_id(dispute_id)
        if not dispute:
            logger.error(f"Dispute {dispute_id} not found")
            return None

        logger.info(f"Starting evidence collection for dispute {dispute.dispute_id}")

        # 2. Create or get existing CaseFile
        case_file = self.db.query(CaseFile).filter(
            CaseFile.dispute_id == dispute.id
        ).first()

        if not case_file:
            case_file = CaseFile(
                dispute_id=dispute.id,
                case_file_id=f"CF-{uuid.uuid4().hex[:12].upper()}",
                status=CaseFileStatus.DRAFT,
            )
            self.db.add(case_file)
            self.db.flush()
            logger.info(f"Created CaseFile {case_file.case_file_id}")

        # 3. Collect each evidence type
        self._collect_customer_info(dispute, case_file)
        self._collect_merchant_info(dispute, case_file)
        self._collect_transactions(dispute, case_file)
        self._collect_orders(dispute, case_file)
        self._collect_payments(dispute, case_file)
        self._collect_refunds(dispute, case_file)
        self._collect_communications(dispute, case_file)
        self._collect_policies(case_file)

        # 4. Commit all changes
        self.db.commit()
        self.db.refresh(case_file)

        # 5. Log the action
        self._log_action(
            action="evidence_collection_completed",
            dispute_id=dispute.id,
            case_file_id=case_file.id,
            details=f"Collected all evidence for dispute {dispute.dispute_id}",
        )

        logger.info(
            f"Evidence collection completed for dispute {dispute.dispute_id}. "
            f"CaseFile: {case_file.case_file_id}"
        )
        return case_file

    # --------------- Private Collection Methods ---------------

    def _store_evidence(
        self,
        case_file_id: int,
        evidence_type: EvidenceType,
        source: EvidenceSource,
        title: str,
        description: Optional[str] = None,
        content_text: Optional[str] = None,
        source_table: Optional[str] = None,
        source_record_id: Optional[int] = None,
        source_external_id: Optional[str] = None,
        event_date: Optional[datetime] = None,
        merchant_name: Optional[str] = None,
        customer_name: Optional[str] = None,
        amount: Optional[float] = None,
        currency: Optional[str] = None,
        transaction_id_ref: Optional[str] = None,
        order_id_ref: Optional[str] = None,
        file_url: Optional[str] = None,
        file_type: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
    ) -> EvidenceRepoModel:
        """Create and store an evidence record, then run entity extraction."""
        evidence = EvidenceRepoModel(
            case_file_id=case_file_id,
            evidence_id=f"EV-{uuid.uuid4().hex[:12].upper()}",
            evidence_type=evidence_type,
            source=source,
            status=EvidenceStatus.COLLECTED,
            source_table=source_table,
            source_record_id=source_record_id,
            source_external_id=source_external_id,
            title=title,
            description=description,
            content_text=content_text,
            event_date=event_date,
            merchant_name=merchant_name,
            customer_name=customer_name,
            amount=amount,
            currency=currency,
            transaction_id_ref=transaction_id_ref,
            order_id_ref=order_id_ref,
            file_url=file_url,
            file_type=file_type,
            file_size_bytes=file_size_bytes,
            is_processed=False,
        )
        self.db.add(evidence)
        self.db.flush()

        # Run entity extraction on the content_text if present
        if content_text and content_text.strip():
            try:
                update_evidence_from_text(evidence, content_text)
                self.db.flush()
                logger.debug(
                    f"Entity extraction completed for evidence {evidence.evidence_id}: "
                    f"merchant={evidence.merchant_name}, amount={evidence.amount}"
                )
            except Exception as e:
                logger.error(f"Entity extraction failed for evidence {evidence.id}: {e}")
                evidence.processing_notes = f"Entity extraction failed: {str(e)}"
                self.db.flush()

        return evidence

    def _collect_customer_info(self, dispute: Dispute, case_file: CaseFile) -> None:
        """Collect customer information as evidence."""
        customer = self.repo.get_customer(dispute.customer_id)
        if not customer:
            logger.warning(f"Customer {dispute.customer_id} not found for dispute {dispute.id}")
            return

        customer_name = f"{customer.first_name} {customer.last_name}"
        self._store_evidence(
            case_file_id=case_file.id,
            evidence_type=EvidenceType.CUSTOMER_INFO,
            source=EvidenceSource.SYSTEM,
            title=f"Customer Information: {customer_name}",
            description=f"Customer profile for {customer.email}",
            content_text=(
                f"Name: {customer_name}\n"
                f"Email: {customer.email}\n"
                f"Phone: {customer.phone or 'N/A'}\n"
                f"Address: {customer.address_line1 or 'N/A'}, "
                f"{customer.city or 'N/A'}, {customer.country or 'N/A'}\n"
                f"Verified: {customer.is_verified}"
            ),
            source_table="customers",
            source_record_id=customer.id,
            source_external_id=customer.customer_id,
            customer_name=customer_name,
        )
        logger.debug(f"Collected customer info for {customer_name}")

    def _collect_merchant_info(self, dispute: Dispute, case_file: CaseFile) -> None:
        """Collect merchant information as evidence."""
        merchant = self.repo.get_merchant(dispute.merchant_id)
        if not merchant:
            logger.warning(f"Merchant {dispute.merchant_id} not found for dispute {dispute.id}")
            return

        self._store_evidence(
            case_file_id=case_file.id,
            evidence_type=EvidenceType.MERCHANT_INFO,
            source=EvidenceSource.SYSTEM,
            title=f"Merchant Information: {merchant.business_name}",
            description=f"Merchant profile for {merchant.business_name}",
            content_text=(
                f"Business Name: {merchant.business_name}\n"
                f"Legal Name: {merchant.legal_name or 'N/A'}\n"
                f"Email: {merchant.email or 'N/A'}\n"
                f"Phone: {merchant.phone or 'N/A'}\n"
                f"Website: {merchant.website or 'N/A'}\n"
                f"Category: {merchant.category or 'N/A'}\n"
                f"Active: {merchant.is_active}"
            ),
            source_table="merchants",
            source_record_id=merchant.id,
            source_external_id=merchant.merchant_id,
            merchant_name=merchant.business_name,
        )
        logger.debug(f"Collected merchant info for {merchant.business_name}")

    def _collect_transactions(self, dispute: Dispute, case_file: CaseFile) -> None:
        """Collect transaction records as evidence."""
        transactions = self.repo.get_transactions_for_dispute(dispute)
        if not transactions:
            logger.info(f"No transactions found for dispute {dispute.id}")
            return

        for tx in transactions:
            merchant = self.repo.get_merchant(tx.merchant_id)
            merchant_name = merchant.business_name if merchant else None

            self._store_evidence(
                case_file_id=case_file.id,
                evidence_type=EvidenceType.TRANSACTION,
                source=EvidenceSource.SYSTEM,
                title=f"Transaction: {tx.transaction_id} ({tx.transaction_type.value})",
                description=tx.description or f"Transaction of {tx.amount} {tx.currency}",
                content_text=(
                    f"Transaction ID: {tx.transaction_id}\n"
                    f"Type: {tx.transaction_type.value}\n"
                    f"Amount: {tx.amount} {tx.currency}\n"
                    f"Date: {tx.transaction_date}\n"
                    f"Reference: {tx.reference_number or 'N/A'}\n"
                    f"Disputed: {tx.is_disputed}"
                ),
                source_table="transactions",
                source_record_id=tx.id,
                source_external_id=tx.transaction_id,
                event_date=tx.transaction_date,
                merchant_name=merchant_name,
                amount=float(tx.amount),
                currency=tx.currency,
                transaction_id_ref=tx.transaction_id,
            )
        logger.debug(f"Collected {len(transactions)} transactions")

    def _collect_orders(self, dispute: Dispute, case_file: CaseFile) -> None:
        """Collect order records as evidence."""
        orders = self.repo.get_orders_for_dispute(dispute)
        if not orders:
            logger.info(f"No orders found for dispute {dispute.id}")
            return

        for order in orders:
            merchant = self.repo.get_merchant(order.merchant_id)
            merchant_name = merchant.business_name if merchant else None

            self._store_evidence(
                case_file_id=case_file.id,
                evidence_type=EvidenceType.ORDER,
                source=EvidenceSource.SYSTEM,
                title=f"Order: {order.order_id} ({order.status.value})",
                description=f"Order placed on {order.order_date}",
                content_text=(
                    f"Order ID: {order.order_id}\n"
                    f"Date: {order.order_date}\n"
                    f"Status: {order.status.value}\n"
                    f"Total: {order.total_amount} {order.currency}\n"
                    f"Tracking: {order.tracking_number or 'N/A'}\n"
                    f"Delivery: {order.delivery_date or 'N/A'}\n"
                    f"Items: {order.items_json}"
                ),
                source_table="orders",
                source_record_id=order.id,
                source_external_id=order.order_id,
                event_date=order.order_date,
                merchant_name=merchant_name,
                amount=float(order.total_amount),
                currency=order.currency,
                order_id_ref=order.order_id,
            )
        logger.debug(f"Collected {len(orders)} orders")

    def _collect_payments(self, dispute: Dispute, case_file: CaseFile) -> None:
        """Collect payment records as evidence."""
        payments = self.repo.get_payments_for_dispute(dispute)
        if not payments:
            logger.info(f"No payments found for dispute {dispute.id}")
            return

        for payment in payments:
            self._store_evidence(
                case_file_id=case_file.id,
                evidence_type=EvidenceType.PAYMENT,
                source=EvidenceSource.SYSTEM,
                title=f"Payment: {payment.payment_id} ({payment.status.value})",
                description=f"Payment of {payment.amount} {payment.currency} via {payment.payment_method.value}",
                content_text=(
                    f"Payment ID: {payment.payment_id}\n"
                    f"Amount: {payment.amount} {payment.currency}\n"
                    f"Method: {payment.payment_method.value}\n"
                    f"Date: {payment.payment_date}\n"
                    f"Status: {payment.status.value}\n"
                    f"Gateway Ref: {payment.gateway_reference or 'N/A'}\n"
                    f"Verified: {payment.is_verified}"
                ),
                source_table="payments",
                source_record_id=payment.id,
                source_external_id=payment.payment_id,
                event_date=payment.payment_date,
                amount=float(payment.amount),
                currency=payment.currency,
            )
        logger.debug(f"Collected {len(payments)} payments")

    def _collect_refunds(self, dispute: Dispute, case_file: CaseFile) -> None:
        """Collect refund history as evidence."""
        refunds = self.repo.get_refunds_for_dispute(dispute)
        if not refunds:
            logger.info(f"No refunds found for dispute {dispute.id}")
            return

        for refund in refunds:
            self._store_evidence(
                case_file_id=case_file.id,
                evidence_type=EvidenceType.REFUND,
                source=EvidenceSource.SYSTEM,
                title=f"Refund: {refund.refund_id} ({refund.status.value})",
                description=refund.reason or f"Refund of {refund.amount} {refund.currency}",
                content_text=(
                    f"Refund ID: {refund.refund_id}\n"
                    f"Amount: {refund.amount} {refund.currency}\n"
                    f"Date: {refund.refund_date}\n"
                    f"Status: {refund.status.value}\n"
                    f"Reason: {refund.reason or 'N/A'}\n"
                    f"Approved By: {refund.approved_by or 'N/A'}"
                ),
                source_table="refund_history",
                source_record_id=refund.id,
                source_external_id=refund.refund_id,
                event_date=refund.refund_date,
                amount=float(refund.amount),
                currency=refund.currency,
            )
        logger.debug(f"Collected {len(refunds)} refunds")

    def _collect_communications(self, dispute: Dispute, case_file: CaseFile) -> None:
        """Collect communication records as evidence."""
        communications = self.repo.get_communications_for_dispute(dispute)
        if not communications:
            logger.info(f"No communications found for dispute {dispute.id}")
            return

        for comm in communications:
            self._store_evidence(
                case_file_id=case_file.id,
                evidence_type=EvidenceType.COMMUNICATION,
                source=EvidenceSource.SYSTEM,
                title=f"{comm.communication_type.value.capitalize()}: {comm.subject or 'No Subject'}",
                description=comm.subject or f"Communication from {comm.sender}",
                content_text=(
                    f"Type: {comm.communication_type.value}\n"
                    f"From: {comm.sender}\n"
                    f"To: {comm.recipient}\n"
                    f"Date: {comm.sent_at}\n"
                    f"Subject: {comm.subject or 'N/A'}\n"
                    f"Body:\n{comm.body[:2000]}"
                ),
                source_table="communications",
                source_record_id=comm.id,
                source_external_id=comm.communication_id,
                event_date=comm.sent_at,
            )
        logger.debug(f"Collected {len(communications)} communications")

    def _collect_policies(self, case_file: CaseFile) -> None:
        """Collect active policies as evidence."""
        policies = self.repo.get_all_active_policies()
        if not policies:
            logger.info("No active policies found")
            return

        for policy in policies:
            self._store_evidence(
                case_file_id=case_file.id,
                evidence_type=EvidenceType.POLICY,
                source=EvidenceSource.SYSTEM,
                title=f"Policy: {policy.title}",
                description=f"{policy.policy_type} - v{policy.version or 'N/A'}",
                content_text=(
                    f"Policy ID: {policy.policy_id}\n"
                    f"Title: {policy.title}\n"
                    f"Type: {policy.policy_type}\n"
                    f"Version: {policy.version or 'N/A'}\n"
                    f"Effective: {policy.effective_date or 'N/A'}\n"
                    f"Expiry: {policy.expiry_date or 'N/A'}\n"
                    f"Category: {policy.category or 'N/A'}\n"
                    f"Content:\n{policy.content[:2000]}"
                ),
                source_table="policy_repository",
                source_record_id=policy.id,
                source_external_id=policy.policy_id,
            )
        logger.debug(f"Collected {len(policies)} policies")

    def _log_action(
        self,
        action: str,
        dispute_id: int,
        case_file_id: int,
        details: str,
    ) -> None:
        """Create an audit log entry."""
        log = AuditLog(
            action=action,
            entity_type="case_file",
            entity_id=case_file_id,
            dispute_id=dispute_id,
            case_file_id=case_file_id,
            details=details,
        )
        self.db.add(log)
        self.db.flush()