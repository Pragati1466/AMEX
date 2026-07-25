"""
Integration tests for Module 1 -> Module 2 -> Module 3 data flow.
Tests the complete pipeline from evidence collection to resolution.
"""

import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db, engine, Base
from app.models.existing import Customer, Merchant, Transaction, Order, Dispute, DisputeReason
from app.models.new import CaseFile, EvidenceRepository, ResolutionState
from app.services.case_file_service import CaseFileService
from app.services.resolution_service import ResolutionService


@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = next(get_db())
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_dispute(db):
    """Create a sample dispute for testing."""
    customer = Customer(
        customer_id="CUST001",
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        is_verified=True
    )
    db.add(customer)
    
    merchant = Merchant(
        merchant_id="MCH001",
        business_name="Test Merchant",
        email="merchant@example.com",
        is_active=True
    )
    db.add(merchant)
    
    transaction = Transaction(
        transaction_id="TXN001",
        customer_id=1,
        merchant_id=1,
        transaction_type="sale",
        amount=100.00,
        currency="USD",
        transaction_date="2026-01-15T10:00:00",
        is_disputed=True
    )
    db.add(transaction)
    
    order = Order(
        order_id="ORD001",
        customer_id=1,
        merchant_id=1,
        order_date="2026-01-15T10:00:00",
        status="shipped",
        total_amount=100.00,
        currency="USD"
    )
    db.add(order)
    
    dispute = Dispute(
        dispute_id="DSP001",
        customer_id=1,
        merchant_id=1,
        transaction_id=1,
        order_id=1,
        reason=DisputeReason.PRODUCT_NOT_RECEIVED,
        description="Customer claims product not received",
        amount=100.00,
        currency="USD",
        filed_at="2026-01-20T10:00:00"
    )
    db.add(dispute)
    db.commit()
    db.refresh(dispute)
    
    return dispute


