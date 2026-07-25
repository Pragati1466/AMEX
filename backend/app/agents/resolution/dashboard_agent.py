"""Live Fairness Dashboard Agent — consolidates resolution state."""

from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.existing import Dispute
from app.models.new import CaseFile, EvidenceValidation, ValidationCategory
from app.models.resolution import (
    ResolutionState, FinalDecision, RescoringEvent,
    EvidenceRecommendation, ResolutionAuditLog, NotificationLog,
    ResolutionReadiness, RecommendationStatus,
)
from app.schemas.resolution import (
    ResolutionDashboardResponse, ResolutionStateResponse,
    FairnessOverview, AIRecommendationView, EvidenceCompletenessView,
    ArgumentSummary, ExplainabilityView, RescoringHistoryItem,
    FinalDecisionView, AuditLogItem, NotificationItem, EvidenceRecommendationResponse,
)


class LiveFairnessDashboardAgent:
    """Builds consolidated dashboard views from resolution state and related data."""

    def __init__(self, db: Session):
        self.db = db

    def get_dispute(self, case_id: int) -> Optional[Dispute]:
        return self.db.query(Dispute).filter(Dispute.id == case_id).first()

    def get_case_file(self, dispute_id: int) -> Optional[CaseFile]:
        return self.db.query(CaseFile).filter(CaseFile.dispute_id == dispute_id).first()

    def get_state(self, dispute_id: int) -> Optional[ResolutionState]:
        return self.db.query(ResolutionState).filter(ResolutionState.dispute_id == dispute_id).first()

    def get_active_decision(self, dispute_id: int) -> Optional[FinalDecision]:
        return (
            self.db.query(FinalDecision)
            .filter(FinalDecision.dispute_id == dispute_id, FinalDecision.is_active.is_(True))
            .order_by(FinalDecision.created_at.desc())
            .first()
        )

    def build_state_response(self, dispute: Dispute, state: Optional[ResolutionState]) -> ResolutionStateResponse:
        has_decision = self.get_active_decision(dispute.id) is not None
        if not state:
            return ResolutionStateResponse(
                case_id=dispute.id,
                dispute_external_id=dispute.dispute_id,
                dispute_status=dispute.status.value if dispute.status else None,
                resolution_status=ResolutionReadiness.NOT_READY,
                recommendation_status=RecommendationStatus.PENDING,
                human_review_required=True,
                resolution_readiness=ResolutionReadiness.NOT_READY,
                has_final_decision=has_decision,
                last_updated=dispute.updated_at,
            )
        return ResolutionStateResponse(
            case_id=dispute.id,
            dispute_external_id=dispute.dispute_id,
            dispute_status=dispute.status.value if dispute.status else None,
            resolution_status=state.resolution_readiness,
            investigation_progress=self._investigation_progress(state),
            fairness_score=state.fairness_score,
            confidence=state.confidence,
            ai_recommendation=state.ai_recommendation,
            recommendation_status=state.recommendation_status,
            human_review_required=state.human_review_required,
            resolution_readiness=state.resolution_readiness,
            evidence_completeness_pct=state.evidence_completeness_pct,
            evidence_count=state.evidence_count,
            last_rescored_at=state.last_rescored_at,
            module2_available=state.module2_available,
            has_final_decision=has_decision,
            last_updated=state.updated_at,
        )

    def _investigation_progress(self, state: ResolutionState) -> str:
        pct = state.evidence_completeness_pct or 0
        if pct >= 90:
            return "Investigation substantially complete"
        if pct >= 60:
            return "Investigation in progress — moderate completeness"
        return "Investigation early stage — evidence gaps remain"

    def build_dashboard(self, case_id: int, state: ResolutionState, include_audit: bool = True) -> ResolutionDashboardResponse:
        dispute = self.get_dispute(case_id)
        case_file = self.get_case_file(case_id)
        final_decision = self.get_active_decision(case_id)

        validations = []
        if case_file:
            validations = (
                self.db.query(EvidenceValidation)
                .filter(EvidenceValidation.case_file_id == case_file.id)
                .all()
            )

        missing = [v.title for v in validations if v.category == ValidationCategory.MISSING_EVIDENCE and not v.is_resolved]
        contradictions = [v.title for v in validations if v.category == ValidationCategory.CONTRADICTION and not v.is_resolved]
        critical = [v.title for v in validations if v.severity.value in ("critical", "error") and not v.is_resolved]

        recommendations = (
            self.db.query(EvidenceRecommendation)
            .filter(EvidenceRecommendation.dispute_id == case_id)
            .order_by(EvidenceRecommendation.priority)
            .all()
        )

        rescoring = (
            self.db.query(RescoringEvent)
            .filter(RescoringEvent.dispute_id == case_id)
            .order_by(RescoringEvent.created_at.desc())
            .limit(20)
            .all()
        )

        customer_bal = state.fairness_score if state.fairness_score is not None else None
        merchant_bal = (100 - state.fairness_score) if state.fairness_score is not None else None

        fairness = FairnessOverview(
            fairness_score=state.fairness_score,
            confidence=state.confidence,
            customer_balance=customer_bal,
            merchant_balance=merchant_bal,
            score_explanation=state.explainability_summary,
            available=state.fairness_score is not None,
            message=None if state.fairness_score is not None else "Fairness score unavailable",
        )

        ai_rec = AIRecommendationView(
            recommended_outcome=state.ai_recommendation,
            confidence=state.confidence,
            rationale=state.recommendation_rationale,
            human_review_required=state.human_review_required,
            recommendation_status=state.recommendation_status,
            timestamp=state.last_rescored_at or state.updated_at,
            available=state.ai_recommendation is not None,
            message=None if state.ai_recommendation else "Recommendation not yet available",
        )

        cust_arg = state.customer_argument_summary or {}
        merch_arg = state.merchant_argument_summary or {}
        expl_details = state.explainability_details or {}

        explainability = ExplainabilityView(
            summary=state.explainability_summary,
            key_factors=expl_details.get("key_factors", []),
            supporting_evidence=expl_details.get("supporting_evidence", []),
            contradictory_evidence=contradictions,
            unresolved_issues=expl_details.get("unresolved_issues", missing),
            available=bool(state.explainability_summary),
            message=None if state.explainability_summary else "Explainability report not yet available",
        )

        audit_items: list[AuditLogItem] = []
        notifications: list[NotificationItem] = []
        if include_audit:
            audits = (
                self.db.query(ResolutionAuditLog)
                .filter(ResolutionAuditLog.dispute_id == case_id)
                .order_by(ResolutionAuditLog.created_at.desc())
                .limit(50)
                .all()
            )
            audit_items = [
                AuditLogItem(
                    id=a.id,
                    action=a.action,
                    event_type=a.event_type,
                    actor_id=a.actor_id,
                    actor_role=a.actor_role,
                    previous_state=a.previous_state,
                    new_state=a.new_state,
                    metadata=a.metadata_json,
                    timestamp=a.created_at,
                )
                for a in audits
            ]
            notifs = (
                self.db.query(NotificationLog)
                .filter(NotificationLog.dispute_id == case_id)
                .order_by(NotificationLog.created_at.desc())
                .limit(20)
                .all()
            )
            notifications = [
                NotificationItem(
                    id=n.id,
                    event_type=n.event_type,
                    title=n.title,
                    message=n.message,
                    is_read=n.is_read,
                    created_at=n.created_at,
                )
                for n in notifs
            ]

        return ResolutionDashboardResponse(
            case_header={
                "case_id": case_id,
                "dispute_external_id": dispute.dispute_id if dispute else None,
                "dispute_status": dispute.status.value if dispute and dispute.status else None,
                "resolution_status": state.resolution_readiness.value,
                "last_updated": state.updated_at.isoformat(),
                "resolution_readiness": state.resolution_readiness.value,
                "case_file_id": case_file.case_file_id if case_file else None,
            },
            fairness_overview=fairness,
            ai_recommendation=ai_rec,
            final_decision=FinalDecisionView.model_validate(final_decision) if final_decision else None,
            evidence_completeness=EvidenceCompletenessView(
                completeness_pct=state.evidence_completeness_pct,
                total_evidence=state.evidence_count,
                missing_evidence=missing,
                contradictory_evidence=contradictions,
                critical_gaps=critical,
            ),
            evidence_recommendations=[
                EvidenceRecommendationResponse(
                    id=r.id,
                    recommendation_id=r.recommendation_id,
                    case_id=case_id,
                    evidence_type=r.evidence_type,
                    description=r.description,
                    reason=r.reason,
                    priority=r.priority,
                    requested_from=r.requested_from,
                    status=r.status,
                    created_at=r.created_at,
                    resolved_at=r.resolved_at,
                )
                for r in recommendations
            ],
            customer_argument=ArgumentSummary(
                claim=cust_arg.get("claim"),
                supporting_evidence=cust_arg.get("supporting_evidence", []),
                confidence=cust_arg.get("confidence"),
            ),
            merchant_argument=ArgumentSummary(
                claim=merch_arg.get("claim"),
                supporting_evidence=merch_arg.get("supporting_evidence", []),
                confidence=merch_arg.get("confidence"),
            ),
            explainability=explainability,
            rescoring_history=[
                RescoringHistoryItem(
                    id=e.id,
                    event_id=e.event_id,
                    previous_fairness_score=e.previous_fairness_score,
                    new_fairness_score=e.new_fairness_score,
                    score_change=(
                        (e.new_fairness_score - e.previous_fairness_score)
                        if e.new_fairness_score is not None and e.previous_fairness_score is not None
                        else None
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
                for e in rescoring
            ],
            resolution_readiness=state.resolution_readiness,
            human_review_required=state.human_review_required,
            audit_history=audit_items,
            notifications=notifications,
        )
