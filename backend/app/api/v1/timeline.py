"""
API endpoints for timeline reconstruction and management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.timeline_service import TimelineService
from app.schemas.timeline import (
    TimelineResponse,
    TimelineEventResponse,
    TimelineEventCompact,
    TimelineSummary,
    TimelineAnalysis,
    TimelineGap,
    ManualEventRequest,
    UpdateEventRequest,
    ReconstructTimelineRequest,
    ReconstructTimelineResponse,
    ReorderTimelineRequest,
    TimelineGapDetectionRequest,
    TimelineEventListResponse,
)

router = APIRouter(prefix="/timeline", tags=["Timeline Reconstruction"])


# --------------- Timeline Reconstruction Endpoints ---------------

@router.post("/reconstruct", response_model=ReconstructTimelineResponse)
def reconstruct_timeline(
    payload: ReconstructTimelineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger the Timeline Reconstruction Agent to automatically arrange
    all events chronologically from collected evidence.

    Provide either case_file_id or dispute_id to identify the case.
    """
    service = TimelineService(db)

    # Determine which ID to use
    if payload.case_file_id:
        result = service.reconstruct_timeline_for_case_file(
            case_file_id=payload.case_file_id,
            clear_existing=payload.clear_existing,
        )
    elif payload.dispute_id:
        result = service.reconstruct_timeline_for_dispute(
            dispute_id=payload.dispute_id,
            clear_existing=payload.clear_existing,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either case_file_id or dispute_id must be provided",
        )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case file or dispute not found",
        )

    return ReconstructTimelineResponse(
        success=True,
        message="Timeline reconstructed successfully",
        **result,
    )


# --------------- Timeline Retrieval Endpoints ---------------

@router.get("/case-file/{case_file_id}", response_model=TimelineResponse)
def get_timeline(
    case_file_id: int,
    include_summary: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the complete timeline for a case file with optional summary.
    """
    service = TimelineService(db)
    timeline_data = service.get_timeline_for_case_file(
        case_file_id=case_file_id,
        include_summary=include_summary,
    )

    # Convert events to compact response format
    events_compact = [
        TimelineEventCompact(**event) for event in timeline_data["events"]
    ]

    return TimelineResponse(
        case_file_id=case_file_id,
        events=events_compact,
        summary=timeline_data.get("summary"),
    )


@router.get("/event/{event_id}", response_model=TimelineEventResponse)
def get_timeline_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a single timeline event by ID.
    """
    service = TimelineService(db)
    event = service.get_timeline_event(event_id)

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timeline event {event_id} not found",
        )

    return TimelineEventResponse(**event)


@router.get("/case-file/{case_file_id}/events", response_model=TimelineEventListResponse)
def get_timeline_events(
    case_file_id: int,
    event_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get timeline events for a case file, optionally filtered by type.
    """
    service = TimelineService(db)

    if event_type:
        events = service.get_timeline_events_by_type(case_file_id, event_type)
    else:
        timeline_data = service.get_timeline_for_case_file(
            case_file_id=case_file_id, include_summary=False
        )
        events = timeline_data["events"]

    events_compact = [TimelineEventCompact(**event) for event in events]

    return TimelineEventListResponse(
        case_file_id=case_file_id,
        total=len(events_compact),
        events=events_compact,
    )


@router.get("/case-file/{case_file_id}/summary", response_model=TimelineSummary)
def get_timeline_summary(
    case_file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get timeline summary statistics for a case file.
    """
    service = TimelineService(db)
    summary = service.get_timeline_summary(case_file_id)

    return TimelineSummary(**summary)


# --------------- Manual Event Management Endpoints ---------------

@router.post("/event/manual", response_model=TimelineEventResponse)
def add_manual_event(
    payload: ManualEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a manually created timeline event (e.g., investigator notes).
    """
    service = TimelineService(db)
    event = service.add_manual_event(
        case_file_id=payload.case_file_id,
        event_type=payload.event_type,
        event_date=payload.event_date,
        title=payload.title,
        description=payload.description,
        amount=payload.amount,
        currency=payload.currency,
        merchant_name=payload.merchant_name,
        customer_name=payload.customer_name,
    )

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case file not found or invalid event type/date",
        )

    return TimelineEventResponse(**event)


@router.put("/event/{event_id}", response_model=TimelineEventResponse)
def update_timeline_event(
    event_id: int,
    payload: UpdateEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing timeline event.
    """
    service = TimelineService(db)
    event = service.update_timeline_event(
        event_id=event_id,
        event_date=payload.event_date,
        title=payload.title,
        description=payload.description,
        sequence_order=payload.sequence_order,
    )

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timeline event {event_id} not found",
        )

    return TimelineEventResponse(**event)


@router.delete("/event/{event_id}")
def delete_timeline_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a timeline event.
    """
    service = TimelineService(db)
    success = service.delete_timeline_event(event_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timeline event {event_id} not found",
        )

    return {"success": True, "message": f"Timeline event {event_id} deleted"}


# --------------- Timeline Analysis Endpoints ---------------

@router.post("/case-file/{case_file_id}/analyze", response_model=TimelineAnalysis)
def analyze_timeline(
    case_file_id: int,
    gap_threshold_days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get comprehensive timeline analysis including summary and detected gaps.
    """
    service = TimelineService(db)
    analysis = service.get_timeline_analysis(case_file_id)

    # Convert summary and gaps to response models
    summary_response = TimelineSummary(**analysis["summary"])
    gaps_response = [TimelineGap(**gap) for gap in analysis["gaps"]]

    return TimelineAnalysis(
        summary=summary_response,
        gaps=gaps_response,
        has_gaps=analysis["has_gaps"],
        gap_count=analysis["gap_count"],
    )


@router.post("/case-file/{case_file_id}/detect-gaps", response_model=list[TimelineGap])
def detect_timeline_gaps(
    case_file_id: int,
    payload: TimelineGapDetectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Detect significant gaps in the timeline.
    """
    service = TimelineService(db)
    gaps = service.detect_timeline_gaps(
        case_file_id=case_file_id,
        gap_threshold_days=payload.gap_threshold_days,
    )

    return [TimelineGap(**gap) for gap in gaps]


# --------------- Timeline Ordering Endpoints ---------------

@router.post("/reorder")
def reorder_timeline_events(
    payload: ReorderTimelineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reorder timeline events based on provided ID sequence.
    """
    service = TimelineService(db)
    success = service.reorder_timeline_events(
        case_file_id=payload.case_file_id,
        event_ids=payload.event_ids,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reorder events. Check that all event IDs belong to the case file.",
        )

    return {"success": True, "message": "Timeline events reordered successfully"}


@router.post("/case-file/{case_file_id}/auto-reorder")
def auto_reorder_timeline(
    case_file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Automatically reorder timeline events by date.
    """
    service = TimelineService(db)
    count = service.auto_reorder_timeline(case_file_id)

    return {
        "success": True,
        "message": f"Auto-reordered {count} timeline events by date",
        "events_reordered": count,
    }
