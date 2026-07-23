"""
Case File Service.
Orchestrates case file generation and provides business logic for the API layer.
Bridges the Case File Generator Agent and external consumers.
"""

from typing import Optional, List, Dict
from datetime import datetime

from loguru import logger
from sqlalchemy.orm import Session

from app.models.new import (
    CaseFile,
    CaseFileStatus,
)
from app.models.existing import Dispute
from app.repositories.evidence_repository import EvidenceRepositoryDB
from app.agents.case_file_generator import CaseFileGeneratorAgent


class CaseFileService:
    """
    Service responsible for case file operations and orchestration.
    Provides a clean interface for the API layer to interact with case file functionality.
    """

    def __init__(self, db: Session):
        self.db = db
        self.evidence_repo = EvidenceRepositoryDB(db)
        self.agent = CaseFileGeneratorAgent(db)

    # --------------- Case File Generation ---------------

    def generate_case_file(
        self, case_file_id: int, user_id: Optional[int] = None
    ) -> Optional[Dict]:
        """
        Generate the complete investigation package for a case file.

        Args:
            case_file_id: Primary key of the case file.
            user_id: User who initiated the generation.

        Returns:
            Dict with generation results, or None if case file not found.
        """
        case_file = self.agent.generate_case_file(
            case_file_id=case_file_id,
            user_id=user_id,
        )

        if not case_file:
            return None

        # Get standardized package
        package = self.agent.get_standardized_package(case_file_id)

        return {
            "case_file_id": case_file.id,
            "case_file_ref": case_file.case_file_id,
            "dispute_id": case_file.dispute_id,
            "status": case_file.status.value,
            "investigation_summary": case_file.investigation_summary,
            "confidence_score": case_file.confidence_score,
            "package": package,
        }

    def generate_case_file_for_dispute(
        self, dispute_id: int, user_id: Optional[int] = None
    ) -> Optional[Dict]:
        """
        Generate case file for a dispute (lookup case file first).

        Args:
            dispute_id: Primary key of the dispute.
            user_id: User who initiated the generation.

        Returns:
            Dict with generation results, or None if dispute/case file not found.
        """
        case_file = self.db.query(CaseFile).filter(
            CaseFile.dispute_id == dispute_id
        ).first()

        if not case_file:
            logger.error(f"No case file found for dispute {dispute_id}")
            return None

        return self.generate_case_file(
            case_file_id=case_file.id,
            user_id=user_id,
        )

    # --------------- Case File Retrieval ---------------

    def get_case_file(self, case_file_id: int) -> Optional[Dict]:
        """
        Get a case file by ID.

        Args:
            case_file_id: Primary key of the case file.

        Returns:
            Dict with case file details, or None if not found.
        """
        case_file = self.db.query(CaseFile).filter(CaseFile.id == case_file_id).first()
        if not case_file:
            return None

        return self._case_file_to_dict(case_file)

    def get_case_file_by_dispute_id(self, dispute_id: int) -> Optional[Dict]:
        """
        Get a case file by dispute ID.

        Args:
            dispute_id: Primary key of the dispute.

        Returns:
            Dict with case file details, or None if not found.
        """
        case_file = self.db.query(CaseFile).filter(
            CaseFile.dispute_id == dispute_id
        ).first()

        if not case_file:
            return None

        return self._case_file_to_dict(case_file)

    def get_all_case_files(
        self,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict]:
        """
        Get all case files with optional filtering.

        Args:
            status: Filter by status.
            limit: Maximum number of results.
            offset: Number of results to skip.

        Returns:
            List of case file dicts.
        """
        query = self.db.query(CaseFile)

        if status:
            try:
                status_enum = CaseFileStatus(status.lower())
                query = query.filter(CaseFile.status == status_enum)
            except ValueError:
                logger.error(f"Invalid status: {status}")

        case_files = query.order_by(CaseFile.created_at.desc()).limit(limit).offset(offset).all()

        return [self._case_file_to_dict(cf) for cf in case_files]

    # --------------- Standardized Package Retrieval ---------------

    def get_standardized_package(
        self, case_file_id: int
    ) -> Optional[Dict]:
        """
        Get the standardized investigation package for Module 2 consumption.

        Args:
            case_file_id: Primary key of the case file.

        Returns:
            Standardized package dict or None if not found.
        """
        return self.agent.get_standardized_package(case_file_id)

    def get_standardized_package_for_dispute(
        self, dispute_id: int
    ) -> Optional[Dict]:
        """
        Get standardized package for a dispute.

        Args:
            dispute_id: Primary key of the dispute.

        Returns:
            Standardized package dict or None if not found.
        """
        case_file = self.db.query(CaseFile).filter(
            CaseFile.dispute_id == dispute_id
        ).first()

        if not case_file:
            return None

        return self.agent.get_standardized_package(case_file.id)

    # --------------- Case File Status Management ---------------

    def update_case_file_status(
        self,
        case_file_id: int,
        status: str,
        submitted_at: Optional[datetime] = None,
    ) -> Optional[Dict]:
        """
        Update the status of a case file.

        Args:
            case_file_id: Primary key of the case file.
            status: New status value.
            submitted_at: Optional submission timestamp.

        Returns:
            Dict with updated case file details, or None if not found.
        """
        case_file = self.db.query(CaseFile).filter(CaseFile.id == case_file_id).first()
        if not case_file:
            return None

        try:
            status_enum = CaseFileStatus(status.lower())
            case_file.status = status_enum

            if submitted_at:
                case_file.submitted_at = submitted_at

            self.db.commit()
            self.db.refresh(case_file)

            return self._case_file_to_dict(case_file)

        except ValueError:
            logger.error(f"Invalid status: {status}")
            return None

    def submit_case_file(
        self, case_file_id: int, user_id: Optional[int] = None
    ) -> Optional[Dict]:
        """
        Submit a case file (mark as submitted).

        Args:
            case_file_id: Primary key of the case file.
            user_id: User who submitted it.

        Returns:
            Dict with updated case file details, or None if not found.
        """
        return self.update_case_file_status(
            case_file_id=case_file_id,
            status="submitted",
            submitted_at=datetime.utcnow(),
        )

    # --------------- Confidence Score Analysis ---------------

    def get_confidence_score_analysis(
        self, case_file_id: int
    ) -> Dict:
        """
        Get detailed confidence score analysis for a case file.

        Args:
            case_file_id: Primary key of the case file.

        Returns:
            Dict with confidence score breakdown.
        """
        case_file = self.db.query(CaseFile).filter(CaseFile.id == case_file_id).first()
        if not case_file:
            return {"error": "Case file not found"}

        # Collect components for analysis
        package = self.agent._collect_investigation_components(case_file_id)

        # Calculate detailed breakdown
        breakdown = {
            "overall_score": case_file.confidence_score or 0.0,
            "components": {
                "evidence_completeness": self._calculate_evidence_score(package),
                "timeline_quality": self._calculate_timeline_score(package),
                "validation_status": self._calculate_validation_score(package),
                "policy_mapping": self._calculate_policy_score(package),
                "evidence_processing": self._calculate_processing_score(package),
            },
            "recommendations": self._generate_confidence_recommendations(package),
        }

        return breakdown

    def _calculate_evidence_score(self, package: Dict) -> float:
        """Calculate evidence completeness score (0.0 to 1.0)."""
        evidence_count = len(package["evidence"])
        if evidence_count >= 5:
            return 1.0
        elif evidence_count >= 3:
            return 0.67
        elif evidence_count >= 1:
            return 0.33
        return 0.0

    def _calculate_timeline_score(self, package: Dict) -> float:
        """Calculate timeline quality score (0.0 to 1.0)."""
        timeline_count = len(package["timeline"])
        if timeline_count >= 3:
            return 1.0
        elif timeline_count >= 1:
            return 0.5
        return 0.0

    def _calculate_validation_score(self, package: Dict) -> float:
        """Calculate validation status score (0.0 to 1.0)."""
        validations = package["validations"]
        if not validations:
            return 0.5  # Neutral

        critical_count = sum(
            1 for v in validations
            if v["severity"] in ["critical", "error"] and not v["is_resolved"]
        )

        if critical_count == 0:
            return 1.0
        elif critical_count <= 2:
            return 0.5
        return 0.0

    def _calculate_policy_score(self, package: Dict) -> float:
        """Calculate policy mapping quality score (0.0 to 1.0)."""
        policy_count = len(package["policy_mapping"])
        if policy_count >= 2:
            return 1.0
        elif policy_count >= 1:
            return 0.5
        return 0.0

    def _calculate_processing_score(self, package: Dict) -> float:
        """Calculate evidence processing score (0.0 to 1.0)."""
        evidence_count = len(package["evidence"])
        if evidence_count == 0:
            return 0.0

        processed_count = sum(
            1 for e in package["evidence"]
            if e.get("status") == "validated"
        )

        if processed_count == evidence_count:
            return 1.0
        elif processed_count >= evidence_count * 0.5:
            return 0.5
        return 0.0

    def _generate_confidence_recommendations(self, package: Dict) -> List[str]:
        """Generate recommendations to improve confidence score."""
        recommendations = []

        # Evidence recommendations
        if len(package["evidence"]) < 3:
            recommendations.append("Collect more evidence to improve completeness")

        # Timeline recommendations
        if len(package["timeline"]) < 2:
            recommendations.append("Add more timeline events for better chronology")

        # Validation recommendations
        critical_count = sum(
            1 for v in package["validations"]
            if v["severity"] in ["critical", "error"] and not v["is_resolved"]
        )
        if critical_count > 0:
            recommendations.append(f"Resolve {critical_count} critical validation issues")

        # Policy recommendations
        if len(package["policy_mapping"]) < 1:
            recommendations.append("Map applicable policies to improve compliance analysis")

        return recommendations

    # --------------- Helper Methods ---------------

    def _case_file_to_dict(self, case_file: CaseFile) -> Dict:
        """Convert a case file model to a dictionary."""
        return {
            "id": case_file.id,
            "case_file_id": case_file.case_file_id,
            "dispute_id": case_file.dispute_id,
            "status": case_file.status.value,
            "investigation_summary": case_file.investigation_summary,
            "confidence_score": case_file.confidence_score,
            "generated_by": case_file.generated_by,
            "submitted_at": case_file.submitted_at.isoformat() if case_file.submitted_at else None,
            "metadata": case_file.metadata_json,
            "created_at": case_file.created_at.isoformat() if case_file.created_at else None,
            "updated_at": case_file.updated_at.isoformat() if case_file.updated_at else None,
        }
