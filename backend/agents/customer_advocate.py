import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from schemas import Argument  # if this fails, see note below
from llm_utils import invoke_with_retry
from schemas import fallback_argument

load_dotenv()

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3
)

structured_llm = llm.with_structured_output(Argument)

SYSTEM_PROMPT = """You are the Customer Advocate Agent in a dispute resolution system.
Build the strongest possible, evidence-based case FOR the card member.
Only use the evidence provided. Do not invent facts.
Return confidence as a plain integer (e.g. 90), not a string or percentage."""

def run_customer_advocate(case_text: str) -> Argument:
    return invoke_with_retry(
        invoke_fn=lambda: structured_llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Case evidence:\n\n{case_text}\n\nBuild the customer's argument.")
        ]),
        fallback=fallback_argument("customer")
    )

if __name__ == "__main__":
    mock_case = """
    Dispute Reason Code: 4554 - Goods And Services Not Received
    Card Member Claim: Customer ordered a laptop on 2025-01-10, paid $1,200.
    Merchant shipped the item but tracking shows it was never delivered.
    No signature on file. Merchant has not issued a refund.
    Card member emailed merchant twice (Jan 20, Jan 28) with no response.
    """
    result = run_customer_advocate(mock_case)
    print(result.model_dump_json(indent=2))