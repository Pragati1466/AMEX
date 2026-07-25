"""Smart Evidence Recommendation Agent — rule-based with optional LLM enhancement."""

import datetime
import uuid
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.existing import Dispute, DisputeReason
from app.models.new import (
    CaseFile, EvidenceRepository, EvidenceValidation,
    ValidationCategory, EvidenceType,
)
from app.models.resolution import (
    EvidenceRecommendation, EvidenceRecommendationPriority,
    EvidenceRequestedFrom, EvidenceRecommendationStatus,
    ResolutionState,
)

# Rule templates: (evidence_type, description, reason, priority, requested_from)
EVIDENCE_RULES: list[tuple[str, str, str, EvidenceRecommendationPriority, EvidenceRequestedFrom]] = [
    ("proof_of_delivery", "Upload proof of delivery", "Delivery confirmation needed to verify receipt", EvidenceRecommendationPriority.CRITICAL, EvidenceRequestedFrom.MERCHANT),
    ("refund_confirmation", "Provide refund confirmation", "Refund status is unclear or disputed", EvidenceRecommendationPriority.HIGH, EvidenceRequestedFrom.MERCHANT),
    ("customer_communication", "Provide customer communication", "Communication records would clarify dispute timeline", EvidenceRecommendationPriority.MEDIUM, EvidenceRequestedFrom.CUSTOMER),
    ("transaction_receipt", "Provide transaction receipt", "Transaction receipt strengthens payment verification", EvidenceRecommendationPriority.HIGH, EvidenceRequestedFrom.EITHER),
    ("cancellation_evidence", "Provide cancellation evidence", "Cancellation proof needed for refund disputes", EvidenceRecommendationPriority.HIGH, EvidenceRequestedFrom.CUSTOMER),
    ("return_shipment_tracking", "Provide return shipment tracking", "Return tracking needed to verify return process", EvidenceRecommendationPriority.HIGH, EvidenceRequestedFrom.CUSTOMER),
    ("merchant_refund_policy", "Provide merchant refund policy", "Policy document needed to assess compliance", EvidenceRecommendationPriority.MEDIUM, EvidenceRequestedFrom.MERCHANT),
    ("bank_transaction_record", "Provide bank transaction record", "Bank record would verify charge details", EvidenceRecommendationPriority.MEDIUM, EvidenceRequestedFrom.CUSTOMER),
]

DISPUTE_REASON_RULES: dict[DisputeReason, list[str]] = {
    DisputeReason.PRODUCT_NOT_RECEIVED: ["proof_of_delivery", "return_shipment_tracking", "customer_communication"],
    DisputeReason.REFUND_NOT_PROCESSED: ["refund_confirmation", "merchant_refund_policy", "bank_transaction_record"],
    DisputeReason.PRODUCT_DEFECTIVE: ["return_shipment_tracking", "customer_communication", "transaction_receipt"],
    DisputeReason.FRAUD: ["bank_transaction_record", "transaction_receipt", "customer_communication"],
    DisputeReason.UNAUTHORIZED: ["bank_transaction_record", "transaction_receipt"],
    DisputeReason.DUPLICATE: ["transaction_receipt", "bank_transaction_record"],
}


