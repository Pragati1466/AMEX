"""
Module 3 Resolution & Collaboration Backend Tests.

Covers:
- Dashboard retrieval
- Evidence recommendations
- Evidence submission
- Re-scoring
- Final decisions
- Notifications
- Audit logging
- Authorization
- Module 2 fallback behavior
"""

import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session

from app.models.existing import Dispute, DisputeStatus, DisputeReason
from app.models.new import CaseFile, EvidenceRepository, EvidenceValidation, ValidationCategory, ValidationSeverity
from app.models.resolution import (
    ResolutionState, EvidenceRecommendation, RescoringEvent,
    FinalDecision, ResolutionReport, NotificationLog,
    ResolutionAuditLog, CollaborationEvent,
    RecommendationOutcome, RecommendationStatus, ResolutionReadiness,
    EvidenceRecommendationPriority, EvidenceRequestedFrom, EvidenceRecommendationStatus,
    FinalDecisionType, NotificationEventType, ResolutionAuditEventType,
)
from app.models.user import User, UserRole
from app.services.resolution_service import ResolutionService
from app.services.module2_adapter import deterministic_fallback_reasoning


# -------------------- Fixtures --------------------

@pytest.fixture
def mock_user_investigator():
    return User(id=1, username="investigator", email="inv@test.com", role=UserRole.INVESTIGATOR, is_superuser=False)

@pytest.fixture
def mock_user_manager():
    return User(id=3, username="manager", email="mgr@test.com", role=UserRole.MANAGER, is_superuser=False)

@pytest.fixture
def mock_user_admin():
    return User(id=4, username="admin", email="admin@test.com", role=UserRole.ADMIN, is_superuser=False)

@pytest.fixture
def mock_dispute():
    return Dispute(
        id=1, dispute_id="DSP-001", customer_id=1, merchant_id=1,
        reason=DisputeReason.PRODUCT_NOT_RECEIVED, amount=100.0, currency="USD",
        status=DisputeStatus.OPEN, filed_at=datetime.utcnow(),
    )

@pytest.fixture
def mock_case_file(mock_dispute):
    return CaseFile(
        id=1, dispute_id=mock_dispute.id, case_file_id="CF-001",
        status="draft", confidence_score=0.8,
    )

@pytest.fixture
def mock_resolution_state(mock_dispute):
    return ResolutionState(
        id=1, dispute_id=mock_dispute.id, case_file_id=1,
        fairness_score=65.0, confidence=0.75,
        ai_recommendation=RecommendationOutcome.APPROVE_CUSTOMER,
        recommendation_rationale="Customer claim supported by evidence",
        recommendation_status=RecommendationStatus.ACTIVE,
        resolution_readiness=ResolutionReadiness.READY_FOR_DECISION,
        evidence_completeness_pct=80.0, evidence_count=3,
        missing_evidence_count=1, contradiction_count=0,
        human_review_required=False, module2_available=True,
    )


# -------------------- Helper --------------------

def make_service(test_db: Session) -> ResolutionService:
    return ResolutionService(test_db)


# -------------------- Tests: Dashboard --------------------

class TestDashboard:
    def test_get_dashboard_success(self, test_db: Session, mock_dispute, mock_resolution_state):
        service = make_service(test_db)
        test_db.add(mock_dispute)
        test_db.add(mock_resolution_state)
        test_db.commit()

        dashboard = service.get_dashboard(mock_dispute.id)
        assert dashboard is not None
        assert dashboard.case_header["case_id"] == mock_dispute.id
        assert dashboard.fairness_overview.fairness_score == 65.0
        assert dashboard.ai_recommendation.recommended_outcome == RecommendationOutcome.APPROVE_CUSTOMER

    def test_get_dashboard_not_found(self, test_db: Session):
        service = make_service(test_db)
        dashboard = service.get_dashboard(999)
        assert dashboard is None

    def test_dashboard_missing_module2_data(self, test_db: Session, mock_dispute):
        state = ResolutionState(
            id=1, dispute_id=mock_dispute.id, case_file_id=None,
            fairness_score=None, confidence=None, ai_recommendation=None,
            recommendation_status=RecommendationStatus.PENDING,
            resolution_readiness=ResolutionReadiness.NOT_READY,
            evidence_completeness_pct=0.0, evidence_count=0,
            missing_evidence_count=0, contradiction_count=0,
            human_review_required=True, module2_available=False,
        )
        test_db.add(mock_dispute)
        test_db.add(state)
        test_db.commit()

        service = make_service(test_db)
        dashboard = service.get_dashboard(mock_dispute.id)
        assert dashboard is not None
        assert dashboard.fairness_overview.fairness_score is None
        assert dashboard.ai_recommendation.available is False


