"""
Adapter layer for Module 2 reasoning pipeline.
Integrates with LangGraph agents when available; falls back to deterministic logic.
"""

import sys
from pathlib import Path
from typing import Any, Optional

from loguru import logger

from app.core.config import settings
from app.models.resolution import RecommendationOutcome


def _ensure_agents_path() -> None:
    agents_dir = Path(__file__).resolve().parent.parent.parent / "agents"
    agents_str = str(agents_dir)
    if agents_str not in sys.path:
        sys.path.insert(0, agents_str)


def format_case_text_from_package(package: dict[str, Any]) -> str:
    """Format investigation package as text for Module 2 agents."""
    try:
        _ensure_agents_path()
        from case_file_adapter import format_case_file_for_agents
        return format_case_file_for_agents(package)
    except Exception:
        return _fallback_format_package(package)


def _fallback_format_package(package: dict[str, Any]) -> str:
    case = package.get("case_file", {})
    lines = [f"CASE FILE: {case.get('case_file_id', 'unknown')}"]
    lines.append(f"Summary: {package.get('investigation_summary', 'N/A')}")
    for e in package.get("evidence", []):
        lines.append(f"- [{e.get('evidence_type', e.get('type'))}] {e.get('title')}: {e.get('description', '')}")
    for v in package.get("validations", []):
        lines.append(f"- ISSUE [{v.get('severity')}] {v.get('title')}: {v.get('description', '')}")
    return "\n".join(lines)


def winning_side_to_outcome(winning_side: str, fairness_score: float, confidence: float) -> RecommendationOutcome:
    """Map Module 2 winning_side to Module 3 recommendation outcome."""
    if confidence < 40 or winning_side == "insufficient_evidence":
        if fairness_score < 45 or fairness_score > 55:
            return RecommendationOutcome.PARTIAL_RESOLUTION
        return RecommendationOutcome.REQUEST_MORE_EVIDENCE
    if winning_side == "customer":
        return RecommendationOutcome.APPROVE_CUSTOMER
    if winning_side == "merchant":
        return RecommendationOutcome.APPROVE_MERCHANT
    if 40 <= fairness_score <= 60:
        return RecommendationOutcome.ESCALATE_TO_HUMAN
    return RecommendationOutcome.REQUEST_MORE_EVIDENCE


def run_module2_reasoning(package: dict[str, Any]) -> dict[str, Any]:
    """
    Run Module 2 LangGraph pipeline on a case package.
    Returns structured reasoning output or raises on total failure.
    """
    _ensure_agents_path()
    case_text = format_case_text_from_package(package)

    from pipeline import dispute_graph

    result = dispute_graph.invoke({"case_text": case_text})
    customer = result["customer_argument"]
    merchant = result["merchant_argument"]
    fairness = result["fairness_decision"]
    explanation = result["explanation"]

    customer_dict = customer.model_dump() if hasattr(customer, "model_dump") else customer
    merchant_dict = merchant.model_dump() if hasattr(merchant, "model_dump") else merchant
    fairness_dict = fairness.model_dump() if hasattr(fairness, "model_dump") else fairness

    outcome = winning_side_to_outcome(
        fairness_dict.get("winning_side", "insufficient_evidence"),
        float(fairness_dict.get("fairness_score", 50)),
        float(fairness_dict.get("confidence", 0)),
    )

    return {
        "module2_available": True,
        "customer_argument": customer_dict,
        "merchant_argument": merchant_dict,
        "fairness_decision": fairness_dict,
        "explanation": explanation if isinstance(explanation, str) else str(explanation),
        "fairness_score": float(fairness_dict.get("fairness_score", 50)),
        "confidence": float(fairness_dict.get("confidence", 0)) / 100.0,
        "ai_recommendation": outcome,
        "recommendation_rationale": "; ".join(fairness_dict.get("key_factors", [])),
        "human_review_required": bool(fairness_dict.get("requires_human_review", True)),
        "explainability_details": {
            "key_factors": fairness_dict.get("key_factors", []),
            "winning_side": fairness_dict.get("winning_side"),
            "explanation": explanation if isinstance(explanation, str) else str(explanation),
        },
    }


