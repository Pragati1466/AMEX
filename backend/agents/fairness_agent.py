import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from schemas import Argument, FairnessDecision
from customer_advocate import run_customer_advocate
from merchant_advocate import run_merchant_advocate
from llm_utils import invoke_with_retry
from schemas import fallback_fairness_decision


load_dotenv()

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.2  # even lower than the advocates — we want consistency, not creativity, in judgment
)

structured_llm = llm.with_structured_output(FairnessDecision)

SYSTEM_PROMPT = """You are the Fairness & Decision Agent in a dispute resolution system.
You are NEUTRAL — you do not favor the customer or the merchant by default.

You will be given:
1. The original case evidence
2. The Customer Advocate's argument
3. The Merchant Advocate's argument

Evaluate using this rubric, in order:
1. EVIDENCE QUALITY: For each side, is their evidence actual documented fact (tracking data, signatures, emails, policy text), or just a claim with no backing?
2. POLICY COMPLIANCE: Does either side's evidence actually satisfy the documented requirements for the cited chargeback reason code? A claim without required proof (e.g. "merchant shipped it" without a signed delivery confirmation) is WEAK evidence, not strong evidence.
3. CONTRADICTIONS: When a contradiction or known issue is flagged in the evidence, do not treat it as automatically ambiguous. Reason about which side it actually supports. For example, if tracking shows delivery to an address that does not match the customer's address, this is evidence AGAINST the merchant's claim of successful delivery, and FOR the customer's claim of non-receipt — it should not be treated as neutral.
4. GAPS: Is there evidence that logically should exist but is missing (e.g. no delivery signature when one would normally be required)? Missing expected evidence typically weakens that side's own claim.

Do not simply average the two advocates' confidence scores. Independently judge the evidence.
Only classify a case as "insufficient_evidence" or set winning_side ambiguous if there is truly no evidence pointing more strongly to one side — not simply because a contradiction exists. A resolved contradiction (i.e. one that clearly favors one side once reasoned through) should push the score toward that side.
If the case is genuinely close, or evidence is thin/contradictory on both sides even after this reasoning, set requires_human_review to true and keep fairness_score near 50."""

def run_fairness_agent(case_text: str, customer_arg: Argument, merchant_arg: Argument) -> FairnessDecision:
    user_prompt = f"""ORIGINAL CASE EVIDENCE:
{case_text}

CUSTOMER ADVOCATE ARGUMENT:
{customer_arg.model_dump_json(indent=2)}

MERCHANT ADVOCATE ARGUMENT:
{merchant_arg.model_dump_json(indent=2)}

Evaluate this dispute using the rubric and produce your decision."""

    decision = invoke_with_retry(
        invoke_fn=lambda: structured_llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_prompt)
        ]),
        fallback=fallback_fairness_decision()
    )

    if 40 <= decision.fairness_score <= 60:
        decision.requires_human_review = True
    if decision.confidence < 60:
        decision.requires_human_review = True

    return decision

if __name__ == "__main__":
    mock_case = """
    Dispute Reason Code: 4540 - Card Not Present
    Card Member Claim: Card member states they did not authorize an online purchase
    of $340 for electronics, made on 2025-02-03.
    Merchant Evidence: Order was placed with correct billing address matching the
    card member's address on file (AVS match = Y). Card Security Code was verified
    (CSC match = Y). Item was shipped to the same billing address.
    However, the card member's account with the merchant had no prior purchase
    history, and this was the first-ever transaction on this account.
    Card member says they never created an account with this merchant.
    """

    customer_result = run_customer_advocate(mock_case)
    merchant_result = run_merchant_advocate(mock_case)

    decision = run_fairness_agent(mock_case, customer_result, merchant_result)
    print(decision.model_dump_json(indent=2))