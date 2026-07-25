"""
Module 3: Resolution & Collaboration database models.
"""

import datetime
import enum

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, Enum as SAEnum, JSON, Float, Index,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.mixins import IDMixin, TimestampMixin


class RecommendationOutcome(str, enum.Enum):
    APPROVE_CUSTOMER = "approve_customer"
    APPROVE_MERCHANT = "approve_merchant"
    PARTIAL_RESOLUTION = "partial_resolution"
    REQUEST_MORE_EVIDENCE = "request_more_evidence"
    ESCALATE_TO_HUMAN = "escalate_to_human"


class RecommendationStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUPERSEDED = "superseded"
    REJECTED = "rejected"
    APPROVED = "approved"


class ResolutionReadiness(str, enum.Enum):
    NOT_READY = "not_ready"
    PARTIAL = "partial"
    READY_FOR_REVIEW = "ready_for_review"
    READY_FOR_DECISION = "ready_for_decision"
    DECISION_RECORDED = "decision_recorded"
    COMPLETED = "completed"


class EvidenceRecommendationPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EvidenceRequestedFrom(str, enum.Enum):
    CUSTOMER = "customer"
    MERCHANT = "merchant"
    INVESTIGATOR = "investigator"
    EITHER = "either"


class EvidenceRecommendationStatus(str, enum.Enum):
    OPEN = "open"
    REQUESTED = "requested"
    SUBMITTED = "submitted"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class FinalDecisionType(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"


class NotificationEventType(str, enum.Enum):
    EVIDENCE_REQUESTED = "evidence_requested"
    EVIDENCE_SUBMITTED = "evidence_submitted"
    EVIDENCE_ACCEPTED = "evidence_accepted"
    FAIRNESS_SCORE_UPDATED = "fairness_score_updated"
    RECOMMENDATION_CHANGED = "recommendation_changed"
    INVESTIGATOR_DECISION = "investigator_decision"
    RESOLUTION_COMPLETED = "resolution_completed"
    RESCORING_COMPLETED = "rescoring_completed"
    REPORT_GENERATED = "report_generated"


class ResolutionAuditEventType(str, enum.Enum):
    EVIDENCE_SUBMITTED = "evidence_submitted"
    RECOMMENDATION_GENERATED = "recommendation_generated"
    RECOMMENDATION_CHANGED = "recommendation_changed"
    RESCORING_TRIGGERED = "rescoring_triggered"
    FAIRNESS_SCORE_CHANGED = "fairness_score_changed"
    INVESTIGATOR_APPROVED = "investigator_approved"
    INVESTIGATOR_REJECTED = "investigator_rejected"
    INVESTIGATOR_MODIFIED = "investigator_modified"
    FINAL_DECISION_RECORDED = "final_decision_recorded"
    REPORT_GENERATED = "report_generated"
    NOTIFICATION_CREATED = "notification_created"
    COLLABORATION_EVENT = "collaboration_event"


class ResolutionState(Base, IDMixin, TimestampMixin):
    """Current resolution state for a dispute."""

    __tablename__ = "resolution_states"

    dispute_id = Column(Integer, ForeignKey("disputes.id"), nullable=False, unique=True, index=True)
    case_file_id = Column(Integer, ForeignKey("case_files.id"), nullable=True, index=True)

    fairness_score = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    ai_recommendation = Column(SAEnum(RecommendationOutcome), nullable=True)
    recommendation_rationale = Column(Text, nullable=True)
    recommendation_status = Column(
        SAEnum(RecommendationStatus), nullable=False, default=RecommendationStatus.PENDING
    )
    customer_argument_summary = Column(JSON, nullable=True)
    merchant_argument_summary = Column(JSON, nullable=True)
    explainability_summary = Column(Text, nullable=True)
    explainability_details = Column(JSON, nullable=True)
    human_review_required = Column(Boolean, default=True, nullable=False)
    resolution_readiness = Column(
        SAEnum(ResolutionReadiness), nullable=False, default=ResolutionReadiness.NOT_READY
    )
    evidence_completeness_pct = Column(Float, nullable=True)
    evidence_count = Column(Integer, default=0, nullable=False)
    missing_evidence_count = Column(Integer, default=0, nullable=False)
    contradiction_count = Column(Integer, default=0, nullable=False)
    last_rescored_at = Column(DateTime, nullable=True)
    module2_available = Column(Boolean, default=False, nullable=False)
    metadata_json = Column(JSON, nullable=True)

    dispute = relationship("Dispute")
    case_file = relationship("CaseFile")


class EvidenceRecommendation(Base, IDMixin, TimestampMixin):
    """Smart evidence gap recommendations."""

    __tablename__ = "evidence_recommendations"

    recommendation_id = Column(String(100), unique=True, index=True, nullable=False)
    dispute_id = Column(Integer, ForeignKey("disputes.id"), nullable=False, index=True)
    case_file_id = Column(Integer, ForeignKey("case_files.id"), nullable=True, index=True)
    evidence_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    priority = Column(
        SAEnum(EvidenceRecommendationPriority),
        nullable=False,
        default=EvidenceRecommendationPriority.MEDIUM,
    )
    requested_from = Column(
        SAEnum(EvidenceRequestedFrom),
        nullable=False,
        default=EvidenceRequestedFrom.EITHER,
    )
    status = Column(
        SAEnum(EvidenceRecommendationStatus),
        nullable=False,
        default=EvidenceRecommendationStatus.OPEN,
    )
    resolved_at = Column(DateTime, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_evidence_recommendations_dispute_status", "dispute_id", "status"),
    )


class RescoringEvent(Base, IDMixin, TimestampMixin):
    """History of re-scoring events."""

    __tablename__ = "rescoring_events"

    event_id = Column(String(100), unique=True, index=True, nullable=False)
    dispute_id = Column(Integer, ForeignKey("disputes.id"), nullable=False, index=True)
    case_file_id = Column(Integer, ForeignKey("case_files.id"), nullable=True, index=True)

    previous_fairness_score = Column(Float, nullable=True)
    new_fairness_score = Column(Float, nullable=True)
    previous_recommendation = Column(SAEnum(RecommendationOutcome), nullable=True)
    new_recommendation = Column(SAEnum(RecommendationOutcome), nullable=True)
    previous_confidence = Column(Float, nullable=True)
    new_confidence = Column(Float, nullable=True)
    triggering_evidence_id = Column(Integer, ForeignKey("evidence_repository.id"), nullable=True)
    change_reason = Column(String(255), nullable=True)
    change_summary = Column(Text, nullable=True)
    used_module2 = Column(Boolean, default=False, nullable=False)
    metadata_json = Column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_rescoring_events_dispute_created", "dispute_id", "created_at"),
    )


