::: {align="center"}
`<img src="https://img.shields.io/badge/FORMLESS-Application%20Readiness-6C63FF?style=for-the-badge&labelColor=171923" alt="FORMLESS Application Readiness"/>`{=html}

# FORMLESS

### Turn complex requirements into clear next steps.

**An AI-assisted, evidence-aware application readiness platform that
transforms lengthy policy documents into structured requirements,
verifiable evidence, and actionable stage-based readiness.**

[Overview](#-overview) · [Features](#-key-features) ·
[Architecture](#-how-it-works) · [Getting Started](#-getting-started) ·
[Testing](#-testing)

`<br/>`{=html}

`<img src="https://img.shields.io/badge/Python-Backend-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"/>`{=html}
`<img src="https://img.shields.io/badge/FastAPI-API-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"/>`{=html}
`<img src="https://img.shields.io/badge/SQLite-Database-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite"/>`{=html}
`<img src="https://img.shields.io/badge/Google%20GenAI-AI%20Integration-4285F4?style=flat-square&logo=google&logoColor=white" alt="Google GenAI"/>`{=html}
`<img src="https://img.shields.io/badge/Vite-Frontend%20Tooling-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"/>`{=html}
:::

------------------------------------------------------------------------

## ✨ Overview

Applying for an internship, scholarship, or institutional program can
mean navigating long PDFs, scattered eligibility criteria, supporting
documents, and joining instructions. The real challenge isn't always
finding an opportunity---it's figuring out **what applies to you, what
evidence you need, and what could prevent you from moving forward.**

**FORMLESS is built to make that process clearer.**

It transforms policy-driven application workflows into structured
requirements, connects those requirements to applicant information and
evidence, and highlights what remains unresolved for the applicant's
current stage.

Instead of treating an application as a flat checklist, FORMLESS models
readiness as a journey:

> **Requirement → Evidence → Verification → Action → Readiness**

## 🎯 Why FORMLESS?

Traditional application workflows leave applicants to interpret dense
documents and manually track every condition. A simple checklist cannot
always distinguish between a requirement that is complete, one that
needs human verification, and one that blocks a later stage.

FORMLESS aims to answer four practical questions:

-   🔎 **What do I need?** --- Understand requirements extracted from
    policy and opportunity documents.
-   📎 **What evidence supports it?** --- Connect requirements to
    applicant information and supporting documents.
-   🛡️ **What is verified?** --- Make uncertainty visible instead of
    treating every extracted fact as confirmed.
-   🧭 **What should I do next?** --- Surface unresolved blockers based
    on the stage the applicant wants to reach.

## 🚀 Key Features

```{=html}
<table>
```
```{=html}
<tr>
```
```{=html}
<td width="50%" valign="top">
```
### 📄 Policy-to-requirements workflow

Turn lengthy policy or opportunity documents into structured
requirements that are easier to review and act on.

```{=html}
</td>
```
```{=html}
<td width="50%" valign="top">
```
### 🔗 Evidence-aware tracking

Connect requirements to the applicant information or evidence used to
address them, supporting a more traceable workflow than a basic
checklist.

```{=html}
</td>
```
```{=html}
</tr>
```
```{=html}
<tr>
```
```{=html}
<td width="50%" valign="top">
```
### ⚙️ Deterministic rule engine

Evaluate supported conditions with explicit operators and `ALL` / `ANY`
rule grouping rather than relying on an opaque readiness score.

```{=html}
</td>
```
```{=html}
<td width="50%" valign="top">
```
### ✅ Verification-aware statuses

Distinguish verified requirements from missing items and items that
still need verification.

```{=html}
</td>
```
```{=html}
</tr>
```
```{=html}
<tr>
```
```{=html}
<td width="50%" valign="top">
```
### 🧭 Stage-based readiness

Calculate readiness against a lifecycle stage, with blockers that can
differ between submission, completion, and joining.

```{=html}
</td>
```
```{=html}
<td width="50%" valign="top">
```
### 🧩 Requirement dependencies

Represent prerequisite relationships so the workflow can account for
requirements that depend on other evidence.

```{=html}
</td>
```
```{=html}
</tr>
```
```{=html}
</table>
```
## 🧠 How It Works

``` mermaid
flowchart TD
    A["📄 Policy or opportunity document"] --> B["AI-assisted document interpretation"]
    B --> C["Structured requirements"]
    D["Applicant profile and evidence"] --> E["Rule engine"]
    C --> E
    E --> F["Requirement and verification states"]
    F --> G["Stage-based readiness calculation"]
    G --> H["Active blockers and next actions"]
    H --> D

    classDef input fill:#eef2ff,stroke:#6c63ff,color:#171923
    classDef process fill:#f3f4f6,stroke:#9ca3af,color:#171923
    classDef output fill:#e6fffa,stroke:#0d9488,color:#171923
    class A,D input
    class B,C,E,F process
    class G,H output
```

1.  **Ingest** a policy or opportunity document.
2.  **Structure** the relevant requirements and their context.
3.  **Connect** requirements with applicant information and evidence.
4.  **Evaluate** supported conditions using explicit rules.
5.  **Verify** uncertain items instead of assuming they are satisfied.
6.  **Calculate readiness** for the active application stage.
7.  **Identify next actions** from the unresolved blockers.

### A key architectural principle

**AI helps interpret documents; deterministic rules evaluate supported
conditions.**

Separating interpretation from evaluation makes the system easier to
test, inspect, and explain. A readiness result should be connected to
identifiable requirements and their current states---not presented as an
unexplained model judgment.

## 🧰 Tech Stack

  ----------------------------------------------------------------------------------------------------------------------------------------------
  Technology                                                                                                 Role
  ---------------------------------------------------------------------------------------------------------- -----------------------------------
  ![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)        Backend application logic

  ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)     REST API

  ![SQLModel](https://img.shields.io/badge/SQLModel-Database%20Models-475569?style=flat-square)              Data models and persistence layer

  ![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)        Local development database

  ![Google                                                                                                   AI-assisted document interpretation
  GenAI](https://img.shields.io/badge/Google%20GenAI-4285F4?style=flat-square&logo=google&logoColor=white)   

  ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)              Frontend development tooling

  ![Pytest](https://img.shields.io/badge/Pytest-0A9EDC?style=flat-square&logo=pytest&logoColor=white)        Backend testing

  `pypdf`                                                                                                    PDF text extraction
  ----------------------------------------------------------------------------------------------------------------------------------------------

The exact frontend framework and dependency versions should be confirmed
from the current frontend `package.json` and lockfile.

## 🧪 Demo Scenario

The canonical demo uses an **FSSAI internship** application workflow. It
includes an applicant profile, eligibility-related requirements, items
requiring verification, missing joining documents, and a prerequisite
relationship between requirements.

The example illustrates how FORMLESS can distinguish:

-   Requirements already marked as verified
-   Items that still need verification
-   Missing supporting documents
-   Blockers relevant to the active lifecycle stage
-   Dependencies that affect the next steps

*The seeded scenario is illustrative demo data. It is not an official
determination of FSSAI eligibility; applicants should consult the latest
official notice.*

## 🏗️ Project Structure

``` text
FORMLESS/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py
│   │   ├── services/
│   │   │   ├── rule_engine.py
│   │   │   ├── readiness.py
│   │   │   └── seed.py
│   │   ├── config.py
│   │   ├── models.py
│   │   └── main.py
│   ├── tests/
│   │   └── test_rules_and_readiness.py
│   └── requirements.txt
├── frontend/
│   └── ... application source and package configuration ...
└── README.md
```

This is an orientation to the principal backend modules, not a
guaranteed exhaustive listing. Refer to the current repository for the
full structure.

## 💻 Getting Started

### Prerequisites

-   Python 3.10+ (or the version supported by the current dependencies)
-   Node.js LTS and npm
-   Git
-   A Google GenAI API key for features that require model access

### 1. Clone the repository

``` bash
git clone <your-repository-url>
cd FORMLESS
```

If the project is already on your machine, open its existing repository
folder.

### 2. Set up the backend

``` powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Configure the environment variables required by the current backend
configuration. If model-backed functionality is enabled, provide your
Google GenAI API key using the exact variable name expected by
`backend/app/config.py`.

**Keep credentials private. Never commit API keys or a populated `.env`
file.**

### 3. Run the backend

From the `backend` directory:

``` powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

When running with the default local settings:

-   API: `http://127.0.0.1:8000`
-   Interactive API docs: `http://127.0.0.1:8000/docs`

### 4. Run the frontend

Open a second terminal at the repository root:

``` powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite---commonly `http://localhost:5173`.

### 5. Verify the application

1.  Confirm that both frontend and backend processes are running.
2.  Open the frontend in your browser.
3.  Complete the available application flow.
4.  Inspect the browser console and Network panel if a request fails.
5.  Check the backend logs and frontend API base-URL configuration when
    troubleshooting connectivity.

> Setup commands and URLs may change as the project evolves. Use the
> current configuration and terminal output as the source of truth.

## 🧪 Testing

Run the backend test suite from the `backend` directory:

``` powershell
.\.venv\Scripts\python.exe -m pytest
```

Run a focused rule-engine/readiness test module:

``` powershell
.\.venv\Scripts\python.exe -m pytest tests/test_rules_and_readiness.py -v
```

Retest rule evaluation, lifecycle transitions, and readiness
calculations whenever their logic changes. Automated tests should be
complemented by a browser walkthrough of the user-facing flow.

## 🔐 Configuration & Responsible Use

-   **Secrets:** Store API keys in local environment configuration; do
    not commit them.
-   **Database:** Confirm the configured SQLite database path in
    `backend/app/config.py`.
-   **Uploads:** Review the configured upload directory and how uploaded
    files are handled.
-   **Demo data:** Understand whether a seed/reset operation overwrites
    local state before running it.
-   **Privacy:** Before processing real applicant documents, assess
    access control, retention, logging, and secure storage.
-   **Verification:** Extracted information may need human review.
    `NEEDS_VERIFICATION` is not the same as verified.
-   **Official decisions:** A readiness result does not guarantee
    eligibility, selection, or acceptance.
-   **Document safety:** Treat uploaded files and extracted text as
    untrusted input; validate inputs and avoid leaking sensitive
    information into logs.

## 🛣️ Future Directions

Potential development priorities include:

-   Improving extraction quality and source-level traceability
-   Strengthening evidence upload and human verification flows
-   Making blocker explanations and next actions more actionable
-   Expanding tests for lifecycle transitions and failure scenarios
-   Improving resilience for scanned, malformed, and large PDFs
-   Hardening privacy, file validation, authentication, and deployment
-   Refining accessibility, responsive behavior, and interaction
    feedback

These are development directions, not claims that every item is already
implemented.

## 🤝 Contributing

Contributions and feedback are welcome.

1.  Create a focused branch for your change.
2.  Keep rule evaluation and readiness behavior covered by tests.
3.  Document any new environment variables or setup requirements.
4.  Run relevant automated tests and manually verify the affected
    browser flow.
5.  Never commit credentials, real applicant documents, or other
    sensitive data.

## 🐛 Troubleshooting

  -----------------------------------------------------------------------
  Problem                             What to check
  ----------------------------------- -----------------------------------
  Frontend cannot reach the API       Backend process, API base URL, CORS
                                      settings, and browser Network
                                      errors

  Model-backed extraction fails       API key, configured model name,
                                      provider quota, network access, and
                                      backend logs

  A requirement cannot be found       Active database/seed data and the
                                      requirement identifier sent by the
                                      frontend

  A port is already in use            Stop the conflicting process or
                                      configure a free port consistently

  Tests fail after a schema change    Fixtures, database state, expected
                                      statuses, and lifecycle assumptions
  -----------------------------------------------------------------------

## 📌 Project Status

FORMLESS is an evolving prototype. Confirm feature behavior,
configuration, and setup instructions against the current branch before
a release or public demo.

## 📄 License

No license is specified in this repository description. Add a `LICENSE`
file and update this section before distributing the project if you
intend to grant others explicit reuse rights.

------------------------------------------------------------------------

::: {align="center"}
### Make requirements understandable. Make readiness actionable.

**FORMLESS**

`<sub>`{=html}Built to bring clarity, evidence, and direction to complex
application workflows.`</sub>`{=html}
:::
