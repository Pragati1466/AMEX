from pydantic import BaseModel, Field, field_validator
from typing import List

class Argument(BaseModel):
    claim: str = Field(description="The core claim being made, one sentence.")
    supporting_evidence: List[str] = Field(description="List of specific evidence points from the case that support the claim.")
    applicable_policy_clause: str = Field(description="The specific chargeback reason code or requirement this argument relies on.")
    confidence: int = Field(description="Confidence in this argument's strength, from 0 to 100.")

    @field_validator("confidence", mode="before")
    @classmethod
    def coerce_confidence_to_int(cls, value):
        if isinstance(value, str):
            return int(value.strip())
        return value

from typing import Literal

class FairnessDecision(BaseModel):
    winning_side: Literal["customer", "merchant", "insufficient_evidence"] = Field(
        description="Which side the evidence more strongly supports, or insufficient_evidence if too close/unclear."
    )
    fairness_score: int = Field(
        description="0-100. 0 = fully favors merchant, 100 = fully favors customer, 50 = perfectly balanced."
    )
    confidence: int = Field(
        description="How confident the system is in this decision overall, 0-100."
    )
    key_factors: List[str] = Field(
        description="The specific evidence-based reasons driving this decision."
    )
    requires_human_review: bool = Field(
        description="True if evidence is contradictory, thin, or the fairness_score is close to 50."
    )

    @field_validator("fairness_score", "confidence", mode="before")
    @classmethod
    def coerce_to_int(cls, value):
        if isinstance(value, str):
            return int(value.strip())
        return value
def fallback_argument(side: str) -> Argument:
    return Argument(
        claim=f"Unable to generate {side} argument due to a system error. Manual review required.",
        supporting_evidence=[],
        applicable_policy_clause="N/A",
        confidence=0
    )

def fallback_fairness_decision() -> FairnessDecision:
    return FairnessDecision(
        winning_side="insufficient_evidence",
        fairness_score=50,
        confidence=0,
        key_factors=["System error: automated reasoning unavailable"],
        requires_human_review=True
    )