"""
Repository layer for timeline event database operations.
Provides data access methods for the Timeline Reconstruction Agent.
"""

from typing import Optional, List
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.new import (
    TimelineEvent,
    EvidenceRepository as EvidenceRepoModel,
    CaseFile,
    TimelineEventType,
)


class TimelineRepository:
    """Data access layer for timeline event operations."""

    def __init__(self, db: Session):
        self.db = db

    # --------------- Timeline Event CRUD ---------------

    def create_timeline_event(
        self,
        case_file_id: int,
        event_type: TimelineEventType,
        event_date: datetime,
        title: str,
        description: Optional[str] = None,
        sequence_order: Optional[int] = None,
        evidence_id: Optional[int] = None,
        source_table: Optional[str] = None,
        source_record_id: Optional[int] = None,
        amount: Optional[float] = None,
        currency: Optional[str] = None,
        merchant_name: Optional[str] = None,
        customer_name: Optional[str] = None,
        metadata_json: Optional[dict] = None,
    ) -> TimelineEvent:
        """
        Create a new timeline event.

        Args:
            case_file_id: Primary key of the case file.
            event_type: Type of the timeline event.
            event_date: When the event occurred.
            title: Short title for the event.
            description: Detailed description.
            sequence_order: Order in timeline (auto-assigned if None).
            evidence_id: Linked evidence record.
            source_table: Source table name.
            source_record_id: Source record primary key.
            amount: Amount if applicable.
            currency: Currency code.
            merchant_name: Merchant name.
            customer_name: Customer name.
            metadata_json: Additional metadata.

        Returns:
            Created TimelineEvent instance.
        """
        import uuid

        # Auto-assign sequence order if not provided
        if sequence_order is None:
            last_event = (
                self.db.query(TimelineEvent)
                .filter(TimelineEvent.case_file_id == case_file_id)
                .order_by(TimelineEvent.sequence_order.desc())
                .first()
            )
            sequence_order = (last_event.sequence_order if last_event else 0) + 1

        event = TimelineEvent(
            case_file_id=case_file_id,
            event_id=f"TE-{uuid.uuid4().hex[:12].upper()}",
            event_type=event_type,
            event_date=event_date,
            title=title,
            description=description,
            sequence_order=sequence_order,
            evidence_id=evidence_id,
            source_table=source_table,
            source_record_id=source_record_id,
            amount=amount,
            currency=currency,
            merchant_name=merchant_name,
            customer_name=customer_name,
            metadata_json=metadata_json,
        )

        self.db.add(event)
        self.db.flush()
        return event

    def get_timeline_event_by_id(self, event_id: int) -> Optional[TimelineEvent]:
        """Fetch a timeline event by primary key."""
        return self.db.query(TimelineEvent).filter(TimelineEvent.id == event_id).first()

    def get_timeline_event_by_ref(self, event_ref: str) -> Optional[TimelineEvent]:
        """Fetch a timeline event by its event_id string."""
        return (
            self.db.query(TimelineEvent)
            .filter(TimelineEvent.event_id == event_ref)
            .first()
        )

    def get_timeline_events_for_case_file(
        self, case_file_id: int, ordered: bool = True
    ) -> List[TimelineEvent]:
        """
        Fetch all timeline events for a case file.

        Args:
            case_file_id: Primary key of the case file.
            ordered: If True, return events ordered by sequence_order.

        Returns:
            List of TimelineEvent instances.
        """
        query = self.db.query(TimelineEvent).filter(
            TimelineEvent.case_file_id == case_file_id
        )

        if ordered:
            query = query.order_by(TimelineEvent.sequence_order.asc())

        return query.all()

    def get_timeline_events_by_type(
        self, case_file_id: int, event_type: TimelineEventType
    ) -> List[TimelineEvent]:
        """Fetch timeline events of a specific type for a case file."""
        return (
            self.db.query(TimelineEvent)
            .filter(
                TimelineEvent.case_file_id == case_file_id,
                TimelineEvent.event_type == event_type,
            )
            .order_by(TimelineEvent.event_date.asc())
            .all()
        )

    def get_timeline_events_in_date_range(
        self, case_file_id: int, start_date: datetime, end_date: datetime
    ) -> List[TimelineEvent]:
        """Fetch timeline events within a date range."""
        return (
            self.db.query(TimelineEvent)
            .filter(
                TimelineEvent.case_file_id == case_file_id,
                TimelineEvent.event_date >= start_date,
                TimelineEvent.event_date <= end_date,
            )
            .order_by(TimelineEvent.event_date.asc())
            .all()
        )

    def update_timeline_event(
        self,
        event_id: int,
        event_date: Optional[datetime] = None,
        title: Optional[str] = None,
        description: Optional[str] = None,
        sequence_order: Optional[int] = None,
        metadata_json: Optional[dict] = None,
    ) -> Optional[TimelineEvent]:
        """Update an existing timeline event."""
        event = self.get_timeline_event_by_id(event_id)
        if not event:
            return None

        if event_date is not None:
            event.event_date = event_date
        if title is not None:
            event.title = title
        if description is not None:
            event.description = description
        if sequence_order is not None:
            event.sequence_order = sequence_order
        if metadata_json is not None:
            event.metadata_json = metadata_json

        self.db.flush()
        return event

    def delete_timeline_event(self, event_id: int) -> bool:
        """Delete a timeline event."""
        event = self.get_timeline_event_by_id(event_id)
        if not event:
            return False

        self.db.delete(event)
        self.db.flush()
        return True

    def delete_timeline_events_for_case_file(self, case_file_id: int) -> int:
        """
        Delete all timeline events for a case file.

        Returns:
            Number of deleted events.
        """
        count = (
            self.db.query(TimelineEvent)
            .filter(TimelineEvent.case_file_id == case_file_id)
            .delete()
        )
        self.db.flush()
        return count

    # --------------- Timeline Ordering ---------------

    def reorder_timeline_events(
        self, case_file_id: int, event_ids: List[int]
    ) -> bool:
        """
        Reorder timeline events based on provided ID sequence.

        Args:
            case_file_id: Primary key of the case file.
            event_ids: List of timeline event IDs in desired order.

        Returns:
            True if successful, False otherwise.
        """
        # Verify all events belong to the case file
        existing_events = (
            self.db.query(TimelineEvent)
            .filter(
                TimelineEvent.case_file_id == case_file_id,
                TimelineEvent.id.in_(event_ids),
            )
            .all()
        )

        if len(existing_events) != len(event_ids):
            return False

        # Update sequence orders
        for idx, event_id in enumerate(event_ids):
            event = next((e for e in existing_events if e.id == event_id), None)
            if event:
                event.sequence_order = idx + 1

        self.db.flush()
        return True

    def recount_sequence_orders(self, case_file_id: int) -> int:
        """
        Recalculate sequence orders for all timeline events in a case file
        based on their event_date.

        Returns:
            Number of events updated.
        """
        events = (
            self.db.query(TimelineEvent)
            .filter(TimelineEvent.case_file_id == case_file_id)
            .order_by(TimelineEvent.event_date.asc())
            .all()
        )

        for idx, event in enumerate(events):
            event.sequence_order = idx + 1

        self.db.flush()
        return len(events)

    # --------------- Evidence Linking ---------------

    def get_timeline_events_for_evidence(
        self, evidence_id: int
    ) -> List[TimelineEvent]:
        """Fetch all timeline events linked to a specific evidence item."""
        return (
            self.db.query(TimelineEvent)
            .filter(TimelineEvent.evidence_id == evidence_id)
            .order_by(TimelineEvent.sequence_order.asc())
            .all()
        )

    def unlink_evidence_from_timeline(self, evidence_id: int) -> int:
        """
        Remove evidence linkage from all timeline events.

        Returns:
            Number of events updated.
        """
        count = (
            self.db.query(TimelineEvent)
            .filter(TimelineEvent.evidence_id == evidence_id)
            .update({"evidence_id": None})
        )
        self.db.flush()
        return count

    # --------------- Case File Operations ---------------

    def get_case_file_by_id(self, case_file_id: int) -> Optional[CaseFile]:
        """Fetch a case file by primary key."""
        return self.db.query(CaseFile).filter(CaseFile.id == case_file_id).first()

    def get_case_file_by_dispute_id(self, dispute_id: int) -> Optional[CaseFile]:
        """Fetch a case file by its dispute_id."""
        return (
            self.db.query(CaseFile).filter(CaseFile.dispute_id == dispute_id).first()
        )

    def get_evidence_for_case_file(
        self, case_file_id: int
    ) -> List[EvidenceRepoModel]:
        """Fetch all evidence items for a case file."""
        return (
            self.db.query(EvidenceRepoModel)
            .filter(EvidenceRepoModel.case_file_id == case_file_id)
            .all()
        )
