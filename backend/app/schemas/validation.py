"""
Pydantic schemas for evidence validation and completeness checks.
"""

from datetime import datetime
from typing import Optional, List, Any, Dict

from pydantic import BaseModel, Field


class ValidationResponse(BaseModel):
    """Response schema for a single validation record."""

    id: int
    validation_id: str
    case_file_id: int
    category: str
    severity: str
    title: str
    description: Optional[str] = None
    detail: Optional[str] = None
    suggestion: Optional[str] = None
    evidence_id: Optional[int] = None
    evidence_type: Optional[str] = None
    conflicting_evidence_id: Optional[int] = None
    conflicting_field: Optional[str] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ValidationSummary(BaseModel):
    """Validation summary statistics."""

    total: int
    resolved: int
    unresolved: int
    by_category: Dict[str, int] = {}
    by_severity: Dict[str, int] = {}


class ValidationListResponse(BaseModel):
    """Response containing a list of validation records."""

    case_file_id: int
    validations: List[ValidationResponse] = []
    summary: ValidationSummary


class ResolveValidationRequest(BaseModel):
    """Request to resolve a validation."""

    resolution_notes: Optional[str] = Field(None, description="Notes about the resolution")


class ReopenValidationRequest(BaseModel):
    """Request to reopen a validation - empty body."""


class ValidateCaseFileRequest(BaseModel):
    """Request to trigger validation for a case file."""

    case_file_id: Optional[int] = Field(None, description="Primary key of the case file")
    dispute_id: Optional[int] = Field(None, description="Primary key of the dispute")
    clear_existing: bool = Field(True, description="Clear existing validations first")


class ValidateCaseFileResponse(BaseModel):
    """Response after validation is triggered."""

    success: bool
    message: str
    case_file_id: Optional[int] = None
    case_file_ref: Optional[str] = None
    validation_completed: bool = False
    total_validations: int = 0
    resolved: int = 0
    unresolved: int = 0
    by_category: Dict[str, int] = {}
    by_severity: Dict[str, int] = {}


class ValidationAnalysis(BaseModel):
    """Comprehensive validation analysis."""

    summary: ValidationSummary
    critical_issues: List[ValidationResponse] = []
    has_critical_issues: bool
    critical_issue_count: int


class CompletenessAnalysis(BaseModel):
    """Evidence completeness analysis from AI."""

    case_file_id: int
    evidence_count: int
    completeness_score: float
    analysis: str
    recommendations: List[str] = []


class AISuggestion(BaseModel):
    """AI-generated suggestion for a validation issue."""

    validation_id: int
    validation_ref: str
    suggestion: str
    priority: str
    action_items: List[str] = []
    confidence: float


class GenerateAISuggestionsRequest(BaseModel):
    """Request to generate AI suggestions."""

    case_file_id: int = Field(..., description="Primary key of the case file")
    validation_ids: Optional[List[int]] = Field(None, description="Specific validation IDs (optional)")


class ValidationFilterRequest(BaseModel):
    """Request to filter validations."""

    resolved_only: bool = False
    unresolved_only: bool = False
    category: Optional[str] = None
    severity: Optional[str] = None
