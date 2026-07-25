"""
Repository layer for querying existing database tables.
Provides data access methods for the Evidence Collection Agent.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.models.existing import (
    Customer, Merchant, Transaction, Order, Payment,
    RefundHistory, Communication, Dispute, PolicyRepository,
)


class EvidenceRepositoryDB:
    """Data access layer for collecting evidence from existing tables."""

    def __init__(self, db: Session):
        self.db = db

    # --------------- Dispute ---------------

    def get_dispute_by_id(self, dispute_id: int) -> Optional[Dispute]:
        """Fetch a dispute by its primary key."""
        return self.db.query(Dispute).filter(Dispute.id == dispute_id).first()

    def get_dispute_by_external_id(self, external_id: str) -> Optional[Dispute]:
        """Fetch a dispute by its external dispute_id."""
        return self.db.query(Dispute).filter(Dispute.dispute_id == external_id).first()

    # --------------- Customer ---------------

    def get_customer(self, customer_id: int) -> Optional[Customer]:
        """Fetch a customer by primary key."""
        return self.db.query(Customer).filter(Customer.id == customer_id).first()

    def get_customer_by_external_id(self, external_id: str) -> Optional[Customer]:
        """Fetch a customer by external customer_id."""
        return self.db.query(Customer).filter(Customer.customer_id == external_id).first()

    # --------------- Merchant ---------------

    def get_merchant(self, merchant_id: int) -> Optional[Merchant]:
        """Fetch a merchant by primary key."""
        return self.db.query(Merchant).filter(Merchant.id == merchant_id).first()

    def get_merchant_by_external_id(self, external_id: str) -> Optional[Merchant]:
        """Fetch a merchant by external merchant_id."""
        return self.db.query(Merchant).filter(Merchant.merchant_id == external_id).first()

    # --------------- Transaction ---------------

    def get_transactions_for_dispute(self, dispute: Dispute) -> list[Transaction]:
        """Fetch transactions related to a dispute."""
        query = self.db.query(Transaction)

        # If dispute has a direct transaction reference
        if dispute.transaction_id:
            query = query.filter(Transaction.id == dispute.transaction_id)

        # Also find by customer + merchant
        results = query.filter(
            Transaction.customer_id == dispute.customer_id,
            Transaction.merchant_id == dispute.merchant_id,
        ).order_by(Transaction.transaction_date.desc()).all()

        return results

    def get_transaction_by_external_id(self, external_id: str) -> Optional[Transaction]:
        """Fetch a transaction by external transaction_id."""
        return self.db.query(Transaction).filter(
            Transaction.transaction_id == external_id
        ).first()

    # --------------- Order ---------------

    def get_orders_for_dispute(self, dispute: Dispute) -> list[Order]:
        """Fetch orders related to a dispute."""
        query = self.db.query(Order)

        if dispute.order_id:
            query = query.filter(Order.id == dispute.order_id)

        results = query.filter(
            Order.customer_id == dispute.customer_id,
            Order.merchant_id == dispute.merchant_id,
        ).order_by(Order.order_date.desc()).all()

        return results

    def get_order_by_external_id(self, external_id: str) -> Optional[Order]:
        """Fetch an order by external order_id."""
        return self.db.query(Order).filter(Order.order_id == external_id).first()

    # --------------- Payment ---------------

    def get_payments_for_dispute(self, dispute: Dispute) -> list[Payment]:
        """Fetch payments related to a dispute."""
        query = self.db.query(Payment).filter(
            Payment.customer_id == dispute.customer_id,
        )

        if dispute.transaction_id:
            query = query.filter(Payment.transaction_id == dispute.transaction_id)

        return query.order_by(Payment.payment_date.desc()).all()

    # --------------- Refund History ---------------

    def get_refunds_for_dispute(self, dispute: Dispute) -> list[RefundHistory]:
        """Fetch refund history related to a dispute."""
        query = self.db.query(RefundHistory).filter(
            RefundHistory.customer_id == dispute.customer_id,
        )

        if dispute.transaction_id:
            query = query.filter(
                RefundHistory.transaction_id == dispute.transaction_id
            )

        return query.order_by(RefundHistory.refund_date.desc()).all()

    # --------------- Communications ---------------

    def get_communications_for_dispute(self, dispute: Dispute) -> list[Communication]:
        """Fetch communications related to a dispute."""
        # Find communications linked to this dispute or customer
        query = self.db.query(Communication).filter(
            Communication.customer_id == dispute.customer_id,
        )

        # Also filter by dispute if linked
        results = query.order_by(Communication.sent_at.desc()).all()

        # Filter to only those linked to this dispute or within relevant timeframe
        filtered = []
        for comm in results:
            if comm.dispute_id == dispute.id:
                filtered.append(comm)
            elif comm.dispute_id is None:
                # Include general communications about the same transaction
                filtered.append(comm)

        return filtered

    # --------------- Policies ---------------

    def get_all_active_policies(self) -> list[PolicyRepository]:
        """Fetch all active policies."""
        return self.db.query(PolicyRepository).filter(
            PolicyRepository.is_active.is_(True)
        ).all()

    def get_policies_by_type(self, policy_type: str) -> list[PolicyRepository]:
        """Fetch active policies by type."""
        return self.db.query(PolicyRepository).filter(
            PolicyRepository.is_active.is_(True),
            PolicyRepository.policy_type == policy_type,
        ).all()

    def get_policy_by_id(self, policy_id: int) -> Optional[PolicyRepository]:
        """Fetch a policy by primary key."""
        return self.db.query(PolicyRepository).filter(
            PolicyRepository.id == policy_id
        ).first()