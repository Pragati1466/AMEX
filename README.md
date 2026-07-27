<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.9%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Vite-5.1-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
</p>

<h1 align="center">⚖️ DisputeIQ</h1>

<p align="center"><strong>AI-powered dispute investigation and resolution platform</strong></p>

<p align="center"><em>A single workspace for collecting evidence, investigating cases, assessing policy compliance, and making fair, explainable resolution decisions.</em></p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Core Capabilities](#-core-capabilities)
- [Unified Workflow](#-unified-workflow)
- [Architecture](#-architecture)
- [Dashboard Previews](#-dashboard-previews)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)

---

## 🎯 Overview

DisputeIQ is a full-stack dispute-operations platform that brings two connected workflows into one application:

1. **Investigation & Evidence Intelligence** — create cases, collect and validate evidence, reconstruct timelines, and review policy compliance.
2. **Resolution & Collaboration** — assess fairness, compare customer and merchant positions, rescore evidence, make a human decision, and retain an audit trail.

The React frontend uses a shared sidebar so investigators can move from case intake to final resolution without changing applications. The FastAPI backend provides authenticated APIs, database persistence, document processing, AI-assisted reasoning, and auditable case data.

---

## 🔥 Core Capabilities

| Capability | Description |
|:---|:---|
| **Unified Case Operations** | One navigation shell connects investigation, evidence intelligence, resolution queues, and case workspaces. |
| **Case Intake** | Capture customer, merchant, transaction, priority, and dispute details for each case. |
| **Investigator Dashboard** | Monitor active cases, pending investigations, completion status, and evidence needs. |
| **Evidence Management** | Upload, process, validate, and monitor missing evidence. |
| **Timeline Reconstruction** | Build a chronological case view and identify evidence or timeline gaps. |
| **Policy Mapping** | Map evidence to applicable policies with compliance and readiness indicators. |
| **Fairness Analysis** | Compare customer and merchant evidence with explainable factors and contradictions. |
| **AI-Assisted Resolution** | Generate evidence recommendations, fairness scores, re-scores, and a resolution recommendation. |
| **Human-in-the-Loop Decisions** | Investigators can approve, reject, or modify the final outcome. |
| **Collaboration & Auditability** | Keep reports, notifications, collaboration events, and audit logs with the resolution. |

---

## 🔄 Unified Workflow

```mermaid
flowchart LR
    A["Create / Select Case"] --> B["Investigation Dashboard"]
    B --> C["Evidence & Timeline"]
    C --> D["Policy & Compliance Analysis"]
    D --> E["Fairness Assessment"]
    E --> F["AI Recommendation & Re-score"]
    F --> G["Human Decision"]
    G --> H["Report, Notifications & Audit Log"]
```

| Area | Routes | Purpose |
|:---|:---|:---|
| **Investigation** | `/investigator/dashboard`, `/investigator/cases/new`, `/investigator/cases/:caseId` | Intake, case workspaces, evidence, timeline, and policy review. |
| **Resolution** | `/dashboard`, `/resolution/cases`, `/resolution/:caseId/*` | Resolution queue, fairness, collaboration, decisions, reports, and audit trail. |

---

## 🏗 Architecture

```mermaid
graph TB
    subgraph "Frontend — React + Vite"
        UI["Unified Sidebar & Routing"]
        INV["Investigation Module"]
        RES["Resolution Module"]
        API["Axios API Client"]
    end
    subgraph "Backend — FastAPI"
        AUTH["Authentication"]
        CASES["Case File APIs"]
        EVIDENCE["Evidence & Validation APIs"]
        RESOLUTION["Resolution & Audit APIs"]
    end
    subgraph "Intelligence & Data"
        AGENTS["Evidence, Timeline, Policy & Resolution Agents"]
        LLM["Groq / LangChain / LangGraph"]
        DB["PostgreSQL or SQLite"]
        STORAGE["Cloudinary & ChromaDB"]
    end
    UI --> INV
    UI --> RES
    INV --> API
    RES --> API
    API --> AUTH
    API --> CASES
    API --> EVIDENCE
    API --> RESOLUTION
    EVIDENCE --> AGENTS
    RESOLUTION --> AGENTS
    AGENTS --> LLM
    CASES --> DB
    EVIDENCE --> STORAGE
```

---

## 🖼 Dashboard Previews

<div align="center">

| Module | Preview |
|:---:|:---|
| **Investigator Dashboard** | <img src="1.jpeg" width="700" alt="Investigator Dashboard showing active dispute cases" /> |
| **Evidence Upload Center** | <img src="2.jpeg" width="700" alt="Evidence upload, validation, and missing evidence workspace" /> |
| **Policy Compliance** | <img src="3.jpeg" width="700" alt="Policy compliance and evidence coverage analysis" /> |
| **Create New Case** | <img src="4.jpeg" width="700" alt="New dispute case intake form" /> |
| **AI Explainability** | <img src="5.jpeg" width="700" alt="Customer and merchant advocate explanations" /> |
| **Live Fairness Score** | <img src="6.jpeg" width="700" alt="Fairness score, AI recommendation, and evidence completeness" /> |

</div>

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose |
|:---|:---|
| React 18 | Component-based user interface |
| React Router | Unified routing across investigation and resolution |
| Vite | Development server and production builds |
| Tailwind CSS | Utility-first styling |
| Recharts | Operational data visualization |
| Axios | Authenticated API communication |
| Lucide React | Interface icons |

### Backend & Intelligence

| Technology | Purpose |
|:---|:---|
| FastAPI | REST API and backend application |
| SQLAlchemy + Alembic | Database models and migrations |
| PostgreSQL / SQLite | Persistent application data |
| LangChain + LangGraph + Groq | AI-assisted agent workflows |
| ChromaDB | Vector search for policies and similar cases |
| PyMuPDF, pdfplumber, pytesseract | Document and OCR processing |
| Cloudinary | Evidence file storage |

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|:---|:---:|
| Node.js | 18+ |
| Python | 3.9+ |
| PostgreSQL | 14+ (or SQLite for development) |
| Groq API key | Required for AI-powered features |
| Cloudinary account | Required for hosted evidence uploads |

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure database, Groq, Cloudinary, and security settings.
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/disputiq
# DATABASE_URL=sqlite:///./test.db
GROQ_API_KEY=your_groq_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
SECRET_KEY=replace_with_a_secure_secret
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

For a deployed backend, set `VITE_API_URL=https://your-api.example.com/api/v1` in the frontend environment.

### Tests

```bash
cd backend
pytest
```

---

## 🔌 API Highlights

The backend serves versioned routes under `/api/v1`:

| Area | Examples |
|:---|:---|
| **Authentication** | `/auth/register`, `/auth/login` |
| **Case files** | `/case-file/generate`, `/case-file/{case_file_id}` |
| **Evidence** | `/evidence/upload`, `/evidence/collect`, `/evidence/extract` |
| **Timeline** | `/timeline/reconstruct`, `/timeline/case-file/{case_file_id}` |
| **Policy** | `/policy/map`, `/policy/case-file/{case_file_id}`, `/policy/search-policies` |
| **Validation** | `/validation/validate`, `/validation/case-file/{case_file_id}/completeness` |
| **Resolution** | `/resolution/{case_id}/dashboard`, `/resolution/{case_id}/rescore`, `/resolution/{case_id}/decision/approve` |

---

<p align="center">Built for fairer, more transparent dispute decisions.</p>
