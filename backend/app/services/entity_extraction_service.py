"""
Entity Extraction Service.
Orchestrates extraction of structured information from evidence text content
using the entity_extractor utility. Bridges agents and the API layer.
"""

from typing import Optional

from loguru import logger
from sqlalchemy.orm import Session

from app.models.new import (
    EvidenceRepository as EvidenceRepoModel,
    AuditLog,
)
from app.utils.entity_extractor import (
    extract_entities,
    update_evidence_from_text,
    ExtractedEntities,
)


class EntityExtractionService:
    """
    Service responsible for running entity extraction on evidence items.
    Can be called individually, in batch, or during the collection pipeline.
    """

    def __init__(self, db: Session):
        self.db = db

    def extract_for_evidence(
        self, evidence_id: int, re_extract: bool = False
    ) -> Optional[ExtractedEntities]:
        """
        Extract entities from a single evidence item's content_text.

        Args:
            evidence_id: Primary key of the evidence_repository record.
            re_extract: If True, re-extract even if already processed.

        Returns:
            ExtractedEntities if successful, None if evidence not found.
        """
        evidence = (
            self.db.query(EvidenceRepoModel)
            .filter(EvidenceRepoModel.id == evidence_id)
            .first()
        )
        if not evidence:
            logger.error(f"Evidence record {evidence_id} not found")
            return None

        # Skip if already processed and re-extract not requested
        if evidence.is_processed and not re_extract:
            logger.debug(
                f"Evidence {evidence_id} already processed. "
                "Use re_extract=True to force re-extraction."
            )
            return ExtractedEntities(
                merchant_name=evidence.merchant_name,
                customer_name=evidence.customer_name,
                amount=float(evidence.amount) if evidence.amount else None,
                currency=evidence.currency,
                transaction_id=evidence.transaction_id_ref,
                order_id=evidence.order_id_ref,
            )

        text = evidence.content_text or ""
        if not text.strip():
            logger.warning(f"Evidence {evidence_id} has no content_text to extract from")
            return ExtractedEntities()

        # Perform extraction
        entities = extract_entities(text)

        # Update the evidence record in-place
        update_evidence_from_text(evidence, text)
        self.db.flush()

        # Audit log
        log = AuditLog(
            action="entity_extraction_completed",
            entity_type="evidence_repository",
            entity_id=evidence.id,
            dispute_id=(
                self.db.query(EvidenceRepoModel.case_file_id)
                .filter(EvidenceRepoModel.id == evidence_id)
                .scalar()
            ),
            details=(
                f"Extracted entities for evidence {evidence.evidence_id}: "
                f"merchant={entities.merchant_name}, "
                f"amount={entities.amount}, "
                f"date={entities.date}, "
                f"txn={entities.transaction_id}"
            ),
        )
        self.db.add(log)

        logger.debug(
            f"Entity extraction completed for evidence {evidence_id}: "
            f"merchant={entities.merchant_name}, "
            f"amount={entities.amount}, "
            f"date={entities.date}"
        )
        return entities

    def extract_for_case_file(
        self, case_file_id: int, re_extract: bool = False
    ) -> dict:
        """
        Extract entities for all evidence items in a case file.

        Args:
            case_file_id: Primary key of the case file.
            re_extract: If True, re-extract already processed items.

        Returns:
            Dict with counts of processed items and any errors.
        """
        evidence_items = (
            self.db.query(EvidenceRepoModel)
            .filter(EvidenceRepoModel.case_file_id == case_file_id)
            .all()
        )

        results = {
            "total": len(evidence_items),
            "processed": 0,
            "skipped": 0,
            "errors": 0,
            "details": [],
        }

        for item in evidence_items:
            try:
                entities = self.extract_for_evidence(item.id, re_extract=re_extract)
                if entities is not None:
                    results["processed"] += 1
                    results["details"].append(
                        {
                            "evidence_id": item.id,
                            "evidence_ref": item.evidence_id,
                            "merchant": entities.merchant_name,
                            "amount": entities.amount,
                            "date": entities.date,
                            "transaction_id": entities.transaction_id,
                            "order_id": entities.order_id,
                        }
                    )
                else:
                    results["skipped"] += 1
            except Exception as e:
                logger.error(f"Entity extraction failed for evidence {item.id}: {e}")
                results["errors"] += 1
                results["details"].append(
                    {
                        "evidence_id": item.id,
                        "evidence_ref": item.evidence_id,
                        "error": str(e),
                    }
                )

        # Commit all changes at once
        self.db.commit()

        # Audit log
        log = AuditLog(
            action="batch_entity_extraction_completed",
            entity_type="evidence_repository",
            case_file_id=case_file_id,
            details=(
                f"Batch entity extraction: {results['processed']} processed, "
                f"{results['skipped']} skipped, {results['errors']} errors "
                f"out of {results['total']} evidence items"
            ),
        )
        self.db.add(log)
        self.db.commit()

        logger.info(
            f"Batch entity extraction for case file {case_file_id}: "
            f"{results['processed']}/{results['total']} processed"
        )
        return results

    def extract_for_evidence_by_ref(
        self, evidence_ref: str, re_extract: bool = False
    ) -> Optional[ExtractedEntities]:
        """
        Extract entities from an evidence item using its evidence_id string.

        Args:
            evidence_ref: The evidence_id (e.g., 'EV-ABC123...').
            re_extract: If True, re-extract already processed items.

        Returns:
            ExtractedEntities if successful, None if not found.
        """
        evidence = (
            self.db.query(EvidenceRepoModel)
            .filter(EvidenceRepoModel.evidence_id == evidence_ref)
            .first()
        )
        if not evidence:
            logger.error(f"Evidence with ref {evidence_ref} not found")
            return None
        return self.extract_for_evidence(evidence.id, re_extract=re_extract)

    def get_extracted_entities(self, evidence_id: int) -> Optional[dict]:
        """
        Retrieve previously extracted entities from an evidence record
        without re-running extraction.

        Args:
            evidence_id: Primary key of the evidence_repository record.

        Returns:
            Dict of extracted entities, or None if not found/not processed.
        """
        evidence = (
            self.db.query(EvidenceRepoModel)
            .filter(EvidenceRepoModel.id == evidence_id)
            .first()
        )
        if not evidence:
            return None

        return {
            "evidence_id": evidence.id,
            "evidence_ref": evidence.evidence_id,
            "is_processed": evidence.is_processed,
            "merchant_name": evidence.merchant_name,
            "customer_name": evidence.customer_name,
            "amount": float(evidence.amount) if evidence.amount else None,
            "currency": evidence.currency,
            "transaction_id_ref": evidence.transaction_id_ref,
            "order_id_ref": evidence.order_id_ref,
            "content_json": evidence.content_json,
            "processing_notes": evidence.processing_notes,
        }