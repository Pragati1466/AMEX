from langgraph.graph import StateGraph, END
from graph_state import DisputeState
from customer_advocate import run_customer_advocate
from merchant_advocate import run_merchant_advocate
from fairness_agent import run_fairness_agent
from explainability_agent import run_explainability_agent


def customer_node(state: DisputeState) -> DisputeState:
    result = run_customer_advocate(state["case_text"])
    return {"customer_argument": result}

def merchant_node(state: DisputeState) -> DisputeState:
    result = run_merchant_advocate(state["case_text"])
    return {"merchant_argument": result}

def fairness_node(state: DisputeState) -> DisputeState:
    decision = run_fairness_agent(
        state["case_text"],
        state["customer_argument"],
        state["merchant_argument"]
    )
    return {"fairness_decision": decision}

def explainability_node(state: DisputeState) -> DisputeState:
    explanation = run_explainability_agent(state["fairness_decision"])
    return {"explanation": explanation}


# --- Build the graph ---
builder = StateGraph(DisputeState)

builder.add_node("customer_advocate", customer_node)
builder.add_node("merchant_advocate", merchant_node)
builder.add_node("fairness_node", fairness_node)
builder.add_node("explainability", explainability_node)

builder.set_entry_point("customer_advocate")
builder.add_edge("customer_advocate", "merchant_advocate")
builder.add_edge("merchant_advocate", "fairness_node")
builder.add_edge("fairness_node", "explainability")
builder.add_edge("explainability", END)

dispute_graph = builder.compile()


if __name__ == "__main__":
    mock_case = """
    Dispute Reason Code: 4554 - Goods And Services Not Received
    Card Member Claim: Customer ordered a laptop on 2025-01-10, paid $1,200.
    Merchant shipped the item but tracking shows it was never delivered.
    No signature on file. Merchant has not issued a refund.
    Card member emailed merchant twice (Jan 20, Jan 28) with no response.
    """

    result = dispute_graph.invoke({"case_text": mock_case})

    print("=== CUSTOMER ARGUMENT ===")
    print(result["customer_argument"].model_dump_json(indent=2))
    print("\n=== MERCHANT ARGUMENT ===")
    print(result["merchant_argument"].model_dump_json(indent=2))
    print("\n=== FAIRNESS DECISION ===")
    print(result["fairness_decision"].model_dump_json(indent=2))
    print("\n=== EXPLANATION ===")
    print(result["explanation"])