class SmartEvidenceRecommendationAgent:
    """Generates prioritized evidence recommendations."""

    def __init__(self, db: Session):
        self.db = db

    def _existing_types(self, case_file_id: int) -> set[str]:
        items = (
            self.db.query(EvidenceRepository)
            .filter(EvidenceRepository.case_file_id == case_file_id)
            .all()
        )
        types: set[str] = set()
        for item in items:
            if item.evidence_type:
                types.add(item.evidence_type.value)
            if item.title:
                title_lower = item.title.lower()
                for rule_type, _, _, _, _ in EVIDENCE_RULES:
                    if rule_type.replace("_", " ") in title_lower or rule_type in title_lower:
                        types.add(rule_type)
        return types

    def _validation_gaps(self, case_file_id: int) -> list[dict[str, Any]]:
        validations = (
            self.db.query(EvidenceValidation)
            .filter(
                EvidenceValidation.case_file_id == case_file_id,
                EvidenceValidation.is_resolved.is_(False),
            )
            .all()
        )
        gaps = []
        for v in validations:
            if v.category in (ValidationCategory.MISSING_EVIDENCE, ValidationCategory.INCOMPLETE_SUBMISSION):
                gaps.append({"title": v.title, "suggestion": v.suggestion, "severity": v.severity.value})
        return gaps

    def generate_recommendations(
        self,
        dispute_id: int,
        refresh: bool = False,
    ) -> list[EvidenceRecommendation]:
        dispute = self.db.query(Dispute).filter(Dispute.id == dispute_id).first()
        if not dispute:
            return []

        case_file = self.db.query(CaseFile).filter(CaseFile.dispute_id == dispute_id).first()
        if not case_file:
            return []

        if refresh:
            open_recs = (
                self.db.query(EvidenceRecommendation)
                .filter(
                    EvidenceRecommendation.dispute_id == dispute_id,
                    EvidenceRecommendation.status == EvidenceRecommendationStatus.OPEN,
                )
                .all()
            )
            for rec in open_recs:
                rec.status = EvidenceRecommendationStatus.DISMISSED

        existing = self._existing_types(case_file.id)
        validation_gaps = self._validation_gaps(case_file.id)
        state = self.db.query(ResolutionState).filter(ResolutionState.dispute_id == dispute_id).first()
        low_confidence = state and state.confidence is not None and state.confidence < 0.5

        candidates: list[tuple[str, str, str, EvidenceRecommendationPriority, EvidenceRequestedFrom, str]] = []

        # From validation gaps
        for gap in validation_gaps:
            sev = gap.get("severity", "warning")
            priority = EvidenceRecommendationPriority.CRITICAL if sev == "critical" else EvidenceRecommendationPriority.HIGH
            candidates.append((
                "validation_gap",
                gap["title"],
                gap.get("suggestion") or f"Resolve validation issue: {gap['title']}",
                priority,
                EvidenceRequestedFrom.EITHER,
                gap["title"],
            ))

        # From dispute reason rules
        reason_types = DISPUTE_REASON_RULES.get(dispute.reason, [])
        rule_map = {r[0]: r for r in EVIDENCE_RULES}
        for rt in reason_types:
            if rt not in existing and rt in rule_map:
                rule = rule_map[rt]
                candidates.append((*rule, rt))

        # From general rules
        for rule in EVIDENCE_RULES:
            if rule[0] not in existing:
                already = any(c[5] == rule[0] for c in candidates)
                if not already:
                    candidates.append((*rule, rule[0]))

        # Low confidence boost
        if low_confidence:
            for rule in EVIDENCE_RULES[:3]:
                if rule[0] not in existing:
                    already = any(c[5] == rule[0] for c in candidates)
                    if not already:
                        boosted = (rule[0], rule[1], f"Low confidence area: {rule[2]}", EvidenceRecommendationPriority.CRITICAL, rule[4], rule[0])
                        candidates.append(boosted)

        # Sort by priority
        priority_order = {
            EvidenceRecommendationPriority.CRITICAL: 0,
            EvidenceRecommendationPriority.HIGH: 1,
            EvidenceRecommendationPriority.MEDIUM: 2,
            EvidenceRecommendationPriority.LOW: 3,
        }
        candidates.sort(key=lambda c: priority_order.get(c[3], 99))

        created: list[EvidenceRecommendation] = []
        seen_keys: set[str] = set()

        for ev_type, desc, reason, priority, requested_from, dedup_key in candidates:
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)

            existing_rec = (
                self.db.query(EvidenceRecommendation)
                .filter(
                    EvidenceRecommendation.dispute_id == dispute_id,
                    EvidenceRecommendation.evidence_type == ev_type,
                    EvidenceRecommendation.status.in_([
                        EvidenceRecommendationStatus.OPEN,
                        EvidenceRecommendationStatus.REQUESTED,
                    ]),
                )
                .first()
            )
            if existing_rec:
                created.append(existing_rec)
                continue

            rec = EvidenceRecommendation(
                recommendation_id=f"ER-{uuid.uuid4().hex[:12].upper()}",
                dispute_id=dispute_id,
                case_file_id=case_file.id,
                evidence_type=ev_type,
                description=desc,
                reason=reason,
                priority=priority,
                requested_from=requested_from,
                status=EvidenceRecommendationStatus.OPEN,
            )
            self.db.add(rec)
            created.append(rec)

        self.db.commit()
        for rec in created:
            self.db.refresh(rec)
        return created

    def _evidence_text(self, evidence: EvidenceRepository) -> str:
        """Concatenate searchable text fields from an evidence item."""
        return " ".join(filter(None, [
            (evidence.title or "").lower(),
            (evidence.description or "").lower(),
            (evidence.content_text or "").lower(),
        ]))

    def _evidence_matches_recommendation(
        self,
        rec: EvidenceRecommendation,
        evidence_text: str,
    ) -> bool:
        """Check if submitted evidence satisfies a recommendation via keyword matching.

        Mirrors the keyword approach already used by ``_existing_types``:
        the recommendation ``evidence_type`` is a plain string label (e.g.
        ``proof_of_delivery``) that does not map directly to the
        ``EvidenceType`` enum on ``EvidenceRepository``.  We therefore check
        whether the label — in both underscore and space form — appears in the
        submitted evidence's title, description, or extracted content.
        """
        if not evidence_text:
            return False

        ev_type = (rec.evidence_type or "").strip()
        match_phrases: list[str] = []

        if ev_type and ev_type != "validation_gap":
            match_phrases.append(ev_type)
            match_phrases.append(ev_type.replace("_", " "))
        elif ev_type == "validation_gap" and rec.description:
            # For validation-gap recommendations the ``description`` holds the
            # gap title (e.g. "Missing proof of delivery").  Strip common
            # prefixes so the remaining phrase can match evidence text.
            desc = rec.description.lower()
            for prefix in ("missing ", "incomplete ", "absent ", "lack of "):
                if desc.startswith(prefix):
                    desc = desc[len(prefix):]
                    break
            match_phrases.append(desc.strip())

        for phrase in match_phrases:
            if phrase and phrase in evidence_text:
                return True
        return False

    def match_and_transition_recommendations(
        self,
        dispute_id: int,
        evidence: EvidenceRepository,
    ) -> list[EvidenceRecommendation]:
        """Match submitted evidence against open/requested recommendations.

        Finds every ``EvidenceRecommendation`` for *dispute_id* whose status is
        ``OPEN`` or ``REQUESTED`` and transitions those satisfied by the
        submitted *evidence* to ``RESOLVED``, setting ``resolved_at``.

        Returns the list of transitioned recommendations.
        """
        open_recs = (
            self.db.query(EvidenceRecommendation)
            .filter(
                EvidenceRecommendation.dispute_id == dispute_id,
                EvidenceRecommendation.status.in_([
                    EvidenceRecommendationStatus.OPEN,
                    EvidenceRecommendationStatus.REQUESTED,
                ]),
            )
            .all()
        )

        evidence_text = self._evidence_text(evidence)

        transitioned: list[EvidenceRecommendation] = []
        for rec in open_recs:
            if self._evidence_matches_recommendation(rec, evidence_text):
                rec.status = EvidenceRecommendationStatus.RESOLVED
                if rec.resolved_at is None:
                    rec.resolved_at = datetime.datetime.utcnow()
                transitioned.append(rec)

        if transitioned:
            self.db.commit()
            for rec in transitioned:
                self.db.refresh(rec)
        return transitioned


