"""
Repository layer for policy mapping database operations.
Provides data access methods for the Strategy & Policy Agent.
"""

from typing import Optional, List
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.new import (
    PolicyMapping,
    CaseFile,
    PolicyMatchType,
    EvidenceType,
)
from app.models.existing import PolicyRepository, Dispute


class PolicyRepositoryDB:
    """Data access layer for policy mapping operations."""

    def __init__(self, db: Session):
        self.db = db

    # --------------- Policy Mapping CRUD ---------------

    def create_policy_mapping(
        self,
        case_file_id: int,
        policy_id: int,
        match_type: PolicyMatchType,
        relevance_score: Optional[float] = None,
        matched_text: Optional[str] = None,
        explanation: Optional[str] = None,
        evidence_id: Optional[int] = None,
        evidence_type: Optional[EvidenceType] = None,
        similar_dispute_id: Optional[int] = None,
        similarity_score: Optional[float] = None,
        metadata_json: Optional[dict] = None,
    ) -> PolicyMapping:
        """
        Create a new policy mapping record.

        Args:
            case_file_id: Primary key of the case file.
            policy_id: Primary key of the policy.
            match_type: Type of match (exact, semantic, keyword, category).
            relevance_score: How relevant the policy is (0.0 to 1.0).
            matched_text: The specific text that matched.
            explanation: Why this policy applies.
            evidence_id: Related evidence item.
            evidence_type: Type of evidence.
            similar_dispute_id: Historical similar dispute.
            similarity_score: Similarity to historical dispute (0.0 to 1.0).
            metadata_json: Additional metadata.

        Returns:
            Created PolicyMapping instance.
        """
        import uuid

        mapping = PolicyMapping(
            case_file_id=case_file_id,
            mapping_id=f"PM-{uuid.uuid4().hex[:12].upper()}",
            policy_id=policy_id,
            match_type=match_type,
            relevance_score=relevance_score,
            matched_text=matched_text,
            explanation=explanation,
            evidence_id=evidence_id,
            evidence_type=evidence_type,
            similar_dispute_id=similar_dispute_id,
            similarity_score=similarity_score,
            is_applicable=True,
            metadata_json=metadata_json,
        )

        self.db.add(mapping)
        self.db.flush()
        return mapping

    def get_policy_mapping_by_id(self, mapping_id: int) -> Optional[PolicyMapping]:
        """Fetch a policy mapping by primary key."""
        return (
            self.db.query(PolicyMapping)
            .filter(PolicyMapping.id == mapping_id)
            .first()
        )

    def get_policy_mapping_by_ref(self, mapping_ref: str) -> Optional[PolicyMapping]:
        """Fetch a policy mapping by its mapping_id string."""
        return (
            self.db.query(PolicyMapping)
            .filter(PolicyMapping.mapping_id == mapping_ref)
            .first()
        )

    def get_policy_mappings_for_case_file(
        self,
        case_file_id: int,
        applicable_only: bool = False,
        match_type: Optional[PolicyMatchType] = None,
    ) -> List[PolicyMapping]:
        """
        Fetch policy mappings for a case file with optional filters.

        Args:
            case_file_id: Primary key of the case file.
            applicable_only: If True, only return applicable mappings.
            match_type: Filter by match type.

        Returns:
            List of PolicyMapping instances.
        """
        query = self.db.query(PolicyMapping).filter(
            PolicyMapping.case_file_id == case_file_id
        )

        if applicable_only:
            query = query.filter(PolicyMapping.is_applicable.is_(True))

        if match_type:
            query = query.filter(PolicyMapping.match_type == match_type)

        return query.order_by(PolicyMapping.relevance_score.desc()).all()

    def get_policy_mappings_by_policy(
        self, policy_id: int
    ) -> List[PolicyMapping]:
        """Fetch all mappings for a specific policy."""
        return (
            self.db.query(PolicyMapping)
            .filter(PolicyMapping.policy_id == policy_id)
            .order_by(PolicyMapping.created_at.desc())
            .all()
        )

    def get_policy_mappings_by_evidence(
        self, evidence_id: int
    ) -> List[PolicyMapping]:
        """Fetch all policy mappings related to a specific evidence item."""
        return (
            self.db.query(PolicyMapping)
            .filter(PolicyMapping.evidence_id == evidence_id)
            .order_by(PolicyMapping.relevance_score.desc())
            .all()
        )

    def update_policy_mapping(
        self,
        mapping_id: int,
        relevance_score: Optional[float] = None,
        explanation: Optional[str] = None,
        is_applicable: Optional[bool] = None,
        metadata_json: Optional[dict] = None,
    ) -> Optional[PolicyMapping]:
        """
        Update an existing policy mapping.

        Args:
            mapping_id: Primary key of the policy mapping.
            relevance_score: New relevance score.
            explanation: New explanation.
            is_applicable: New applicability status.
            metadata_json: New metadata.

        Returns:
            Updated PolicyMapping, or None if not found.
        """
        mapping = self.get_policy_mapping_by_id(mapping_id)
        if not mapping:
            return None

        if relevance_score is not None:
            mapping.relevance_score = relevance_score
        if explanation is not None:
            mapping.explanation = explanation
        if is_applicable is not None:
            mapping.is_applicable = is_applicable
        if metadata_json is not None:
            mapping.metadata_json = metadata_json

        self.db.flush()
        return mapping

    def delete_policy_mapping(self, mapping_id: int) -> bool:
        """Delete a policy mapping."""
        mapping = self.get_policy_mapping_by_id(mapping_id)
        if not mapping:
            return False

        self.db.delete(mapping)
        self.db.flush()
        return True

    def delete_policy_mappings_for_case_file(self, case_file_id: int) -> int:
        """
        Delete all policy mappings for a case file.

        Returns:
            Number of deleted mappings.
        """
        count = (
            self.db.query(PolicyMapping)
            .filter(PolicyMapping.case_file_id == case_file_id)
            .delete()
        )
        self.db.flush()
        return count

    # --------------- Policy Repository Operations ---------------

    def get_policy_by_id(self, policy_id: int) -> Optional[PolicyRepository]:
        """Fetch a policy by primary key."""
        return (
            self.db.query(PolicyRepository)
            .filter(PolicyRepository.id == policy_id)
            .first()
        )

    def get_policy_by_external_id(self, external_id: str) -> Optional[PolicyRepository]:
        """Fetch a policy by external policy_id."""
        return (
            self.db.query(PolicyRepository)
            .filter(PolicyRepository.policy_id == external_id)
            .first()
        )

    def get_all_active_policies(self) -> List[PolicyRepository]:
        """Fetch all active policies."""
        return (
            self.db.query(PolicyRepository)
            .filter(PolicyRepository.is_active.is_(True))
            .all()
        )

    def get_policies_by_type(self, policy_type: str) -> List[PolicyRepository]:
        """Fetch active policies by type."""
        return (
            self.db.query(PolicyRepository)
            .filter(
                PolicyRepository.is_active.is_(True),
                PolicyRepository.policy_type == policy_type,
            )
            .all()
        )

    def get_policies_by_category(self, category: str) -> List[PolicyRepository]:
        """Fetch active policies by category."""
        return (
            self.db.query(PolicyRepository)
            .filter(
                PolicyRepository.is_active.is_(True),
                PolicyRepository.category == category,
            )
            .all()
        )

    def search_policies_by_keyword(self, keyword: str) -> List[PolicyRepository]:
        """Search policies by keyword in title or content."""
        search_term = f"%{keyword}%"
        return (
            self.db.query(PolicyRepository)
            .filter(
                PolicyRepository.is_active.is_(True),
                (
                    PolicyRepository.title.ilike(search_term)
                    | PolicyRepository.content.ilike(search_term)
                ),
            )
            .all()
        )

    # --------------- Historical Dispute Operations ---------------

    def get_dispute_by_id(self, dispute_id: int) -> Optional[Dispute]:
        """Fetch a dispute by primary key."""
        return self.db.query(Dispute).filter(Dispute.id == dispute_id).first()

    def get_dispute_by_external_id(self, external_id: str) -> Optional[Dispute]:
        """Fetch a dispute by external dispute_id."""
        return (
            self.db.query(Dispute)
            .filter(Dispute.dispute_id == external_id)
            .first()
        )

    def get_similar_disputes(
        self,
        reason: Optional[str] = None,
        amount_range: Optional[tuple] = None,
        limit: int = 10,
    ) -> List[Dispute]:
        """
        Find historical disputes similar to given criteria.

        Args:
            reason: Filter by dispute reason.
            amount_range: Tuple of (min_amount, max_amount).
            limit: Maximum number of results.

        Returns:
            List of similar Dispute instances.
        """
        query = self.db.query(Dispute)

        if reason:
            query = query.filter(Dispute.reason == reason)

        if amount_range:
            min_amount, max_amount = amount_range
            query = query.filter(
                Dispute.amount >= min_amount,
                Dispute.amount <= max_amount,
            )

        return query.order_by(Dispute.created_at.desc()).limit(limit).all()

    # --------------- Case File Operations ---------------

    def get_case_file_by_id(self, case_file_id: int) -> Optional[CaseFile]:
        """Fetch a case file by primary key."""
        return self.db.query(CaseFile).filter(CaseFile.id == case_file_id).first()

    def get_case_file_by_dispute_id(self, dispute_id: int) -> Optional[CaseFile]:
        """Fetch a case file by its dispute_id."""
        return (
            self.db.query(CaseFile)
            .filter(CaseFile.dispute_id == dispute_id)
            .first()
        )

    # --------------- Policy Mapping Statistics ---------------

    def get_policy_mapping_summary(
        self, case_file_id: int
    ) -> dict:
        """
        Get policy mapping summary statistics for a case file.

        Returns:
            Dict with mapping counts by match type and applicability.
        """
        mappings = self.get_policy_mappings_for_case_file(case_file_id)

        summary = {
            "total": len(mappings),
            "applicable": 0,
            "not_applicable": 0,
            "by_match_type": {},
            "average_relevance": 0.0,
        }

        relevance_scores = []

        for mapping in mappings:
            # Count by applicability
            if mapping.is_applicable:
                summary["applicable"] += 1
            else:
                summary["not_applicable"] += 1

            # Count by match type
            match_type = mapping.match_type.value
            summary["by_match_type"][match_type] = (
                summary["by_match_type"].get(match_type, 0) + 1
            )

            # Collect relevance scores
            if mapping.relevance_score is not None:
                relevance_scores.append(mapping.relevance_score)

        # Calculate average relevance
        if relevance_scores:
            summary["average_relevance"] = sum(relevance_scores) / len(relevance_scores)

        return summary
