"""
Unit Tests for Evidence Collection Agent.
Tests the evidence collection functionality in isolation.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from sqlalchemy.orm import Session

from app.agents.evidence_collection import EvidenceCollectionAgent
from app.models.case_file import CaseFile
from app.models.evidence_repository import EvidenceRepository
from app.core.exception_handlers import DatabaseException, NotFoundException


@pytest.mark.unit
class TestEvidenceCollectionAgent:
    """Test suite for Evidence Collection Agent."""
    
    @pytest.fixture
    def agent(self, test_db):
        """Provide Evidence Collection Agent instance."""
        return EvidenceCollectionAgent(test_db)
    
    @pytest.fixture
    def mock_dispute_data(self):
        """Provide mock dispute data."""
        return {
            "id": 1,
            "dispute_id": "DSP-12345",
            "customer_id": 1,
            "merchant_id": 1,
            "transaction_id": 1,
            "order_id": 1,
            "payment_id": 1,
        }
    
    def test_agent_initialization(self, test_db):
        """Test that agent initializes correctly."""
        agent = EvidenceCollectionAgent(test_db)
        
        assert agent.db is not None
        assert isinstance(agent.db, Session)
    
    def test_collect_all_evidence_success(self, agent, mock_dispute_data):
        """Test successful evidence collection."""
        # Mock the database queries
        with patch.object(agent.db, 'query') as mock_query:
            # Mock dispute query
            mock_dispute = Mock()
            mock_dispute.id = mock_dispute_data["id"]
            mock_dispute.customer_id = mock_dispute_data["customer_id"]
            mock_dispute.merchant_id = mock_dispute_data["merchant_id"]
            mock_dispute.transaction_id = mock_dispute_data["transaction_id"]
            mock_dispute.order_id = mock_dispute_data["order_id"]
            mock_dispute.payment_id = mock_dispute_data["payment_id"]
            
            mock_query.return_value.filter.return_value.first.return_value = mock_dispute
            
            # Mock case file creation
            mock_case_file = Mock()
            mock_case_file.id = 1
            mock_case_file.case_file_id = "CF-ABC123"
            
            with patch.object(agent, '_create_case_file') as mock_create:
                mock_create.return_value = mock_case_file
                
                # Mock evidence collection methods
                with patch.object(agent, '_collect_transaction_evidence') as mock_trans:
                    with patch.object(agent, '_collect_order_evidence') as mock_order:
                        with patch.object(agent, '_collect_payment_evidence') as mock_payment:
                            result = agent.collect_all_evidence(mock_dispute_data["id"])
                            
                            assert result is not None
                            assert result.id == 1
                            mock_create.assert_called_once()
                            mock_trans.assert_called_once()
                            mock_order.assert_called_once()
                            mock_payment.assert_called_once()
    
    def test_collect_all_evidence_dispute_not_found(self, agent):
        """Test evidence collection when dispute not found."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.first.return_value = None
            
            with pytest.raises(NotFoundException):
                agent.collect_all_evidence(999)
    
    def test_create_case_file(self, agent, mock_dispute_data):
        """Test case file creation."""
        with patch.object(agent.db, 'add') as mock_add:
            with patch.object(agent.db, 'commit') as mock_commit:
                with patch.object(agent.db, 'refresh') as mock_refresh:
                    mock_case_file = Mock()
                    mock_case_file.id = 1
                    mock_case_file.case_file_id = "CF-ABC123"
                    mock_refresh.return_value = mock_case_file
                    
                    result = agent._create_case_file(mock_dispute_data["id"])
                    
                    assert result is not None
                    mock_add.assert_called_once()
                    mock_commit.assert_called_once()
    
    def test_collect_transaction_evidence(self, agent, mock_case_file):
        """Test transaction evidence collection."""
        with patch.object(agent.db, 'query') as mock_query:
            # Mock transaction data
            mock_transaction = Mock()
            mock_transaction.id = 1
            mock_transaction.transaction_id = "TXN-12345"
            mock_transaction.amount = 99.99
            mock_transaction.currency = "USD"
            mock_transaction.status = "completed"
            
            mock_query.return_value.filter.return_value.first.return_value = mock_transaction
            
            with patch.object(agent, '_create_evidence_record') as mock_create:
                mock_create.return_value = Mock()
                
                agent._collect_transaction_evidence(mock_case_file.id, 1)
                
                mock_create.assert_called_once()
    
    def test_collect_order_evidence(self, agent, mock_case_file):
        """Test order evidence collection."""
        with patch.object(agent.db, 'query') as mock_query:
            # Mock order data
            mock_order = Mock()
            mock_order.id = 1
            mock_order.order_id = "ORD-12345"
            mock_order.status = "shipped"
            mock_order.total_amount = 99.99
            
            mock_query.return_value.filter.return_value.first.return_value = mock_order
            
            with patch.object(agent, '_create_evidence_record') as mock_create:
                mock_create.return_value = Mock()
                
                agent._collect_order_evidence(mock_case_file.id, 1)
                
                mock_create.assert_called_once()
    
    def test_collect_payment_evidence(self, agent, mock_case_file):
        """Test payment evidence collection."""
        with patch.object(agent.db, 'query') as mock_query:
            # Mock payment data
            mock_payment = Mock()
            mock_payment.id = 1
            mock_payment.payment_id = "PAY-12345"
            mock_payment.amount = 99.99
            mock_payment.status = "success"
            
            mock_query.return_value.filter.return_value.first.return_value = mock_payment
            
            with patch.object(agent, '_create_evidence_record') as mock_create:
                mock_create.return_value = Mock()
                
                agent._collect_payment_evidence(mock_case_file.id, 1)
                
                mock_create.assert_called_once()
    
    def test_create_evidence_record(self, agent, mock_case_file):
        """Test evidence record creation."""
        evidence_data = {
            "evidence_type": "transaction",
            "source": "database",
            "title": "Transaction Record",
            "description": "Transaction details",
            "metadata": {"transaction_id": "TXN-12345"},
        }
        
        with patch.object(agent.db, 'add') as mock_add:
            with patch.object(agent.db, 'commit') as mock_commit:
                mock_evidence = Mock()
                mock_evidence.id = 1
                mock_evidence.evidence_id = "EV-001"
                
                with patch('app.agents.evidence_collection.generate_evidence_id') as mock_gen:
                    mock_gen.return_value = "EV-001"
                    
                    result = agent._create_evidence_record(mock_case_file.id, evidence_data)
                    
                    assert result is not None
                    mock_add.assert_called_once()
                    mock_commit.assert_called_once()
    
    def test_collect_communication_evidence(self, agent, mock_case_file):
        """Test communication evidence collection."""
        with patch.object(agent.db, 'query') as mock_query:
            # Mock communication data
            mock_comm = Mock()
            mock_comm.id = 1
            mock_comm.communication_type = "email"
            mock_comm.subject = "Dispute Inquiry"
            mock_comm.body = "Customer inquiry about dispute"
            
            mock_query.return_value.filter.return_value.all.return_value = [mock_comm]
            
            with patch.object(agent, '_create_evidence_record') as mock_create:
                mock_create.return_value = Mock()
                
                agent._collect_communication_evidence(mock_case_file.id, 1)
                
                mock_create.assert_called_once()
    
    def test_handle_database_error(self, agent):
        """Test database error handling."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_query.side_effect = Exception("Database connection failed")
            
            with pytest.raises(DatabaseException):
                agent.collect_all_evidence(1)
    
    def test_evidence_id_generation(self, agent):
        """Test evidence ID generation."""
        with patch('app.agents.evidence_collection.uuid4') as mock_uuid:
            mock_uuid.return_value = "test-uuid"
            
            evidence_id = agent._generate_evidence_id()
            
            assert evidence_id is not None
            assert "EV-" in evidence_id
    
    def test_collect_all_evidence_with_existing_case_file(self, agent, mock_dispute_data):
        """Test evidence collection when case file already exists."""
        with patch.object(agent.db, 'query') as mock_query:
            # Mock dispute
            mock_dispute = Mock()
            mock_dispute.id = mock_dispute_data["id"]
            mock_query.return_value.filter.return_value.first.return_value = mock_dispute
            
            # Mock existing case file
            mock_existing_case_file = Mock()
            mock_existing_case_file.id = 1
            
            with patch.object(agent, '_get_existing_case_file') as mock_get:
                mock_get.return_value = mock_existing_case_file
                
                result = agent.collect_all_evidence(mock_dispute_data["id"])
                
                assert result is not None
                assert result.id == 1
                mock_get.assert_called_once()
    
    def test_collect_refund_history_evidence(self, agent, mock_case_file):
        """Test refund history evidence collection."""
        with patch.object(agent.db, 'query') as mock_query:
            # Mock refund history data
            mock_refund = Mock()
            mock_refund.id = 1
            mock_refund.refund_id = "REF-12345"
            mock_refund.amount = 99.99
            mock_refund.status = "processed"
            
            mock_query.return_value.filter.return_value.all.return_value = [mock_refund]
            
            with patch.object(agent, '_create_evidence_record') as mock_create:
                mock_create.return_value = Mock()
                
                agent._collect_refund_history_evidence(mock_case_file.id, 1)
                
                mock_create.assert_called_once()
    
    def test_validate_evidence_data(self, agent):
        """Test evidence data validation."""
        valid_data = {
            "evidence_type": "transaction",
            "source": "database",
            "title": "Test Evidence",
        }
        
        assert agent._validate_evidence_data(valid_data) is True
        
        invalid_data = {
            "evidence_type": "",  # Empty evidence type
            "source": "database",
            "title": "Test Evidence",
        }
        
        assert agent._validate_evidence_data(invalid_data) is False
    
    def test_get_evidence_statistics(self, agent, mock_case_file):
        """Test evidence statistics retrieval."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.count.return_value = 5
            
            stats = agent.get_evidence_statistics(mock_case_file.id)
            
            assert stats is not None
            assert stats["total_evidence"] == 5


