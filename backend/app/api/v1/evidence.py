"""
API endpoints for evidence collection and case file management.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.evidence_service import EvidenceService
from app.schemas.evidence import (
    CollectEvidenceRequest,
    CollectEvidenceResponse,
    CaseFileResponse,
    CaseFileDetailResponse,
    EvidenceItemResponse,
    EvidenceListResponse,
)

router = APIRouter(prefix="/evidence", tags=["Evidence Collection"])


@router.post("/collect", response_model=CollectEvidenceResponse)
def collect_evidence(
    payload: CollectEvidenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger the Evidence Collection Agent to automatically collect
    all dispute-related evidence from existing systems.
    """
    service = EvidenceService(db)
    result = service.collect_evidence_for_dispute(payload.dispute_id)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"],
        )

    # Convert case_file to response if present
    case_file_response = None
    if result["case_file"]:
        evidence_count = result["evidence_count"]
        case_file_obj = result["case_file"]
        case_file_response = CaseFileResponse(
            id=case_file_obj.id,
            case_file_id=case_file_obj.case_file_id,
            dispute_id=case_file_obj.dispute_id,
            status=case_file_obj.status.value if case_file_obj.status else "draft",
            investigation_summary=case_file_obj.investigation_summary,
            confidence_score=case_file_obj.confidence_score,
            submitted_at=case_file_obj.submitted_at,
            created_at=case_file_obj.created_at,
            updated_at=case_file_obj.updated_at,
            evidence_count=evidence_count,
        )

    return CollectEvidenceResponse(
        success=True,
        message=result["message"],
        case_file=case_file_response,
        evidence_count=result["evidence_count"],
    )


@router.post("/upload", response_model=CollectEvidenceResponse)
async def upload_evidence(
    dispute_id: int = Form(...),
    title: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload an evidence file and attach it to a dispute's case file.
    The file is stored in Cloudinary and recorded in the Evidence Repository.
    """
    service = EvidenceService(db)
    result = await service.upload_evidence_file(
        dispute_id=dispute_id,
        file=file,
        title=title,
        description=description,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"],
        )

    evidence = result["evidence"]
    return CollectEvidenceResponse(
        success=True,
        message=result["message"],
        evidence_count=1,
    )


@router.get("/case-file/{dispute_id}", response_model=CaseFileDetailResponse)
def get_case_file(
    dispute_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the case file and all evidence items for a given dispute.
    """
    service = EvidenceService(db)
    case_file = service.get_case_file_by_dispute(dispute_id)

    if not case_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No case file found for dispute {dispute_id}",
        )

    evidence_items = service.get_evidence_for_case(case_file.id)

    evidence_responses = [
        EvidenceItemResponse(
            id=e.id,
            evidence_id=e.evidence_id,
            evidence_type=e.evidence_type.value if e.evidence_type else "unknown",
            source=e.source.value if e.source else "unknown",
            status=e.status.value if e.status else "unknown",
            title=e.title,
            description=e.description,
            source_table=e.source_table,
            source_external_id=e.source_external_id,
            event_date=e.event_date,
            collected_at=e.collected_at,
            merchant_name=e.merchant_name,
            customer_name=e.customer_name,
            amount=float(e.amount) if e.amount else None,
            currency=e.currency,
            transaction_id_ref=e.transaction_id_ref,
            order_id_ref=e.order_id_ref,
            file_url=e.file_url,
            file_type=e.file_type,
            is_processed=e.is_processed,
        )
        for e in evidence_items
    ]

    return CaseFileDetailResponse(
        id=case_file.id,
        case_file_id=case_file.case_file_id,
        dispute_id=case_file.dispute_id,
        status=case_file.status.value if case_file.status else "draft",
        investigation_summary=case_file.investigation_summary,
        confidence_score=case_file.confidence_score,
        submitted_at=case_file.submitted_at,
        created_at=case_file.created_at,
        updated_at=case_file.updated_at,
        evidence_count=len(evidence_items),
        evidence_items=evidence_responses,
    )


@router.get("/list/{case_file_id}", response_model=EvidenceListResponse)
def list_evidence(
    case_file_id: int,
    evidence_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all evidence items for a case file, optionally filtered by type.
    """
    service = EvidenceService(db)

    if evidence_type:
        items = service.get_evidence_by_type(case_file_id, evidence_type)
    else:
        items = service.get_evidence_for_case(case_file_id)

    evidence_responses = [
        EvidenceItemResponse(
            id=e.id,
            evidence_id=e.evidence_id,
            evidence_type=e.evidence_type.value if e.evidence_type else "unknown",
            source=e.source.value if e.source else "unknown",
            status=e.status.value if e.status else "unknown",
            title=e.title,
            description=e.description,
            source_table=e.source_table,
            source_external_id=e.source_external_id,
            event_date=e.event_date,
            collected_at=e.collected_at,
            merchant_name=e.merchant_name,
            customer_name=e.customer_name,
            amount=float(e.amount) if e.amount else None,
            currency=e.currency,
            transaction_id_ref=e.transaction_id_ref,
            order_id_ref=e.order_id_ref,
            file_url=e.file_url,
            file_type=e.file_type,
            is_processed=e.is_processed,
        )
        for e in items
    ]

    return EvidenceListResponse(
        items=evidence_responses,
        total=len(evidence_responses),
    )