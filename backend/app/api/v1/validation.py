"""
API endpoints for evidence validation and completeness checks.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.validation_service import ValidationService
from app.schemas.validation import (
    ValidationResponse,
    ValidationSummary,
    ValidationListResponse,
    ResolveValidationRequest,
    ReopenValidationRequest,
    ValidateCaseFileRequest,
    ValidateCaseFileResponse,
    ValidationAnalysis,
    CompletenessAnalysis,
    AISuggestion,
    GenerateAISuggestionsRequest,
    ValidationFilterRequest,
)

router = APIRouter(prefix="/validation", tags=["Evidence Validation"])


# --------------- Validation Orchestration Endpoints ---------------

@router.post("/validate", response_model=ValidateCaseFileResponse)
def validate_case_file(
    payload: ValidateCaseFileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger the Evidence Completeness Agent to validate evidence
    for missing documents, contradictions, and incomplete submissions.

    Provide either case_file_id or dispute_id to identify the case.
    """
    service = ValidationService(db)

    # Determine which ID to use
    if payload.case_file_id:
        result = service.validate_case_file(
            case_file_id=payload.case_file_id,
            clear_existing=payload.clear_existing,
        )
    elif payload.dispute_id:
        result = service.validate_for_dispute(
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

    return ValidateCaseFileResponse(
        success=True,
        message="Validation completed successfully",
        **result,
    )


# --------------- Validation Retrieval Endpoints ---------------

@router.get("/case-file/{case_file_id}", response_model=ValidationListResponse)
def get_validations(
    case_file_id: int,
    resolved_only: bool = False,
    unresolved_only: bool = False,
    category: str = None,
    severity: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get validation records for a case file with optional filters.
    """
    service = ValidationService(db)
    validation_data = service.get_validations_for_case_file(
        case_file_id=case_file_id,
        resolved_only=resolved_only,
        unresolved_only=unresolved_only,
        category=category,
        severity=severity,
    )

    return ValidationListResponse(**validation_data)


@router.get("/validation/{validation_id}", response_model=ValidationResponse)
def get_validation(
    validation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a single validation record by ID.
    """
    service = ValidationService(db)
    validation = service.get_validation(validation_id)

    if not validation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Validation {validation_id} not found",
        )

    return ValidationResponse(**validation)


@router.get("/case-file/{case_file_id}/category/{category}", response_model=list[ValidationResponse])
def get_validations_by_category(
    case_file_id: int,
    category: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get validation records of a specific category for a case file.
    """
    service = ValidationService(db)
    validations = service.get_validations_by_category(case_file_id, category)

    return [ValidationResponse(**v) for v in validations]


@router.get("/case-file/{case_file_id}/severity/{severity}", response_model=list[ValidationResponse])
def get_validations_by_severity(
    case_file_id: int,
    severity: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get validation records of a specific severity for a case file.
    """
    service = ValidationService(db)
    validations = service.get_validations_by_severity(case_file_id, severity)

    return [ValidationResponse(**v) for v in validations]


@router.get("/case-file/{case_file_id}/critical", response_model=list[ValidationResponse])
def get_critical_validations(
    case_file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all critical and error severity validations for a case file.
    """
    service = ValidationService(db)
    validations = service.get_critical_validations(case_file_id)

    return [ValidationResponse(**v) for v in validations]


# --------------- Validation Resolution Endpoints ---------------

@router.post("/validation/{validation_id}/resolve", response_model=ValidationResponse)
def resolve_validation(
    validation_id: int,
    payload: ResolveValidationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a validation as resolved.
    """
    service = ValidationService(db)
    validation = service.resolve_validation(
        validation_id=validation_id,
        resolved_by=current_user.email if current_user else "system",
        resolution_notes=payload.resolution_notes,
    )

    if not validation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Validation {validation_id} not found",
        )

    return ValidationResponse(**validation)


@router.post("/validation/{validation_id}/reopen", response_model=ValidationResponse)
def reopen_validation(
    validation_id: int,
    payload: ReopenValidationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reopen a previously resolved validation.
    """
    service = ValidationService(db)
    validation = service.reopen_validation(validation_id)

    if not validation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Validation {validation_id} not found",
        )

    return ValidationResponse(**validation)


@router.delete("/validation/{validation_id}")
def delete_validation(
    validation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a validation record.
    """
    service = ValidationService(db)
    success = service.delete_validation(validation_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Validation {validation_id} not found",
        )

    return {"success": True, "message": f"Validation {validation_id} deleted"}


# --------------- Validation Analysis Endpoints ---------------

@router.get("/case-file/{case_file_id}/summary", response_model=ValidationSummary)
def get_validation_summary(
    case_file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get validation summary statistics for a case file.
    """
    service = ValidationService(db)
    summary = service.get_validation_summary(case_file_id)

    return ValidationSummary(**summary)


@router.get("/case-file/{case_file_id}/analyze", response_model=ValidationAnalysis)
def analyze_validations(
    case_file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get comprehensive validation analysis including summary and critical issues.
    """
    service = ValidationService(db)
    analysis = service.get_validation_analysis(case_file_id)

    return ValidationAnalysis(**analysis)


# --------------- AI-Powered Analysis Endpoints ---------------

@router.get("/case-file/{case_file_id}/completeness", response_model=CompletenessAnalysis)
def analyze_evidence_completeness(
    case_file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze overall evidence completeness using AI.
    """
    service = ValidationService(db)
    analysis = service.analyze_evidence_completeness(case_file_id)

    return CompletenessAnalysis(**analysis)


@router.post("/ai-suggestions", response_model=list[AISuggestion])
def generate_ai_suggestions(
    payload: GenerateAISuggestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate AI-powered suggestions for validation issues using Groq API.
    """
    service = ValidationService(db)
    suggestions = service.generate_ai_suggestions(
        case_file_id=payload.case_file_id,
        validation_ids=payload.validation_ids,
    )

    return [AISuggestion(**s) for s in suggestions]
