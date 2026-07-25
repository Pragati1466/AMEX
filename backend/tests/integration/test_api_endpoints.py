"""
API Integration Tests for DisputeIQ.
Tests the API endpoints with real HTTP requests.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch


@pytest.mark.integration
class TestEvidenceAPI:
    """Test suite for Evidence API endpoints."""
    
    def test_collect_evidence_success(self, test_client, mock_dispute):
        """Test successful evidence collection."""
        with patch('app.api.v1.evidence.EvidenceCollectionService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.collect_evidence.return_value = {
                "success": True,
                "case_file_id": 1,
                "evidence_count": 5
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.post(
                "/api/v1/evidence/collect",
                json={"dispute_id": mock_dispute["id"]}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
    
    def test_collect_evidence_not_found(self, test_client):
        """Test evidence collection with non-existent dispute."""
        with patch('app.api.v1.evidence.EvidenceCollectionService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.collect_evidence.side_effect = Exception("Dispute not found")
            mock_service.return_value = mock_service_instance
            
            response = test_client.post(
                "/api/v1/evidence/collect",
                json={"dispute_id": 999}
            )
            
            assert response.status_code == 500
    
    def test_get_evidence_list(self, test_client, mock_case_file):
        """Test getting evidence list."""
        with patch('app.api.v1.evidence.EvidenceCollectionService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_evidence_list.return_value = {
                "total": 5,
                "evidence": [
                    {
                        "evidence_id": "EV-001",
                        "evidence_type": "transaction",
                        "title": "Transaction Record"
                    }
                ]
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.get(f"/api/v1/evidence/case-file/{mock_case_file['id']}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 5


@pytest.mark.integration
class TestTimelineAPI:
    """Test suite for Timeline API endpoints."""
    
    def test_reconstruct_timeline_success(self, test_client, mock_case_file):
        """Test successful timeline reconstruction."""
        with patch('app.api.v1.timeline.TimelineService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.reconstruct_timeline.return_value = {
                "success": True,
                "timeline_id": 1,
                "events_count": 5
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.post(
                f"/api/v1/timeline/reconstruct/{mock_case_file['id']}",
                json={"clear_existing": True}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
    
    def test_get_timeline(self, test_client, mock_case_file):
        """Test getting timeline."""
        with patch('app.api.v1.timeline.TimelineService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_timeline.return_value = {
                "case_file_id": mock_case_file["id"],
                "events": [
                    {
                        "event_id": "TE-001",
                        "event_type": "payment_made",
                        "event_date": "2024-06-01"
                    }
                ]
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.get(f"/api/v1/timeline/case-file/{mock_case_file['id']}")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["events"]) == 1
    
    def test_get_timeline_summary(self, test_client, mock_case_file):
        """Test getting timeline summary."""
        with patch('app.api.v1.timeline.TimelineService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_timeline_summary.return_value = {
                "total_events": 5,
                "date_range": "2024-06-01 to 2024-06-05",
                "event_types": ["payment_made", "order_placed"]
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.get(f"/api/v1/timeline/summary/{mock_case_file['id']}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["total_events"] == 5


@pytest.mark.integration
class TestValidationAPI:
    """Test suite for Validation API endpoints."""
    
    def test_validate_case_file_success(self, test_client, mock_case_file):
        """Test successful case file validation."""
        with patch('app.api.v1.validation.ValidationService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.validate_case_file.return_value = {
                "success": True,
                "validation_id": 1,
                "issues_count": 2
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.post(
                f"/api/v1/validation/validate/{mock_case_file['id']}",
                json={"clear_existing": True}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
    
    def test_get_validations(self, test_client, mock_case_file):
        """Test getting validations."""
        with patch('app.api.v1.validation.ValidationService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_validations.return_value = {
                "total": 2,
                "validations": [
                    {
                        "validation_id": "VL-001",
                        "category": "missing_evidence",
                        "severity": "warning"
                    }
                ]
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.get(f"/api/v1/validation/case-file/{mock_case_file['id']}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 2
    
    def test_resolve_validation(self, test_client):
        """Test resolving validation."""
        with patch('app.api.v1.validation.ValidationService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.resolve_validation.return_value = {
                "success": True,
                "validation_id": 1,
                "is_resolved": True
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.put("/api/v1/validation/resolve/1")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True


@pytest.mark.integration
class TestPolicyAPI:
    """Test suite for Policy API endpoints."""
    
    def test_map_policies_success(self, test_client, mock_case_file):
        """Test successful policy mapping."""
        with patch('app.api.v1.policy.PolicyService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.map_policies.return_value = {
                "success": True,
                "mappings_count": 3
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.post(
                f"/api/v1/policy/map/{mock_case_file['id']}",
                json={"clear_existing": True}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
    
    def test_get_policy_mappings(self, test_client, mock_case_file):
        """Test getting policy mappings."""
        with patch('app.api.v1.policy.PolicyService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_policy_mappings.return_value = {
                "total": 3,
                "mappings": [
                    {
                        "mapping_id": "PM-001",
                        "match_type": "semantic",
                        "relevance_score": 0.85
                    }
                ]
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.get(f"/api/v1/policy/case-file/{mock_case_file['id']}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 3
    
    def test_semantic_search(self, test_client):
        """Test semantic search."""
        with patch('app.api.v1.policy.PolicyService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.semantic_search.return_value = {
                "results": [
                    {
                        "policy_id": "POL-001",
                        "score": 0.85,
                        "title": "Refund Policy"
                    }
                ]
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.post(
                "/api/v1/policy/search",
                json={"query": "product not received"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["results"]) == 1


@pytest.mark.integration
class TestCaseFileAPI:
    """Test suite for Case File API endpoints."""
    
    def test_generate_case_file_success(self, test_client, mock_case_file):
        """Test successful case file generation."""
        with patch('app.api.v1.case_file.CaseFileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.generate_case_file.return_value = {
                "success": True,
                "case_file_id": mock_case_file["id"],
                "confidence_score": 0.85
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.post(
                f"/api/v1/case-file/generate/{mock_case_file['id']}",
                json={"user_id": 1}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
    
    def test_get_case_file(self, test_client, mock_case_file):
        """Test getting case file."""
        with patch('app.api.v1.case_file.CaseFileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_case_file.return_value = {
                "id": mock_case_file["id"],
                "case_file_id": "CF-ABC123",
                "status": "complete",
                "confidence_score": 0.85
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.get(f"/api/v1/case-file/{mock_case_file['id']}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == mock_case_file["id"]
    
    def test_get_standardized_package(self, test_client, mock_case_file):
        """Test getting standardized package."""
        with patch('app.api.v1.case_file.CaseFileService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_standardized_package.return_value = {
                "case_file": {
                    "id": mock_case_file["id"],
                    "case_file_id": "CF-ABC123"
                },
                "timeline": [],
                "evidence": [],
                "validations": [],
                "policy_mapping": [],
                "investigation_summary": "Test summary",
                "confidence_score": 0.85
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.get(f"/api/v1/case-file/{mock_case_file['id']}/package")
            
            assert response.status_code == 200
            data = response.json()
            assert "case_file" in data
            assert "confidence_score" in data


@pytest.mark.integration
class TestInvestigationAPI:
    """Test suite for Investigation API endpoints."""
    
    def test_run_investigation_success(self, test_client, mock_dispute):
        """Test successful investigation workflow."""
        with patch('app.api.v1.investigation.InvestigationOrchestratorService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.run_investigation.return_value = {
                "success": True,
                "dispute_id": mock_dispute["id"],
                "case_file_id": 1,
                "confidence_score": 0.85,
                "steps_completed": ["evidence_collection", "timeline_reconstruction"]
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.post(
                f"/api/v1/investigate/{mock_dispute['id']}",
                json={"user_id": 1, "clear_existing": False}
            )
            
            assert response.status_code == 202
            data = response.json()
            assert data["success"] is True
    
    def test_get_investigation_status(self, test_client, mock_dispute):
        """Test getting investigation status."""
        with patch('app.api.v1.investigation.InvestigationOrchestratorService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_investigation_status.return_value = {
                "dispute_id": mock_dispute["id"],
                "status": "complete",
                "confidence_score": 0.85
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.get(f"/api/v1/investigate/{mock_dispute['id']}/status")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "complete"
    
    def test_submit_investigation(self, test_client, mock_dispute):
        """Test submitting investigation."""
        with patch('app.api.v1.investigation.InvestigationOrchestratorService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.submit_investigation.return_value = {
                "success": True,
                "dispute_id": mock_dispute["id"],
                "status": "submitted"
            }
            mock_service.return_value = mock_service_instance
            
            response = test_client.post(
                f"/api/v1/investigate/{mock_dispute['id']}/submit",
                json={"user_id": 1}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True


@pytest.mark.integration
class TestHealthEndpoints:
    """Test suite for health check endpoints."""
    
    def test_root_endpoint(self, test_client):
        """Test root endpoint."""
        response = test_client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "app" in data
        assert "version" in data
        assert "status" in data
    
    def test_health_check(self, test_client):
        """Test health check endpoint."""
        response = test_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


@pytest.mark.integration
class TestAPIAuthentication:
    """Test suite for API authentication."""
    
    def test_protected_endpoint_without_auth(self, test_client):
        """Test protected endpoint without authentication."""
        response = test_client.get("/api/v1/evidence/list")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403]
    
    def test_protected_endpoint_with_auth(self, test_client, auth_headers):
        """Test protected endpoint with authentication."""
        response = test_client.get(
            "/api/v1/evidence/list",
            headers=auth_headers
        )
        
        # Should return 200 or 404 (if no data)
        assert response.status_code in [200, 404]


@pytest.mark.integration
class TestAPIErrorHandling:
    """Test suite for API error handling."""
    
    def test_invalid_request_data(self, test_client):
        """Test API with invalid request data."""
        response = test_client.post(
            "/api/v1/evidence/collect",
            json={"invalid_field": "value"}
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422
    
    def test_nonexistent_resource(self, test_client):
        """Test API with non-existent resource."""
        response = test_client.get("/api/v1/case-file/99999")
        
        # Should return 404
        assert response.status_code == 404
    
    def test_method_not_allowed(self, test_client):
        """Test API with wrong HTTP method."""
        response = test_client.put("/api/v1/evidence/collect")
        
        # Should return 405
        assert response.status_code == 405
