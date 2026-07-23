"""
API endpoints for case file generation and management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.case_file_service import CaseFileService
from app.schemas.case_file import (
    CaseFileResponse,
    StandardizedPackage,
    GenerateCaseFileRequest,
    GenerateCaseFileResponse,
    UpdateCaseFileStatusRequest,
    ConfidenceAnalysis,
    ConfidenceScoreBreakdown,
    CaseFileListResponse,
)

router = APIRouter(prefix="/case-file", tags=["Case File Generation"])


# --------------- Case File Generation Endpoints ---------------

@router.post("/generate", response_model=GenerateCaseFileResponse)
def generate_case_file(
    payload: GenerateCaseFileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger the Case File Generator to create the complete investigation package.
    Combines evidence, timeline, validation, and policy mapping into a standardized package.

    Provide either case_file_id or dispute_id to identify the case.
    """
    service = CaseFileService(db)

    # Determine which ID to use
    if payload.case_file_id:
        result = service.generate_case_file(
            case_file_id=payload.case_file_id,
            user_id=current_user.id if current_user else None,
        )
    elif payload.dispute_id:
        result = service.generate_case_file_for_dispute(
            dispute_id=payload.dispute_id,
            user_id=current_user.id if current_user else None,
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

    return GenerateCaseFileResponse(
        success=True,
        message="Case file generated successfully",
        **result,
    )


# --------------- Case File Retrieval Endpoints ---------------

@router.get("/{case_file_id}", response_model=CaseFileResponse)
def get_case_file(
    case_file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a case file by ID.
    """
    service = CaseFileService(db)
    case_file = service.get_case_file(case_file_id)

    if not case_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case file {case_file_id} not found",
        )

    return CaseFileResponse(**case_file)


@router.get("/dispute/{dispute_id}", response_model=CaseFileResponse)
def get_case_file_by_dispute(
    dispute_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a case file by dispute ID.
    """
    service = CaseFileService(db)
    case_file = service.get_case_file_by_dispute_id(dispute_id)

    if not case_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case file for dispute {dispute_id} not found",
        )

    return CaseFileResponse(**case_file)


@router.get("/", response_model=CaseFileListResponse)
def list_case_files(
    status: str = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all case files with optional filtering.
    """
    service = CaseFileService(db)
    case_files = service.get_all_case_files(
        status=status,
        limit=limit,
        offset=offset,
    )

    return CaseFileListResponse(
        case_files=[CaseFileResponse(**cf) for cf in case_files],
        total=len(case_files),
    )


# --------------- Standardized Package Endpoints ---------------

@router.get("/{case_file_id}/package", response_model=StandardizedPackage)
def get_standardized_package(
    case_file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the standardized investigation package for Module 2 consumption.
    This is the final output that includes evidence, timeline, validation, policies, summary, and confidence score.
    """
    service = CaseFileService(db)
    package = service.get_standardized_package(case_file_id)

    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case file {case_file_id} not found",
        )

    return StandardizedPackage(**package)


@router.get("/dispute/{dispute_id}/package", response_model=StandardizedPackage)
def get_standardized_package_for_dispute(
    dispute_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the standardized package for a dispute.
    """
    service = CaseFileService(db)
    package = service.get_standardized_package_for_dispute(dispute_id)

    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case file for dispute {dispute_id} not found",
        )

    return StandardizedPackage(**package)


# --------------- Case File Status Management ---------------

@router.put("/{case_file_id}/status", response_model=CaseFileResponse)
def update_case_file_status(
    case_file_id: int,
    payload: UpdateCaseFileStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update the status of a case file.
    """
    service = CaseFileService(db)
    case_file = service.update_case_file_status(
        case_file_id=case_file_id,
        status=payload.status,
        submitted_at=payload.submitted_at,
    )

    if not case_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case file {case_file_id} not found",
        )

    return CaseFileResponse(**case_file)


@router.post("/{case_file_id}/submit", response_model=CaseFileResponse)
def submit_case_file(
    case_file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a case file (mark as submitted).
    """
    service = CaseFileService(db)
    case_file = service.submit_case_file(
        case_file_id=case_file_id,
        user_id=current_user.id if current_user else None,
    )

    if not case_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case file {case_file_id} not found",
        )

    return CaseFileResponse(**case_file)


# --------------- Confidence Score Analysis ---------------

@router.get("/{case_file_id}/confidence", response_model=ConfidenceAnalysis)
def get_confidence_analysis(
    case_file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed confidence score analysis for a case file.
    """
    service = CaseFileService(db)
    analysis = service.get_confidence_score_analysis(case_file_id)

    if "error" in analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=analysis["error"],
        )

    return ConfidenceAnalysis(
        overall_score=analysis["overall_score"],
        components=ConfidenceScoreBreakdown(**analysis["components"]),
        recommendations=analysis["recommendations"],
    )
