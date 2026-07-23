"""
Pydantic schemas for timeline reconstruction and management.
"""

from datetime import datetime
from typing import Optional, List, Any, Dict

from pydantic import BaseModel, Field


class TimelineEventResponse(BaseModel):
    """Response schema for a single timeline event."""

    id: int
    event_id: str
    event_type: str
    event_date: Optional[datetime] = None
    title: str
    description: Optional[str] = None
    sequence_order: int
    amount: Optional[float] = None
    currency: Optional[str] = None
    merchant_name: Optional[str] = None
    customer_name: Optional[str] = None
    evidence_id: Optional[int] = None
    source_table: Optional[str] = None
    source_record_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TimelineEventCompact(BaseModel):
    """Compact timeline event response for list views."""

    id: int
    event_id: str
    event_type: str
    event_date: Optional[datetime] = None
    title: str
    sequence_order: int
    amount: Optional[float] = None
    currency: Optional[str] = None

    model_config = {"from_attributes": True}


class TimelineResponse(BaseModel):
    """Response schema for a complete timeline."""

    case_file_id: int
    events: List[TimelineEventCompact] = []
    summary: Optional[Dict[str, Any]] = None


class TimelineSummary(BaseModel):
    """Timeline summary statistics."""

    total_events: int
    date_range: Optional[Dict[str, Optional[str]]] = None
    event_types: Dict[str, int] = {}
    key_events: List[Dict[str, Any]] = []


class TimelineGap(BaseModel):
    """Detected gap in the timeline."""

    after_event: str
    before_event: str
    after_date: str
    before_date: str
    gap_days: int
    severity: str


class TimelineAnalysis(BaseModel):
    """Comprehensive timeline analysis."""

    summary: TimelineSummary
    gaps: List[TimelineGap] = []
    has_gaps: bool
    gap_count: int


class ManualEventRequest(BaseModel):
    """Request to add a manual timeline event."""

    case_file_id: int = Field(..., description="Primary key of the case file")
    event_type: str = Field(..., description="Timeline event type")
    event_date: str = Field(..., description="ISO format date string")
    title: str = Field(..., min_length=1, max_length=500, description="Event title")
    description: Optional[str] = Field(None, description="Event description")
    amount: Optional[float] = Field(None, ge=0, description="Amount if applicable")
    currency: Optional[str] = Field(None, max_length=3, description="Currency code")
    merchant_name: Optional[str] = Field(None, max_length=255, description="Merchant name")
    customer_name: Optional[str] = Field(None, max_length=255, description="Customer name")


class UpdateEventRequest(BaseModel):
    """Request to update a timeline event."""

    event_date: Optional[str] = Field(None, description="ISO format date string")
    title: Optional[str] = Field(None, min_length=1, max_length=500, description="Event title")
    description: Optional[str] = Field(None, description="Event description")
    sequence_order: Optional[int] = Field(None, ge=1, description="New sequence order")


class ReconstructTimelineRequest(BaseModel):
    """Request to trigger timeline reconstruction."""

    case_file_id: Optional[int] = Field(None, description="Primary key of the case file")
    dispute_id: Optional[int] = Field(None, description="Primary key of the dispute")
    clear_existing: bool = Field(True, description="Clear existing timeline events first")


class ReconstructTimelineResponse(BaseModel):
    """Response after timeline reconstruction."""

    success: bool
    message: str
    case_file_id: Optional[int] = None
    case_file_ref: Optional[str] = None
    timeline_reconstructed: bool = False
    total_events: int = 0
    date_range: Optional[Dict[str, Optional[str]]] = None
    event_types: Dict[str, int] = {}


class ReorderTimelineRequest(BaseModel):
    """Request to reorder timeline events."""

    case_file_id: int = Field(..., description="Primary key of the case file")
    event_ids: List[int] = Field(..., description="List of event IDs in desired order")


class TimelineGapDetectionRequest(BaseModel):
    """Request to detect timeline gaps."""

    case_file_id: int = Field(..., description="Primary key of the case file")
    gap_threshold_days: int = Field(7, ge=1, description="Minimum gap in days to flag")


class TimelineEventListResponse(BaseModel):
    """Response containing a list of timeline events."""

    case_file_id: int
    total: int
    events: List[TimelineEventCompact] = []
