"""
Unit Tests for Timeline Reconstruction Agent.
Tests the timeline reconstruction functionality in isolation.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.agents.timeline_reconstruction import TimelineReconstructionAgent
from app.models.timeline_events import TimelineEvents
from app.core.exception_handlers import DatabaseException, NotFoundException


@pytest.mark.unit
class TestTimelineReconstructionAgent:
    """Test suite for Timeline Reconstruction Agent."""
    
    @pytest.fixture
    def agent(self, test_db):
        """Provide Timeline Reconstruction Agent instance."""
        return TimelineReconstructionAgent(test_db)
    
    @pytest.fixture
    def mock_evidence_data(self):
        """Provide mock evidence data."""
        return [
            {
                "id": 1,
                "evidence_type": "transaction",
                "title": "Transaction Record",
                "description": "Payment made on 2024-06-01",
                "metadata": {
                    "transaction_date": "2024-06-01",
                    "amount": 99.99
                }
            },
            {
                "id": 2,
                "evidence_type": "order",
                "title": "Order Details",
                "description": "Order placed on 2024-06-02",
                "metadata": {
                    "order_date": "2024-06-02",
                    "order_id": "ORD-12345"
                }
            },
            {
                "id": 3,
                "evidence_type": "communication",
                "title": "Customer Email",
                "description": "Email sent on 2024-06-03",
                "metadata": {
                    "communication_date": "2024-06-03",
                    "type": "email"
                }
            }
        ]
    
    def test_agent_initialization(self, test_db):
        """Test that agent initializes correctly."""
        agent = TimelineReconstructionAgent(test_db)
        
        assert agent.db is not None
        assert isinstance(agent.db, Session)
    
    def test_reconstruct_timeline_success(self, agent, mock_evidence_data):
        """Test successful timeline reconstruction."""
        with patch.object(agent.db, 'query') as mock_query:
            # Mock evidence retrieval
            mock_query.return_value.filter.return_value.all.return_value = mock_evidence_data
            
            # Mock timeline event creation
            with patch.object(agent, '_create_timeline_event') as mock_create:
                mock_create.return_value = Mock()
                
                agent.reconstruct_timeline(1, clear_existing=True)
                
                # Should create 3 timeline events
                assert mock_create.call_count == 3
    
    def test_reconstruct_timeline_clear_existing(self, agent):
        """Test timeline reconstruction with clearing existing events."""
        with patch.object(agent.db, 'query') as mock_query:
            # Mock existing events
            mock_query.return_value.filter.return_value.delete.return_value = 1
            
            with patch.object(agent, '_extract_events_from_evidence') as mock_extract:
                mock_extract.return_value = []
                
                agent.reconstruct_timeline(1, clear_existing=True)
                
                # Should delete existing events
                mock_query.return_value.filter.return_value.delete.assert_called_once()
    
    def test_reconstruct_timeline_without_clearing(self, agent):
        """Test timeline reconstruction without clearing existing events."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.all.return_value = []
            
            with patch.object(agent, '_extract_events_from_evidence') as mock_extract:
                mock_extract.return_value = []
                
                agent.reconstruct_timeline(1, clear_existing=False)
                
                # Should not delete existing events
                mock_query.return_value.filter.return_value.delete.assert_not_called()
    
    def test_extract_events_from_evidence(self, agent, mock_evidence_data):
        """Test event extraction from evidence."""
        events = agent._extract_events_from_evidence(mock_evidence_data)
        
        assert len(events) == 3
        assert events[0]["event_type"] == "payment_made"
        assert events[1]["event_type"] == "order_placed"
        assert events[2]["event_type"] == "communication_sent"
    
    def test_extract_events_from_empty_evidence(self, agent):
        """Test event extraction from empty evidence."""
        events = agent._extract_events_from_evidence([])
        
        assert len(events) == 0
    
    def test_determine_event_type_transaction(self, agent):
        """Test event type determination for transaction evidence."""
        evidence = {
            "evidence_type": "transaction",
            "metadata": {"transaction_date": "2024-06-01"}
        }
        
        event_type = agent._determine_event_type(evidence)
        
        assert event_type == "payment_made"
    
    def test_determine_event_type_order(self, agent):
        """Test event type determination for order evidence."""
        evidence = {
            "evidence_type": "order",
            "metadata": {"order_date": "2024-06-02"}
        }
        
        event_type = agent._determine_event_type(evidence)
        
        assert event_type == "order_placed"
    
    def test_determine_event_type_communication(self, agent):
        """Test event type determination for communication evidence."""
        evidence = {
            "evidence_type": "communication",
            "metadata": {"communication_date": "2024-06-03"}
        }
        
        event_type = agent._determine_event_type(evidence)
        
        assert event_type == "communication_sent"
    
    def test_determine_event_type_unknown(self, agent):
        """Test event type determination for unknown evidence."""
        evidence = {
            "evidence_type": "unknown",
            "metadata": {}
        }
        
        event_type = agent._determine_event_type(evidence)
        
        assert event_type == "unknown_event"
    
    def test_extract_date_from_evidence(self, agent):
        """Test date extraction from evidence."""
        evidence = {
            "metadata": {"transaction_date": "2024-06-01"}
        }
        
        date = agent._extract_date_from_evidence(evidence)
        
        assert date is not None
        assert date == "2024-06-01"
    
    def test_extract_date_from_evidence_no_date(self, agent):
        """Test date extraction when no date available."""
        evidence = {
            "metadata": {}
        }
        
        date = agent._extract_date_from_evidence(evidence)
        
        assert date is None
    
    def test_create_timeline_event(self, agent):
        """Test timeline event creation."""
        event_data = {
            "event_type": "payment_made",
            "event_date": "2024-06-01",
            "title": "Payment Made",
            "description": "Customer made payment",
        }
        
        with patch.object(agent.db, 'add') as mock_add:
            with patch.object(agent.db, 'commit') as mock_commit:
                with patch('app.agents.timeline_reconstruction.generate_event_id') as mock_gen:
                    mock_gen.return_value = "TE-001"
                    
                    result = agent._create_timeline_event(1, event_data)
                    
                    assert result is not None
                    mock_add.assert_called_once()
                    mock_commit.assert_called_once()
    
    def test_order_events_chronologically(self, agent):
        """Test chronological ordering of events."""
        events = [
            {
                "event_date": "2024-06-03",
                "event_type": "communication_sent"
            },
            {
                "event_date": "2024-06-01",
                "event_type": "payment_made"
            },
            {
                "event_date": "2024-06-02",
                "event_type": "order_placed"
            }
        ]
        
        ordered_events = agent._order_events_chronologically(events)
        
        assert ordered_events[0]["event_type"] == "payment_made"
        assert ordered_events[1]["event_type"] == "order_placed"
        assert ordered_events[2]["event_type"] == "communication_sent"
    
    def test_assign_chronological_order(self, agent):
        """Test chronological order assignment."""
        events = [
            {"event_date": "2024-06-01"},
            {"event_date": "2024-06-02"},
            {"event_date": "2024-06-03"}
        ]
        
        ordered_events = agent._assign_chronological_order(events)
        
        assert ordered_events[0]["chronological_order"] == 1
        assert ordered_events[1]["chronological_order"] == 2
        assert ordered_events[2]["chronological_order"] == 3
    
    def test_handle_database_error(self, agent):
        """Test database error handling."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_query.side_effect = Exception("Database connection failed")
            
            with pytest.raises(DatabaseException):
                agent.reconstruct_timeline(1)
    
    def test_get_timeline_statistics(self, agent):
        """Test timeline statistics retrieval."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.count.return_value = 5
            
            stats = agent.get_timeline_statistics(1)
            
            assert stats is not None
            assert stats["total_events"] == 5
    
    def test_get_timeline_by_case_file(self, agent):
        """Test timeline retrieval by case file."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_event = Mock()
            mock_event.id = 1
            mock_event.event_id = "TE-001"
            mock_event.event_type = "payment_made"
            
            mock_query.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_event]
            
            timeline = agent.get_timeline_by_case_file(1)
            
            assert timeline is not None
            assert len(timeline) == 1
            assert timeline[0].event_type == "payment_made"
    
    def test_generate_event_title(self, agent):
        """Test event title generation."""
        event_type = "payment_made"
        metadata = {"amount": 99.99, "currency": "USD"}
        
        title = agent._generate_event_title(event_type, metadata)
        
        assert title is not None
        assert "Payment" in title
    
    def test_generate_event_description(self, agent):
        """Test event description generation."""
        event_type = "payment_made"
        metadata = {"amount": 99.99, "currency": "USD"}
        
        description = agent._generate_event_description(event_type, metadata)
        
        assert description is not None
        assert len(description) > 0
    
    def test_validate_event_data(self, agent):
        """Test event data validation."""
        valid_data = {
            "event_type": "payment_made",
            "event_date": "2024-06-01",
            "title": "Payment Made",
        }
        
        assert agent._validate_event_data(valid_data) is True
        
        invalid_data = {
            "event_type": "",  # Empty event type
            "event_date": "2024-06-01",
            "title": "Payment Made",
        }
        
        assert agent._validate_event_data(invalid_data) is False
    
    def test_merge_duplicate_events(self, agent):
        """Test merging of duplicate events."""
        events = [
            {
                "event_date": "2024-06-01",
                "event_type": "payment_made",
                "title": "Payment Made"
            },
            {
                "event_date": "2024-06-01",
                "event_type": "payment_made",
                "title": "Payment Made"
            }
        ]
        
        merged_events = agent._merge_duplicate_events(events)
        
        assert len(merged_events) == 1


@pytest.mark.unit
class TestTimelineEventsModel:
    """Test suite for Timeline Events model."""
    
    def test_timeline_events_creation(self, test_db):
        """Test timeline events model creation."""
        event = TimelineEvents(
            event_id="TE-001",
            case_file_id=1,
            event_type="payment_made",
            event_date="2024-06-01",
            title="Payment Made",
            description="Customer made payment",
            chronological_order=1,
        )
        
        assert event.event_id == "TE-001"
        assert event.event_type == "payment_made"
        assert event.chronological_order == 1
    
    def test_timeline_events_to_dict(self, test_db):
        """Test timeline events to_dict method."""
        event = TimelineEvents(
            event_id="TE-001",
            case_file_id=1,
            event_type="payment_made",
            event_date="2024-06-01",
            title="Payment Made",
            description="Customer made payment",
            chronological_order=1,
        )
        
        event_dict = event.to_dict()
        
        assert isinstance(event_dict, dict)
        assert event_dict["event_id"] == "TE-001"
        assert event_dict["event_type"] == "payment_made"
