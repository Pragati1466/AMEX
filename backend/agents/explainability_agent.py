from schemas import FairnessDecision

def run_explainability_agent(decision: FairnessDecision) -> str:
    """
    Converts a FairnessDecision into a plain-English explanation.
    Purely template-based: every sentence is directly traceable to the
    actual decision data, so it cannot contradict or hallucinate beyond it.
    """

    # --- Opening line: who the evidence favors ---
    if decision.winning_side == "customer":
        opening = f"The evidence favors the card member (fairness score: {decision.fairness_score}/100)."
    elif decision.winning_side == "merchant":
        opening = f"The evidence favors the merchant (fairness score: {decision.fairness_score}/100)."
    else:
        opening = f"The evidence is insufficient to clearly favor either side (fairness score: {decision.fairness_score}/100)."

    # --- Key factors, as a readable list ---
    if decision.key_factors:
        factors_text = "Key factors driving this decision:\n"
        for factor in decision.key_factors:
            factors_text += f"  • {factor}\n"
    else:
        factors_text = "No specific key factors were identified.\n"

    # --- Confidence framing ---
    if decision.confidence >= 80:
        confidence_text = f"The system has high confidence ({decision.confidence}/100) in this assessment."
    elif decision.confidence >= 60:
        confidence_text = f"The system has moderate confidence ({decision.confidence}/100) in this assessment."
    else:
        confidence_text = f"The system has low confidence ({decision.confidence}/100) in this assessment."

    # --- Human review flag ---
    if decision.requires_human_review:
        review_text = "⚠️ This case has been flagged for human investigator review due to closely balanced or uncertain evidence."
    else:
        review_text = "This case did not meet the threshold for mandatory human review, but the investigator retains full authority to override this recommendation."

    explanation = f"{opening}\n\n{factors_text}\n{confidence_text}\n\n{review_text}"
    return explanation


if __name__ == "__main__":
    from customer_advocate import run_customer_advocate
    from merchant_advocate import run_merchant_advocate
    from fairness_agent import run_fairness_agent

    mock_case = """
    Dispute Reason Code: 4554 - Goods And Services Not Received
    Card Member Claim: Customer ordered a laptop on 2025-01-10, paid $1,200.
    Merchant shipped the item but tracking shows it was never delivered.
    No signature on file. Merchant has not issued a refund.
    Card member emailed merchant twice (Jan 20, Jan 28) with no response.
    """

    customer_result = run_customer_advocate(mock_case)
    merchant_result = run_merchant_advocate(mock_case)
    decision = run_fairness_agent(mock_case, customer_result, merchant_result)

    explanation = run_explainability_agent(decision)
    print(explanation)