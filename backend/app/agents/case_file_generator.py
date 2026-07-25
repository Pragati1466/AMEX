"""
Case File Generator Agent.
Combines outputs from all previous agents into a standardized investigation package.
Uses Groq API for LLM summarization and confidence score calculation.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

from loguru import logger
from sqlalchemy.orm import Session

from app.models.new import (
    EvidenceRepository as EvidenceRepoModel,
    TimelineEvent,
    EvidenceValidation,
    PolicyMapping,
    CaseFile,
    CaseFileStatus,
    AuditLog,
    ValidationSeverity,
    PolicyMatchType,
)
from app.models.existing import Dispute, Customer, Merchant
from app.repositories.evidence_repository import EvidenceRepositoryDB
from app.utils.groq_client import GroqClient


class CaseFileGeneratorAgent:
    """
    Agent responsible for generating the final investigation package.
    Combines evidence, timeline, validation, and policy mapping into a structured case file.
    """

    def __init__(self, db: Session):
        self.db = db
        self.evidence_repo = EvidenceRepositoryDB(db)
        self.groq_client = GroqClient()

    def generate_case_file(
        self, case_file_id: int, user_id: Optional[int] = None
    ) -> Optional[CaseFile]:
        """
        Generate the complete investigation package for a case file.

        Process:
          1. Fetch case file and dispute details
          2. Collect all investigation components
          3. Calculate confidence score
          4. Generate LLM investigation summary
          5. Update case file with final package
          6. Update status to COMPLETE

        Args:
            case_file_id: Primary key of the case file.
            user_id: User who initiated the generation.

        Returns:
            The updated CaseFile, or None if not found.
        """
        # 1. Fetch the case file
        case_file = self.db.query(CaseFile).filter(CaseFile.id == case_file_id).first()
        if not case_file:
            logger.error(f"Case file {case_file_id} not found")
            return None

        logger.info(f"Starting case file generation for {case_file.case_file_id}")

        # 2. Fetch dispute details
        dispute = self.db.query(Dispute).filter(Dispute.id == case_file.dispute_id).first()
        if not dispute:
            logger.error(f"Dispute {case_file.dispute_id} not found")
            return case_file

        # 3. Collect all investigation components
        investigation_package = self._collect_investigation_components(case_file_id)

        # 4. Calculate confidence score
        confidence_score = self._calculate_confidence_score(
            case_file_id, investigation_package
        )

        # 5. Generate LLM investigation summary
        investigation_summary = self._generate_investigation_summary(
            dispute, investigation_package, confidence_score
        )

        # 6. Update case file with final package
        case_file.investigation_summary = investigation_summary
        case_file.confidence_score = confidence_score
        case_file.status = CaseFileStatus.COMPLETE
        case_file.generated_by = user_id
        case_file.metadata_json = {
            "package_generated_at": datetime.utcnow().isoformat(),
            "evidence_count": len(investigation_package["evidence"]),
            "timeline_events": len(investigation_package["timeline"]),
            "validations": len(investigation_package["validations"]),
            "policy_mappings": len(investigation_package["policy_mapping"]),
        }

        self.db.commit()
        self.db.refresh(case_file)

        # 7. Log the action
        self._log_action(
            action="case_file_generated",
            case_file_id=case_file_id,
            dispute_id=dispute.id,
            user_id=user_id,
            details=f"Generated investigation package with confidence score {confidence_score:.2f}",
        )

        logger.info(
            f"Case file generation completed for {case_file.case_file_id}. "
            f"Confidence score: {confidence_score:.2f}"
        )
        return case_file

    def _collect_investigation_components(
        self, case_file_id: int
    ) -> Dict[str, List[Dict]]:
        """
        Collect all investigation components for the case file.

        Returns:
            Dict with evidence, timeline, validations, and policy_mapping.
        """
        package = {
            "evidence": [],
            "timeline": [],
            "validations": [],
            "policy_mapping": [],
        }

        # Collect evidence
        evidence_items = (
            self.db.query(EvidenceRepoModel)
            .filter(EvidenceRepoModel.case_file_id == case_file_id)
            .all()
        )

        for evidence in evidence_items:
            package["evidence"].append({
                "id": evidence.id,
                "evidence_id": evidence.evidence_id,
                "type": evidence.evidence_type.value,
                "title": evidence.title,
                "description": evidence.description,
                "status": evidence.status.value,
                "merchant_name": evidence.merchant_name,
                "amount": float(evidence.amount) if evidence.amount else None,
                "currency": evidence.currency,
                "event_date": evidence.event_date.isoformat() if evidence.event_date else None,
            })

        # Collect timeline events
        timeline_events = (
            self.db.query(TimelineEvent)
            .filter(TimelineEvent.case_file_id == case_file_id)
            .order_by(TimelineEvent.sequence_order.asc())
            .all()
        )

        for event in timeline_events:
            package["timeline"].append({
                "id": event.id,
                "event_id": event.event_id,
                "type": event.event_type.value,
                "date": event.event_date.isoformat() if event.event_date else None,
                "title": event.title,
                "description": event.description,
                "sequence_order": event.sequence_order,
            })

        # Collect validations
        validations = (
            self.db.query(EvidenceValidation)
            .filter(EvidenceValidation.case_file_id == case_file_id)
            .all()
        )

        for validation in validations:
            package["validations"].append({
                "id": validation.id,
                "validation_id": validation.validation_id,
                "category": validation.category.value,
                "severity": validation.severity.value,
                "title": validation.title,
                "description": validation.description,
                "is_resolved": validation.is_resolved,
            })

        # Collect policy mappings
        policy_mappings = (
            self.db.query(PolicyMapping)
            .filter(PolicyMapping.case_file_id == case_file_id)
            .all()
        )

        for mapping in policy_mappings:
            package["policy_mapping"].append({
                "id": mapping.id,
                "mapping_id": mapping.mapping_id,
                "match_type": mapping.match_type.value,
                "relevance_score": mapping.relevance_score,
                "explanation": mapping.explanation,
                "is_applicable": mapping.is_applicable,
            })

        logger.info(
            f"Collected investigation components: "
            f"{len(package['evidence'])} evidence, "
            f"{len(package['timeline'])} timeline events, "
            f"{len(package['validations'])} validations, "
            f"{len(package['policy_mapping'])} policy mappings"
        )

        return package

    def _calculate_confidence_score(
        self, case_file_id: int, package: Dict[str, List[Dict]]
    ) -> float:
        """
        Calculate overall confidence score for the investigation.

        Args:
            case_file_id: Primary key of the case file.
            package: Investigation package components.

        Returns:
            Confidence score between 0.0 and 1.0.
        """
        score = 0.0
        max_score = 100.0

        # 1. Evidence completeness (30 points)
        evidence_count = len(package["evidence"])
        if evidence_count >= 5:
            score += 30.0
        elif evidence_count >= 3:
            score += 20.0
        elif evidence_count >= 1:
            score += 10.0

        # 2. Timeline quality (20 points)
        timeline_count = len(package["timeline"])
        if timeline_count >= 3:
            score += 20.0
        elif timeline_count >= 1:
            score += 10.0

        # 3. Validation status (20 points)
        validations = package["validations"]
        if validations:
            critical_count = sum(
                1 for v in validations
                if v["severity"] in ["critical", "error"] and not v["is_resolved"]
            )
            if critical_count == 0:
                score += 20.0
            elif critical_count <= 2:
                score += 10.0
        else:
            score += 10.0  # No validations is neutral

        # 4. Policy mapping quality (20 points)
        policy_count = len(package["policy_mapping"])
        if policy_count >= 2:
            score += 20.0
        elif policy_count >= 1:
            score += 10.0

        # 5. Evidence processing status (10 points)
        processed_evidence = sum(
            1 for e in package["evidence"]
            if e.get("status") == "validated"
        )
        if processed_evidence == evidence_count and evidence_count > 0:
            score += 10.0
        elif processed_evidence >= evidence_count * 0.5:
            score += 5.0

        # Normalize to 0.0-1.0 range
        confidence_score = min(score / max_score, 1.0)

        logger.info(f"Calculated confidence score: {confidence_score:.2f} (raw: {score:.1f}/{max_score})")
        return confidence_score

    def _generate_investigation_summary(
        self,
        dispute: Dispute,
        package: Dict[str, List[Dict]],
        confidence_score: float,
    ) -> str:
        """
        Generate LLM investigation summary using Groq API.

        Args:
            dispute: The dispute object.
            package: Investigation package components.
            confidence_score: Calculated confidence score.

        Returns:
            Generated investigation summary text.
        """
        # Build context for LLM
        context = self._build_llm_context(dispute, package, confidence_score)

        if not self.groq_client.is_available():
            logger.warning("Groq API not available - using rule-based summary")
            return self._generate_rule_based_summary(dispute, package, confidence_score)

        try:
            summary = self.groq_client.generate_investigation_summary(context)
            return summary
        except Exception as e:
            logger.error(f"LLM summary generation failed: {e}")
            return self._generate_rule_based_summary(dispute, package, confidence_score)

    def _build_llm_context(
        self,
        dispute: Dispute,
        package: Dict[str, List[Dict]],
        confidence_score: float,
    ) -> str:
        """Build context string for LLM summarization."""
        context_parts = []

        # Dispute information
        context_parts.append(f"DISPUTE DETAILS:")
        context_parts.append(f"  Dispute ID: {dispute.dispute_id}")
        context_parts.append(f"  Reason: {dispute.reason.value if dispute.reason else 'unknown'}")
        context_parts.append(f"  Amount: {dispute.amount} {dispute.currency}")
        context_parts.append(f"  Description: {dispute.description or 'No description'}")
        context_parts.append(f"  Status: {dispute.status.value}")

        # Evidence summary
        context_parts.append(f"\nEVIDENCE SUMMARY:")
        context_parts.append(f"  Total evidence items: {len(package['evidence'])}")
        evidence_types = {}
        for evidence in package["evidence"]:
            etype = evidence["type"]
            evidence_types[etype] = evidence_types.get(etype, 0) + 1
        for etype, count in evidence_types.items():
            context_parts.append(f"    {etype}: {count}")

        # Timeline summary
        context_parts.append(f"\nTIMELINE SUMMARY:")
        context_parts.append(f"  Total events: {len(package['timeline'])}")
        if package["timeline"]:
            first_event = package["timeline"][0]
            last_event = package["timeline"][-1]
            context_parts.append(f"  Date range: {first_event.get('date')} to {last_event.get('date')}")

        # Validation summary
        context_parts.append(f"\nVALIDATION SUMMARY:")
        critical_count = sum(
            1 for v in package["validations"]
            if v["severity"] in ["critical", "error"] and not v["is_resolved"]
        )
        context_parts.append(f"  Total validations: {len(package['validations'])}")
        context_parts.append(f"  Unresolved critical issues: {critical_count}")

        # Policy mapping summary
        context_parts.append(f"\nPOLICY MAPPING SUMMARY:")
        context_parts.append(f"  Total policy mappings: {len(package['policy_mapping'])}")
        if package["policy_mapping"]:
            avg_relevance = sum(
                m.get("relevance_score", 0) for m in package["policy_mapping"]
            ) / len(package["policy_mapping"])
            context_parts.append(f"  Average relevance: {avg_relevance:.2f}")

        # Confidence score
        context_parts.append(f"\nINVESTIGATION CONFIDENCE: {confidence_score:.2f}")

        return "\n".join(context_parts)

    def _generate_rule_based_summary(
        self,
        dispute: Dispute,
        package: Dict[str, List[Dict]],
        confidence_score: float,
    ) -> str:
        """Generate rule-based summary when LLM is unavailable."""
        summary_parts = []

        summary_parts.append(f"Investigation Summary for Dispute {dispute.dispute_id}")
        summary_parts.append(f"Reason: {dispute.reason.value if dispute.reason else 'unknown'}")
        summary_parts.append(f"Amount: {dispute.amount} {dispute.currency}")
        summary_parts.append("")

        summary_parts.append("Evidence Collected:")
        for evidence in package["evidence"][:5]:  # Limit to first 5
            summary_parts.append(f"  - {evidence['type']}: {evidence['title']}")

        summary_parts.append("")
        summary_parts.append(f"Timeline Events: {len(package['timeline'])}")
        summary_parts.append(f"Validations: {len(package['validations'])}")
        summary_parts.append(f"Policy Mappings: {len(package['policy_mapping'])}")
        summary_parts.append("")
        summary_parts.append(f"Overall Confidence Score: {confidence_score:.2f}")

        return "\n".join(summary_parts)

    def get_standardized_package(
        self, case_file_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get the standardized investigation package for Module 2 consumption.

        Args:
            case_file_id: Primary key of the case file.

        Returns:
            Standardized package dict or None if not found.
        """
        case_file = self.db.query(CaseFile).filter(CaseFile.id == case_file_id).first()
        if not case_file:
            return None

        # Collect all components
        package = self._collect_investigation_components(case_file_id)

        # Build standardized output
        standardized = {
            "case_file": {
                "id": case_file.id,
                "case_file_id": case_file.case_file_id,
                "dispute_id": case_file.dispute_id,
                "status": case_file.status.value,
                "generated_at": case_file.updated_at.isoformat() if case_file.updated_at else None,
            },
            "timeline": package["timeline"],
            "evidence": package["evidence"],
            "validations": package["validations"],
            "policy_mapping": package["policy_mapping"],
            "investigation_summary": case_file.investigation_summary,
            "confidence_score": case_file.confidence_score,
        }

        return standardized

    def _log_action(
        self,
        action: str,
        case_file_id: int,
        dispute_id: int,
        user_id: Optional[int] = None,
        details: str = "",
    ) -> None:
        """Create an audit log entry for case file generation actions."""
        log = AuditLog(
            action=action,
            entity_type="case_file",
            entity_id=case_file_id,
            dispute_id=dispute_id,
            case_file_id=case_file_id,
            user_id=user_id,
            details=details,
        )
        self.db.add(log)
        self.db.flush()
