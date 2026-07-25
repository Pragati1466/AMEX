"""
Unit Tests for Strategy & Policy Agent.
Tests the policy mapping functionality in isolation.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime
from sqlalchemy.orm import Session

from app.agents.strategy_policy import StrategyPolicyAgent
from app.models.policy_mapping import PolicyMapping
from app.core.exception_handlers import DatabaseException, NotFoundException


@pytest.mark.unit
class TestStrategyPolicyAgent:
    """Test suite for Strategy & Policy Agent."""
    
    @pytest.fixture
    def agent(self, test_db):
        """Provide Strategy & Policy Agent instance."""
        return StrategyPolicyAgent(test_db)
    
    @pytest.fixture
    def mock_policies(self):
        """Provide mock policy data."""
        return [
            {
                "id": 1,
                "policy_id": "POL-001",
                "title": "Refund Policy",
                "category": "refund",
                "content": "Refund policy content",
            },
            {
                "id": 2,
                "policy_id": "POL-002",
                "title": "Dispute Policy",
                "category": "dispute",
                "content": "Dispute policy content",
            }
        ]
    
    @pytest.fixture
    def mock_similar_cases(self):
        """Provide mock similar case data."""
        return [
            {
                "id": 1,
                "dispute_id": "DSP-12344",
                "reason": "product_not_received",
                "resolution": "refund_issued",
                "similarity_score": 0.85,
            },
            {
                "id": 2,
                "dispute_id": "DSP-12343",
                "reason": "product_not_received",
                "resolution": "merchant_response",
                "similarity_score": 0.75,
            }
        ]
    
    def test_agent_initialization(self, test_db):
        """Test that agent initializes correctly."""
        agent = StrategyPolicyAgent(test_db)
        
        assert agent.db is not None
        assert isinstance(agent.db, Session)
    
    def test_map_policies_for_case_file_success(self, agent, mock_policies):
        """Test successful policy mapping."""
        with patch.object(agent.db, 'query') as mock_query:
            # Mock policy retrieval
            mock_query.return_value.filter.return_value.all.return_value = mock_policies
            
            # Mock policy mapping creation
            with patch.object(agent, '_create_policy_mapping') as mock_create:
                mock_create.return_value = Mock()
                
                agent.map_policies_for_case_file(1, clear_existing=True)
                
                # Should create policy mappings
                assert mock_create.call_count > 0
    
    def test_map_policies_clear_existing(self, agent):
        """Test policy mapping with clearing existing mappings."""
        with patch.object(agent.db, 'query') as mock_query:
            # Mock existing mappings
            mock_query.return_value.filter.return_value.delete.return_value = 1
            
            with patch.object(agent, '_perform_semantic_search') as mock_search:
                mock_search.return_value = []
                
                agent.map_policies_for_case_file(1, clear_existing=True)
                
                # Should delete existing mappings
                mock_query.return_value.filter.return_value.delete.assert_called_once()
    
    def test_map_policies_without_clearing(self, agent):
        """Test policy mapping without clearing existing mappings."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.all.return_value = []
            
            with patch.object(agent, '_perform_semantic_search') as mock_search:
                mock_search.return_value = []
                
                agent.map_policies_for_case_file(1, clear_existing=False)
                
                # Should not delete existing mappings
                mock_query.return_value.filter.return_value.delete.assert_not_called()
    
    def test_perform_semantic_search(self, agent):
        """Test semantic search for policies."""
        with patch.object(agent, '_vector_store_search') as mock_search:
            mock_search.return_value = [
                {
                    "id": "policy-1",
                    "score": 0.85,
                    "metadata": {"policy_id": "POL-001"}
                }
            ]
            
            results = agent._perform_semantic_search("product not received")
            
            assert results is not None
            assert len(results) == 1
    
    def test_vector_store_search(self, agent):
        """Test vector store search."""
        with patch('app.agents.strategy_policy.ChromaDB') as mock_chroma:
            mock_collection = Mock()
            mock_collection.query.return_value = {
                "ids": [["policy-1"]],
                "distances": [[0.15]],
                "metadatas": [[{"policy_id": "POL-001"}]]
            }
            mock_chroma.return_value.get_collection.return_value = mock_collection
            
            results = agent._vector_store_search("test query")
            
            assert results is not None
    
    def test_find_similar_cases(self, agent, mock_similar_cases):
        """Test similar case finding."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.all.return_value = mock_similar_cases
            
            similar_cases = agent._find_similar_cases("product_not_received")
            
            assert similar_cases is not None
            assert len(similar_cases) == 2
    
    def test_create_policy_mapping(self, agent):
        """Test policy mapping creation."""
        mapping_data = {
            "policy_id": 1,
            "match_type": "semantic",
            "relevance_score": 0.85,
            "is_applicable": True,
        }
        
        with patch.object(agent.db, 'add') as mock_add:
            with patch.object(agent.db, 'commit') as mock_commit:
                with patch('app.agents.strategy_policy.generate_mapping_id') as mock_gen:
                    mock_gen.return_value = "PM-001"
                    
                    result = agent._create_policy_mapping(1, mapping_data)
                    
                    assert result is not None
                    mock_add.assert_called_once()
                    mock_commit.assert_called_once()
    
    def test_calculate_relevance_score(self, agent):
        """Test relevance score calculation."""
        search_result = {
            "score": 0.85,
            "metadata": {"category": "refund"}
        }
        
        relevance_score = agent._calculate_relevance_score(search_result, "product_not_received")
        
        assert relevance_score is not None
        assert 0 <= relevance_score <= 1
    
    def test_determine_applicability(self, agent):
        """Test policy applicability determination."""
        policy = {
            "category": "refund",
            "conditions": ["product_not_received", "damaged"]
        }
        
        is_applicable = agent._determine_applicability(policy, "product_not_received")
        
        assert is_applicable is True
    
    def test_get_policy_mapping_summary(self, agent):
        """Test policy mapping summary retrieval."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_mapping = Mock()
            mock_mapping.id = 1
            mock_mapping.match_type = "semantic"
            mock_mapping.relevance_score = 0.85
            mock_mapping.is_applicable = True
            
            mock_query.return_value.filter.return_value.all.return_value = [mock_mapping]
            
            summary = agent.get_policy_mapping_summary(1)
            
            assert summary is not None
            assert summary["total_mappings"] == 1
    
    def test_update_policy_mapping_status(self, agent):
        """Test policy mapping status update."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_mapping = Mock()
            mock_mapping.id = 1
            mock_mapping.is_applicable = True
            
            mock_query.return_value.filter.return_value.first.return_value = mock_mapping
            
            with patch.object(agent.db, 'commit') as mock_commit:
                agent.update_policy_mapping_status(1, False)
                
                assert mock_mapping.is_applicable is False
                mock_commit.assert_called_once()
    
    def test_get_applicable_policies(self, agent):
        """Test retrieval of applicable policies."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_mapping = Mock()
            mock_mapping.id = 1
            mock_mapping.is_applicable = True
            mock_mapping.relevance_score = 0.85
            
            mock_query.return_value.filter.return_value.all.return_value = [mock_mapping]
            
            policies = agent.get_applicable_policies(1)
            
            assert len(policies) == 1
            assert policies[0].is_applicable is True
    
    def test_generate_search_query(self, agent):
        """Test search query generation."""
        dispute_reason = "product_not_received"
        query = agent._generate_search_query(dispute_reason)
        
        assert query is not None
        assert "product" in query.lower() or "received" in query.lower()
    
    def test_filter_by_relevance(self, agent):
        """Test filtering by relevance score."""
        mappings = [
            {"relevance_score": 0.85},
            {"relevance_score": 0.65},
            {"relevance_score": 0.45}
        ]
        
        filtered = agent._filter_by_relevance(mappings, min_score=0.7)
        
        assert len(filtered) == 1
        assert filtered[0]["relevance_score"] == 0.85
    
    def test_handle_vector_store_error(self, agent):
        """Test vector store error handling."""
        with patch('app.agents.strategy_policy.ChromaDB') as mock_chroma:
            mock_chroma.side_effect = Exception("Vector store connection failed")
            
            with patch.object(agent, '_fallback_to_keyword_search') as mock_fallback:
                mock_fallback.return_value = []
                
                agent._vector_store_search("test query")
                
                mock_fallback.assert_called_once()
    
    def test_fallback_to_keyword_search(self, agent):
        """Test fallback to keyword search."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_policy = Mock()
            mock_policy.id = 1
            mock_policy.title = "Refund Policy"
            mock_policy.content = "Product not received"
            
            mock_query.return_value.filter.return_value.all.return_value = [mock_policy]
            
            results = agent._fallback_to_keyword_search("product not received")
            
            assert results is not None
    
    def test_create_case_similarity_mapping(self, agent):
        """Test case similarity mapping creation."""
        similar_case = {
            "dispute_id": "DSP-12344",
            "similarity_score": 0.85,
            "resolution": "refund_issued"
        }
        
        with patch.object(agent, '_create_policy_mapping') as mock_create:
            mock_create.return_value = Mock()
            
            agent._create_case_similarity_mapping(1, similar_case)
            
            mock_create.assert_called_once()
    
    def test_get_policy_recommendations(self, agent):
        """Test policy recommendations retrieval."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_mapping = Mock()
            mock_mapping.policy_id = 1
            mock_mapping.relevance_score = 0.85
            
            mock_query.return_value.filter.return_value.all.return_value = [mock_mapping]
            
            recommendations = agent.get_policy_recommendations(1)
            
            assert recommendations is not None
    
    def test_generate_mapping_id(self, agent):
        """Test mapping ID generation."""
        with patch('app.agents.strategy_policy.uuid4') as mock_uuid:
            mock_uuid.return_value = "test-uuid"
            
            mapping_id = agent._generate_mapping_id()
            
            assert mapping_id is not None
            assert "PM-" in mapping_id
    
    def test_validate_policy_data(self, agent):
        """Test policy data validation."""
        valid_policy = {
            "policy_id": "POL-001",
            "title": "Refund Policy",
            "category": "refund",
            "content": "Policy content"
        }
        
        assert agent._validate_policy_data(valid_policy) is True
        
        invalid_policy = {
            "policy_id": "",  # Empty policy ID
            "title": "Refund Policy",
            "category": "refund",
            "content": "Policy content"
        }
        
        assert agent._validate_policy_data(invalid_policy) is False
    
    def test_get_policy_statistics(self, agent):
        """Test policy statistics retrieval."""
        with patch.object(agent.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.count.return_value = 5
            
            stats = agent.get_policy_statistics(1)
            
            assert stats is not None
            assert stats["total_mappings"] == 5


@pytest.mark.unit
class TestPolicyMappingModel:
    """Test suite for Policy Mapping model."""
    
    def test_policy_mapping_creation(self, test_db):
        """Test policy mapping model creation."""
        mapping = PolicyMapping(
            mapping_id="PM-001",
            case_file_id=1,
            policy_id=1,
            match_type="semantic",
            relevance_score=0.85,
            is_applicable=True,
        )
        
        assert mapping.mapping_id == "PM-001"
        assert mapping.match_type == "semantic"
        assert mapping.relevance_score == 0.85
        assert mapping.is_applicable is True
    
    def test_policy_mapping_to_dict(self, test_db):
        """Test policy mapping to_dict method."""
        mapping = PolicyMapping(
            mapping_id="PM-001",
            case_file_id=1,
            policy_id=1,
            match_type="semantic",
            relevance_score=0.85,
            is_applicable=True,
        )
        
        mapping_dict = mapping.to_dict()
        
        assert isinstance(mapping_dict, dict)
        assert mapping_dict["mapping_id"] == "PM-001"
        assert mapping_dict["match_type"] == "semantic"
