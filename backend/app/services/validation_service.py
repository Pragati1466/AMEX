"""
Validation Service.
Orchestrates evidence validation and provides business logic for the API layer.
Bridges the Evidence Completeness Agent and external consumers.
"""

from typing import Optional, List, Dict
from datetime import datetime

from loguru import logger
from sqlalchemy.orm import Session

from app.models.new import (
    EvidenceValidation,
    CaseFile,
    ValidationCategory,
    ValidationSeverity,
)
from app.repositories.validation_repository import ValidationRepository
from app.agents.evidence_completeness import EvidenceCompletenessAgent
from app.utils.groq_client import GroqClient


class ValidationService:
    """
    Service responsible for validation operations and orchestration.
    Provides a clean interface for the API layer to interact with validation functionality.
    """

    def __init__(self, db: Session):
        self.db = db
        self.validation_repo = ValidationRepository(db)
        self.agent = EvidenceCompletenessAgent(db)
        self.groq_client = GroqClient()

    # --------------- Validation Orchestration ---------------

    def validate_case_file(
        self, case_file_id: int, clear_existing: bool = True
    ) -> Optional[Dict]:
        """
        Run comprehensive validation on a case file.

        Args:
            case_file_id: Primary key of the case file.
            clear_existing: If True, delete existing validations first.

        Returns:
            Dict with validation results, or None if case file not found.
        """
        case_file = self.agent.validate_case_file(
            case_file_id=case_file_id,
            clear_existing=clear_existing,
        )

        if not case_file:
            return None

        # Get validation summary
        summary = self.validation_repo.get_validation_summary(case_file_id)

        return {
            "case_file_id": case_file.id,
            "case_file_ref": case_file.case_file_id,
            "validation_completed": True,
            "total_validations": summary["total"],
            "resolved": summary["resolved"],
            "unresolved": summary["unresolved"],
            "by_category": summary["by_category"],
            "by_severity": summary["by_severity"],
        }

    def validate_for_dispute(
        self, dispute_id: int, clear_existing: bool = True
    ) -> Optional[Dict]:
        """
        Validate evidence for a dispute (lookup case file first).

        Args:
            dispute_id: Primary key of the dispute.
            clear_existing: If True, delete existing validations first.

        Returns:
            Dict with validation results, or None if dispute/case file not found.
        """
        case_file = self.validation_repo.get_case_file_by_dispute_id(dispute_id)
        if not case_file:
            logger.error(f"No case file found for dispute {dispute_id}")
            return None

        return self.validate_case_file(
            case_file_id=case_file.id,
            clear_existing=clear_existing,
        )

    # --------------- Validation Retrieval ---------------

    def get_validations_for_case_file(
        self,
        case_file_id: int,
        resolved_only: bool = False,
        unresolved_only: bool = False,
        category: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> Dict:
        """
        Get validation records for a case file with optional filters.

        Args:
            case_file_id: Primary key of the case file.
            resolved_only: If True, only return resolved validations.
            unresolved_only: If True, only return unresolved validations.
            category: Filter by validation category.
            severity: Filter by severity level.

        Returns:
            Dict with validation records and summary.
        """
        # Convert string enums to actual enums if provided
        category_enum = None
        if category:
            try:
                category_enum = ValidationCategory(category.lower())
            except ValueError:
                logger.error(f"Invalid category: {category}")

        severity_enum = None
        if severity:
            try:
                severity_enum = ValidationSeverity(severity.lower())
            except ValueError:
                logger.error(f"Invalid severity: {severity}")

        validations = self.validation_repo.get_validations_for_case_file(
            case_file_id=case_file_id,
            resolved_only=resolved_only,
            unresolved_only=unresolved_only,
            category=category_enum,
            severity=severity_enum,
        )

        validation_dicts = [self._validation_to_dict(v) for v in validations]

        summary = self.validation_repo.get_validation_summary(case_file_id)

        return {
            "case_file_id": case_file_id,
            "validations": validation_dicts,
            "summary": summary,
        }

    def get_validation(self, validation_id: int) -> Optional[Dict]:
        """
        Get a single validation record by ID.

        Args:
            validation_id: Primary key of the validation record.

        Returns:
            Dict with validation details, or None if not found.
        """
        validation = self.validation_repo.get_validation_by_id(validation_id)
        if not validation:
            return None

        return self._validation_to_dict(validation)

    def get_validations_by_category(
        self, case_file_id: int, category: str
    ) -> List[Dict]:
        """
        Get validation records of a specific category for a case file.

        Args:
            case_file_id: Primary key of the case file.
            category: String representation of ValidationCategory.

        Returns:
            List of validation dicts.
        """
        try:
            category_enum = ValidationCategory(category.lower())
        except ValueError:
            logger.error(f"Invalid category: {category}")
            return []

        validations = self.validation_repo.get_validations_by_category(
            case_file_id=case_file_id,
            category=category_enum,
        )

        return [self._validation_to_dict(v) for v in validations]

    def get_validations_by_severity(
        self, case_file_id: int, severity: str
    ) -> List[Dict]:
        """
        Get validation records of a specific severity for a case file.

        Args:
            case_file_id: Primary key of the case file.
            severity: String representation of ValidationSeverity.

        Returns:
            List of validation dicts.
        """
        try:
            severity_enum = ValidationSeverity(severity.lower())
        except ValueError:
            logger.error(f"Invalid severity: {severity}")
            return []

        validations = self.validation_repo.get_validations_by_severity(
            case_file_id=case_file_id,
            severity=severity_enum,
        )

        return [self._validation_to_dict(v) for v in validations]

    def get_critical_validations(self, case_file_id: int) -> List[Dict]:
        """Get all critical and error severity validations for a case file."""
        validations = self.validation_repo.get_critical_validations(case_file_id)
        return [self._validation_to_dict(v) for v in validations]

    # --------------- Validation Resolution ---------------

    def resolve_validation(
        self,
        validation_id: int,
        resolved_by: str,
        resolution_notes: Optional[str] = None,
    ) -> Optional[Dict]:
        """
        Mark a validation as resolved.

        Args:
            validation_id: Primary key of the validation record.
            resolved_by: Who resolved it (user ID or name).
            resolution_notes: Notes about the resolution.

        Returns:
            Dict with updated validation details, or None if not found.
        """
        validation = self.validation_repo.resolve_validation(
            validation_id=validation_id,
            resolved_by=resolved_by,
            resolution_notes=resolution_notes,
        )

        if not validation:
            return None

        self.db.commit()
        return self._validation_to_dict(validation)

    def reopen_validation(self, validation_id: int) -> Optional[Dict]:
        """
        Reopen a previously resolved validation.

        Args:
            validation_id: Primary key of the validation record.

        Returns:
            Dict with updated validation details, or None if not found.
        """
        validation = self.validation_repo.reopen_validation(validation_id)

        if not validation:
            return None

        self.db.commit()
        return self._validation_to_dict(validation)

    def delete_validation(self, validation_id: int) -> bool:
        """
        Delete a validation record.

        Args:
            validation_id: Primary key of the validation record.

        Returns:
            True if deleted, False if not found.
        """
        success = self.validation_repo.delete_validation(validation_id)

        if success:
            self.db.commit()

        return success

    # --------------- Validation Analysis ---------------

    def get_validation_summary(self, case_file_id: int) -> Dict:
        """
        Get validation summary statistics for a case file.

        Args:
            case_file_id: Primary key of the case file.

        Returns:
            Dict with validation summary.
        """
        return self.validation_repo.get_validation_summary(case_file_id)

    def get_validation_analysis(self, case_file_id: int) -> Dict:
        """
        Get comprehensive validation analysis including summary and critical issues.

        Args:
            case_file_id: Primary key of the case file.

        Returns:
            Dict with complete validation analysis.
        """
        summary = self.validation_repo.get_validation_summary(case_file_id)
        critical_validations = self.validation_repo.get_critical_validations(case_file_id)

        return {
            "summary": summary,
            "critical_issues": [self._validation_to_dict(v) for v in critical_validations],
            "has_critical_issues": len(critical_validations) > 0,
            "critical_issue_count": len(critical_validations),
        }

    # --------------- AI-Powered Analysis ---------------

    def analyze_evidence_completeness(
        self, case_file_id: int
    ) -> Dict:
        """
        Analyze overall evidence completeness using AI.

        Args:
            case_file_id: Primary key of the case file.

        Returns:
            Dict with completeness analysis and recommendations.
        """
        # Get evidence summary
        evidence_items = self.validation_repo.get_evidence_for_case_file(case_file_id)
        evidence_summary = self._generate_evidence_summary(evidence_items)

        # Get dispute context
        case_file = self.validation_repo.get_case_file_by_id(case_file_id)
        dispute_context = ""
        if case_file:
            from app.models.existing import Dispute
            dispute = self.db.query(Dispute).filter(Dispute.id == case_file.dispute_id).first()
            if dispute:
                dispute_context = f"""
Dispute ID: {dispute.dispute_id}
Reason: {dispute.reason.value if dispute.reason else 'unknown'}
Amount: {dispute.amount if dispute.amount else 'unknown'}
Description: {dispute.description or 'No description'}
"""

        # Use Groq for analysis
        analysis = self.groq_client.analyze_evidence_completeness(
            evidence_summary=evidence_summary,
            dispute_context=dispute_context,
        )

        return {
            "case_file_id": case_file_id,
            "evidence_count": len(evidence_items),
            **analysis,
        }

    def generate_ai_suggestions(
        self, case_file_id: int, validation_ids: Optional[List[int]] = None
    ) -> List[Dict]:
        """
        Generate AI-powered suggestions for validation issues.

        Args:
            case_file_id: Primary key of the case file.
            validation_ids: Specific validation IDs to generate suggestions for (optional).

        Returns:
            List of dicts with AI-generated suggestions.
        """
        # Get validations
        if validation_ids:
            validations = [
                self.validation_repo.get_validation_by_id(vid)
                for vid in validation_ids
            ]
            validations = [v for v in validations if v is not None]
        else:
            validations = self.validation_repo.get_validations_for_case_file(
                case_file_id=case_file_id, unresolved_only=True
            )

        if not validations:
            return []

        # Generate evidence summary for context
        evidence_items = self.validation_repo.get_evidence_for_case_file(case_file_id)
        evidence_summary = self._generate_evidence_summary(evidence_items)

        # Generate suggestions
        suggestions = []
        for validation in validations:
            context = {
                "title": validation.title,
                "description": validation.description,
                "detail": validation.detail,
                "severity": validation.severity.value,
                "category": validation.category.value,
            }

            try:
                ai_suggestion = self.groq_client.generate_validation_suggestion(
                    validation_type=validation.category.value,
                    context=context,
                    evidence_summary=evidence_summary,
                )

                suggestions.append({
                    "validation_id": validation.id,
                    "validation_ref": validation.validation_id,
                    "suggestion": ai_suggestion.suggestion,
                    "priority": ai_suggestion.priority,
                    "action_items": ai_suggestion.action_items,
                    "confidence": ai_suggestion.confidence,
                })

            except Exception as e:
                logger.error(f"AI suggestion generation failed for validation {validation.id}: {e}")

        return suggestions

    # --------------- Helper Methods ---------------

    def _validation_to_dict(self, validation: EvidenceValidation) -> Dict:
        """Convert a validation model to a dictionary."""
        return {
            "id": validation.id,
            "validation_id": validation.validation_id,
            "case_file_id": validation.case_file_id,
            "category": validation.category.value,
            "severity": validation.severity.value,
            "title": validation.title,
            "description": validation.description,
            "detail": validation.detail,
            "suggestion": validation.suggestion,
            "evidence_id": validation.evidence_id,
            "evidence_type": validation.evidence_type.value if validation.evidence_type else None,
            "conflicting_evidence_id": validation.conflicting_evidence_id,
            "conflicting_field": validation.conflicting_field,
            "is_resolved": validation.is_resolved,
            "resolved_at": validation.resolved_at.isoformat() if validation.resolved_at else None,
            "resolved_by": validation.resolved_by,
            "resolution_notes": validation.resolution_notes,
            "metadata": validation.metadata_json,
            "created_at": validation.created_at.isoformat() if validation.created_at else None,
            "updated_at": validation.updated_at.isoformat() if validation.updated_at else None,
        }

    def _generate_evidence_summary(self, evidence_items) -> str:
        """Generate a summary of evidence for AI context."""
        if not evidence_items:
            return "No evidence collected."

        summary_parts = []
        summary_parts.append(f"Total evidence items: {len(evidence_items)}")

        # Count by type
        type_counts = {}
        for evidence in evidence_items:
            type_name = evidence.evidence_type.value
            type_counts[type_name] = type_counts.get(type_name, 0) + 1

        summary_parts.append("Evidence types:")
        for type_name, count in sorted(type_counts.items()):
            summary_parts.append(f"  - {type_name}: {count}")

        # Timeline info
        dated_items = [e for e in evidence_items if e.event_date]
        if dated_items:
            dates = [e.event_date for e in dated_items if e.event_date]
            summary_parts.append(f"Date range: {min(dates)} to {max(dates)}")

        # Merchant info
        merchants = set(e.merchant_name for e in evidence_items if e.merchant_name)
        if merchants:
            summary_parts.append(f"Merchants: {', '.join(merchants)}")

        return "\n".join(summary_parts)
