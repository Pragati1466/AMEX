"""
Pydantic schemas for evidence collection and case file management.
"""

from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, Field


class EvidenceItemResponse(BaseModel):
    """Response schema for a single evidence item."""

    id: int
    evidence_id: str
    evidence_type: str
    source: str
    status: str
    title: Optional[str] = None
    description: Optional[str] = None
    content_text: Optional[str] = None
    source_table: Optional[str] = None
    source_external_id: Optional[str] = None
    event_date: Optional[datetime] = None
    collected_at: datetime
    merchant_name: Optional[str] = None
    customer_name: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    transaction_id_ref: Optional[str] = None
    order_id_ref: Optional[str] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    is_processed: bool
    processing_notes: Optional[str] = None

    model_config = {"from_attributes": True}


class CaseFileResponse(BaseModel):
    """Response schema for a case file."""

    id: int
    case_file_id: str
    dispute_id: int
    status: str
    investigation_summary: Optional[str] = None
    confidence_score: Optional[float] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    evidence_count: Optional[int] = None

    model_config = {"from_attributes": True}


class CaseFileDetailResponse(CaseFileResponse):
    """Detailed case file response with evidence items."""

    evidence_items: list[EvidenceItemResponse] = []


class CollectEvidenceRequest(BaseModel):
    """Request to trigger evidence collection for a dispute."""

    dispute_id: int = Field(..., description="Primary key of the dispute to investigate")


class CollectEvidenceResponse(BaseModel):
    """Response after evidence collection is triggered."""

    success: bool
    message: str
    case_file: Optional[CaseFileResponse] = None
    evidence_count: int = 0


class UploadEvidenceRequest(BaseModel):
    """Request metadata for uploading evidence files."""

    dispute_id: int
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    evidence_type: str = "uploaded_document"


class EvidenceListResponse(BaseModel):
    """Response containing a list of evidence items."""

    items: list[EvidenceItemResponse]
    total: int


class ExtractedEntitiesResponse(BaseModel):
    """Response schema for extracted entities."""

    evidence_id: int
    evidence_ref: str
    is_processed: bool
    merchant_name: Optional[str] = None
    customer_name: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    transaction_id_ref: Optional[str] = None
    order_id_ref: Optional[str] = None
    content_json: Optional[dict] = None
    processing_notes: Optional[str] = None

    model_config = {"from_attributes": True}


class BatchExtractionResult(BaseModel):
    """Response schema for batch entity extraction."""

    total: int
    processed: int
    skipped: int
    errors: int
    details: list[dict] = []


class EntityExtractionRequest(BaseModel):
    """Request to trigger entity extraction."""

    evidence_id: Optional[int] = None
    evidence_ref: Optional[str] = None
    case_file_id: Optional[int] = None
    re_extract: bool = False
