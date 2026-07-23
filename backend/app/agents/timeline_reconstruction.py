"""
Timeline Reconstruction Agent.
Responsible for arranging all events chronologically from collected evidence.
Creates a coherent timeline for the investigation package.
"""

from datetime import datetime
from typing import Optional, List, Dict, Tuple
from decimal import Decimal

from loguru import logger
from sqlalchemy.orm import Session

from app.models.new import (
    EvidenceRepository as EvidenceRepoModel,
    TimelineEvent,
    CaseFile,
    AuditLog,
    TimelineEventType,
    EvidenceType,
)
from app.repositories.timeline_repository import TimelineRepository
from app.repositories.evidence_repository import EvidenceRepositoryDB


class TimelineReconstructionAgent:
    """
    Agent responsible for reconstructing the chronological timeline
    from all collected evidence for a dispute investigation.
    """

    def __init__(self, db: Session):
        self.db = db
        self.timeline_repo = TimelineRepository(db)
        self.evidence_repo = EvidenceRepositoryDB(db)

    def reconstruct_timeline(
        self, case_file_id: int, clear_existing: bool = True
    ) -> Optional[CaseFile]:
        """
        Reconstruct the complete timeline for a case file.

        Process:
          1. Fetch all evidence for the case file
          2. Extract temporal information from each evidence item
          3. Create timeline events based on evidence type and date
          4. Order events chronologically
          5. Link events to source evidence
          6. Generate timeline summary

        Args:
            case_file_id: Primary key of the case file.
            clear_existing: If True, delete existing timeline events first.

        Returns:
            The updated CaseFile, or None if not found.
        """
        # 1. Fetch the case file
        case_file = self.timeline_repo.get_case_file_by_id(case_file_id)
        if not case_file:
            logger.error(f"Case file {case_file_id} not found")
            return None

        logger.info(f"Starting timeline reconstruction for case file {case_file.case_file_id}")

        # 2. Clear existing timeline if requested
        if clear_existing:
            deleted_count = self.timeline_repo.delete_timeline_events_for_case_file(
                case_file_id
            )
            logger.debug(f"Cleared {deleted_count} existing timeline events")

        # 3. Fetch all evidence for the case file
        evidence_items = self.timeline_repo.get_evidence_for_case_file(case_file_id)
        if not evidence_items:
            logger.warning(f"No evidence items found for case file {case_file_id}")
            return case_file

        logger.info(f"Processing {len(evidence_items)} evidence items for timeline")

        # 4. Process each evidence item and create timeline events
        events_created = 0
        for evidence in evidence_items:
            try:
                event = self._create_event_from_evidence(evidence, case_file_id)
                if event:
                    events_created += 1
                    logger.debug(
                        f"Created timeline event {event.event_id} from evidence {evidence.evidence_id}"
                    )
            except Exception as e:
                logger.error(
                    f"Failed to create timeline event from evidence {evidence.evidence_id}: {e}"
                )

        # 5. Order all events chronologically
        ordered_count = self.timeline_repo.recount_sequence_orders(case_file_id)
        logger.info(f"Ordered {ordered_count} timeline events chronologically")

        # 6. Commit changes
        self.db.commit()
        self.db.refresh(case_file)

        # 7. Log the action
        self._log_action(
            action="timeline_reconstruction_completed",
            case_file_id=case_file_id,
            dispute_id=case_file.dispute_id,
            details=f"Reconstructed timeline with {events_created} events from {len(evidence_items)} evidence items",
        )

        logger.info(
            f"Timeline reconstruction completed for case file {case_file.case_file_id}. "
            f"Created {events_created} events."
        )
        return case_file

    def _create_event_from_evidence(
        self, evidence: EvidenceRepoModel, case_file_id: int
    ) -> Optional[TimelineEvent]:
        """
        Create a timeline event from a single evidence item.

        The event type and details are determined based on the evidence type
        and available temporal information.

        Args:
            evidence: The evidence repository record.
            case_file_id: Primary key of the case file.

        Returns:
            Created TimelineEvent, or None if no valid date is available.
        """
        # Determine the event date (priority: event_date > created_at)
        event_date = evidence.event_date or evidence.collected_at
        if not event_date:
            logger.debug(
                f"Evidence {evidence.evidence_id} has no valid date, skipping timeline event"
            )
            return None

        # Determine event type and title based on evidence type
        event_type, title, description = self._determine_event_type_and_title(evidence)

        # Extract additional details from evidence
        amount = float(evidence.amount) if evidence.amount else None
        currency = evidence.currency
        merchant_name = evidence.merchant_name
        customer_name = evidence.customer_name

        # Create the timeline event
        event = self.timeline_repo.create_timeline_event(
            case_file_id=case_file_id,
            event_type=event_type,
            event_date=event_date,
            title=title,
            description=description,
            evidence_id=evidence.id,
            source_table=evidence.source_table,
            source_record_id=evidence.source_record_id,
            amount=amount,
            currency=currency,
            merchant_name=merchant_name,
            customer_name=customer_name,
            metadata_json={
                "evidence_id": evidence.evidence_id,
                "evidence_type": evidence.evidence_type.value,
                "source": evidence.source.value,
            },
        )

        return event

    def _determine_event_type_and_title(
        self, evidence: EvidenceRepoModel
    ) -> Tuple[TimelineEventType, str, Optional[str]]:
        """
        Determine the timeline event type, title, and description based on evidence.

        Args:
            evidence: The evidence repository record.

        Returns:
            Tuple of (event_type, title, description).
        """
        evidence_type = evidence.evidence_type
        title = evidence.title or f"{evidence_type.value.replace('_', ' ').title()}"
        description = evidence.description

        # Map evidence types to timeline event types
        type_mapping = {
            EvidenceType.TRANSACTION: (TimelineEventType.TRANSACTION, "Transaction"),
            EvidenceType.ORDER: (TimelineEventType.ORDER_PLACED, "Order Placed"),
            EvidenceType.PAYMENT: (TimelineEventType.PAYMENT_MADE, "Payment Made"),
            EvidenceType.REFUND: (TimelineEventType.REFUND_PROCESSED, "Refund Processed"),
            EvidenceType.COMMUNICATION: (
                TimelineEventType.COMMUNICATION_SENT,
                "Communication",
            ),
            EvidenceType.CUSTOMER_INFO: (
                TimelineEventType.SYSTEM_EVENT,
                "Customer Information Recorded",
            ),
            EvidenceType.MERCHANT_INFO: (
                TimelineEventType.SYSTEM_EVENT,
                "Merchant Information Recorded",
            ),
            EvidenceType.UPLOADED_DOCUMENT: (
                TimelineEventType.EVIDENCE_UPLOADED,
                "Evidence Document Uploaded",
            ),
            EvidenceType.POLICY: (TimelineEventType.POLICY_APPLIED, "Policy Reference"),
            EvidenceType.OTHER: (TimelineEventType.OTHER, "Other Event"),
        }

        event_type, default_title = type_mapping.get(
            evidence_type, (TimelineEventType.OTHER, "Other Event")
        )

        # Enhance title with extracted entities
        if evidence.merchant_name:
            title = f"{default_title} - {evidence.merchant_name}"
        elif evidence.customer_name:
            title = f"{default_title} - {evidence.customer_name}"
        else:
            title = default_title

        # Add amount to title if available
        if evidence.amount:
            amount_str = f"{evidence.amount} {evidence.currency or 'USD'}"
            title = f"{title} ({amount_str})"

        # Enhance description for communication types
        if evidence_type == EvidenceType.COMMUNICATION and description:
            # Truncate long descriptions
            if len(description) > 200:
                description = description[:197] + "..."

        return event_type, title, description

    def add_manual_event(
        self,
        case_file_id: int,
        event_type: TimelineEventType,
        event_date: datetime,
        title: str,
        description: Optional[str] = None,
        amount: Optional[float] = None,
        currency: Optional[str] = None,
        merchant_name: Optional[str] = None,
        customer_name: Optional[str] = None,
    ) -> Optional[TimelineEvent]:
        """
        Add a manually created timeline event (e.g., investigator notes).

        Args:
            case_file_id: Primary key of the case file.
            event_type: Type of the timeline event.
            event_date: When the event occurred.
            title: Short title for the event.
            description: Detailed description.
            amount: Amount if applicable.
            currency: Currency code.
            merchant_name: Merchant name.
            customer_name: Customer name.

        Returns:
            Created TimelineEvent, or None if case file not found.
        """
        case_file = self.timeline_repo.get_case_file_by_id(case_file_id)
        if not case_file:
            logger.error(f"Case file {case_file_id} not found")
            return None

        event = self.timeline_repo.create_timeline_event(
            case_file_id=case_file_id,
            event_type=event_type,
            event_date=event_date,
            title=title,
            description=description,
            amount=amount,
            currency=currency,
            merchant_name=merchant_name,
            customer_name=customer_name,
            metadata_json={"manually_added": True},
        )

        # Reorder timeline after adding manual event
        self.timeline_repo.recount_sequence_orders(case_file_id)
        self.db.commit()

        self._log_action(
            action="manual_timeline_event_added",
            case_file_id=case_file_id,
            dispute_id=case_file.dispute_id,
            details=f"Added manual timeline event: {title}",
        )

        logger.info(f"Added manual timeline event {event.event_id} to case file {case_file.case_file_id}")
        return event

    def get_timeline_summary(
        self, case_file_id: int
    ) -> Dict:
        """
        Generate a summary of the timeline for a case file.

        Args:
            case_file_id: Primary key of the case file.

        Returns:
            Dict containing timeline summary statistics and key events.
        """
        events = self.timeline_repo.get_timeline_events_for_case_file(case_file_id)

        if not events:
            return {
                "total_events": 0,
                "date_range": None,
                "event_types": {},
                "key_events": [],
            }

        # Calculate date range
        dates = [e.event_date for e in events if e.event_date]
        date_range = {
            "start": min(dates).isoformat() if dates else None,
            "end": max(dates).isoformat() if dates else None,
        }

        # Count event types
        event_type_counts = {}
        for event in events:
            event_type = event.event_type.value
            event_type_counts[event_type] = event_type_counts.get(event_type, 0) + 1

        # Identify key events (first and last of each type)
        key_events = []
        for event in events[:5]:  # First 5 events
            key_events.append({
                "event_id": event.event_id,
                "type": event.event_type.value,
                "date": event.event_date.isoformat() if event.event_date else None,
                "title": event.title,
            })

        return {
            "total_events": len(events),
            "date_range": date_range,
            "event_types": event_type_counts,
            "key_events": key_events,
        }

    def detect_timeline_gaps(
        self, case_file_id: int, gap_threshold_days: int = 7
    ) -> List[Dict]:
        """
        Detect significant gaps in the timeline.

        Args:
            case_file_id: Primary key of the case file.
            gap_threshold_days: Minimum gap in days to flag.

        Returns:
            List of gap descriptions with start, end, and duration.
        """
        events = self.timeline_repo.get_timeline_events_for_case_file(case_file_id)
        gaps = []

        if len(events) < 2:
            return gaps

        for i in range(len(events) - 1):
            current = events[i]
            next_event = events[i + 1]

            if current.event_date and next_event.event_date:
                gap_days = (next_event.event_date - current.event_date).days
                if gap_days >= gap_threshold_days:
                    gaps.append({
                        "after_event": current.event_id,
                        "before_event": next_event.event_id,
                        "after_date": current.event_date.isoformat(),
                        "before_date": next_event.event_date.isoformat(),
                        "gap_days": gap_days,
                        "severity": "high" if gap_days >= 30 else "medium",
                    })

        return gaps

    def _log_action(
        self,
        action: str,
        case_file_id: int,
        dispute_id: int,
        details: str,
    ) -> None:
        """Create an audit log entry for timeline actions."""
        log = AuditLog(
            action=action,
            entity_type="timeline_events",
            case_file_id=case_file_id,
            dispute_id=dispute_id,
            details=details,
        )
        self.db.add(log)
        self.db.flush()
