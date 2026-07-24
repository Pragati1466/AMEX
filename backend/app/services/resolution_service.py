"""Main resolution service orchestrating Module 3 agents."""

import datetime
import uuid
from typing import Any, Optional

from fastapi import UploadFile
from loguru import logger
from sqlalchemy.orm import Session

from app.agents.resolution import (
    LiveFairnessDashboardAgent,
    SmartEvidenceRecommendationAgent,
    RealTimeRescoringAgent,
    ResolutionAgent,
)
from app.models.existing import Dispute, DisputeStatus
from app.models.new import CaseFile
from app.models.resolution import (
    FinalDecision, FinalDecisionType, ResolutionReport,
    ResolutionState, ResolutionReadiness, RecommendationStatus,
    NotificationEventType, ResolutionAuditEventType,
    CollaborationEvent,
)
from app.models.user import User, UserRole
from app.services.evidence_service import EvidenceService
from app.services.notification_service import NotificationService
from app.services.resolution_audit_service import ResolutionAuditService
from app.services.resolution_ws import resolution_ws_manager
from app.schemas.resolution import (
    ResolutionDashboardResponse, ResolutionStateResponse,
    EvidenceRecommendationResponse, RescoringHistoryItem,
    FinalDecisionView, ResolutionReportResponse,
    ResolutionRecommendationResponse, GenerateRecommendationsResponse,
    RescoreResponse,
)


