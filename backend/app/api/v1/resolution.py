"""Module 3 Resolution & Collaboration API endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token, get_current_user
from app.models.user import User
from app.services.resolution_service import ResolutionService
from app.services.resolution_ws import resolution_ws_manager
from app.schemas.resolution import (
    ResolutionDashboardResponse,
    ResolutionStateResponse,
    EvidenceRecommendationResponse,
    GenerateRecommendationsResponse,
    RescoreRequest,
    RescoreResponse,
    RescoringHistoryItem,
    ResolutionRecommendationResponse,
    ResolutionReportResponse,
    FinalDecisionView,
    AuditLogItem,
    NotificationItem,
    DecisionApproveRequest,
    DecisionRejectRequest,
    DecisionModifyRequest,
    SubmitEvidenceRequest,
)

router = APIRouter(prefix="/resolution", tags=["Resolution & Collaboration"])


def _get_service(db: Session = Depends(get_db)) -> ResolutionService:
    return ResolutionService(db)


def _require_investigator(current_user: User = Depends(get_current_user)) -> User:
    if not ResolutionService.is_investigator(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Investigator access required")
    return current_user


@router.get("/{case_id}/dashboard", response_model=ResolutionDashboardResponse)
def get_dashboard(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get complete resolution dashboard for a case."""
    service = ResolutionService(db)
    include_sensitive = ResolutionService.is_investigator(current_user)
    dashboard = service.get_dashboard(case_id, include_sensitive=include_sensitive)
    if not dashboard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return dashboard


@router.get("/{case_id}", response_model=ResolutionStateResponse)
def get_resolution_state(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current resolution state."""
    service = ResolutionService(db)
    state = service.get_state(case_id)
    if not state:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return state


@router.get("/{case_id}/evidence-recommendations", response_model=list[EvidenceRecommendationResponse])
def get_evidence_recommendations(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get evidence recommendations for a case."""
    service = ResolutionService(db)
    dispute = service._resolve_case_id(case_id)
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return service.get_evidence_recommendations(case_id)


@router.post("/{case_id}/evidence-recommendations/generate", response_model=GenerateRecommendationsResponse)
def generate_evidence_recommendations(
    case_id: int,
    refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate or refresh evidence recommendations."""
    service = ResolutionService(db)
    result = service.generate_evidence_recommendations(case_id, refresh=refresh)
    if not result.success and result.total == 0:
        dispute = service._resolve_case_id(case_id)
        if not dispute:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return result


@router.post("/{case_id}/evidence")
async def submit_evidence(
    case_id: int,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    submitted_by_role: str = Form("investigator"),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit additional evidence for a case."""
    service = ResolutionService(db)
    result = await service.submit_evidence(
        case_id=case_id,
        title=title,
        description=description,
        file=file,
        actor=current_user,
        submitted_by_role=submitted_by_role,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if "not found" in result.get("message", "").lower() else status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Evidence submission failed"),
        )
    return result


@router.post("/{case_id}/rescore", response_model=RescoreResponse)
async def trigger_rescore(
    case_id: int,
    payload: RescoreRequest = RescoreRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger re-scoring for a case."""
    service = ResolutionService(db)
    result = await service.trigger_rescore(
        case_id=case_id,
        reason=payload.reason or "manual_trigger",
        triggering_evidence_id=payload.triggering_evidence_id,
        actor=current_user,
    )
    if not result.success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result.message)
    return result


@router.get("/{case_id}/rescore-history", response_model=list[RescoringHistoryItem])
def get_rescore_history(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get re-scoring history."""
    service = ResolutionService(db)
    dispute = service._resolve_case_id(case_id)
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return service.get_rescore_history(case_id)


@router.get("/{case_id}/recommendation", response_model=ResolutionRecommendationResponse)
def get_recommendation(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get resolution recommendation package."""
    service = ResolutionService(db)
    rec = service.get_recommendation(case_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return rec


@router.post("/{case_id}/report", response_model=ResolutionReportResponse)
def generate_report(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_investigator),
):
    """Generate resolution report."""
    service = ResolutionService(db)
    report = service.generate_report(case_id, actor=current_user)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return report


@router.post("/{case_id}/decision/approve", response_model=FinalDecisionView)
async def approve_decision(
    case_id: int,
    payload: DecisionApproveRequest = DecisionApproveRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_investigator),
):
    """Investigator approves AI recommendation as final decision."""
    service = ResolutionService(db)
    decision = await service.approve_decision(case_id, payload.rationale, current_user)
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve — case not found or AI recommendation unavailable",
        )
    return decision


@router.post("/{case_id}/decision/reject", response_model=FinalDecisionView)
async def reject_decision(
    case_id: int,
    payload: DecisionRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_investigator),
):
    """Investigator rejects AI recommendation."""
    service = ResolutionService(db)
    decision = await service.reject_decision(case_id, payload.rationale, current_user)
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return decision


@router.post("/{case_id}/decision/modify", response_model=FinalDecisionView)
async def modify_decision(
    case_id: int,
    payload: DecisionModifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_investigator),
):
    """Investigator modifies and records final decision."""
    service = ResolutionService(db)
    decision = await service.modify_decision(case_id, payload.outcome, payload.rationale, current_user)
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return decision


@router.get("/{case_id}/decision", response_model=FinalDecisionView)
def get_final_decision(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get active final decision."""
    service = ResolutionService(db)
    decision = service.get_final_decision(case_id)
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No final decision recorded")
    return decision


@router.get("/{case_id}/report", response_model=ResolutionReportResponse)
def get_report(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get latest resolution report."""
    service = ResolutionService(db)
    report = service.get_report(case_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No resolution report found")
    return report


@router.get("/{case_id}/audit", response_model=list[AuditLogItem])
def get_audit_history(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_investigator),
):
    """Get resolution audit history."""
    service = ResolutionService(db)
    dispute = service._resolve_case_id(case_id)
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return service.get_audit_history(case_id)


@router.get("/{case_id}/notifications", response_model=list[NotificationItem])
def get_notifications(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notifications for a case."""
    service = ResolutionService(db)
    dispute = service._resolve_case_id(case_id)
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return service.get_notifications(case_id)


@router.post("/{case_id}/notifications/{notification_id}/read")
def mark_notification_read(
    case_id: int,
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read."""
    service = ResolutionService(db)
    dispute = service._resolve_case_id(case_id)
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    notif = service.mark_notification_read(notification_id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"success": True, "message": "Notification marked as read"}


@router.get("/{case_id}/collaboration-events", response_model=list[CollaborationEventResponse])
def get_collaboration_events(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get collaboration events for a case."""
    service = ResolutionService(db)
    dispute = service._resolve_case_id(case_id)
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")
    return service.get_collaboration_events(case_id)


@router.websocket("/ws/{case_id}")
async def resolution_websocket(websocket: WebSocket, case_id: int, db: Session = Depends(get_db)):
    """WebSocket endpoint for live resolution updates with JWT authentication."""
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
        return

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token payload")
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token")
        return

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found or inactive")
        return

    service = ResolutionService(db)
    dispute = service._resolve_case_id(case_id)
    if not dispute:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Case not found")
        return

    if not ResolutionService.is_investigator(user):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Insufficient permissions")
        return

    await resolution_ws_manager.connect(case_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        resolution_ws_manager.disconnect(case_id, websocket)
    except Exception:
        resolution_ws_manager.disconnect(case_id, websocket)