# -------------------- Tests: Evidence Recommendations --------------------

class TestEvidenceRecommendations:
    def test_generate_recommendations(self, test_db: Session, mock_dispute, mock_case_file):
        test_db.add(mock_dispute)
        test_db.add(mock_case_file)
        test_db.commit()

        service = make_service(test_db)
        result = service.generate_evidence_recommendations(mock_dispute.id)
        assert result.success is True
        assert result.total >= 0  # may be 0 if no gaps

    def test_get_evidence_recommendations(self, test_db: Session, mock_dispute, mock_case_file):
        rec = EvidenceRecommendation(
            recommendation_id="ER-001", dispute_id=mock_dispute.id, case_file_id=mock_case_file.id,
            evidence_type="proof_of_delivery", description="Upload proof", reason="Missing",
            priority=EvidenceRecommendationPriority.HIGH,
            requested_from=EvidenceRequestedFrom.MERCHANT,
            status=EvidenceRecommendationStatus.OPEN,
        )
        test_db.add(mock_dispute)
        test_db.add(mock_case_file)
        test_db.add(rec)
        test_db.commit()

        service = make_service(test_db)
        recs = service.get_evidence_recommendations(mock_dispute.id)
        assert len(recs) == 1
        assert recs[0].evidence_type == "proof_of_delivery"

    def test_recommendation_deduplication(self, test_db: Session, mock_dispute, mock_case_file):
        """Verify that generating recommendations doesn't create duplicates for the same evidence type."""
        rec = EvidenceRecommendation(
            recommendation_id="ER-001", dispute_id=mock_dispute.id, case_file_id=mock_case_file.id,
            evidence_type="proof_of_delivery", description="Upload proof", reason="Missing",
            priority=EvidenceRecommendationPriority.HIGH,
            requested_from=EvidenceRequestedFrom.MERCHANT,
            status=EvidenceRecommendationStatus.OPEN,
        )
        test_db.add(mock_dispute)
        test_db.add(mock_case_file)
        test_db.add(rec)
        test_db.commit()

        service = make_service(test_db)
        result = service.generate_evidence_recommendations(mock_dispute.id, refresh=False)
        
        # Count how many proof_of_delivery recommendations exist
        proof_of_delivery_recs = [r for r in result.recommendations if r.evidence_type == "proof_of_delivery"]
        assert len(proof_of_delivery_recs) == 1, "Should not create duplicate proof_of_delivery recommendations"


# -------------------- Tests: Evidence Submission --------------------

@pytest.mark.asyncio
class TestEvidenceSubmission:
    async def test_submit_evidence_creates_record(self, test_db: Session, mock_dispute, mock_case_file):
        test_db.add(mock_dispute)
        test_db.add(mock_case_file)
        test_db.commit()

        service = make_service(test_db)
        result = await service.submit_evidence(
            case_id=mock_dispute.id, title="Test Evidence",
            description="Test", file=None, actor=None, submitted_by_role="investigator",
        )
        assert result["success"] is True
        assert result["evidence_id"] is not None

    async def test_submit_evidence_creates_audit_and_notification(self, test_db: Session, mock_dispute, mock_case_file):
        test_db.add(mock_dispute)
        test_db.add(mock_case_file)
        test_db.commit()

        service = make_service(test_db)
        result = await service.submit_evidence(
            case_id=mock_dispute.id, title="Test Evidence",
            description="Test", file=None, actor=None, submitted_by_role="investigator",
        )
        assert result["success"] is True

        audits = test_db.query(ResolutionAuditLog).filter(ResolutionAuditLog.dispute_id == mock_dispute.id).all()
        assert len(audits) >= 1
        notifs = test_db.query(NotificationLog).filter(NotificationLog.dispute_id == mock_dispute.id).all()
        assert len(notifs) >= 1


# -------------------- Tests: Re-Scoring --------------------

class TestRescoring:
    @pytest.mark.asyncio
    async def test_trigger_rescore(self, test_db: Session, mock_dispute, mock_case_file):
        test_db.add(mock_dispute)
        test_db.add(mock_case_file)
        test_db.commit()

        service = make_service(test_db)
        result = await service.trigger_rescore(mock_dispute.id, reason="manual_trigger")
        assert result.success is True
        assert result.rescoring_event is not None

    def test_rescore_history(self, test_db: Session, mock_dispute, mock_case_file):
        test_db.add(mock_dispute)
        test_db.add(mock_case_file)
        test_db.commit()

        service = make_service(test_db)
        # Use sync rescore for history test
        state, event = service.rescoring_agent.rescore(mock_dispute.id, reason="test")
        history = service.get_rescore_history(mock_dispute.id)
        assert len(history) >= 1