class ResolutionService:
    """Orchestrates Module 3 resolution workflows."""

    def __init__(self, db: Session):
        self.db = db
        self.dashboard_agent = LiveFairnessDashboardAgent(db)
        self.evidence_agent = SmartEvidenceRecommendationAgent(db)
        self.rescoring_agent = RealTimeRescoringAgent(db)
        self.resolution_agent = ResolutionAgent(db)
        self.notification_service = NotificationService(db)
        self.audit_service = ResolutionAuditService(db)
        self.evidence_service = EvidenceService(db)

    def _resolve_case_id(self, case_id: int) -> Optional[Dispute]:
        dispute = self.dashboard_agent.get_dispute(case_id)
        if dispute:
            return dispute
        return self.db.query(Dispute).filter(Dispute.dispute_id == str(case_id)).first()

    def _ensure_state(self, dispute_id: int) -> ResolutionState:
        state = self.dashboard_agent.get_state(dispute_id)
        if state:
            return state
        case_file = self.dashboard_agent.get_case_file(dispute_id)
        state, _ = self.rescoring_agent.rescore(dispute_id, reason="initial_scoring", force_fallback=True)
        return state

    async def _broadcast(self, case_id: int, event: str, data: dict[str, Any]) -> None:
        try:
            await resolution_ws_manager.broadcast_to_case(case_id, event, data)
        except Exception as exc:
            logger.warning(f"WebSocket broadcast failed: {exc}")

    def get_state(self, case_id: int) -> Optional[ResolutionStateResponse]:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return None
        state = self._ensure_state(dispute.id)
        return self.dashboard_agent.build_state_response(dispute, state)

    def get_dashboard(self, case_id: int, include_sensitive: bool = True) -> Optional[ResolutionDashboardResponse]:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return None
        state = self._ensure_state(dispute.id)
        dashboard = self.dashboard_agent.build_dashboard(dispute.id, state, include_audit=include_sensitive)
        if not include_sensitive:
            dashboard.audit_history = []
            dashboard.ai_recommendation.rationale = None
        return dashboard

    def get_evidence_recommendations(self, case_id: int) -> list[EvidenceRecommendationResponse]:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return []
        from app.models.resolution import EvidenceRecommendation
        recs = (
            self.db.query(EvidenceRecommendation)
            .filter(EvidenceRecommendation.dispute_id == dispute.id)
            .all()
        )
        return [
            EvidenceRecommendationResponse(
                id=r.id, recommendation_id=r.recommendation_id, case_id=dispute.id,
                evidence_type=r.evidence_type, description=r.description, reason=r.reason,
                priority=r.priority, requested_from=r.requested_from, status=r.status,
                created_at=r.created_at, resolved_at=r.resolved_at,
            )
            for r in recs
        ]

    def generate_evidence_recommendations(self, case_id: int, refresh: bool = False) -> GenerateRecommendationsResponse:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return GenerateRecommendationsResponse(success=False, message="Case not found", recommendations=[], total=0)

        recs = self.evidence_agent.generate_recommendations(dispute.id, refresh=refresh)
        self.audit_service.log(
            dispute_id=dispute.id,
            action="evidence_recommendations_generated",
            event_type=ResolutionAuditEventType.RECOMMENDATION_GENERATED,
            new_state={"count": len(recs)},
        )
        responses = [
            EvidenceRecommendationResponse(
                id=r.id, recommendation_id=r.recommendation_id, case_id=dispute.id,
                evidence_type=r.evidence_type, description=r.description, reason=r.reason,
                priority=r.priority, requested_from=r.requested_from, status=r.status,
                created_at=r.created_at, resolved_at=r.resolved_at,
            )
            for r in recs
        ]
        return GenerateRecommendationsResponse(
            success=True,
            message=f"Generated {len(responses)} evidence recommendations",
            recommendations=responses,
            total=len(responses),
        )

    async def request_evidence(
        self,
        case_id: int,
        recommendation_id: str,
        actor: Optional[User] = None,
        submitted_by_role: str = "investigator",
    ) -> Optional[EvidenceRecommendationResponse]:
        """Formally request evidence for a specific recommendation.

        Transitions the recommendation from OPEN to REQUESTED.
        """
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return None

        from app.models.resolution import EvidenceRecommendation, EvidenceRecommendationStatus
        rec = (
            self.db.query(EvidenceRecommendation)
            .filter(
                EvidenceRecommendation.dispute_id == dispute.id,
                EvidenceRecommendation.recommendation_id == recommendation_id,
                EvidenceRecommendation.status == EvidenceRecommendationStatus.OPEN,
            )
            .first()
        )
        if not rec:
            return None

        previous_status = rec.status
        rec.status = EvidenceRecommendationStatus.REQUESTED
        self.db.commit()
        self.db.refresh(rec)

        self.audit_service.log(
            dispute_id=dispute.id,
            action="evidence_recommendation_requested",
            event_type=ResolutionAuditEventType.RECOMMENDATION_CHANGED,
            actor_id=actor.id if actor else None,
            actor_role=submitted_by_role,
            previous_state={"status": previous_status.value},
            new_state={"status": rec.status.value, "recommendation_id": rec.recommendation_id},
        )
        self.notification_service.create(
            dispute_id=dispute.id,
            event_type=NotificationEventType.EVIDENCE_REQUESTED,
            title="Evidence Requested",
            message=f"Evidence requested: {rec.description}",
            user_id=actor.id if actor else None,
        )
        await self._broadcast(dispute.id, "evidence_requested", {
            "recommendation_id": rec.recommendation_id,
            "evidence_type": rec.evidence_type,
            "status": rec.status.value,
        })

        return EvidenceRecommendationResponse(
            id=rec.id, recommendation_id=rec.recommendation_id, case_id=dispute.id,
            evidence_type=rec.evidence_type, description=rec.description, reason=rec.reason,
            priority=rec.priority, requested_from=rec.requested_from, status=rec.status,
            created_at=rec.created_at, resolved_at=rec.resolved_at,
        )

    async def submit_evidence(
        self,
        case_id: int,
        title: str,
        description: Optional[str],
        file: Optional[UploadFile],
        actor: Optional[User] = None,
        submitted_by_role: str = "investigator",
    ) -> dict[str, Any]:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return {"success": False, "message": "Case not found"}

        if file:
            result = await self.evidence_service.upload_evidence_file(
                dispute_id=dispute.id, file=file, title=title, description=description,
            )
        else:
            from app.models.new import EvidenceRepository, EvidenceType, EvidenceSource, EvidenceStatus
            case_file = self.db.query(CaseFile).filter(CaseFile.dispute_id == dispute.id).first()
            if not case_file:
                collect = self.evidence_service.collect_evidence_for_dispute(dispute.id)
                if not collect["success"]:
                    return {"success": False, "message": collect["message"]}
                case_file = collect["case_file"]
            evidence = EvidenceRepository(
                case_file_id=case_file.id,
                evidence_id=f"EV-{uuid.uuid4().hex[:12].upper()}",
                evidence_type=EvidenceType.UPLOADED_DOCUMENT,
                source=EvidenceSource.UPLOAD,
                status=EvidenceStatus.COLLECTED,
                title=title,
                description=description,
            )
            self.db.add(evidence)
            self.db.commit()
            self.db.refresh(evidence)
            result = {"success": True, "message": "Evidence recorded", "evidence": evidence}

        if not result.get("success"):
            return result

        evidence_obj = result.get("evidence")
        ev_id = evidence_obj.id if evidence_obj else None

        collab = CollaborationEvent(
            dispute_id=dispute.id,
            actor_id=actor.id if actor else None,
            actor_role=submitted_by_role,
            event_type="evidence_submitted",
            description=f"Evidence submitted: {title}",
            metadata_json={"evidence_id": ev_id},
        )
        self.db.add(collab)

        self.audit_service.log(
            dispute_id=dispute.id,
            action="evidence_submitted",
            event_type=ResolutionAuditEventType.EVIDENCE_SUBMITTED,
            actor_id=actor.id if actor else None,
            actor_role=submitted_by_role,
            new_state={"title": title, "evidence_id": ev_id},
        )
        self.notification_service.create(
            dispute_id=dispute.id,
            event_type=NotificationEventType.EVIDENCE_SUBMITTED,
            title="Evidence Submitted",
            message=f"New evidence submitted: {title}",
            user_id=actor.id if actor else None,
        )
        self.db.commit()

        # Transition matching evidence recommendations to RESOLVED
        if evidence_obj:
            transitioned = self.evidence_agent.match_and_transition_recommendations(
                dispute_id=dispute.id,
                evidence=evidence_obj,
            )
            for rec in transitioned:
                self.audit_service.log(
                    dispute_id=dispute.id,
                    action="evidence_recommendation_resolved",
                    event_type=ResolutionAuditEventType.RECOMMENDATION_CHANGED,
                    actor_id=actor.id if actor else None,
                    actor_role=submitted_by_role,
                    new_state={
                        "recommendation_id": rec.recommendation_id,
                        "evidence_type": rec.evidence_type,
                        "status": rec.status.value,
                    },
                )
                self.notification_service.create(
                    dispute_id=dispute.id,
                    event_type=NotificationEventType.RECOMMENDATION_CHANGED,
                    title="Evidence Recommendation Resolved",
                    message=f"Recommendation '{rec.description}' resolved by submitted evidence",
                    user_id=actor.id if actor else None,
                )
                await self._broadcast(dispute.id, "recommendation_resolved", {
                    "recommendation_id": rec.recommendation_id,
                    "evidence_type": rec.evidence_type,
                    "status": rec.status.value,
                })

        await self._broadcast(dispute.id, "evidence_submitted", {"title": title, "evidence_id": ev_id})

        state, event = self.rescoring_agent.rescore(dispute.id, reason="new_evidence", triggering_evidence_id=ev_id)
        await self._broadcast(dispute.id, "rescoring_completed", {"event_id": event.event_id})

        return {"success": True, "message": result["message"], "evidence_id": ev_id, "rescoring_event_id": event.event_id}

    async def trigger_rescore(
        self,
        case_id: int,
        reason: str = "manual_trigger",
        triggering_evidence_id: Optional[int] = None,
        actor: Optional[User] = None,
    ) -> RescoreResponse:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return RescoreResponse(success=False, message="Case not found")

        await self._broadcast(dispute.id, "rescoring_started", {"reason": reason})

        self.audit_service.log(
            dispute_id=dispute.id,
            action="rescoring_triggered",
            event_type=ResolutionAuditEventType.RESCORING_TRIGGERED,
            actor_id=actor.id if actor else None,
            actor_role=actor.role.value if actor else None,
            metadata={"reason": reason},
        )

        state, event = self.rescoring_agent.rescore(
            dispute.id, reason=reason, triggering_evidence_id=triggering_evidence_id,
        )

        self.notification_service.create(
            dispute_id=dispute.id,
            event_type=NotificationEventType.RESCORING_COMPLETED,
            title="Re-Scoring Completed",
            message=event.change_summary or "Resolution state updated",
        )

        await self._broadcast(dispute.id, "fairness_score_updated", {
            "fairness_score": state.fairness_score,
            "confidence": state.confidence,
        })
        await self._broadcast(dispute.id, "recommendation_updated", {
            "recommendation": state.ai_recommendation.value if state.ai_recommendation else None,
        })
        await self._broadcast(dispute.id, "rescoring_completed", {"event_id": event.event_id})

        return RescoreResponse(
            success=True,
            message="Re-scoring completed",
            rescoring_event=RescoringHistoryItem(
                id=event.id, event_id=event.event_id,
                previous_fairness_score=event.previous_fairness_score,
                new_fairness_score=event.new_fairness_score,
                score_change=(
                    (event.new_fairness_score - event.previous_fairness_score)
                    if event.new_fairness_score is not None and event.previous_fairness_score is not None else None
                ),
                previous_recommendation=event.previous_recommendation,
                new_recommendation=event.new_recommendation,
                previous_confidence=event.previous_confidence,
                new_confidence=event.new_confidence,
                triggering_evidence_id=event.triggering_evidence_id,
                change_reason=event.change_reason,
                change_summary=event.change_summary,
                timestamp=event.created_at,
                used_module2=event.used_module2,
            ),
            updated_state=self.dashboard_agent.build_state_response(dispute, state),
        )

    def get_rescore_history(self, case_id: int) -> list[RescoringHistoryItem]:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return []
        from app.models.resolution import RescoringEvent
        events = (
            self.db.query(RescoringEvent)
            .filter(RescoringEvent.dispute_id == dispute.id)
            .order_by(RescoringEvent.created_at.desc())
            .all()
        )
        return [
            RescoringHistoryItem(
                id=e.id, event_id=e.event_id,
                previous_fairness_score=e.previous_fairness_score,
                new_fairness_score=e.new_fairness_score,
                score_change=(
                    (e.new_fairness_score - e.previous_fairness_score)
                    if e.new_fairness_score is not None and e.previous_fairness_score is not None else None
                ),
                previous_recommendation=e.previous_recommendation,
                new_recommendation=e.new_recommendation,
                previous_confidence=e.previous_confidence,
                new_confidence=e.new_confidence,
                triggering_evidence_id=e.triggering_evidence_id,
                change_reason=e.change_reason,
                change_summary=e.change_summary,
                timestamp=e.created_at,
                used_module2=e.used_module2,
            )
            for e in events
        ]

    def get_recommendation(self, case_id: int) -> Optional[ResolutionRecommendationResponse]:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return None
        self._ensure_state(dispute.id)
        return self.resolution_agent.generate_recommendation(dispute.id)

    def generate_report(self, case_id: int, actor: Optional[User] = None) -> Optional[ResolutionReportResponse]:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return None

        dashboard = self.get_dashboard(dispute.id)
        recommendation = self.get_recommendation(dispute.id)
        final_decision = self.dashboard_agent.get_active_decision(dispute.id)
        history = self.get_rescore_history(dispute.id)

        content = {
            "case_id": dispute.id,
            "dispute_external_id": dispute.dispute_id,
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "dashboard_summary": dashboard.model_dump() if dashboard else {},
            "recommendation": recommendation.model_dump() if recommendation else {},
            "final_decision": FinalDecisionView.model_validate(final_decision).model_dump() if final_decision else None,
            "rescoring_history_count": len(history),
        }

        case_file = self.dashboard_agent.get_case_file(dispute.id)
        report = ResolutionReport(
            report_id=f"RR-{uuid.uuid4().hex[:12].upper()}",
            dispute_id=dispute.id,
            case_file_id=case_file.id if case_file else None,
            generated_by=actor.id if actor else None,
            report_content=content,
            generated_at=datetime.datetime.utcnow(),
        )
        self.db.add(report)
        self.audit_service.log(
            dispute_id=dispute.id,
            action="report_generated",
            event_type=ResolutionAuditEventType.REPORT_GENERATED,
            actor_id=actor.id if actor else None,
            new_state={"report_id": report.report_id},
        )
        self.notification_service.create(
            dispute_id=dispute.id,
            event_type=NotificationEventType.REPORT_GENERATED,
            title="Resolution Report Generated",
            message=f"Report {report.report_id} has been generated",
            user_id=actor.id if actor else None,
        )
        self.db.commit()
        self.db.refresh(report)

        return ResolutionReportResponse(
            report_id=report.report_id,
            case_id=dispute.id,
            generated_at=report.generated_at,
            report_content=report.report_content,
        )

    def get_report(self, case_id: int) -> Optional[ResolutionReportResponse]:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return None
        report = (
            self.db.query(ResolutionReport)
            .filter(ResolutionReport.dispute_id == dispute.id)
            .order_by(ResolutionReport.generated_at.desc())
            .first()
        )
        if not report:
            return None
        return ResolutionReportResponse(
            report_id=report.report_id,
            case_id=dispute.id,
            generated_at=report.generated_at,
            report_content=report.report_content,
        )

    def _record_decision(
        self,
        dispute: Dispute,
        outcome: Any,
        rationale: str,
        decision_type: FinalDecisionType,
        actor: User,
    ) -> FinalDecision:
        existing = self.dashboard_agent.get_active_decision(dispute.id)
        if existing:
            existing.is_active = False
            existing.superseded_at = datetime.datetime.utcnow()

        state = self.dashboard_agent.get_state(dispute.id)
        decision = FinalDecision(
            decision_id=f"FD-{uuid.uuid4().hex[:12].upper()}",
            dispute_id=dispute.id,
            case_file_id=state.case_file_id if state else None,
            investigator_id=actor.id,
            outcome=outcome,
            rationale=rationale,
            decision_type=decision_type,
            ai_recommendation_at_decision=state.ai_recommendation if state else None,
            ai_fairness_score_at_decision=state.fairness_score if state else None,
            ai_confidence_at_decision=state.confidence if state else None,
            is_active=True,
        )
        self.db.add(decision)

        if state:
            state.resolution_readiness = ResolutionReadiness.DECISION_RECORDED
            state.recommendation_status = (
                RecommendationStatus.APPROVED if decision_type == FinalDecisionType.APPROVED
                else RecommendationStatus.REJECTED if decision_type == FinalDecisionType.REJECTED
                else RecommendationStatus.ACTIVE
            )

        dispute.status = DisputeStatus.RESOLVED
        dispute.resolved_at = datetime.datetime.utcnow()
        self.db.commit()
        self.db.refresh(decision)
        return decision

    async def _complete_resolution(
        self,
        dispute: Dispute,
        decision: FinalDecision,
        actor: User,
    ) -> None:
        """Transition resolution to COMPLETED after a final decision is recorded."""
        state = self.dashboard_agent.get_state(dispute.id)
        if state:
            state.resolution_readiness = ResolutionReadiness.COMPLETED
            self.db.commit()
            self.db.refresh(state)

        self.notification_service.create(
            dispute_id=dispute.id,
            event_type=NotificationEventType.RESOLUTION_COMPLETED,
            title="Resolution Completed",
            message=f"Resolution {decision.decision_id} recorded. Case marked as completed.",
            user_id=actor.id,
        )
        self.audit_service.log(
            dispute_id=dispute.id,
            action="resolution_completed",
            event_type=ResolutionAuditEventType.FINAL_DECISION_RECORDED,
            actor_id=actor.id,
            actor_role=actor.role.value,
            new_state={
                "resolution_readiness": state.resolution_readiness.value if state else None,
                "decision_id": decision.decision_id,
            },
        )
        await self._broadcast(dispute.id, "resolution_completed", {
            "decision_id": decision.decision_id,
            "resolution_readiness": state.resolution_readiness.value if state else None,
        })

    async def approve_decision(self, case_id: int, rationale: Optional[str], actor: User) -> Optional[FinalDecisionView]:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return None
        state = self.dashboard_agent.get_state(dispute.id)
        if not state or not state.ai_recommendation:
            return None

        rat = rationale or f"Investigator approved AI recommendation: {state.ai_recommendation.value}"
        decision = self._record_decision(dispute, state.ai_recommendation, rat, FinalDecisionType.APPROVED, actor)

        await self._complete_resolution(dispute, decision, actor)

        self.audit_service.log(
            dispute_id=dispute.id, action="investigator_approved",
            event_type=ResolutionAuditEventType.INVESTIGATOR_APPROVED,
            actor_id=actor.id, actor_role=actor.role.value,
            previous_state={"ai_recommendation": state.ai_recommendation.value},
            new_state={"outcome": decision.outcome.value},
        )
        self.notification_service.create(
            dispute_id=dispute.id,
            event_type=NotificationEventType.INVESTIGATOR_DECISION,
            title="Investigator Approved AI Recommendation",
            message=rat, user_id=actor.id,
        )
        await self._broadcast(dispute.id, "decision_recorded", {"decision_id": decision.decision_id})
        return FinalDecisionView.model_validate(decision)

    async def reject_decision(self, case_id: int, rationale: str, actor: User) -> Optional[FinalDecisionView]:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return None
        from app.models.resolution import RecommendationOutcome
        decision = self._record_decision(
            dispute, RecommendationOutcome.ESCALATE_TO_HUMAN, rationale, FinalDecisionType.REJECTED, actor,
        )
        await self._complete_resolution(dispute, decision, actor)
        self.audit_service.log(
            dispute_id=dispute.id, action="investigator_rejected",
            event_type=ResolutionAuditEventType.INVESTIGATOR_REJECTED,
            actor_id=actor.id, actor_role=actor.role.value,
            new_state={"rationale": rationale},
        )
        self.notification_service.create(
            dispute_id=dispute.id,
            event_type=NotificationEventType.INVESTIGATOR_DECISION,
            title="Investigator Rejected AI Recommendation",
            message=rationale, user_id=actor.id,
        )
        await self._broadcast(dispute.id, "decision_recorded", {"decision_id": decision.decision_id})
        return FinalDecisionView.model_validate(decision)

    async def modify_decision(self, case_id: int, outcome: Any, rationale: str, actor: User) -> Optional[FinalDecisionView]:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return None
        decision = self._record_decision(dispute, outcome, rationale, FinalDecisionType.MODIFIED, actor)
        await self._complete_resolution(dispute, decision, actor)
        self.audit_service.log(
            dispute_id=dispute.id, action="investigator_modified",
            event_type=ResolutionAuditEventType.INVESTIGATOR_MODIFIED,
            actor_id=actor.id, actor_role=actor.role.value,
            new_state={"outcome": outcome.value, "rationale": rationale},
        )
        self.notification_service.create(
            dispute_id=dispute.id,
            event_type=NotificationEventType.INVESTIGATOR_DECISION,
            title="Investigator Modified Recommendation",
            message=rationale, user_id=actor.id,
        )
        await self._broadcast(dispute.id, "decision_recorded", {"decision_id": decision.decision_id})
        return FinalDecisionView.model_validate(decision)

    def get_final_decision(self, case_id: int) -> Optional[FinalDecisionView]:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return None
        decision = self.dashboard_agent.get_active_decision(dispute.id)
        return FinalDecisionView.model_validate(decision) if decision else None

    def get_audit_history(self, case_id: int) -> list:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return []
        from app.schemas.resolution import AuditLogItem
        logs = self.audit_service.list_for_case(dispute.id)
        return [
            AuditLogItem(
                id=a.id, action=a.action, event_type=a.event_type,
                actor_id=a.actor_id, actor_role=a.actor_role,
                previous_state=a.previous_state, new_state=a.new_state,
                metadata=a.metadata_json, timestamp=a.created_at,
            )
            for a in logs
        ]

    def get_notifications(self, case_id: int) -> list:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return []
        from app.schemas.resolution import NotificationItem
        notifs = self.notification_service.list_for_case(dispute.id)
        return [
            NotificationItem(
                id=n.id, event_type=n.event_type, title=n.title,
                message=n.message, is_read=n.is_read, created_at=n.created_at,
            )
            for n in notifs
        ]

    def mark_notification_read(self, notification_id: int):
        return self.notification_service.mark_read(notification_id)

    def get_collaboration_events(self, case_id: int) -> list:
        dispute = self._resolve_case_id(case_id)
        if not dispute:
            return []
        from app.schemas.resolution import CollaborationEventResponse
        events = (
            self.db.query(CollaborationEvent)
            .filter(CollaborationEvent.dispute_id == dispute.id)
            .order_by(CollaborationEvent.created_at.desc())
            .all()
        )
        return [
            CollaborationEventResponse(
                id=e.id, event_type=e.event_type, description=e.description,
                actor_role=e.actor_role, created_at=e.created_at,
            )
            for e in events
        ]

    @staticmethod
    def is_investigator(user: User) -> bool:
        return user.role in (UserRole.INVESTIGATOR, UserRole.MANAGER, UserRole.ADMIN) or user.is_superuser
