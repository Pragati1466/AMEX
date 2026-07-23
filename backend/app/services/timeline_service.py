"""
Timeline Service.
Orchestrates timeline reconstruction and provides business logic for the API layer.
Bridges the Timeline Reconstruction Agent and external consumers.
"""

from typing import Optional, List, Dict
from datetime import datetime

from loguru import logger
from sqlalchemy.orm import Session

from app.models.new import (
    TimelineEvent,
    CaseFile,
    TimelineEventType,
)
from app.repositories.timeline_repository import TimelineRepository
from app.agents.timeline_reconstruction import TimelineReconstructionAgent


class TimelineService:
    """
    Service responsible for timeline operations and orchestration.
    Provides a clean interface for the API layer to interact with timeline functionality.
    """

    def __init__(self, db: Session):
        self.db = db
        self.timeline_repo = TimelineRepository(db)
        self.agent = TimelineReconstructionAgent(db)

    # --------------- Timeline Reconstruction ---------------

    def reconstruct_timeline_for_case_file(
        self, case_file_id: int, clear_existing: bool = True
    ) -> Optional[Dict]:
        """
        Reconstruct the timeline for a case file.

        Args:
            case_file_id: Primary key of the case file.
            clear_existing: If True, delete existing timeline events first.

        Returns:
            Dict with reconstruction results, or None if case file not found.
        """
        case_file = self.agent.reconstruct_timeline(
            case_file_id=case_file_id,
            clear_existing=clear_existing,
        )

        if not case_file:
            return None

        # Get timeline summary
        summary = self.agent.get_timeline_summary(case_file_id)

        return {
            "case_file_id": case_file.id,
            "case_file_ref": case_file.case_file_id,
            "timeline_reconstructed": True,
            "total_events": summary["total_events"],
            "date_range": summary["date_range"],
            "event_types": summary["event_types"],
        }

    def reconstruct_timeline_for_dispute(
        self, dispute_id: int, clear_existing: bool = True
    ) -> Optional[Dict]:
        """
        Reconstruct timeline for a dispute (lookup case file first).

        Args:
            dispute_id: Primary key of the dispute.
            clear_existing: If True, delete existing timeline events first.

        Returns:
            Dict with reconstruction results, or None if dispute/case file not found.
        """
        case_file = self.timeline_repo.get_case_file_by_dispute_id(dispute_id)
        if not case_file:
            logger.error(f"No case file found for dispute {dispute_id}")
            return None

        return self.reconstruct_timeline_for_case_file(
            case_file_id=case_file.id,
            clear_existing=clear_existing,
        )

    # --------------- Timeline Event Retrieval ---------------

    def get_timeline_for_case_file(
        self, case_file_id: int, include_summary: bool = True
    ) -> Dict:
        """
        Get the complete timeline for a case file.

        Args:
            case_file_id: Primary key of the case file.
            include_summary: If True, include timeline summary statistics.

        Returns:
            Dict with timeline events and optional summary.
        """
        events = self.timeline_repo.get_timeline_events_for_case_file(case_file_id)

        response = {
            "case_file_id": case_file_id,
            "events": [
                {
                    "id": event.id,
                    "event_id": event.event_id,
                    "event_type": event.event_type.value,
                    "event_date": event.event_date.isoformat() if event.event_date else None,
                    "title": event.title,
                    "description": event.description,
                    "sequence_order": event.sequence_order,
                    "amount": float(event.amount) if event.amount else None,
                    "currency": event.currency,
                    "merchant_name": event.merchant_name,
                    "customer_name": event.customer_name,
                    "evidence_id": event.evidence_id,
                    "metadata": event.metadata_json,
                }
                for event in events
            ],
        }

        if include_summary:
            response["summary"] = self.agent.get_timeline_summary(case_file_id)

        return response

    def get_timeline_event(self, event_id: int) -> Optional[Dict]:
        """
        Get a single timeline event by ID.

        Args:
            event_id: Primary key of the timeline event.

        Returns:
            Dict with event details, or None if not found.
        """
        event = self.timeline_repo.get_timeline_event_by_id(event_id)
        if not event:
            return None

        return {
            "id": event.id,
            "event_id": event.event_id,
            "event_type": event.event_type.value,
            "event_date": event.event_date.isoformat() if event.event_date else None,
            "title": event.title,
            "description": event.description,
            "sequence_order": event.sequence_order,
            "amount": float(event.amount) if event.amount else None,
            "currency": event.currency,
            "merchant_name": event.merchant_name,
            "customer_name": event.customer_name,
            "evidence_id": event.evidence_id,
            "source_table": event.source_table,
            "source_record_id": event.source_record_id,
            "metadata": event.metadata_json,
            "created_at": event.created_at.isoformat() if event.created_at else None,
            "updated_at": event.updated_at.isoformat() if event.updated_at else None,
        }

    def get_timeline_events_by_type(
        self, case_file_id: int, event_type: str
    ) -> List[Dict]:
        """
        Get timeline events of a specific type for a case file.

        Args:
            case_file_id: Primary key of the case file.
            event_type: String representation of TimelineEventType.

        Returns:
            List of event dicts.
        """
        try:
            event_type_enum = TimelineEventType(event_type.lower())
        except ValueError:
            logger.error(f"Invalid event type: {event_type}")
            return []

        events = self.timeline_repo.get_timeline_events_by_type(
            case_file_id=case_file_id,
            event_type=event_type_enum,
        )

        return [
            {
                "id": event.id,
                "event_id": event.event_id,
                "event_type": event.event_type.value,
                "event_date": event.event_date.isoformat() if event.event_date else None,
                "title": event.title,
                "description": event.description,
                "sequence_order": event.sequence_order,
                "amount": float(event.amount) if event.amount else None,
                "currency": event.currency,
            }
            for event in events
        ]

    # --------------- Manual Event Management ---------------

    def add_manual_event(
        self,
        case_file_id: int,
        event_type: str,
        event_date: str,
        title: str,
        description: Optional[str] = None,
        amount: Optional[float] = None,
        currency: Optional[str] = None,
        merchant_name: Optional[str] = None,
        customer_name: Optional[str] = None,
    ) -> Optional[Dict]:
        """
        Add a manually created timeline event.

        Args:
            case_file_id: Primary key of the case file.
            event_type: String representation of TimelineEventType.
            event_date: ISO format date string.
            title: Short title for the event.
            description: Detailed description.
            amount: Amount if applicable.
            currency: Currency code.
            merchant_name: Merchant name.
            customer_name: Customer name.

        Returns:
            Dict with created event details, or None if failed.
        """
        try:
            event_type_enum = TimelineEventType(event_type.lower())
            event_date_parsed = datetime.fromisoformat(event_date)
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid event type or date: {e}")
            return None

        event = self.agent.add_manual_event(
            case_file_id=case_file_id,
            event_type=event_type_enum,
            event_date=event_date_parsed,
            title=title,
            description=description,
            amount=amount,
            currency=currency,
            merchant_name=merchant_name,
            customer_name=customer_name,
        )

        if not event:
            return None

        return self.get_timeline_event(event.id)

    def update_timeline_event(
        self,
        event_id: int,
        event_date: Optional[str] = None,
        title: Optional[str] = None,
        description: Optional[str] = None,
        sequence_order: Optional[int] = None,
    ) -> Optional[Dict]:
        """
        Update an existing timeline event.

        Args:
            event_id: Primary key of the timeline event.
            event_date: ISO format date string.
            title: Short title for the event.
            description: Detailed description.
            sequence_order: New sequence order.

        Returns:
            Dict with updated event details, or None if not found.
        """
        event_date_parsed = None
        if event_date:
            try:
                event_date_parsed = datetime.fromisoformat(event_date)
            except ValueError:
                logger.error(f"Invalid event date: {event_date}")
                return None

        event = self.timeline_repo.update_timeline_event(
            event_id=event_id,
            event_date=event_date_parsed,
            title=title,
            description=description,
            sequence_order=sequence_order,
        )

        if not event:
            return None

        # Reorder timeline if sequence was changed
        if sequence_order is not None:
            case_file_id = event.case_file_id
            self.timeline_repo.recount_sequence_orders(case_file_id)
            self.db.commit()

        return self.get_timeline_event(event_id)

    def delete_timeline_event(self, event_id: int) -> bool:
        """
        Delete a timeline event.

        Args:
            event_id: Primary key of the timeline event.

        Returns:
            True if deleted, False if not found.
        """
        # Get the event first to retrieve case_file_id for reordering
        event = self.timeline_repo.get_timeline_event_by_id(event_id)
        if not event:
            return False

        case_file_id = event.case_file_id
        success = self.timeline_repo.delete_timeline_event(event_id)

        if success:
            # Reorder remaining events
            self.timeline_repo.recount_sequence_orders(case_file_id)
            self.db.commit()

        return success

    # --------------- Timeline Analysis ---------------

    def get_timeline_summary(self, case_file_id: int) -> Dict:
        """
        Get timeline summary statistics.

        Args:
            case_file_id: Primary key of the case file.

        Returns:
            Dict with timeline summary.
        """
        return self.agent.get_timeline_summary(case_file_id)

    def detect_timeline_gaps(
        self, case_file_id: int, gap_threshold_days: int = 7
    ) -> List[Dict]:
        """
        Detect significant gaps in the timeline.

        Args:
            case_file_id: Primary key of the case file.
            gap_threshold_days: Minimum gap in days to flag.

        Returns:
            List of gap descriptions.
        """
        return self.agent.detect_timeline_gaps(
            case_file_id=case_file_id,
            gap_threshold_days=gap_threshold_days,
        )

    def get_timeline_analysis(self, case_file_id: int) -> Dict:
        """
        Get comprehensive timeline analysis including summary and gaps.

        Args:
            case_file_id: Primary key of the case file.

        Returns:
            Dict with complete timeline analysis.
        """
        summary = self.agent.get_timeline_summary(case_file_id)
        gaps = self.agent.detect_timeline_gaps(case_file_id)

        return {
            "summary": summary,
            "gaps": gaps,
            "has_gaps": len(gaps) > 0,
            "gap_count": len(gaps),
        }

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
        success = self.timeline_repo.reorder_timeline_events(
            case_file_id=case_file_id,
            event_ids=event_ids,
        )

        if success:
            self.db.commit()

        return success

    def auto_reorder_timeline(self, case_file_id: int) -> int:
        """
        Automatically reorder timeline events by date.

        Args:
            case_file_id: Primary key of the case file.

        Returns:
            Number of events reordered.
        """
        count = self.timeline_repo.recount_sequence_orders(case_file_id)
        self.db.commit()
        return count