# -------------------- Tests: Final Decisions --------------------

@pytest.mark.asyncio
class TestFinalDecisions:
    async def test_approve_decision(self, test_db: Session, mock_dispute, mock_resolution_state, mock_user_investigator):
        test_db.add(mock_dispute)
        test_db.add(mock_resolution_state)
        test_db.commit()

        service = make_service(test_db)
        decision = await service.approve_decision(mock_dispute.id, "Looks good", mock_user_investigator)
        assert decision is not None
        assert decision.outcome == RecommendationOutcome.APPROVE_CUSTOMER

    async def test_reject_decision(self, test_db: Session, mock_dispute, mock_resolution_state, mock_user_investigator):
        test_db.add(mock_dispute)
        test_db.add(mock_resolution_state)
        test_db.commit()

        service = make_service(test_db)
        decision = await service.reject_decision(mock_dispute.id, "Insufficient evidence", mock_user_investigator)
        assert decision is not None
        assert decision.outcome == RecommendationOutcome.ESCALATE_TO_HUMAN

    async def test_modify_decision(self, test_db: Session, mock_dispute, mock_resolution_state, mock_user_investigator):
        test_db.add(mock_dispute)
        test_db.add(mock_resolution_state)
        test_db.commit()

        service = make_service(test_db)
        decision = await service.modify_decision(
            mock_dispute.id, RecommendationOutcome.PARTIAL_RESOLUTION,
            "Partial refund approved", mock_user_investigator,
        )
        assert decision is not None
        assert decision.outcome == RecommendationOutcome.PARTIAL_RESOLUTION

    async def test_decision_creates_audit(self, test_db: Session, mock_dispute, mock_resolution_state, mock_user_investigator):
        test_db.add(mock_dispute)
        test_db.add(mock_resolution_state)
        test_db.commit()

        service = make_service(test_db)
        await service.approve_decision(mock_dispute.id, "Approved", mock_user_investigator)
        audits = test_db.query(ResolutionAuditLog).filter(ResolutionAuditLog.dispute_id == mock_dispute.id).all()
        assert any(a.event_type == ResolutionAuditEventType.INVESTIGATOR_APPROVED for a in audits)


# -------------------- Tests: Notifications --------------------

class TestNotifications:
    def test_get_notifications(self, test_db: Session, mock_dispute):
        notif = NotificationLog(
            dispute_id=mock_dispute.id, event_type=NotificationEventType.EVIDENCE_SUBMITTED,
            title="Test", message="Test message",
        )
        test_db.add(mock_dispute)
        test_db.add(notif)
        test_db.commit()

        service = make_service(test_db)
        notifs = service.get_notifications(mock_dispute.id)
        assert len(notifs) == 1

    def test_mark_notification_read(self, test_db: Session, mock_dispute):
        notif = NotificationLog(
            dispute_id=mock_dispute.id, event_type=NotificationEventType.EVIDENCE_SUBMITTED,
            title="Test", message="Test message", is_read=False,
        )
        test_db.add(mock_dispute)
        test_db.add(notif)
        test_db.commit()

        service = make_service(test_db)
        updated = service.mark_notification_read(notif.id)
        assert updated is not None
        assert updated.is_read is True


# -------------------- Tests: Module 2 Fallback --------------------

class TestModule2Fallback:
    def test_deterministic_fallback_returns_structure(self):
        package = {"case_file": {"dispute_id": "1"}}
        result = deterministic_fallback_reasoning(package, [], 0, 2, 0)
        assert "fairness_score" in result
        assert "confidence" in result
        assert "ai_recommendation" in result
        assert result["module2_available"] is False
        assert "deterministic" in result.get("explanation", "").lower()


# -------------------- Tests: Authorization --------------------

class TestAuthorization:
    def test_is_investigator_accepts_all_authorized_roles(self):
        # Current UserRole enum has no non-investigator role to test against.
        # Verify that all defined roles are accepted as investigators.
        for role in (UserRole.INVESTIGATOR, UserRole.MANAGER, UserRole.ADMIN):
            user = User(id=1, username="user", email="u@test.com", role=role, is_superuser=False)
            assert ResolutionService.is_investigator(user) is True