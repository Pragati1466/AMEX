from typing import TypedDict, Optional
from schemas import Argument, FairnessDecision

class DisputeState(TypedDict):
    case_text: str
    customer_argument: Optional[Argument]
    merchant_argument: Optional[Argument]
    fairness_decision: Optional[FairnessDecision]
    explanation: Optional[str]