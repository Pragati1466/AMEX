"""
Pydantic schemas for case file generation and management.
"""

from datetime import datetime
from typing import Optional, List, Any, Dict

from pydantic import BaseModel, Field


class CaseFileResponse(BaseModel):
    """Response schema for a case file."""

    id: int
    case_file_id: str
    dispute_id: int
    status: str
    investigation_summary: Optional[str] = None
    confidence_score: Optional[float] = None
    generated_by: Optional[int] = None
    submitted_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class StandardizedPackage(BaseModel):
    """Standardized investigation package for Module 2 consumption."""

    case_file: Dict[str, Any]
    timeline: List[Dict[str, Any]] = []
    evidence: List[Dict[str, Any]] = []
    validations: List[Dict[str, Any]] = []
    policy_mapping: List[Dict[str, Any]] = []
    investigation_summary: Optional[str] = None
    confidence_score: Optional[float] = None


class GenerateCaseFileRequest(BaseModel):
    """Request to trigger case file generation."""

    case_file_id: Optional[int] = Field(None, description="Primary key of the case file")
    dispute_id: Optional[int] = Field(None, description="Primary key of the dispute")


class GenerateCaseFileResponse(BaseModel):
    """Response after case file generation."""

    success: bool
    message: str
    case_file_id: Optional[int] = None
    case_file_ref: Optional[str] = None
    dispute_id: Optional[int] = None
    status: str
    investigation_summary: Optional[str] = None
    confidence_score: Optional[float] = None
    package: Optional[StandardizedPackage] = None


class UpdateCaseFileStatusRequest(BaseModel):
    """Request to update case file status."""

    status: str = Field(..., description="New status value")
    submitted_at: Optional[datetime] = Field(None, description="Submission timestamp")


class ConfidenceScoreBreakdown(BaseModel):
    """Confidence score component breakdown."""

    evidence_completeness: float
    timeline_quality: float
    validation_status: float
    policy_mapping: float
    evidence_processing: float


class ConfidenceAnalysis(BaseModel):
    """Detailed confidence score analysis."""

    overall_score: float
    components: ConfidenceScoreBreakdown
    recommendations: List[str] = []


class CaseFileListResponse(BaseModel):
    """Response containing a list of case files."""

    case_files: List[CaseFileResponse] = []
    total: int


class EvidenceComponent(BaseModel):
    """Evidence component in the package."""

    id: int
    evidence_id: str
    type: str
    title: str
    description: Optional[str] = None
    status: str
    merchant_name: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    event_date: Optional[str] = None


class TimelineComponent(BaseModel):
    """Timeline component in the package."""

    id: int
    event_id: str
    type: str
    date: Optional[str] = None
    title: str
    description: Optional[str] = None
    sequence_order: int


class ValidationComponent(BaseModel):
    """Validation component in the package."""

    id: int
    validation_id: str
    category: str
    severity: str
    title: str
    description: Optional[str] = None
    is_resolved: bool


class PolicyMappingComponent(BaseModel):
    """Policy mapping component in the package."""

    id: int
    mapping_id: str
    match_type: str
    relevance_score: Optional[float] = None
    explanation: Optional[str] = None
    is_applicable: bool