@pytest.mark.unit
class TestEvidenceRepositoryModel:
    """Test suite for Evidence Repository model."""
    
    def test_evidence_repository_creation(self, test_db):
        """Test evidence repository model creation."""
        evidence = EvidenceRepository(
            evidence_id="EV-001",
            case_file_id=1,
            evidence_type="transaction",
            source="database",
            title="Transaction Record",
            description="Transaction details",
            status="validated",
        )
        
        assert evidence.evidence_id == "EV-001"
        assert evidence.evidence_type == "transaction"
        assert evidence.status == "validated"
    
    def test_evidence_repository_to_dict(self, test_db):
        """Test evidence repository to_dict method."""
        evidence = EvidenceRepository(
            evidence_id="EV-001",
            case_file_id=1,
            evidence_type="transaction",
            source="database",
            title="Transaction Record",
            description="Transaction details",
            status="validated",
        )
        
        evidence_dict = evidence.to_dict()
        
        assert isinstance(evidence_dict, dict)
        assert evidence_dict["evidence_id"] == "EV-001"
        assert evidence_dict["evidence_type"] == "transaction"


@pytest.mark.unit
class TestCaseFileModel:
    """Test suite for Case File model."""
    
    def test_case_file_creation(self, test_db):
        """Test case file model creation."""
        case_file = CaseFile(
            case_file_id="CF-ABC123",
            dispute_id=1,
            status="draft",
            confidence_score=0.85,
            investigation_summary="Test summary",
            generated_by=1,
        )
        
        assert case_file.case_file_id == "CF-ABC123"
        assert case_file.status == "draft"
        assert case_file.confidence_score == 0.85
    
    def test_case_file_to_dict(self, test_db):
        """Test case file to_dict method."""
        case_file = CaseFile(
            case_file_id="CF-ABC123",
            dispute_id=1,
            status="draft",
            confidence_score=0.85,
            investigation_summary="Test summary",
            generated_by=1,
        )
        
        case_file_dict = case_file.to_dict()
        
        assert isinstance(case_file_dict, dict)
        assert case_file_dict["case_file_id"] == "CF-ABC123"
        assert case_file_dict["status"] == "draft"
