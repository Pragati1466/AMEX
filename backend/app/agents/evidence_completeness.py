"""
Evidence Completeness Agent.
Responsible for detecting missing evidence, contradictions, and incomplete submissions.
Uses rule-based validation and AI-powered suggestions via Groq API.
"""

from typing import Optional, List, Dict, Tuple, Set
from datetime import datetime, timedelta
from decimal import Decimal

from loguru import logger
from sqlalchemy.orm import Session

from app.models.new import (
    EvidenceRepository as EvidenceRepoModel,
    EvidenceValidation,
    CaseFile,
    AuditLog,
    EvidenceType,
    ValidationCategory,
    ValidationSeverity,
    DisputeReason,
)
from app.repositories.validation_repository import ValidationRepository
from app.repositories.evidence_repository import EvidenceRepositoryDB
from app.utils.groq_client import GroqClient


class EvidenceCompletenessAgent:
    """
    Agent responsible for validating evidence completeness and quality.
    Detects missing documents, contradictions, and incomplete submissions.
    """

    def __init__(self, db: Session):
        self.db = db
        self.validation_repo = ValidationRepository(db)
        self.evidence_repo = EvidenceRepositoryDB(db)
        self.groq_client = GroqClient()

    def validate_case_file(
        self, case_file_id: int, clear_existing: bool = True
    ) -> Optional[CaseFile]:
        """
        Run comprehensive validation on a case file.

        Process:
          1. Clear existing validations if requested
          2. Fetch all evidence for the case file
          3. Run rule-based validation checks
          4. Detect contradictions
          5. Generate AI-powered suggestions
          6. Store validation results

        Args:
            case_file_id: Primary key of the case file.
            clear_existing: If True, delete existing validations first.

        Returns:
            The updated CaseFile, or None if not found.
        """
        # 1. Fetch the case file
        case_file = self.validation_repo.get_case_file_by_id(case_file_id)
        if not case_file:
            logger.error(f"Case file {case_file_id} not found")
            return None

        logger.info(f"Starting evidence validation for case file {case_file.case_file_id}")

        # 2. Clear existing validations if requested
        if clear_existing:
            deleted_count = self.validation_repo.delete_validations_for_case_file(
                case_file_id
            )
            logger.debug(f"Cleared {deleted_count} existing validations")

        # 3. Fetch all evidence for the case file
        evidence_items = self.validation_repo.get_evidence_for_case_file(case_file_id)
        if not evidence_items:
            logger.warning(f"No evidence items found for case file {case_file_id}")
            self._create_validation(
                case_file_id=case_file_id,
                category=ValidationCategory.MISSING_EVIDENCE,
                severity=ValidationSeverity.CRITICAL,
                title="No Evidence Collected",
                description="No evidence items have been collected for this case file.",
                detail="The investigation cannot proceed without evidence.",
                suggestion="Run evidence collection to gather transaction, order, payment, and communication records.",
            )
            self.db.commit()
            return case_file

        logger.info(f"Processing {len(evidence_items)} evidence items for validation")

        # 4. Run rule-based validation checks
        validations_created = 0

        # Check for missing evidence types
        validations_created += self._check_missing_evidence_types(
            case_file_id, evidence_items
        )

        # Check for incomplete evidence
        validations_created += self._check_incomplete_evidence(
            case_file_id, evidence_items
        )

        # Check for contradictions
        validations_created += self._check_contradictions(
            case_file_id, evidence_items
        )

        # Check for timeline gaps
        validations_created += self._check_timeline_gaps(case_file_id)

        # Check for disputed-specific requirements
        validations_created += self._check_dispute_requirements(
            case_file_id, evidence_items
        )

        # 5. Generate AI-powered suggestions for critical issues
        self._generate_ai_suggestions(case_file_id)

        # 6. Commit changes
        self.db.commit()
        self.db.refresh(case_file)

        # 7. Log the action
        self._log_action(
            action="evidence_validation_completed",
            case_file_id=case_file_id,
            dispute_id=case_file.dispute_id,
            details=f"Created {validations_created} validation findings for {len(evidence_items)} evidence items",
        )

        logger.info(
            f"Evidence validation completed for case file {case_file.case_file_id}. "
            f"Created {validations_created} validation findings."
        )
        return case_file

    def _check_missing_evidence_types(
        self, case_file_id: int, evidence_items: List[EvidenceRepoModel]
    ) -> int:
        """
        Check for missing required evidence types.

        Returns:
            Number of validations created.
        """
        validations_created = 0
        present_types = {item.evidence_type for item in evidence_items}

        # Define required evidence types based on dispute context
        required_types = {
            EvidenceType.TRANSACTION: "Transaction record showing the disputed charge",
            EvidenceType.ORDER: "Order details showing what was purchased",
            EvidenceType.PAYMENT: "Payment confirmation and method",
        }

        # Optional but recommended types
        recommended_types = {
            EvidenceType.COMMUNICATION: "Customer communications about the dispute",
            EvidenceType.UPLOADED_DOCUMENT: "Supporting documents (receipts, emails, etc.)",
        }

        # Check required types
        for evidence_type, description in required_types.items():
            if evidence_type not in present_types:
                self._create_validation(
                    case_file_id=case_file_id,
                    category=ValidationCategory.MISSING_EVIDENCE,
                    severity=ValidationSeverity.ERROR,
                    title=f"Missing {evidence_type.value.replace('_', ' ').title()}",
                    description=f"No {evidence_type.value} evidence found",
                    detail=f"{description} is required for a complete investigation.",
                    suggestion=f"Collect {evidence_type.value} records from the source system or request upload from the investigator.",
                    evidence_type=evidence_type,
                )
                validations_created += 1

        # Check recommended types
        for evidence_type, description in recommended_types.items():
            if evidence_type not in present_types:
                self._create_validation(
                    case_file_id=case_file_id,
                    category=ValidationCategory.MISSING_EVIDENCE,
                    severity=ValidationSeverity.WARNING,
                    title=f"Recommended: {evidence_type.value.replace('_', ' ').title()}",
                    description=f"No {evidence_type.value} evidence found",
                    detail=f"{description} would strengthen the investigation.",
                    suggestion=f"Consider collecting {evidence_type.value} to provide additional context.",
                    evidence_type=evidence_type,
                )
                validations_created += 1

        return validations_created

    def _check_incomplete_evidence(
        self, case_file_id: int, evidence_items: List[EvidenceRepoModel]
    ) -> int:
        """
        Check for incomplete evidence (missing critical fields).

        Returns:
            Number of validations created.
        """
        validations_created = 0

        for evidence in evidence_items:
            issues = []

            # Check for missing content
            if not evidence.content_text and not evidence.file_url:
                issues.append("No content text or file attachment")

            # Check for missing temporal information
            if not evidence.event_date and not evidence.collected_at:
                issues.append("No date information")

            # Check for missing extracted entities
            if evidence.evidence_type in [
                EvidenceType.TRANSACTION,
                EvidenceType.ORDER,
                EvidenceType.PAYMENT,
            ]:
                if not evidence.amount:
                    issues.append("Missing amount")
                if not evidence.merchant_name:
                    issues.append("Missing merchant name")

            # Create validation if issues found
            if issues:
                self._create_validation(
                    case_file_id=case_file_id,
                    category=ValidationCategory.INCOMPLETE_SUBMISSION,
                    severity=ValidationSeverity.WARNING,
                    title=f"Incomplete {evidence.evidence_type.value.replace('_', ' ').title()}",
                    description=f"Evidence {evidence.evidence_id} is incomplete",
                    detail=f"Missing fields: {', '.join(issues)}",
                    suggestion="Update the evidence record with missing information or upload supporting documents.",
                    evidence_id=evidence.id,
                    evidence_type=evidence.evidence_type,
                )
                validations_created += 1

        return validations_created

    def _check_contradictions(
        self, case_file_id: int, evidence_items: List[EvidenceRepoModel]
    ) -> int:
        """
        Check for contradictory information across evidence items.

        Returns:
            Number of validations created.
        """
        validations_created = 0

        # Group evidence by transaction/order IDs for comparison
        by_transaction_id: Dict[str, List[EvidenceRepoModel]] = {}
        by_order_id: Dict[str, List[EvidenceRepoModel]] = {}

        for evidence in evidence_items:
            if evidence.transaction_id_ref:
                by_transaction_id.setdefault(evidence.transaction_id_ref, []).append(
                    evidence
                )
            if evidence.order_id_ref:
                by_order_id.setdefault(evidence.order_id_ref, []).append(evidence)

        # Check for amount contradictions
        validations_created += self._check_amount_contradictions(
            case_file_id, by_transaction_id
        )

        # Check for date contradictions
        validations_created += self._check_date_contradictions(
            case_file_id, by_order_id
        )

        # Check for merchant name contradictions
        validations_created += self._check_merchant_contradictions(
            case_file_id, evidence_items
        )

        return validations_created

    def _check_amount_contradictions(
        self, case_file_id: int, by_transaction_id: Dict[str, List[EvidenceRepoModel]]
    ) -> int:
        """Check for contradictory amounts for the same transaction."""
        validations_created = 0

        for txn_id, evidence_list in by_transaction_id.items():
            if len(evidence_list) < 2:
                continue

            amounts = [
                (e.id, e.amount)
                for e in evidence_list
                if e.amount is not None
            ]

            if len(amounts) < 2:
                continue

            # Check if amounts differ significantly (more than 1% difference)
            first_amount = amounts[0][1]
            for evidence_id, amount in amounts[1:]:
                if amount != first_amount:
                    difference = abs(float(amount - first_amount))
                    percentage = (difference / float(first_amount)) * 100

                    if percentage > 1.0:  # More than 1% difference
                        self._create_validation(
                            case_file_id=case_file_id,
                            category=ValidationCategory.CONTRADICTION,
                            severity=ValidationSeverity.ERROR,
                            title=f"Amount Contradiction for Transaction {txn_id}",
                            description=f"Different amounts found for the same transaction",
                            detail=f"Evidence shows {first_amount} and {amount} (difference: {percentage:.2f}%)",
                            suggestion="Verify which amount is correct by checking the original source or contacting the payment processor.",
                            evidence_id=amounts[0][0],
                            conflicting_evidence_id=evidence_id,
                            conflicting_field="amount",
                        )
                        validations_created += 1
                        break

        return validations_created

    def _check_date_contradictions(
        self, case_file_id: int, by_order_id: Dict[str, List[EvidenceRepoModel]]
    ) -> int:
        """Check for illogical date sequences."""
        validations_created = 0

        for order_id, evidence_list in by_order_id.items():
            if len(evidence_list) < 2:
                continue

            # Sort by date
            dated_evidence = [
                (e.id, e.event_date)
                for e in evidence_list
                if e.event_date is not None
            ]

            if len(dated_evidence) < 2:
                continue

            # Check for illogical sequences (e.g., delivery before order)
            dated_evidence.sort(key=lambda x: x[1])

            for i in range(len(dated_evidence) - 1):
                current_id, current_date = dated_evidence[i]
                next_id, next_date = dated_evidence[i + 1]

                # If there's a large gap (> 30 days), flag it
                if (next_date - current_date).days > 30:
                    self._create_validation(
                        case_file_id=case_file_id,
                        category=ValidationCategory.TIMELINE_GAP,
                        severity=ValidationSeverity.INFO,
                        title=f"Large Date Gap for Order {order_id}",
                        description=f"Significant time gap between events",
                        detail=f"Gap of {(next_date - current_date).days} days between evidence items",
                        suggestion="Verify if this gap is expected or if evidence is missing for the intervening period.",
                        evidence_id=current_id,
                        conflicting_evidence_id=next_id,
                        conflicting_field="event_date",
                    )
                    validations_created += 1

        return validations_created

    def _check_merchant_contradictions(
        self, case_file_id: int, evidence_items: List[EvidenceRepoModel]
    ) -> int:
        """Check for contradictory merchant names."""
        validations_created = 0

        # Group by merchant name (case-insensitive)
        merchant_names: Dict[str, List[int]] = {}
        for evidence in evidence_items:
            if evidence.merchant_name:
                normalized = evidence.merchant_name.lower().strip()
                merchant_names.setdefault(normalized, []).append(evidence.id)

        # Check for similar but different merchant names
        if len(merchant_names) > 1:
            name_list = list(merchant_names.keys())
            for i in range(len(name_list)):
                for j in range(i + 1, len(name_list)):
                    name1, name2 = name_list[i], name_list[j]

                    # Check if one name is contained in the other (potential abbreviation)
                    if name1 in name2 or name2 in name1:
                        if name1 != name2:  # Different but similar
                            self._create_validation(
                                case_file_id=case_file_id,
                                category=ValidationCategory.CONTRADICTION,
                                severity=ValidationSeverity.WARNING,
                                title="Similar Merchant Names Detected",
                                description=f"Potential merchant name inconsistency",
                                detail=f"Found similar merchant names: '{name1}' and '{name2}'",
                                suggestion="Verify if these refer to the same merchant or if one is incorrect.",
                                evidence_id=merchant_names[name1][0],
                                conflicting_evidence_id=merchant_names[name2][0],
                                conflicting_field="merchant_name",
                            )
                            validations_created += 1

        return validations_created

    def _check_timeline_gaps(self, case_file_id: int) -> int:
        """
        Check for significant gaps in the investigation timeline.

        Returns:
            Number of validations created.
        """
        validations_created = 0

        # Import here to avoid circular dependency
        from app.repositories.timeline_repository import TimelineRepository
        timeline_repo = TimelineRepository(self.db)

        events = timeline_repo.get_timeline_events_for_case_file(case_file_id)

        if len(events) < 2:
            return 0

        # Check for gaps > 7 days
        for i in range(len(events) - 1):
            current = events[i]
            next_event = events[i + 1]

            if current.event_date and next_event.event_date:
                gap_days = (next_event.event_date - current.event_date).days

                if gap_days > 7:
                    severity = (
                        ValidationSeverity.ERROR if gap_days > 30 else ValidationSeverity.WARNING
                    )

                    self._create_validation(
                        case_file_id=case_file_id,
                        category=ValidationCategory.TIMELINE_GAP,
                        severity=severity,
                        title=f"Timeline Gap: {gap_days} Days",
                        description=f"Significant gap between '{current.title}' and '{next_event.title}'",
                        detail=f"Gap of {gap_days} days between {current.event_date} and {next_event.event_date}",
                        suggestion="Investigate if evidence is missing for this period or if the gap is expected.",
                    )
                    validations_created += 1

        return validations_created

    def _check_dispute_requirements(
        self, case_file_id: int, evidence_items: List[EvidenceRepoModel]
    ) -> int:
        """
        Check for dispute-specific evidence requirements.

        Returns:
            Number of validations created.
        """
        validations_created = 0

        # Get the dispute to understand the reason
        case_file = self.validation_repo.get_case_file_by_id(case_file_id)
        if not case_file:
            return 0

        # Fetch dispute details
        from app.models.existing import Dispute
        dispute = self.db.query(Dispute).filter(Dispute.id == case_file.dispute_id).first()
        if not dispute:
            return 0

        # Dispute reason-specific checks
        if dispute.reason == DisputeReason.PRODUCT_NOT_RECEIVED:
            # Check for delivery/tracking evidence
            has_delivery = any(
                e.evidence_type == EvidenceType.OTHER
                and e.content_text
                and ("delivery" in e.content_text.lower() or "tracking" in e.content_text.lower())
                for e in evidence_items
            )

            if not has_delivery:
                self._create_validation(
                    case_file_id=case_file_id,
                    category=ValidationCategory.MISSING_EVIDENCE,
                    severity=ValidationSeverity.ERROR,
                    title="Missing Delivery/Tracking Information",
                    description="No delivery proof or tracking information found",
                    detail="For 'product not received' disputes, delivery confirmation or tracking details are essential.",
                    suggestion="Request delivery confirmation, tracking number, or courier delivery proof from the merchant.",
                )
                validations_created += 1

        elif dispute.reason == DisputeReason.PRODUCT_DEFECTIVE:
            # Check for product photos or defect description
            has_defect_evidence = any(
                e.evidence_type == EvidenceType.UPLOADED_DOCUMENT
                or (e.content_text and "defect" in e.content_text.lower())
                for e in evidence_items
            )

            if not has_defect_evidence:
                self._create_validation(
                    case_file_id=case_file_id,
                    category=ValidationCategory.MISSING_EVIDENCE,
                    severity=ValidationSeverity.WARNING,
                    title="Missing Defect Documentation",
                    description="No photos or description of the product defect found",
                    detail="For 'product defective' disputes, visual evidence or detailed defect descriptions strengthen the case.",
                    suggestion="Request product photos showing the defect or a detailed description of the issue.",
                )
                validations_created += 1

        elif dispute.reason == DisputeReason.REFUND_NOT_PROCESSED:
            # Check for refund request evidence
            has_refund_request = any(
                e.evidence_type == EvidenceType.COMMUNICATION
                and e.content_text
                and "refund" in e.content_text.lower()
                for e in evidence_items
            )

            if not has_refund_request:
                self._create_validation(
                    case_file_id=case_file_id,
                    category=ValidationCategory.MISSING_EVIDENCE,
                    severity=ValidationSeverity.ERROR,
                    title="Missing Refund Request Evidence",
                    description="No evidence of refund request found",
                    detail="For 'refund not processed' disputes, evidence of the refund request is required.",
                    suggestion="Locate communications showing the refund request or obtain a copy from the customer.",
                )
                validations_created += 1

        return validations_created

    def _generate_ai_suggestions(self, case_file_id: int) -> None:
        """
        Generate AI-powered suggestions for critical validation issues using Groq API.
        Falls back to rule-based suggestions if Groq is unavailable.
        """
        # Get critical validations
        critical_validations = self.validation_repo.get_critical_validations(case_file_id)

        if not critical_validations:
            return

        # Generate evidence summary for context
        evidence_items = self.validation_repo.get_evidence_for_case_file(case_file_id)
        evidence_summary = self._generate_evidence_summary(evidence_items)

        # Generate AI suggestions for each critical validation
        for validation in critical_validations:
            if not validation.suggestion:
                context = {
                    "title": validation.title,
                    "description": validation.description,
                    "detail": validation.detail,
                    "severity": validation.severity.value,
                    "category": validation.category.value,
                }

                try:
                    ai_suggestion = self.groq_client.generate_validation_suggestion(
                        validation_type=validation.category.value,
                        context=context,
                        evidence_summary=evidence_summary,
                    )

                    # Use the AI-generated suggestion
                    validation.suggestion = ai_suggestion.suggestion

                    # Add action items to metadata
                    if not validation.metadata_json:
                        validation.metadata_json = {}

                    validation.metadata_json.update({
                        "ai_generated": True,
                        "priority": ai_suggestion.priority,
                        "action_items": ai_suggestion.action_items,
                        "confidence": ai_suggestion.confidence,
                    })

                except Exception as e:
                    logger.error(f"AI suggestion generation failed: {e}")
                    # Fall back to rule-based suggestion
                    validation.suggestion = self._generate_rule_based_suggestion(validation)

        self.db.flush()

    def _generate_evidence_summary(self, evidence_items: List[EvidenceRepoModel]) -> str:
        """Generate a summary of evidence for AI context."""
        if not evidence_items:
            return "No evidence collected."

        summary_parts = []
        summary_parts.append(f"Total evidence items: {len(evidence_items)}")

        # Count by type
        type_counts = {}
        for evidence in evidence_items:
            type_name = evidence.evidence_type.value
            type_counts[type_name] = type_counts.get(type_name, 0) + 1

        summary_parts.append("Evidence types:")
        for type_name, count in sorted(type_counts.items()):
            summary_parts.append(f"  - {type_name}: {count}")

        # Timeline info
        dated_items = [e for e in evidence_items if e.event_date]
        if dated_items:
            dates = [e.event_date for e in dated_items if e.event_date]
            summary_parts.append(f"Date range: {min(dates)} to {max(dates)}")

        # Merchant info
        merchants = set(e.merchant_name for e in evidence_items if e.merchant_name)
        if merchants:
            summary_parts.append(f"Merchants: {', '.join(merchants)}")

        return "\n".join(summary_parts)

    def _generate_rule_based_suggestion(self, validation: EvidenceValidation) -> str:
        """Generate rule-based suggestion as fallback."""
        if validation.category == ValidationCategory.MISSING_EVIDENCE:
            if validation.evidence_type:
                type_name = validation.evidence_type.value.replace("_", " ")
                return (
                    f"Contact the relevant department to obtain {type_name} records. "
                    f"If records are unavailable, document the reason and consider alternative evidence sources."
                )
            return "Review the evidence requirements and collect the missing information from available sources."

        elif validation.category == ValidationCategory.CONTRADICTION:
            if validation.conflicting_field:
                return (
                    f"Verify the {validation.conflicting_field} by checking the original source documents. "
                    f"Contact the data provider if needed to resolve the discrepancy."
                )
            return "Review the conflicting evidence items and determine which information is accurate."

        elif validation.category == ValidationCategory.INCOMPLETE_SUBMISSION:
            return (
                "Update the evidence record with the missing information. "
                "If the information is not available, document why it cannot be obtained."
            )

        elif validation.category == ValidationCategory.TIMELINE_GAP:
            return (
                "Investigate whether evidence is missing for the time period or if the gap is expected. "
                "Request additional documentation if needed."
            )

        return "Review the validation issue and take appropriate action based on the details provided."

    def _create_validation(
        self,
        case_file_id: int,
        category: ValidationCategory,
        severity: ValidationSeverity,
        title: str,
        description: Optional[str] = None,
        detail: Optional[str] = None,
        suggestion: Optional[str] = None,
        evidence_id: Optional[int] = None,
        evidence_type: Optional[EvidenceType] = None,
        conflicting_evidence_id: Optional[int] = None,
        conflicting_field: Optional[str] = None,
    ) -> EvidenceValidation:
        """Create a validation record."""
        return self.validation_repo.create_validation(
            case_file_id=case_file_id,
            category=category,
            severity=severity,
            title=title,
            description=description,
            detail=detail,
            suggestion=suggestion,
            evidence_id=evidence_id,
            evidence_type=evidence_type,
            conflicting_evidence_id=conflicting_evidence_id,
            conflicting_field=conflicting_field,
        )

    def _log_action(
        self,
        action: str,
        case_file_id: int,
        dispute_id: int,
        details: str,
    ) -> None:
        """Create an audit log entry for validation actions."""
        log = AuditLog(
            action=action,
            entity_type="evidence_validation",
            case_file_id=case_file_id,
            dispute_id=dispute_id,
            details=details,
        )
        self.db.add(log)
        self.db.flush()
