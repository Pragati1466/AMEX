from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
from pipeline import dispute_graph
from case_file_adapter import format_case_file_for_agents

app = FastAPI(title="DisputeIQ - Module 2: Reasoning Engine")

INVESTIGATION_MODULE_BASE_URL = "http://localhost:8000"
INVESTIGATION_MODULE_USERNAME = "anjali"
INVESTIGATION_MODULE_PASSWORD = "TestPass123!"

def get_investigation_token() -> str:
    r = requests.post(
        f"{INVESTIGATION_MODULE_BASE_URL}/api/v1/auth/login",
        json={"username": INVESTIGATION_MODULE_USERNAME, "password": INVESTIGATION_MODULE_PASSWORD}
    )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to authenticate with Investigation module")
    return r.json()["access_token"]

class CaseRequest(BaseModel):
    case_file_id: str

@app.post("/reasoning/run")
def run_reasoning(request: CaseRequest):
    token = get_investigation_token()
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(
        f"{INVESTIGATION_MODULE_BASE_URL}/api/v1/case-file/{request.case_file_id}/package",
        headers=headers
    )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch case file from Investigation module")

    package = response.json()
    case_text = format_case_file_for_agents(package)
    result = dispute_graph.invoke({"case_text": case_text})

    return {
        "case_file_id": request.case_file_id,
        "customer_argument": result["customer_argument"].model_dump(),
        "merchant_argument": result["merchant_argument"].model_dump(),
        "fairness_decision": result["fairness_decision"].model_dump(),
        "explanation": result["explanation"]
    }

@app.get("/")
def health_check():
    return {"status": "Module 2 reasoning engine is running"}