class FinalDecision(Base, IDMixin, TimestampMixin):
    """Investigator final decision — never overwritten silently."""

    __tablename__ = "final_decisions"

    decision_id = Column(String(100), unique=True, index=True, nullable=False)
    dispute_id = Column(Integer, ForeignKey("disputes.id"), nullable=False, index=True)
    case_file_id = Column(Integer, ForeignKey("case_files.id"), nullable=True, index=True)
    investigator_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    outcome = Column(SAEnum(RecommendationOutcome), nullable=False)
    rationale = Column(Text, nullable=False)
    decision_type = Column(SAEnum(FinalDecisionType), nullable=False)
    ai_recommendation_at_decision = Column(SAEnum(RecommendationOutcome), nullable=True)
    ai_fairness_score_at_decision = Column(Float, nullable=True)
    ai_confidence_at_decision = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    superseded_at = Column(DateTime, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    investigator = relationship("User")

    __table_args__ = (
        Index("ix_final_decisions_dispute_active", "dispute_id", "is_active"),
    )


class ResolutionReport(Base, IDMixin, TimestampMixin):
    """Generated resolution report."""

    __tablename__ = "resolution_reports"

    report_id = Column(String(100), unique=True, index=True, nullable=False)
    dispute_id = Column(Integer, ForeignKey("disputes.id"), nullable=False, index=True)
    case_file_id = Column(Integer, ForeignKey("case_files.id"), nullable=True, index=True)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    report_content = Column(JSON, nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    generator = relationship("User")


class NotificationLog(Base, IDMixin, TimestampMixin):
    """In-app notification log."""

    __tablename__ = "notification_logs"

    dispute_id = Column(Integer, ForeignKey("disputes.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    event_type = Column(SAEnum(NotificationEventType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_notification_logs_dispute_read", "dispute_id", "is_read"),
    )


class ResolutionAuditLog(Base, IDMixin, TimestampMixin):
    """Module 3 audit trail — separate from Module 1 audit_logs."""

    __tablename__ = "resolution_audit_logs"

    dispute_id = Column(Integer, ForeignKey("disputes.id"), nullable=False, index=True)
    case_file_id = Column(Integer, ForeignKey("case_files.id"), nullable=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False)
    event_type = Column(SAEnum(ResolutionAuditEventType), nullable=False)
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_resolution_audit_dispute_created", "dispute_id", "created_at"),
    )


class CollaborationEvent(Base, IDMixin, TimestampMixin):
    """Collaboration activity between parties."""

    __tablename__ = "collaboration_events"

    dispute_id = Column(Integer, ForeignKey("disputes.id"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_role = Column(String(50), nullable=False)
    event_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