def deterministic_fallback_reasoning(
    package: dict[str, Any],
    validations: list[Any],
    evidence_count: int,
    missing_count: int,
    contradiction_count: int,
) -> dict[str, Any]:
    """Rule-based fallback when Module 2 / LLM is unavailable."""
    case = package.get("case_file", {})
    confidence_score = case.get("confidence_score") or 0.5
    completeness = max(0.0, min(1.0, 1.0 - (missing_count * 0.15) - (contradiction_count * 0.1)))

    customer_support: list[str] = []
    merchant_support: list[str] = []
    unresolved: list[str] = []

    for v in validations:
        cat = v.category.value if hasattr(v, "category") else v.get("category", "")
        title = v.title if hasattr(v, "title") else v.get("title", "")
        if cat == "missing_evidence":
            unresolved.append(title)
        elif cat == "contradiction":
            unresolved.append(f"Contradiction: {title}")

    if missing_count >= 3 or evidence_count < 2:
        outcome = RecommendationOutcome.REQUEST_MORE_EVIDENCE
        fairness = 50.0
    elif contradiction_count >= 2:
        outcome = RecommendationOutcome.ESCALATE_TO_HUMAN
        fairness = 50.0
    elif confidence_score >= 0.7 and completeness >= 0.75:
        outcome = RecommendationOutcome.APPROVE_CUSTOMER
        fairness = 65.0
        customer_support.append("Investigation confidence supports customer claim")
    elif confidence_score <= 0.4:
        outcome = RecommendationOutcome.APPROVE_MERCHANT
        fairness = 35.0
        merchant_support.append("Low investigation confidence favors merchant position")
    else:
        outcome = RecommendationOutcome.PARTIAL_RESOLUTION
        fairness = 50.0 + (confidence_score - 0.5) * 30

    confidence = completeness * confidence_score
    human_review = (
        missing_count > 0
        or contradiction_count > 0
        or 40 <= fairness <= 60
        or confidence < 0.5
    )

    return {
        "module2_available": False,
        "customer_argument": {
            "claim": "Customer position based on available evidence (deterministic analysis)",
            "supporting_evidence": customer_support,
            "confidence": int(fairness),
        },
        "merchant_argument": {
            "claim": "Merchant position based on available evidence (deterministic analysis)",
            "supporting_evidence": merchant_support,
            "confidence": int(100 - fairness),
        },
        "fairness_decision": {
            "winning_side": "insufficient_evidence" if human_review else (
                "customer" if fairness > 55 else "merchant" if fairness < 45 else "insufficient_evidence"
            ),
            "fairness_score": int(fairness),
            "confidence": int(confidence * 100),
            "key_factors": unresolved or ["Deterministic analysis — LLM unavailable"],
            "requires_human_review": human_review,
        },
        "explanation": (
            "Automated deterministic analysis used because AI reasoning was unavailable. "
            f"Evidence completeness: {completeness:.0%}, missing items: {missing_count}, "
            f"contradictions: {contradiction_count}."
        ),
        "fairness_score": fairness,
        "confidence": confidence,
        "ai_recommendation": outcome,
        "recommendation_rationale": (
            f"Deterministic fallback: completeness={completeness:.0%}, "
            f"missing={missing_count}, contradictions={contradiction_count}"
        ),
        "human_review_required": human_review,
        "explainability_details": {
            "key_factors": unresolved or ["Deterministic fallback applied"],
            "unresolved_issues": unresolved,
            "explanation": "Rule-based analysis — Module 2 LLM unavailable",
        },
    }


def get_reasoning_output(
    package: Optional[dict[str, Any]],
    validations: list[Any],
    evidence_count: int,
    missing_count: int,
    contradiction_count: int,
    force_fallback: bool = False,
) -> dict[str, Any]:
    """Get reasoning output, trying Module 2 first then falling back."""
    if not package:
        return deterministic_fallback_reasoning(
            {"case_file": {}}, validations, evidence_count, missing_count, contradiction_count
        )

    if force_fallback or not settings.GROQ_API_KEY:
        logger.info("Using deterministic fallback reasoning (no GROQ_API_KEY or forced)")
        return deterministic_fallback_reasoning(
            package, validations, evidence_count, missing_count, contradiction_count
        )

    try:
        return run_module2_reasoning(package)
    except Exception as exc:
        logger.warning(f"Module 2 reasoning failed, using fallback: {exc}")
        return deterministic_fallback_reasoning(
            package, validations, evidence_count, missing_count, contradiction_count
        )
