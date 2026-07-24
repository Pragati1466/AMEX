"""Pydantic schemas for Module 3 Resolution & Collaboration APIs."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.resolution import (
    RecommendationOutcome,
    RecommendationStatus,
    ResolutionReadiness,
    EvidenceRecommendationPriority,
    EvidenceRequestedFrom,
    EvidenceRecommendationStatus,
    FinalDecisionType,
    NotificationEventType,
    ResolutionAuditEventType,
)


class ArgumentSummary(BaseModel):
    claim: Optional[str] = None
    supporting_evidence: list[str] = Field(default_factory=list)
    confidence: Optional[float] = None


class FairnessOverview(BaseModel):
    fairness_score: Optional[float] = None
    confidence: Optional[float] = None
    customer_balance: Optional[float] = None
    merchant_balance: Optional[float] = None
    score_explanation: Optional[str] = None
    available: bool = True
    message: Optional[str] = None


class AIRecommendationView(BaseModel):
    recommended_outcome: Optional[RecommendationOutcome] = None
    confidence: Optional[float] = None
    rationale: Optional[str] = None
    human_review_required: bool = True
    recommendation_status: RecommendationStatus = RecommendationStatus.PENDING
    timestamp: Optional[datetime] = None
    available: bool = True
    message: Optional[str] = None


class EvidenceCompletenessView(BaseModel):
    completeness_pct: Optional[float] = None
    total_evidence: int = 0
    missing_evidence: list[str] = Field(default_factory=list)
    contradictory_evidence: list[str] = Field(default_factory=list)
    critical_gaps: list[str] = Field(default_factory=list)


class EvidenceRecommendationResponse(BaseModel):
    id: int
    recommendation_id: str
    case_id: int
    evidence_type: str
    description: str
    reason: str
    priority: EvidenceRecommendationPriority
    requested_from: EvidenceRequestedFrom
    status: EvidenceRecommendationStatus
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ExplainabilityView(BaseModel):
    summary: Optional[str] = None
    key_factors: list[str] = Field(default_factory=list)
    supporting_evidence: list[str] = Field(default_factory=list)
    contradictory_evidence: list[str] = Field(default_factory=list)
    unresolved_issues: list[str] = Field(default_factory=list)
    available: bool = True
    message: Optional[str] = None


class RescoringHistoryItem(BaseModel):
    id: int
    event_id: str
    previous_fairness_score: Optional[float] = None
    new_fairness_score: Optional[float] = None
    score_change: Optional[float] = None
    previous_recommendation: Optional[RecommendationOutcome] = None
    new_recommendation: Optional[RecommendationOutcome] = None
    previous_confidence: Optional[float] = None
    new_confidence: Optional[float] = None
    triggering_evidence_id: Optional[int] = None
    change_reason: Optional[str] = None
    change_summary: Optional[str] = None
    timestamp: datetime
    used_module2: bool = False

    model_config = {"from_attributes": True}


class FinalDecisionView(BaseModel):
    id: int
    decision_id: str
    outcome: RecommendationOutcome
    rationale: str
    decision_type: FinalDecisionType
    ai_recommendation_at_decision: Optional[RecommendationOutcome] = None
    investigator_id: Optional[int] = None
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogItem(BaseModel):
    id: int
    action: str
    event_type: ResolutionAuditEventType
    actor_id: Optional[int] = None
    actor_role: Optional[str] = None
    previous_state: Optional[dict[str, Any]] = None
    new_state: Optional[dict[str, Any]] = None
    metadata: Optional[dict[str, Any]] = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class NotificationItem(BaseModel):
    id: int
    event_type: NotificationEventType
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ResolutionStateResponse(BaseModel):
    case_id: int
    dispute_external_id: Optional[str] = None
    dispute_status: Optional[str] = None
    resolution_status: ResolutionReadiness
    investigation_progress: Optional[str] = None
    fairness_score: Optional[float] = None
    confidence: Optional[float] = None
    ai_recommendation: Optional[RecommendationOutcome] = None
    recommendation_status: RecommendationStatus
    human_review_required: bool = True
    resolution_readiness: ResolutionReadiness
    evidence_completeness_pct: Optional[float] = None
    evidence_count: int = 0
    last_rescored_at: Optional[datetime] = None
    module2_available: bool = False
    has_final_decision: bool = False
    last_updated: datetime


class ResolutionDashboardResponse(BaseModel):
    case_header: dict[str, Any]
    fairness_overview: FairnessOverview
    ai_recommendation: AIRecommendationView
    final_decision: Optional[FinalDecisionView] = None
    evidence_completeness: EvidenceCompletenessView
    evidence_recommendations: list[EvidenceRecommendationResponse]
    customer_argument: ArgumentSummary
    merchant_argument: ArgumentSummary
    explainability: ExplainabilityView
    rescoring_history: list[RescoringHistoryItem]
    resolution_readiness: ResolutionReadiness
    human_review_required: bool = True
    audit_history: list[AuditLogItem]
    notifications: list[NotificationItem]


class SubmitEvidenceRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    evidence_type: Optional[str] = "uploaded_document"
    submitted_by_role: Optional[str] = "investigator"


class RescoreRequest(BaseModel):
    reason: Optional[str] = "manual_trigger"
    triggering_evidence_id: Optional[int] = None


class RescoreResponse(BaseModel):
    success: bool
    message: str
    rescoring_event: Optional[RescoringHistoryItem] = None
    updated_state: Optional[ResolutionStateResponse] = None


class DecisionApproveRequest(BaseModel):
    rationale: Optional[str] = None


class DecisionRejectRequest(BaseModel):
    rationale: str = Field(..., min_length=1)


class DecisionModifyRequest(BaseModel):
    outcome: RecommendationOutcome
    rationale: str = Field(..., min_length=1)


class ResolutionRecommendationResponse(BaseModel):
    recommended_outcome: Optional[RecommendationOutcome] = None
    recommendation_rationale: Optional[str] = None
    fairness_score: Optional[float] = None
    confidence: Optional[float] = None
    evidence_summary: Optional[str] = None
    key_supporting_evidence: list[str] = Field(default_factory=list)
    key_contradictory_evidence: list[str] = Field(default_factory=list)
    customer_argument_summary: Optional[ArgumentSummary] = None
    merchant_argument_summary: Optional[ArgumentSummary] = None
    explainability_summary: Optional[str] = None
    unresolved_issues: list[str] = Field(default_factory=list)
    recommended_next_action: Optional[str] = None
    human_review_flag: bool = True
    resolution_readiness: ResolutionReadiness = ResolutionReadiness.NOT_READY


class ResolutionReportResponse(BaseModel):
    report_id: str
    case_id: int
    generated_at: datetime
    report_content: dict[str, Any]

    model_config = {"from_attributes": True}


class GenerateRecommendationsResponse(BaseModel):
    success: bool
    message: str
    recommendations: list[EvidenceRecommendationResponse]
    total: int


class CollaborationEventResponse(BaseModel):
    id: int
    event_type: str
    description: Optional[str] = None
    actor_role: str
    created_at: datetime

    model_config = {"from_attributes": True}
