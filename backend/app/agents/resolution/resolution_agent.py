"""Resolution Agent — generates recommended resolution package for investigator review."""

from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.existing import Dispute
from app.models.new import CaseFile, EvidenceRepository, EvidenceValidation, ValidationCategory
from app.models.resolution import ResolutionState, ResolutionReadiness, RecommendationOutcome
from app.schemas.resolution import ResolutionRecommendationResponse, ArgumentSummary


class ResolutionAgent:
    """Builds resolution recommendation package without making final decisions."""

    def __init__(self, db: Session):
        self.db = db

    def generate_recommendation(self, dispute_id: int) -> ResolutionRecommendationResponse:
        dispute = self.db.query(Dispute).filter(Dispute.id == dispute_id).first()
        state = self.db.query(ResolutionState).filter(ResolutionState.dispute_id == dispute_id).first()
        case_file = self.db.query(CaseFile).filter(CaseFile.dispute_id == dispute_id).first()

        if not state:
            return ResolutionRecommendationResponse(
                recommended_outcome=RecommendationOutcome.REQUEST_MORE_EVIDENCE,
                recommendation_rationale="Resolution state not initialized. Collect evidence and trigger re-scoring.",
                resolution_readiness=ResolutionReadiness.NOT_READY,
                human_review_flag=True,
                recommended_next_action="Initialize case file and run re-scoring",
            )

        supporting: list[str] = []
        contradictory: list[str] = []
        unresolved: list[str] = []

        if case_file:
            evidence = (
                self.db.query(EvidenceRepository)
                .filter(EvidenceRepository.case_file_id == case_file.id)
                .limit(10)
                .all()
            )
            supporting = [e.title for e in evidence if e.title][:5]

            validations = (
                self.db.query(EvidenceValidation)
                .filter(EvidenceValidation.case_file_id == case_file.id, EvidenceValidation.is_resolved.is_(False))
                .all()
            )
            for v in validations:
                if v.category == ValidationCategory.CONTRADICTION:
                    contradictory.append(v.title)
                else:
                    unresolved.append(v.title)

        cust = state.customer_argument_summary or {}
        merch = state.merchant_argument_summary or {}

        next_action = self._next_action(state)

        summary_parts = []
        if case_file and case_file.investigation_summary:
            summary_parts.append(case_file.investigation_summary[:500])
        if state.recommendation_rationale:
            summary_parts.append(state.recommendation_rationale)

        return ResolutionRecommendationResponse(
            recommended_outcome=state.ai_recommendation,
            recommendation_rationale=state.recommendation_rationale,
            fairness_score=state.fairness_score,
            confidence=state.confidence,
            evidence_summary=" ".join(summary_parts) if summary_parts else None,
            key_supporting_evidence=supporting,
            key_contradictory_evidence=contradictory,
            customer_argument_summary=ArgumentSummary(
                claim=cust.get("claim"),
                supporting_evidence=cust.get("supporting_evidence", []),
                confidence=cust.get("confidence"),
            ),
            merchant_argument_summary=ArgumentSummary(
                claim=merch.get("claim"),
                supporting_evidence=merch.get("supporting_evidence", []),
                confidence=merch.get("confidence"),
            ),
            explainability_summary=state.explainability_summary,
            unresolved_issues=unresolved,
            recommended_next_action=next_action,
            human_review_flag=state.human_review_required,
            resolution_readiness=state.resolution_readiness,
        )

    def _next_action(self, state: ResolutionState) -> str:
        if state.resolution_readiness == ResolutionReadiness.DECISION_RECORDED:
            return "Generate resolution report and notify parties"
        if state.resolution_readiness == ResolutionReadiness.READY_FOR_DECISION:
            return "Investigator review and record final decision"
        if state.ai_recommendation == RecommendationOutcome.REQUEST_MORE_EVIDENCE:
            return "Request additional evidence from parties"
        if state.human_review_required:
            return "Escalate for human review — AI confidence insufficient"
        return "Continue evidence collection and re-scoring"
