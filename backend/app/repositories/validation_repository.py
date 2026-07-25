"""
Repository layer for evidence validation database operations.
Provides data access methods for the Evidence Completeness Agent.
"""

from typing import Optional, List
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.new import (
    EvidenceValidation,
    EvidenceRepository as EvidenceRepoModel,
    CaseFile,
    ValidationCategory,
    ValidationSeverity,
    EvidenceType,
)


class ValidationRepository:
    """Data access layer for evidence validation operations."""

    def __init__(self, db: Session):
        self.db = db

    # --------------- Validation CRUD ---------------

    def create_validation(
        self,
        case_file_id: int,
        category: ValidationCategory,
        severity: ValidationSeverity,
        title: str,
        description: Optional[str] = None,
        detail: Optional[str] = None,
        suggestion: Optional[str] = None,
        evidence_id: Optional[int] = None,
        evidence_type: Optional[EvidenceType] = None,
        conflicting_evidence_id: Optional[int] = None,
        conflicting_field: Optional[str] = None,
        metadata_json: Optional[dict] = None,
    ) -> EvidenceValidation:
        """
        Create a new evidence validation record.

        Args:
            case_file_id: Primary key of the case file.
            category: Validation category (missing_evidence, contradiction, etc.).
            severity: Severity level (info, warning, error, critical).
            title: Short title for the validation finding.
            description: Brief description.
            detail: Detailed explanation.
            suggestion: Suggested action to resolve.
            evidence_id: Related evidence item.
            evidence_type: Type of evidence.
            conflicting_evidence_id: For contradictions, the conflicting evidence.
            conflicting_field: Which field has the contradiction.
            metadata_json: Additional metadata.

        Returns:
            Created EvidenceValidation instance.
        """
        import uuid

        validation = EvidenceValidation(
            case_file_id=case_file_id,
            validation_id=f"VL-{uuid.uuid4().hex[:12].upper()}",
            category=category,
            severity=severity,
            title=title,
            description=description,
            detail=detail,
            suggestion=suggestion,
            evidence_id=evidence_id,
            evidence_type=evidence_type,
            conflicting_evidence_id=conflicting_evidence_id,
            conflicting_field=conflicting_field,
            is_resolved=False,
            metadata_json=metadata_json,
        )

        self.db.add(validation)
        self.db.flush()
        return validation

    def get_validation_by_id(self, validation_id: int) -> Optional[EvidenceValidation]:
        """Fetch a validation record by primary key."""
        return (
            self.db.query(EvidenceValidation)
            .filter(EvidenceValidation.id == validation_id)
            .first()
        )

    def get_validation_by_ref(self, validation_ref: str) -> Optional[EvidenceValidation]:
        """Fetch a validation record by its validation_id string."""
        return (
            self.db.query(EvidenceValidation)
            .filter(EvidenceValidation.validation_id == validation_ref)
            .first()
        )

    def get_validations_for_case_file(
        self,
        case_file_id: int,
        resolved_only: bool = False,
        unresolved_only: bool = False,
        category: Optional[ValidationCategory] = None,
        severity: Optional[ValidationSeverity] = None,
    ) -> List[EvidenceValidation]:
        """
        Fetch validation records for a case file with optional filters.

        Args:
            case_file_id: Primary key of the case file.
            resolved_only: If True, only return resolved validations.
            unresolved_only: If True, only return unresolved validations.
            category: Filter by validation category.
            severity: Filter by severity level.

        Returns:
            List of EvidenceValidation instances.
        """
        query = self.db.query(EvidenceValidation).filter(
            EvidenceValidation.case_file_id == case_file_id
        )

        if resolved_only:
            query = query.filter(EvidenceValidation.is_resolved.is_(True))
        elif unresolved_only:
            query = query.filter(EvidenceValidation.is_resolved.is_(False))

        if category:
            query = query.filter(EvidenceValidation.category == category)

        if severity:
            query = query.filter(EvidenceValidation.severity == severity)

        return query.order_by(
            EvidenceValidation.severity.desc(),  # Critical first
            EvidenceValidation.created_at.desc(),
        ).all()

    def get_validations_by_evidence(
        self, evidence_id: int
    ) -> List[EvidenceValidation]:
        """Fetch all validation records related to a specific evidence item."""
        return (
            self.db.query(EvidenceValidation)
            .filter(EvidenceValidation.evidence_id == evidence_id)
            .order_by(EvidenceValidation.created_at.desc())
            .all()
        )

    def get_validations_by_category(
        self, case_file_id: int, category: ValidationCategory
    ) -> List[EvidenceValidation]:
        """Fetch validation records of a specific category for a case file."""
        return (
            self.db.query(EvidenceValidation)
            .filter(
                EvidenceValidation.case_file_id == case_file_id,
                EvidenceValidation.category == category,
            )
            .order_by(EvidenceValidation.severity.desc())
            .all()
        )

    def get_validations_by_severity(
        self, case_file_id: int, severity: ValidationSeverity
    ) -> List[EvidenceValidation]:
        """Fetch validation records of a specific severity for a case file."""
        return (
            self.db.query(EvidenceValidation)
            .filter(
                EvidenceValidation.case_file_id == case_file_id,
                EvidenceValidation.severity == severity,
            )
            .order_by(EvidenceValidation.created_at.desc())
            .all()
        )

    # --------------- Validation Resolution ---------------

    def resolve_validation(
        self,
        validation_id: int,
        resolved_by: str,
        resolution_notes: Optional[str] = None,
    ) -> Optional[EvidenceValidation]:
        """
        Mark a validation as resolved.

        Args:
            validation_id: Primary key of the validation record.
            resolved_by: Who resolved it (user ID or name).
            resolution_notes: Notes about the resolution.

        Returns:
            Updated EvidenceValidation, or None if not found.
        """
        validation = self.get_validation_by_id(validation_id)
        if not validation:
            return None

        validation.is_resolved = True
        validation.resolved_at = datetime.utcnow()
        validation.resolved_by = resolved_by
        validation.resolution_notes = resolution_notes

        self.db.flush()
        return validation

    def reopen_validation(self, validation_id: int) -> Optional[EvidenceValidation]:
        """
        Reopen a previously resolved validation.

        Args:
            validation_id: Primary key of the validation record.

        Returns:
            Updated EvidenceValidation, or None if not found.
        """
        validation = self.get_validation_by_id(validation_id)
        if not validation:
            return None

        validation.is_resolved = False
        validation.resolved_at = None
        validation.resolved_by = None
        validation.resolution_notes = None

        self.db.flush()
        return validation

    def delete_validation(self, validation_id: int) -> bool:
        """Delete a validation record."""
        validation = self.get_validation_by_id(validation_id)
        if not validation:
            return False

        self.db.delete(validation)
        self.db.flush()
        return True

    def delete_validations_for_case_file(self, case_file_id: int) -> int:
        """
        Delete all validation records for a case file.

        Returns:
            Number of deleted records.
        """
        count = (
            self.db.query(EvidenceValidation)
            .filter(EvidenceValidation.case_file_id == case_file_id)
            .delete()
        )
        self.db.flush()
        return count

    # --------------- Validation Statistics ---------------

    def get_validation_summary(
        self, case_file_id: int
    ) -> dict:
        """
        Get validation summary statistics for a case file.

        Returns:
            Dict with validation counts by category, severity, and resolution status.
        """
        all_validations = self.get_validations_for_case_file(case_file_id)

        summary = {
            "total": len(all_validations),
            "resolved": 0,
            "unresolved": 0,
            "by_category": {},
            "by_severity": {},
        }

        for validation in all_validations:
            # Count by resolution status
            if validation.is_resolved:
                summary["resolved"] += 1
            else:
                summary["unresolved"] += 1

            # Count by category
            category = validation.category.value
            summary["by_category"][category] = (
                summary["by_category"].get(category, 0) + 1
            )

            # Count by severity
            severity = validation.severity.value
            summary["by_severity"][severity] = (
                summary["by_severity"].get(severity, 0) + 1
            )

        return summary

    def get_critical_validations(self, case_file_id: int) -> List[EvidenceValidation]:
        """Fetch all critical and error severity validations for a case file."""
        return (
            self.db.query(EvidenceValidation)
            .filter(
                EvidenceValidation.case_file_id == case_file_id,
                EvidenceValidation.severity.in_(
                    [ValidationSeverity.CRITICAL, ValidationSeverity.ERROR]
                ),
                EvidenceValidation.is_resolved.is_(False),
            )
            .order_by(EvidenceValidation.created_at.desc())
            .all()
        )

    # --------------- Evidence Linking ---------------

    def get_case_file_by_id(self, case_file_id: int) -> Optional[CaseFile]:
        """Fetch a case file by primary key."""
        return self.db.query(CaseFile).filter(CaseFile.id == case_file_id).first()

    def get_evidence_by_id(self, evidence_id: int) -> Optional[EvidenceRepoModel]:
        """Fetch an evidence item by primary key."""
        return (
            self.db.query(EvidenceRepoModel)
            .filter(EvidenceRepoModel.id == evidence_id)
            .first()
        )

    def get_evidence_for_case_file(
        self, case_file_id: int
    ) -> List[EvidenceRepoModel]:
        """Fetch all evidence items for a case file."""
        return (
            self.db.query(EvidenceRepoModel)
            .filter(EvidenceRepoModel.case_file_id == case_file_id)
            .all()
        )
