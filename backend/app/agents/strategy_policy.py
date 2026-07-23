"""
Strategy & Policy Agent.
Responsible for matching evidence against company policies, regulations, and historical cases.
Uses semantic similarity with Sentence Transformers and ChromaDB for intelligent matching.
"""

from typing import Optional, List, Dict, Tuple
from datetime import datetime
from decimal import Decimal

from loguru import logger
from sqlalchemy.orm import Session

from app.models.new import (
    EvidenceRepository as EvidenceRepoModel,
    PolicyMapping,
    CaseFile,
    AuditLog,
    PolicyMatchType,
    EvidenceType,
)
from app.models.existing import PolicyRepository, Dispute, DisputeReason
from app.repositories.policy_repository import PolicyRepositoryDB
from app.utils.vector_store import PolicyVectorStore, HistoricalCaseVectorStore, SearchResult


class StrategyPolicyAgent:
    """
    Agent responsible for matching evidence against policies and historical cases.
    Uses semantic search to find applicable policies and similar dispute cases.
    """

    def __init__(self, db: Session):
        self.db = db
        self.policy_repo = PolicyRepositoryDB(db)
        self.policy_vector_store = PolicyVectorStore()
        self.case_vector_store = HistoricalCaseVectorStore()

    def map_policies_for_case_file(
        self, case_file_id: int, clear_existing: bool = True
    ) -> Optional[CaseFile]:
        """
        Map applicable policies to a case file using semantic search.

        Process:
          1. Clear existing policy mappings if requested
          2. Fetch case file and dispute details
          3. Generate search query from dispute context
          4. Search for semantically similar policies
          5. Search for similar historical cases
          6. Create policy mappings with relevance scores
          7. Store results in database

        Args:
            case_file_id: Primary key of the case file.
            clear_existing: If True, delete existing mappings first.

        Returns:
            The updated CaseFile, or None if not found.
        """
        # 1. Fetch the case file
        case_file = self.policy_repo.get_case_file_by_id(case_file_id)
        if not case_file:
            logger.error(f"Case file {case_file_id} not found")
            return None

        logger.info(f"Starting policy mapping for case file {case_file.case_file_id}")

        # 2. Clear existing mappings if requested
        if clear_existing:
            deleted_count = self.policy_repo.delete_policy_mappings_for_case_file(
                case_file_id
            )
            logger.debug(f"Cleared {deleted_count} existing policy mappings")

        # 3. Fetch dispute details
        dispute = self.policy_repo.get_dispute_by_id(case_file.dispute_id)
        if not dispute:
            logger.error(f"Dispute {case_file.dispute_id} not found")
            return case_file

        # 4. Generate search query from dispute context
        search_query = self._generate_search_query(dispute)

        # 5. Search for semantically similar policies
        policy_mappings = self._search_and_map_policies(
            case_file_id=case_file_id,
            dispute=dispute,
            search_query=search_query,
        )

        # 6. Search for similar historical cases
        case_mappings = self._search_and_map_similar_cases(
            case_file_id=case_file_id,
            dispute=dispute,
            search_query=search_query,
        )

        # 7. Commit changes
        self.db.commit()
        self.db.refresh(case_file)

        # 8. Log the action
        self._log_action(
            action="policy_mapping_completed",
            case_file_id=case_file_id,
            dispute_id=dispute.id,
            details=f"Mapped {policy_mappings} policies and {case_mappings} similar cases",
        )

        logger.info(
            f"Policy mapping completed for case file {case_file.case_file_id}. "
            f"Found {policy_mappings} policies and {case_mappings} similar cases."
        )
        return case_file

    def _generate_search_query(self, dispute: Dispute) -> str:
        """Generate a search query from dispute details."""
        query_parts = []

        # Add dispute reason
        if dispute.reason:
            query_parts.append(f"Dispute reason: {dispute.reason.value}")

        # Add description
        if dispute.description:
            query_parts.append(f"Description: {dispute.description}")

        # Add amount context
        if dispute.amount:
            query_parts.append(f"Amount: {dispute.amount} {dispute.currency}")

        # Combine into search query
        return " ".join(query_parts)

    def _search_and_map_policies(
        self, case_file_id: int, dispute: Dispute, search_query: str
    ) -> int:
        """
        Search for semantically similar policies and create mappings.

        Returns:
            Number of policy mappings created.
        """
        mappings_created = 0

        if not self.policy_vector_store.is_available():
            logger.warning("Policy vector store not available - using keyword search")
            return self._keyword_policy_search(case_file_id, dispute)

        # Perform semantic search
        search_results = self.policy_vector_store.search_policies(
            query=search_query,
            n_results=10,
        )

        # Create mappings for relevant policies
        for result in search_results:
            # Only map policies with high relevance (score > 0.5)
            if result.score > 0.5:
                # Get policy from database
                policy = self.policy_repo.get_policy_by_external_id(
                    result.metadata.get("policy_id")
                )

                if policy:
                    # Create policy mapping
                    self.policy_repo.create_policy_mapping(
                        case_file_id=case_file_id,
                        policy_id=policy.id,
                        match_type=PolicyMatchType.SEMANTIC,
                        relevance_score=result.score,
                        matched_text=result.content[:200] if result.content else None,
                        explanation=f"Policy matched semantically with relevance score {result.score:.2f}",
                        metadata_json={
                            "vector_search": True,
                            "search_query": search_query,
                            "policy_type": result.metadata.get("policy_type"),
                            "category": result.metadata.get("category"),
                        },
                    )
                    mappings_created += 1
                    logger.debug(
                        f"Mapped policy {policy.policy_id} with relevance {result.score:.2f}"
                    )

        return mappings_created

    def _keyword_policy_search(self, case_file_id: int, dispute: Dispute) -> int:
        """
        Fallback keyword-based policy search when vector store is unavailable.

        Returns:
            Number of policy mappings created.
        """
        mappings_created = 0

        # Get search terms from dispute
        search_terms = []
        if dispute.reason:
            search_terms.append(dispute.reason.value)
        if dispute.description:
            # Extract key terms from description
            words = dispute.description.split()
            search_terms.extend([w for w in words if len(w) > 4])

        # Search for policies by keywords
        for term in search_terms[:5]:  # Limit to top 5 terms
            policies = self.policy_repo.search_policies_by_keyword(term)

            for policy in policies:
                # Check if already mapped
                existing = self.db.query(PolicyMapping).filter(
                    PolicyMapping.case_file_id == case_file_id,
                    PolicyMapping.policy_id == policy.id,
                ).first()

                if not existing:
                    self.policy_repo.create_policy_mapping(
                        case_file_id=case_file_id,
                        policy_id=policy.id,
                        match_type=PolicyMatchType.KEYWORD,
                        relevance_score=0.7,  # Default relevance for keyword match
                        matched_text=term,
                        explanation=f"Policy matched on keyword '{term}'",
                        metadata_json={
                            "vector_search": False,
                            "search_term": term,
                        },
                    )
                    mappings_created += 1

        return mappings_created

    def _search_and_map_similar_cases(
        self, case_file_id: int, dispute: Dispute, search_query: str
    ) -> int:
        """
        Search for similar historical cases and create mappings.

        Returns:
            Number of case mappings created.
        """
        mappings_created = 0

        if not self.case_vector_store.is_available():
            logger.warning("Historical case vector store not available - using database search")
            return self._database_case_search(case_file_id, dispute)

        # Perform semantic search
        search_results = self.case_vector_store.search_similar_cases(
            query=search_query,
            reason=dispute.reason.value if dispute.reason else None,
            n_results=5,
        )

        # Create mappings for similar cases
        for result in search_results:
            # Only map cases with high similarity (score > 0.6)
            if result.score > 0.6:
                # Get dispute from database
                similar_dispute = self.policy_repo.get_dispute_by_external_id(
                    result.metadata.get("dispute_id")
                )

                if similar_dispute and similar_dispute.id != dispute.id:
                    # Find a relevant policy to associate with this case
                    # (This could be enhanced to find the most relevant policy)
                    policy = self._find_relevant_policy_for_dispute(similar_dispute)

                    if policy:
                        self.policy_repo.create_policy_mapping(
                            case_file_id=case_file_id,
                            policy_id=policy.id,
                            match_type=PolicyMatchType.SEMANTIC,
                            relevance_score=result.score,
                            matched_text=result.content[:200] if result.content else None,
                            explanation=f"Similar historical case (similarity: {result.score:.2f}) with outcome: {result.metadata.get('outcome')}",
                            similar_dispute_id=similar_dispute.id,
                            similarity_score=result.score,
                            metadata_json={
                                "vector_search": True,
                                "historical_case": True,
                                "similar_dispute_id": similar_dispute.dispute_id,
                                "outcome": result.metadata.get("outcome"),
                            },
                        )
                        mappings_created += 1
                        logger.debug(
                            f"Mapped similar case {similar_dispute.dispute_id} with similarity {result.score:.2f}"
                        )

        return mappings_created

    def _database_case_search(self, case_file_id: int, dispute: Dispute) -> int:
        """
        Fallback database search for similar cases when vector store is unavailable.

        Returns:
            Number of case mappings created.
        """
        mappings_created = 0

        # Search for similar disputes in database
        amount_range = None
        if dispute.amount:
            # Allow ±20% amount variance
            min_amount = float(dispute.amount) * 0.8
            max_amount = float(dispute.amount) * 1.2
            amount_range = (min_amount, max_amount)

        similar_disputes = self.policy_repo.get_similar_disputes(
            reason=dispute.reason.value if dispute.reason else None,
            amount_range=amount_range,
            limit=5,
        )

        for similar_dispute in similar_disputes:
            if similar_dispute.id != dispute.id:
                # Find a relevant policy
                policy = self._find_relevant_policy_for_dispute(similar_dispute)

                if policy:
                    self.policy_repo.create_policy_mapping(
                        case_file_id=case_file_id,
                        policy_id=policy.id,
                        match_type=PolicyMatchType.CATEGORY,
                        relevance_score=0.6,  # Default relevance for category match
                        explanation=f"Similar historical case based on {dispute.reason.value if dispute.reason else 'category'}",
                        similar_dispute_id=similar_dispute.id,
                        similarity_score=0.6,
                        metadata_json={
                            "vector_search": False,
                            "historical_case": True,
                            "similar_dispute_id": similar_dispute.dispute_id,
                        },
                    )
                    mappings_created += 1

        return mappings_created

    def _find_relevant_policy_for_dispute(
        self, dispute: Dispute
    ) -> Optional[PolicyRepository]:
        """Find a relevant policy for a given dispute."""
        # Try to find policy by dispute reason
        if dispute.reason:
            policy_type_map = {
                DisputeReason.REFUND_NOT_PROCESSED: "refund_policy",
                DisputeReason.PRODUCT_NOT_RECEIVED: "shipping_policy",
                DisputeReason.PRODUCT_DEFECTIVE: "return_policy",
                DisputeReason.UNAUTHORIZED: "fraud_policy",
            }

            policy_type = policy_type_map.get(dispute.reason)
            if policy_type:
                policies = self.policy_repo.get_policies_by_type(policy_type)
                if policies:
                    return policies[0]  # Return first matching policy

        # Fallback to any active policy
        policies = self.policy_repo.get_all_active_policies()
        return policies[0] if policies else None

    def index_policies_in_vector_store(self) -> Dict[str, int]:
        """
        Index all active policies from the database into the vector store.

        Returns:
            Dict with indexing statistics.
        """
        if not self.policy_vector_store.is_available():
            logger.warning("Policy vector store not available - cannot index policies")
            return {"indexed": 0, "failed": 0, "total": 0}

        # Clear existing collection
        self.policy_vector_store.clear_collection()

        # Get all active policies
        policies = self.policy_repo.get_all_active_policies()

        indexed_count = 0
        failed_count = 0

        for policy in policies:
            try:
                success = self.policy_vector_store.add_policy(
                    policy_id=policy.policy_id,
                    title=policy.title,
                    content=policy.content,
                    policy_type=policy.policy_type,
                    category=policy.category,
                    tags=policy.tags if policy.tags else [],
                    metadata={
                        "version": policy.version,
                        "effective_date": str(policy.effective_date) if policy.effective_date else None,
                    },
                )

                if success:
                    indexed_count += 1
                else:
                    failed_count += 1

            except Exception as e:
                logger.error(f"Failed to index policy {policy.policy_id}: {e}")
                failed_count += 1

        logger.info(
            f"Policy indexing completed: {indexed_count} indexed, {failed_count} failed"
        )

        return {
            "indexed": indexed_count,
            "failed": failed_count,
            "total": len(policies),
        }

    def index_historical_cases_in_vector_store(self) -> Dict[str, int]:
        """
        Index resolved historical disputes into the vector store.

        Returns:
            Dict with indexing statistics.
        """
        if not self.case_vector_store.is_available():
            logger.warning("Historical case vector store not available - cannot index cases")
            return {"indexed": 0, "failed": 0, "total": 0}

        # Clear existing collection
        self.case_vector_store.clear_collection()

        # Get resolved disputes
        resolved_disputes = (
            self.db.query(Dispute)
            .filter(Dispute.status.in_(["resolved", "closed"]))
            .limit(1000)  # Limit to recent 1000 cases
            .all()
        )

        indexed_count = 0
        failed_count = 0

        for dispute in resolved_disputes:
            try:
                success = self.case_vector_store.add_case(
                    dispute_id=dispute.dispute_id,
                    description=dispute.description or "",
                    reason=dispute.reason.value if dispute.reason else "unknown",
                    amount=float(dispute.amount) if dispute.amount else 0.0,
                    outcome=dispute.status.value,
                    metadata={
                        "resolved_at": str(dispute.resolved_at) if dispute.resolved_at else None,
                        "merchant_id": dispute.merchant_id,
                    },
                )

                if success:
                    indexed_count += 1
                else:
                    failed_count += 1

            except Exception as e:
                logger.error(f"Failed to index case {dispute.dispute_id}: {e}")
                failed_count += 1

        logger.info(
            f"Historical case indexing completed: {indexed_count} indexed, {failed_count} failed"
        )

        return {
            "indexed": indexed_count,
            "failed": failed_count,
            "total": len(resolved_disputes),
        }

    def _log_action(
        self,
        action: str,
        case_file_id: int,
        dispute_id: int,
        details: str,
    ) -> None:
        """Create an audit log entry for policy mapping actions."""
        log = AuditLog(
            action=action,
            entity_type="policy_mapping",
            case_file_id=case_file_id,
            dispute_id=dispute_id,
            details=details,
        )
        self.db.add(log)
        self.db.flush()
