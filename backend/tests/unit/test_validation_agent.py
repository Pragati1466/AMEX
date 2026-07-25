"""
Unit Tests for Evidence Validation Agent.
Tests the evidence validation functionality in isolation.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime
from sqlalchemy.orm import Session

from app.agents.evidence_completeness import EvidenceCompletenessAgent
from app.models.evidence_validation import EvidenceValidation
from app.core.exception_handlers import DatabaseException, NotFoundException


@pytest.mark.unit
class TestEvidenceCompletenessAgent:
    """Test suite for Evidence Completeness Agent."""
    
    @pytest.fixture
    def agent(self, test_db):
        """Provide Evidence Completeness Agent instance."""
        return EvidenceCompletenessAgent(test_db)
    
    @pytest.fixture
    def mock_evidence_data(self):
        """Provide mock evidence data."""
        return [
            {
                "id": 1,
                "evidence_type": "transaction",
                "status": "validated",
                "title": "Transaction Record",
            },
            {
                "id": 2,
                "evidence_type": "order",
                "status": "validated",
                "title": "Order Details",
            },
            {
                "id": 3,
                "evidence_type": "communication",
                "status": "validated",
                "title": "Customer Email",
            }
        ]
    
    def test_agent_initialization(self, test_db):
        """Test that agent initializes correctly."""
        agent = EvidenceCompletenessAgent(test_db)
        
        assert agent.db is not None
        assert isinstance(agent.db, Session)
    
    def test_validate_case_file_success(self, agent, mock_evidence_data):
        """Test successful case file validation."""
        with patch.object(agent.db, 'query') as mock_query:
            # Mock evidence retrieval
            mock_query.return_value.filter.return_value.all.return_value = mock_evidence_data
            
            # Mock validation creation
            with patch.object(agent, '_create_validation_record') as mock_create:
                mock_create.return_value = Mock()
                
                agent.validate_case_file(1, clear_existing=True)
                
                # Should create validation records
                assert mock_create.call_count > 0
    
    def test_validate_case_file_clear_existing(self, agent):
        """Test validation with clearing existing validations."""
        with patch.object(agent.db, 'query') as mock_query:
            # Mock existing validations
            mock_query.return_value.filter.return_value.delete.return_value = 1
            
            with patch.object(agent, '_perform_rule_based_validation') as mock_validate:
                mock_validate.return_value = []
                
                agent.validate_case_file(1, clear_existing=True)
                
                # Should delete existing validations
                mock_query.return_value.filter.return_value.delete.assert_called_once()
    
    def test_validate_case_file_without_clearing(self, agent):
        """Test validation without clearing existing validations."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.all.return_value = []
            
            with patch.object(agent, '_perform_rule_based_validation') as mock_validate:
                mock_validate.return_value = []
                
                agent.validate_case_file(1, clear_existing=False)
                
                # Should not delete existing validations
                mock_query.return_value.filter.return_value.delete.assert_not_called()
    
    def test_perform_rule_based_validation(self, agent, mock_evidence_data):
        """Test rule-based validation."""
        validations = agent._perform_rule_based_validation(mock_evidence_data)
        
        assert validations is not None
        assert isinstance(validations, list)
    
    def test_check_missing_evidence_types(self, agent, mock_evidence_data):
        """Test missing evidence type detection."""
        missing_types = agent._check_missing_evidence_types(mock_evidence_data)
        
        # Should detect if certain types are missing
        assert isinstance(missing_types, list)
    
    def test_check_unvalidated_evidence(self, agent):
        """Test unvalidated evidence detection."""
        evidence_with_unvalidated = [
            {
                "id": 1,
                "evidence_type": "transaction",
                "status": "pending",  # Not validated
                "title": "Transaction Record",
            },
            {
                "id": 2,
                "evidence_type": "order",
                "status": "validated",
                "title": "Order Details",
            }
        ]
        
        unvalidated = agent._check_unvalidated_evidence(evidence_with_unvalidated)
        
        assert len(unvalidated) == 1
        assert unvalidated[0]["id"] == 1
    
    def test_check_conflicting_information(self, agent):
        """Test conflicting information detection."""
        evidence_with_conflicts = [
            {
                "id": 1,
                "evidence_type": "transaction",
                "metadata": {"amount": 99.99},
                "title": "Transaction Record",
            },
            {
                "id": 2,
                "evidence_type": "order",
                "metadata": {"amount": 149.99},  # Different amount
                "title": "Order Details",
            }
        ]
        
        conflicts = agent._check_conflicting_information(evidence_with_conflicts)
        
        assert isinstance(conflicts, list)
    
    def test_check_incomplete_evidence(self, agent):
        """Test incomplete evidence detection."""
        incomplete_evidence = [
            {
                "id": 1,
                "evidence_type": "transaction",
                "metadata": {},  # Empty metadata
                "title": "Transaction Record",
            }
        ]
        
        incomplete = agent._check_incomplete_evidence(incomplete_evidence)
        
        assert len(incomplete) == 1
    
    def test_create_validation_record(self, agent):
        """Test validation record creation."""
        validation_data = {
            "category": "missing_evidence",
            "severity": "warning",
            "description": "Missing receipt",
            "is_resolved": False,
        }
        
        with patch.object(agent.db, 'add') as mock_add:
            with patch.object(agent.db, 'commit') as mock_commit:
                with patch('app.agents.evidence_completeness.generate_validation_id') as mock_gen:
                    mock_gen.return_value = "VL-001"
                    
                    result = agent._create_validation_record(1, validation_data)
                    
                    assert result is not None
                    mock_add.assert_called_once()
                    mock_commit.assert_called_once()
    
    def test_perform_llm_analysis(self, agent, mock_evidence_data):
        """Test LLM-based analysis."""
        with patch.object(agent, '_call_groq_api') as mock_groq:
            mock_groq.return_value = {
                "suggestions": [
                    "Collect more evidence",
                    "Validate transaction details"
                ]
            }
            
            suggestions = agent._perform_llm_analysis(mock_evidence_data)
            
            assert suggestions is not None
            assert len(suggestions) == 2
    
    def test_call_groq_api_success(self, agent):
        """Test successful Groq API call."""
        with patch('app.agents.evidence_completeness.requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "choices": [
                    {
                        "message": {
                            "content": "Test suggestions"
                        }
                    }
                ]
            }
            mock_post.return_value = mock_response
            
            result = agent._call_groq_api("test prompt")
            
            assert result is not None
    
    def test_call_groq_api_failure(self, agent):
        """Test Groq API call failure."""
        with patch('app.agents.evidence_completeness.requests.post') as mock_post:
            mock_post.side_effect = Exception("API call failed")
            
            result = agent._call_groq_api("test prompt")
            
            assert result is None
    
    def test_calculate_validation_score(self, agent):
        """Test validation score calculation."""
        validations = [
            {"severity": "critical", "is_resolved": False},
            {"severity": "warning", "is_resolved": False},
            {"severity": "info", "is_resolved": True},
        ]
        
        score = agent._calculate_validation_score(validations)
        
        assert score is not None
        assert 0 <= score <= 100
    
    def test_get_validation_summary(self, agent):
        """Test validation summary retrieval."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_validation = Mock()
            mock_validation.id = 1
            mock_validation.category = "missing_evidence"
            mock_validation.severity = "warning"
            mock_validation.is_resolved = False
            
            mock_query.return_value.filter.return_value.all.return_value = [mock_validation]
            
            summary = agent.get_validation_summary(1)
            
            assert summary is not None
            assert summary["total_validations"] == 1
    
    def test_resolve_validation(self, agent):
        """Test validation resolution."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_validation = Mock()
            mock_validation.id = 1
            mock_validation.is_resolved = False
            
            mock_query.return_value.filter.return_value.first.return_value = mock_validation
            
            with patch.object(agent.db, 'commit') as mock_commit:
                agent.resolve_validation(1)
                
                assert mock_validation.is_resolved is True
                mock_commit.assert_called_once()
    
    def test_get_unresolved_critical_issues(self, agent):
        """Test retrieval of unresolved critical issues."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_validation = Mock()
            mock_validation.id = 1
            mock_validation.category = "missing_evidence"
            mock_validation.severity = "critical"
            mock_validation.is_resolved = False
            
            mock_query.return_value.filter.return_value.all.return_value = [mock_validation]
            
            issues = agent.get_unresolved_critical_issues(1)
            
            assert len(issues) == 1
            assert issues[0].severity == "critical"
    
    def test_handle_database_error(self, agent):
        """Test database error handling."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_query.side_effect = Exception("Database connection failed")
            
            with pytest.raises(DatabaseException):
                agent.validate_case_file(1)
    
    def test_validate_evidence_completeness(self, agent):
        """Test evidence completeness validation."""
        evidence = [
            {"evidence_type": "transaction"},
            {"evidence_type": "order"},
            {"evidence_type": "communication"}
        ]
        
        completeness = agent._validate_evidence_completeness(evidence)
        
        assert completeness is not None
        assert "score" in completeness
        assert "missing_types" in completeness
    
    def test_generate_validation_id(self, agent):
        """Test validation ID generation."""
        with patch('app.agents.evidence_completeness.uuid4') as mock_uuid:
            mock_uuid.return_value = "test-uuid"
            
            validation_id = agent._generate_validation_id()
            
            assert validation_id is not None
            assert "VL-" in validation_id
    
    def test_determine_severity(self, agent):
        """Test severity determination."""
        severity = agent._determine_severity("missing_evidence")
        
        assert severity in ["critical", "warning", "info"]
    
    def test_create_recommendation(self, agent):
        """Test recommendation creation based on validation."""
        validation = {
            "category": "missing_evidence",
            "severity": "warning",
            "description": "Missing receipt"
        }
        
        recommendation = agent._create_recommendation(validation)
        
        assert recommendation is not None
        assert len(recommendation) > 0


@pytest.mark.unit
class TestEvidenceValidationModel:
    """Test suite for Evidence Validation model."""
    
    def test_evidence_validation_creation(self, test_db):
        """Test evidence validation model creation."""
        validation = EvidenceValidation(
            validation_id="VL-001",
            case_file_id=1,
            category="missing_evidence",
            severity="warning",
            description="Missing receipt",
            is_resolved=False,
        )
        
        assert validation.validation_id == "VL-001"
        assert validation.category == "missing_evidence"
        assert validation.severity == "warning"
        assert validation.is_resolved is False
    
    def test_evidence_validation_to_dict(self, test_db):
        """Test evidence validation to_dict method."""
        validation = EvidenceValidation(
            validation_id="VL-001",
            case_file_id=1,
            category="missing_evidence",
            severity="warning",
            description="Missing receipt",
            is_resolved=False,
        )
        
        validation_dict = validation.to_dict()
        
        assert isinstance(validation_dict, dict)
        assert validation_dict["validation_id"] == "VL-001"
        assert validation_dict["category"] == "missing_evidence"
