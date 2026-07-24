"""Real-Time Re-Scoring Agent."""

import datetime
import uuid
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.new import CaseFile, EvidenceRepository, EvidenceValidation, ValidationCategory
from app.models.resolution import (
    ResolutionState, RescoringEvent, RecommendationStatus,
    ResolutionReadiness, RecommendationOutcome,
)
from app.services.module2_adapter import get_reasoning_output
from app.services.case_file_service import CaseFileService


class RealTimeRescoringAgent:
    """Recalculates resolution state when evidence changes."""

    def __init__(self, db: Session):
        self.db = db
        self.case_file_service = CaseFileService(db)

    def _compute_completeness(
        self,
        evidence_count: int,
        validations: list[Any],
    ) -> tuple[float, int, int]:
        missing = sum(
            1 for v in validations
            if v.category == ValidationCategory.MISSING_EVIDENCE and not v.is_resolved
        )
        contradictions = sum(
            1 for v in validations
            if v.category == ValidationCategory.CONTRADICTION and not v.is_resolved
        )
        if evidence_count == 0:
            return 0.0, missing, contradictions
        penalty = missing * 0.12 + contradictions * 0.08
        completeness = max(0.0, min(100.0, (evidence_count * 15) - (penalty * 100)))
        if evidence_count >= 5 and missing == 0:
            completeness = min(100.0, completeness + 10)
        return completeness, missing, contradictions

    def _get_or_create_state(self, dispute_id: int, case_file: Optional[CaseFile]) -> ResolutionState:
        state = self.db.query(ResolutionState).filter(ResolutionState.dispute_id == dispute_id).first()
        if state:
            return state
        state = ResolutionState(
            dispute_id=dispute_id,
            case_file_id=case_file.id if case_file else None,
            recommendation_status=RecommendationStatus.PENDING,
            resolution_readiness=ResolutionReadiness.NOT_READY,
        )
        self.db.add(state)
        self.db.flush()
        return state

    def _determine_readiness(
        self,
        completeness: float,
        confidence: Optional[float],
        has_decision: bool,
        human_review: bool,
    ) -> ResolutionReadiness:
        if has_decision:
            return ResolutionReadiness.DECISION_RECORDED
        if completeness >= 80 and confidence and confidence >= 0.6 and not human_review:
            return ResolutionReadiness.READY_FOR_DECISION
        if completeness >= 60:
            return ResolutionReadiness.READY_FOR_REVIEW
        if completeness >= 30:
            return ResolutionReadiness.PARTIAL
        return ResolutionReadiness.NOT_READY

    def rescore(
        self,
        dispute_id: int,
        reason: str = "evidence_change",
        triggering_evidence_id: Optional[int] = None,
        force_fallback: bool = False,
    ) -> tuple[ResolutionState, RescoringEvent]:
        case_file = self.db.query(CaseFile).filter(CaseFile.dispute_id == dispute_id).first()
        state = self._get_or_create_state(dispute_id, case_file)

        prev_fairness = state.fairness_score
        prev_rec = state.ai_recommendation
        prev_conf = state.confidence

        evidence_count = 0
        validations: list[Any] = []
        package = None

        if case_file:
            evidence_count = (
                self.db.query(EvidenceRepository)
                .filter(EvidenceRepository.case_file_id == case_file.id)
                .count()
            )
            validations = (
                self.db.query(EvidenceValidation)
                .filter(EvidenceValidation.case_file_id == case_file.id)
                .all()
            )
            try:
                package = self.case_file_service.get_standardized_package(case_file.id)
            except Exception:
                package = None

        missing_count = sum(
            1 for v in validations
            if v.category == ValidationCategory.MISSING_EVIDENCE and not v.is_resolved
        )
        contradiction_count = sum(
            1 for v in validations
            if v.category == ValidationCategory.CONTRADICTION and not v.is_resolved
        )

        completeness, missing, contradictions = self._compute_completeness(evidence_count, validations)

        reasoning = get_reasoning_output(
            package=package,
            validations=validations,
            evidence_count=evidence_count,
            missing_count=missing_count,
            contradiction_count=contradiction_count,
            force_fallback=force_fallback,
        )

        new_fairness = reasoning["fairness_score"]
        new_conf = reasoning["confidence"]
        new_rec = reasoning["ai_recommendation"]

        state.fairness_score = new_fairness
        state.confidence = new_conf
        state.ai_recommendation = new_rec
        state.recommendation_rationale = reasoning.get("recommendation_rationale")
        state.customer_argument_summary = reasoning.get("customer_argument")
        state.merchant_argument_summary = reasoning.get("merchant_argument")
        state.explainability_summary = reasoning.get("explanation")
        state.explainability_details = reasoning.get("explainability_details")
        state.human_review_required = reasoning.get("human_review_required", True)
        state.module2_available = reasoning.get("module2_available", False)
        state.evidence_completeness_pct = completeness
        state.evidence_count = evidence_count
        state.missing_evidence_count = missing
        state.contradiction_count = contradictions
        state.recommendation_status = RecommendationStatus.ACTIVE
        state.last_rescored_at = datetime.datetime.utcnow()
        if case_file:
            state.case_file_id = case_file.id

        from app.models.resolution import FinalDecision
        has_decision = (
            self.db.query(FinalDecision)
            .filter(FinalDecision.dispute_id == dispute_id, FinalDecision.is_active.is_(True))
            .count() > 0
        )
        state.resolution_readiness = self._determine_readiness(
            completeness, new_conf, has_decision, state.human_review_required
        )

        score_change = None
        if prev_fairness is not None and new_fairness is not None:
            score_change = new_fairness - prev_fairness

        change_parts = []
        if prev_fairness != new_fairness:
            change_parts.append(f"Fairness: {prev_fairness} → {new_fairness}")
        if prev_rec != new_rec:
            change_parts.append(f"Recommendation: {prev_rec} → {new_rec}")
        if prev_conf != new_conf:
            change_parts.append(f"Confidence: {prev_conf} → {new_conf}")

        event = RescoringEvent(
            event_id=f"RS-{uuid.uuid4().hex[:12].upper()}",
            dispute_id=dispute_id,
            case_file_id=case_file.id if case_file else None,
            previous_fairness_score=prev_fairness,
            new_fairness_score=new_fairness,
            previous_recommendation=prev_rec,
            new_recommendation=new_rec,
            previous_confidence=prev_conf,
            new_confidence=new_conf,
            triggering_evidence_id=triggering_evidence_id,
            change_reason=reason,
            change_summary="; ".join(change_parts) if change_parts else "Initial scoring",
            used_module2=reasoning.get("module2_available", False),
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(state)
        self.db.refresh(event)
        return state, event
