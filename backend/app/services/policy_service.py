"""
Policy Service.
Orchestrates policy mapping and semantic search operations.
Bridges the Strategy & Policy Agent and external consumers.
"""

from typing import Optional, List, Dict
from datetime import datetime

from loguru import logger
from sqlalchemy.orm import Session

from app.models.new import (
    PolicyMapping,
    CaseFile,
    PolicyMatchType,
)
from app.models.existing import PolicyRepository, Dispute
from app.repositories.policy_repository import PolicyRepositoryDB
from app.agents.strategy_policy import StrategyPolicyAgent
from app.utils.vector_store import PolicyVectorStore, HistoricalCaseVectorStore


class PolicyService:
    """
    Service responsible for policy operations and orchestration.
    Provides a clean interface for the API layer to interact with policy functionality.
    """

    def __init__(self, db: Session):
        self.db = db
        self.policy_repo = PolicyRepositoryDB(db)
        self.agent = StrategyPolicyAgent(db)
        self.policy_vector_store = PolicyVectorStore()
        self.case_vector_store = HistoricalCaseVectorStore()

    # --------------- Policy Mapping Orchestration ---------------

    def map_policies_for_case_file(
        self, case_file_id: int, clear_existing: bool = True
    ) -> Optional[Dict]:
        """
        Map applicable policies to a case file using semantic search.

        Args:
            case_file_id: Primary key of the case file.
            clear_existing: If True, delete existing mappings first.

        Returns:
            Dict with mapping results, or None if case file not found.
        """
        case_file = self.agent.map_policies_for_case_file(
            case_file_id=case_file_id,
            clear_existing=clear_existing,
        )

        if not case_file:
            return None

        # Get mapping summary
        summary = self.policy_repo.get_policy_mapping_summary(case_file_id)

        return {
            "case_file_id": case_file.id,
            "case_file_ref": case_file.case_file_id,
            "policy_mapping_completed": True,
            "total_mappings": summary["total"],
            "applicable": summary["applicable"],
            "not_applicable": summary["not_applicable"],
            "by_match_type": summary["by_match_type"],
            "average_relevance": summary["average_relevance"],
        }

    def map_policies_for_dispute(
        self, dispute_id: int, clear_existing: bool = True
    ) -> Optional[Dict]:
        """
        Map policies for a dispute (lookup case file first).

        Args:
            dispute_id: Primary key of the dispute.
            clear_existing: If True, delete existing mappings first.

        Returns:
            Dict with mapping results, or None if dispute/case file not found.
        """
        case_file = self.policy_repo.get_case_file_by_dispute_id(dispute_id)
        if not case_file:
            logger.error(f"No case file found for dispute {dispute_id}")
            return None

        return self.map_policies_for_case_file(
            case_file_id=case_file.id,
            clear_existing=clear_existing,
        )

    # --------------- Policy Mapping Retrieval ---------------

    def get_policy_mappings_for_case_file(
        self,
        case_file_id: int,
        applicable_only: bool = False,
        match_type: Optional[str] = None,
    ) -> Dict:
        """
        Get policy mappings for a case file with optional filters.

        Args:
            case_file_id: Primary key of the case file.
            applicable_only: If True, only return applicable mappings.
            match_type: Filter by match type.

        Returns:
            Dict with policy mappings and summary.
        """
        # Convert string enum to actual enum if provided
        match_type_enum = None
        if match_type:
            try:
                match_type_enum = PolicyMatchType(match_type.lower())
            except ValueError:
                logger.error(f"Invalid match type: {match_type}")

        mappings = self.policy_repo.get_policy_mappings_for_case_file(
            case_file_id=case_file_id,
            applicable_only=applicable_only,
            match_type=match_type_enum,
        )

        mapping_dicts = [self._mapping_to_dict(m) for m in mappings]

        summary = self.policy_repo.get_policy_mapping_summary(case_file_id)

        return {
            "case_file_id": case_file_id,
            "mappings": mapping_dicts,
            "summary": summary,
        }

    def get_policy_mapping(self, mapping_id: int) -> Optional[Dict]:
        """
        Get a single policy mapping by ID.

        Args:
            mapping_id: Primary key of the policy mapping.

        Returns:
            Dict with mapping details, or None if not found.
        """
        mapping = self.policy_repo.get_policy_mapping_by_id(mapping_id)
        if not mapping:
            return None

        return self._mapping_to_dict(mapping)

    # --------------- Policy Retrieval ---------------

    def get_all_policies(self, active_only: bool = True) -> List[Dict]:
        """
        Get all policies from the repository.

        Args:
            active_only: If True, only return active policies.

        Returns:
            List of policy dicts.
        """
        if active_only:
            policies = self.policy_repo.get_all_active_policies()
        else:
            policies = self.db.query(PolicyRepository).all()

        return [self._policy_to_dict(p) for p in policies]

    def get_policy_by_id(self, policy_id: int) -> Optional[Dict]:
        """
        Get a policy by primary key.

        Args:
            policy_id: Primary key of the policy.

        Returns:
            Dict with policy details, or None if not found.
        """
        policy = self.policy_repo.get_policy_by_id(policy_id)
        if not policy:
            return None

        return self._policy_to_dict(policy)

    def get_policies_by_type(self, policy_type: str) -> List[Dict]:
        """
        Get policies by type.

        Args:
            policy_type: Policy type to filter by.

        Returns:
            List of policy dicts.
        """
        policies = self.policy_repo.get_policies_by_type(policy_type)
        return [self._policy_to_dict(p) for p in policies]

    def search_policies_by_keyword(self, keyword: str) -> List[Dict]:
        """
        Search policies by keyword.

        Args:
            keyword: Search keyword.

        Returns:
            List of policy dicts.
        """
        policies = self.policy_repo.search_policies_by_keyword(keyword)
        return [self._policy_to_dict(p) for p in policies]

    # --------------- Vector Store Operations ---------------

    def index_policies(self) -> Dict[str, int]:
        """
        Index all active policies into the vector store.

        Returns:
            Dict with indexing statistics.
        """
        return self.agent.index_policies_in_vector_store()

    def index_historical_cases(self) -> Dict[str, int]:
        """
        Index resolved historical disputes into the vector store.

        Returns:
            Dict with indexing statistics.
        """
        return self.agent.index_historical_cases_in_vector_store()

    def get_vector_store_stats(self) -> Dict[str, Dict]:
        """
        Get statistics for both vector stores.

        Returns:
            Dict with policy and case vector store statistics.
        """
        return {
            "policy_vector_store": self.policy_vector_store.get_collection_stats(),
            "case_vector_store": self.case_vector_store.get_collection_stats(),
        }

    def search_policies_semantic(
        self,
        query: str,
        policy_type: Optional[str] = None,
        category: Optional[str] = None,
        n_results: int = 5,
    ) -> List[Dict]:
        """
        Search for policies using semantic similarity.

        Args:
            query: Search query.
            policy_type: Filter by policy type.
            category: Filter by category.
            n_results: Number of results.

        Returns:
            List of search result dicts.
        """
        if not self.policy_vector_store.is_available():
            logger.warning("Policy vector store not available")
            return []

        search_results = self.policy_vector_store.search_policies(
            query=query,
            policy_type=policy_type,
            category=category,
            n_results=n_results,
        )

        return [
            {
                "id": result.id,
                "content": result.content,
                "metadata": result.metadata,
                "score": result.score,
                "distance": result.distance,
            }
            for result in search_results
        ]

    def search_similar_cases(
        self,
        query: str,
        reason: Optional[str] = None,
        n_results: int = 5,
    ) -> List[Dict]:
        """
        Search for similar historical cases.

        Args:
            query: Search query.
            reason: Filter by dispute reason.
            n_results: Number of results.

        Returns:
            List of search result dicts.
        """
        if not self.case_vector_store.is_available():
            logger.warning("Historical case vector store not available")
            return []

        search_results = self.case_vector_store.search_similar_cases(
            query=query,
            reason=reason,
            n_results=n_results,
        )

        return [
            {
                "id": result.id,
                "content": result.content,
                "metadata": result.metadata,
                "score": result.score,
                "distance": result.distance,
            }
            for result in search_results
        ]

    # --------------- Policy Mapping Management ---------------

    def update_policy_mapping(
        self,
        mapping_id: int,
        relevance_score: Optional[float] = None,
        explanation: Optional[str] = None,
        is_applicable: Optional[bool] = None,
    ) -> Optional[Dict]:
        """
        Update a policy mapping.

        Args:
            mapping_id: Primary key of the policy mapping.
            relevance_score: New relevance score.
            explanation: New explanation.
            is_applicable: New applicability status.

        Returns:
            Dict with updated mapping details, or None if not found.
        """
        mapping = self.policy_repo.update_policy_mapping(
            mapping_id=mapping_id,
            relevance_score=relevance_score,
            explanation=explanation,
            is_applicable=is_applicable,
        )

        if not mapping:
            return None

        self.db.commit()
        return self._mapping_to_dict(mapping)

    def delete_policy_mapping(self, mapping_id: int) -> bool:
        """
        Delete a policy mapping.

        Args:
            mapping_id: Primary key of the policy mapping.

        Returns:
            True if deleted, False if not found.
        """
        success = self.policy_repo.delete_policy_mapping(mapping_id)

        if success:
            self.db.commit()

        return success

    # --------------- Helper Methods ---------------

    def _mapping_to_dict(self, mapping: PolicyMapping) -> Dict:
        """Convert a policy mapping model to a dictionary."""
        return {
            "id": mapping.id,
            "mapping_id": mapping.mapping_id,
            "case_file_id": mapping.case_file_id,
            "policy_id": mapping.policy_id,
            "match_type": mapping.match_type.value,
            "relevance_score": mapping.relevance_score,
            "matched_text": mapping.matched_text,
            "explanation": mapping.explanation,
            "evidence_id": mapping.evidence_id,
            "evidence_type": mapping.evidence_type.value if mapping.evidence_type else None,
            "similar_dispute_id": mapping.similar_dispute_id,
            "similarity_score": mapping.similarity_score,
            "is_applicable": mapping.is_applicable,
            "metadata": mapping.metadata_json,
            "created_at": mapping.created_at.isoformat() if mapping.created_at else None,
            "updated_at": mapping.updated_at.isoformat() if mapping.updated_at else None,
        }

    def _policy_to_dict(self, policy: PolicyRepository) -> Dict:
        """Convert a policy model to a dictionary."""
        return {
            "id": policy.id,
            "policy_id": policy.policy_id,
            "title": policy.title,
            "content": policy.content,
            "policy_type": policy.policy_type,
            "effective_date": str(policy.effective_date) if policy.effective_date else None,
            "expiry_date": str(policy.expiry_date) if policy.expiry_date else None,
            "version": policy.version,
            "is_active": policy.is_active,
            "category": policy.category,
            "tags": policy.tags if policy.tags else [],
            "source_url": policy.source_url,
            "metadata": policy.metadata_json,
            "created_at": policy.created_at.isoformat() if policy.created_at else None,
            "updated_at": policy.updated_at.isoformat() if policy.updated_at else None,
        }