def test_complete_pipeline(db, client, sample_dispute):
    """Test the complete pipeline from evidence collection to resolution."""
    
    # Step 1: Collect evidence (Module 1)
    response = client.post(
        "/api/v1/evidence/collect",
        json={"dispute_id": sample_dispute.id}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "case_file" in data
    
    case_file_id = data["case_file"]["id"]
    
    # Step 2: Reconstruct timeline (Module 1)
    response = client.post(
        "/api/v1/timeline/reconstruct",
        json={"case_file_id": case_file_id, "clear_existing": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["timeline_reconstructed"] is True
    
    # Step 3: Validate evidence (Module 1)
    response = client.post(
        "/api/v1/validation/validate",
        json={"case_file_id": case_file_id, "clear_existing": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Step 4: Map policies (Module 1)
    response = client.post(
        "/api/v1/policy/map",
        json={"case_file_id": case_file_id, "clear_existing": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Step 5: Get standardized package (Module 1 -> Module 2)
    response = client.get(f"/api/v1/case-file/{case_file_id}/package")
    assert response.status_code == 200
    package = response.json()
    assert "case_file" in package
    assert "evidence" in package
    assert "timeline" in package
    assert "validations" in package
    assert "policy_mappings" in package
    
    # Step 6: Trigger re-scoring (Module 2 -> Module 3)
    response = client.post(
        f"/api/v1/resolution/{sample_dispute.id}/rescore",
        json={"reason": "test_pipeline"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Step 7: Get resolution state (Module 3)
    response = client.get(f"/api/v1/resolution/{sample_dispute.id}")
    assert response.status_code == 200
    state = response.json()
    assert "fairness_score" in state
    assert "confidence" in state
    assert "ai_recommendation" in state
    
    # Step 8: Get dashboard (Module 3)
    response = client.get(f"/api/v1/resolution/{sample_dispute.id}/dashboard")
    assert response.status_code == 200
    dashboard = response.json()
    assert "fairness_overview" in dashboard
    assert "ai_recommendation" in dashboard
    assert "evidence_completeness" in dashboard


def test_module2_fallback_handling(db, sample_dispute):
    """Test Module 2 fallback when LLM is unavailable."""
    from app.services.module2_adapter import deterministic_fallback_reasoning
    
    # Create a basic case file
    case_file = CaseFile(
        dispute_id=sample_dispute.id,
        case_file_id="CF-TEST001",
        status="draft"
    )
    db.add(case_file)
    db.commit()
    
    # Create some evidence
    evidence = EvidenceRepository(
        case_file_id=case_file.id,
        evidence_id="EV-TEST001",
        evidence_type="transaction",
        source="system",
        status="collected",
        title="Test Transaction",
        amount=100.00,
        currency="USD"
    )
    db.add(evidence)
    db.commit()
    
    # Test fallback reasoning
    package = {
        "case_file": {
            "case_file_id": "CF-TEST001",
            "confidence_score": 0.7
        }
    }
    
    result = deterministic_fallback_reasoning(
        package=package,
        validations=[],
        evidence_count=1,
        missing_count=0,
        contradiction_count=0
    )
    
    assert result["module2_available"] is False
    assert "fairness_score" in result
    assert "ai_recommendation" in result
    assert "explanation" in result
    assert result["human_review_required"] is True  # Fallback always requires human review


def test_evidence_recommendation_generation(db, sample_dispute):
    """Test smart evidence recommendation generation."""
    from app.agents.resolution.evidence_recommendation_agent import SmartEvidenceRecommendationAgent
    
    # Create case file
    case_file = CaseFile(
        dispute_id=sample_dispute.id,
        case_file_id="CF-TEST002",
        status="draft"
    )
    db.add(case_file)
    db.commit()
    
    # Generate recommendations
    agent = SmartEvidenceRecommendationAgent(db)
    recommendations = agent.generate_recommendations(
        dispute_id=sample_dispute.id,
        refresh=True
    )
    
    assert len(recommendations) > 0
    # Should recommend evidence for product_not_received dispute
    recommendation_types = [rec.evidence_type for rec in recommendations]
    assert any("proof_of_delivery" in rt or "delivery" in rt.lower() for rt in recommendation_types)


def test_rescoring_with_evidence_change(db, sample_dispute):
    """Test that rescoring updates fairness scores when evidence changes."""
    from app.agents.resolution.rescoring_agent import RealTimeRescoringAgent
    
    # Create case file with initial state
    case_file = CaseFile(
        dispute_id=sample_dispute.id,
        case_file_id="CF-TEST003",
        status="draft"
    )
    db.add(case_file)
    db.commit()
    
    # Initial rescoring
    agent = RealTimeRescoringAgent(db)
    state, event = agent.rescore(
        dispute_id=sample_dispute.id,
        reason="initial_scoring"
    )
    
    assert state is not None
    assert state.fairness_score is not None
    initial_score = state.fairness_score
    
    # Add new evidence
    new_evidence = EvidenceRepository(
        case_file_id=case_file.id,
        evidence_id="EV-NEW001",
        evidence_type="uploaded_document",
        source="upload",
        status="collected",
        title="New Delivery Proof",
        description="Customer uploaded delivery confirmation"
    )
    db.add(new_evidence)
    db.commit()
    
    # Re-score with new evidence
    state, event = agent.rescore(
        dispute_id=sample_dispute.id,
        reason="evidence_added",
        triggering_evidence_id=new_evidence.id
    )
    
    assert state.evidence_count > 0
    assert event.change_reason == "evidence_added"
    assert event.triggering_evidence_id == new_evidence.id


def test_dashboard_consolidation(db, sample_dispute):
    """Test that dashboard properly consolidates all resolution data."""
    from app.agents.resolution.dashboard_agent import LiveFairnessDashboardAgent
    
    # Create complete resolution state
    case_file = CaseFile(
        dispute_id=sample_dispute.id,
        case_file_id="CF-TEST004",
        status="complete"
    )
    db.add(case_file)
    db.commit()
    
    agent = LiveFairnessDashboardAgent(db)
    dashboard = agent.build_dashboard(
        case_id=sample_dispute.id,
        state=None,
        include_audit=True
    )
    
    assert dashboard is not None
    assert "fairness_overview" in dashboard
    assert "ai_recommendation" in dashboard
    assert "evidence_completeness" in dashboard
    assert "explainability" in dashboard


if __name__ == "__main__":
    pytest.main([__file__, "-v"])