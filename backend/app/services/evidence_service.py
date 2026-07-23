"""
Service layer for evidence collection operations.
Bridges API layer with the Evidence Collection Agent.
"""

import uuid
from typing import Optional

from fastapi import UploadFile
from loguru import logger
from sqlalchemy.orm import Session

from app.agents.evidence_collection import EvidenceCollectionAgent
from app.models.new import (
    EvidenceRepository as EvidenceRepoModel,
    CaseFile, AuditLog,
    EvidenceType, EvidenceSource, EvidenceStatus,
)
from app.utils.cloudinary import upload_file
from app.utils.document_processor import extract_text_from_bytes, is_supported_file


class EvidenceService:
    """Business logic for evidence collection and management."""

    def __init__(self, db: Session):
        self.db = db
        self.agent = EvidenceCollectionAgent(db)

    def collect_evidence_for_dispute(self, dispute_id: int) -> dict:
        """
        Trigger the Evidence Collection Agent to collect all evidence
        for a given dispute.

        Args:
            dispute_id: Primary key of the dispute.

        Returns:
            Dict with success status, message, case_file, and evidence_count.
        """
        case_file = self.agent.collect_all_evidence(dispute_id)

        if not case_file:
            return {
                "success": False,
                "message": f"Dispute {dispute_id} not found or collection failed",
                "case_file": None,
                "evidence_count": 0,
            }

        # Count evidence items
        evidence_count = (
            self.db.query(EvidenceRepoModel)
            .filter(EvidenceRepoModel.case_file_id == case_file.id)
            .count()
        )

        return {
            "success": True,
            "message": f"Evidence collection completed. {evidence_count} items collected.",
            "case_file": case_file,
            "evidence_count": evidence_count,
        }

    async def upload_evidence_file(
        self,
        dispute_id: int,
        file: UploadFile,
        title: str,
        description: Optional[str] = None,
    ) -> dict:
        """
        Upload an evidence file and store it in the evidence repository.

        Args:
            dispute_id: Primary key of the dispute.
            file: The uploaded file.
            title: Title for the evidence item.
            description: Optional description.

        Returns:
            Dict with success status and evidence item details.
        """
        # Find or create case file for this dispute
        case_file = self.db.query(CaseFile).filter(
            CaseFile.dispute_id == dispute_id
        ).first()

        if not case_file:
            # Create a case file first
            agent = EvidenceCollectionAgent(self.db)
            case_file = agent.collect_all_evidence(dispute_id)
            if not case_file:
                return {
                    "success": False,
                    "message": f"Dispute {dispute_id} not found",
                }

        # Read file data
        file_data = await file.read()
        file_name = f"{case_file.case_file_id}_{file.filename}"

        # Upload to Cloudinary
        upload_result = upload_file(
            file_data=file_data,
            file_name=file_name,
            folder=f"dispute_iq_evidence/{case_file.case_file_id}",
        )

        file_url = upload_result.get("url") if upload_result else None
        file_size = upload_result.get("bytes") if upload_result else len(file_data)

        # Extract text from the uploaded document
        extracted_text = extract_text_from_bytes(
            file_data=file_data,
            filename=file.filename or "unknown",
            mime_type=file.content_type,
        )

        # Store in evidence repository
        evidence = EvidenceRepoModel(
            case_file_id=case_file.id,
            evidence_id=f"EV-{uuid.uuid4().hex[:12].upper()}",
            evidence_type=EvidenceType.UPLOADED_DOCUMENT,
            source=EvidenceSource.UPLOAD,
            status=EvidenceStatus.COLLECTED,
            title=title,
            description=description,
            content_text=extracted_text if extracted_text else None,
            file_url=file_url,
            file_type=file.content_type,
            file_size_bytes=file_size,
            is_processed=bool(extracted_text),
            processing_notes=(
                f"Text extraction completed: {len(extracted_text)} characters extracted"
                if extracted_text
                else "No text could be extracted from this file"
            ),
        )
        self.db.add(evidence)
        self.db.commit()
        self.db.refresh(evidence)

        # Audit log
        log = AuditLog(
            action="evidence_uploaded",
            entity_type="evidence_repository",
            entity_id=evidence.id,
            dispute_id=dispute_id,
            case_file_id=case_file.id,
            details=(
                f"Uploaded evidence file: {file.filename}. "
                f"Text extracted: {len(extracted_text)} characters."
            ),
        )
        self.db.add(log)
        self.db.commit()

        logger.info(
            f"Evidence file uploaded: {file.filename} for dispute {dispute_id}. "
            f"Extracted {len(extracted_text)} chars."
        )

        return {
            "success": True,
            "message": "File uploaded successfully",
            "evidence": evidence,
            "extracted_text_length": len(extracted_text),
        }

    def get_case_file(self, case_file_id: int) -> Optional[CaseFile]:
        """Get a case file by its primary key."""
        return self.db.query(CaseFile).filter(CaseFile.id == case_file_id).first()

    def get_case_file_by_dispute(self, dispute_id: int) -> Optional[CaseFile]:
        """Get a case file by dispute ID."""
        return self.db.query(CaseFile).filter(
            CaseFile.dispute_id == dispute_id
        ).first()

    def get_evidence_for_case(self, case_file_id: int) -> list[EvidenceRepoModel]:
        """Get all evidence items for a case file."""
        return (
            self.db.query(EvidenceRepoModel)
            .filter(EvidenceRepoModel.case_file_id == case_file_id)
            .order_by(EvidenceRepoModel.event_date.asc().nullslast())
            .all()
        )

    def get_evidence_by_type(
        self, case_file_id: int, evidence_type: str
    ) -> list[EvidenceRepoModel]:
        """Get evidence items filtered by type."""
        return (
            self.db.query(EvidenceRepoModel)
            .filter(
                EvidenceRepoModel.case_file_id == case_file_id,
                EvidenceRepoModel.evidence_type == evidence_type,
            )
            .all()
        )