# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MaternIQ is a maternal health monitoring platform with live wearable-simulated
vitals, a doctor/hospital management system, and a patient-only LLM lifestyle
assistant. It is built in 4 sequential phases — see `docs/` for the full phase
specs, which are the source of truth over assumptions made here or in code
comments.

## Tech Stack (do not substitute)

- Frontend: React + Vite
- Backend: Flask (synchronous — NOT FastAPI/async)
- Database: MySQL, accessed via **SQLAlchemy ORM** (models + Flask-Migrate/Alembic
  migrations, driver = PyMySQL — NOT raw `mysql-connector`/`%s` queries, NOT asyncpg / `$1 $2`)
- Real-time: Flask-SocketIO (rooms, one room per patient)
- MQTT Broker: Mosquitto (self-hosted — NOT HiveMQ Cloud)
- Background jobs: Redis RQ
- LLM: Groq API, single model `openai/gpt-oss-120b`

## Profiles

Exactly three user profiles: **Maternal Patient, Doctor, Hospital**. Do not add a
General/Other user profile even though it appears in some older source docs —
this was explicitly decided against.

## Development Phases

Build in this order — each phase assumes the previous one is complete. Do not
jump ahead to a later phase's features unless the current phase's core logic
is working first.

1. `Phase1_Foundation_Auth_and_Dashboards.docx` — auth, registration, dashboard shells
2. `Phase2_Hospital_Doctor_Patient_Connection.docx` — access codes, doctor mapping, appointments/reports/video/medicines
3. `Phase3_Vitals_Simulation_Pipeline.docx` — simulator, edge layer, MQTT, WebSocket, dashboards
4. `Phase4_LLM_Assistant_Security_Notifications.docx` — LLM pipeline, notifications

## LLM Architecture — Critical Constraint

- ONE model only: `openai/gpt-oss-120b` via Groq API. Do NOT implement a local
  model (e.g. Gemma), a router, or complexity-based model selection, even if
  referenced in old docs/specs.
- Every patient message follows this exact pipeline: PII Anonymizer → Prompt
  Injection Defender → RAG (ChromaDB) → single Groq call → Response Filter.
- The LLM NEVER talks to the doctor dashboard, directly or indirectly. No
  exceptions, no "just this once" notifications.
- The LLM never gives medicine names, dosages, diagnoses, or treatment
  instructions — always redirect to "contact your doctor via the
  consultation section."

## Data & Isolation Rules

- Three-tier vitals storage: Hot Buffer (24h) → Warm Trend (7d) → Cold Ledger
  (~270d). Never write directly to Cold Ledger; it's populated only by
  scheduled compression jobs.
- Per-hospital isolation: a doctor at two hospitals = two fully separate
  records. Never auto-link them.
- Deactivate, never hard-delete, any doctor/patient/mapping with history.
- Vitals sharing is a per-doctor toggle, independent of wearable connection
  and hospital connection — three separate controls, never conflate them.

## Conventions

- Keep edge-layer logic (deadband filter, moving window avg, daily
  aggregation) inside the simulator script, not the Flask backend.
- MQTT topics follow `patients/{patient_id}/vitals/{parameter}`.
- Always check the pointed files and its respective development phase before implementing a feature — they
  are the source of truth over assumptions.

## Commands

Not yet established — backend, frontend, tests, and lint tooling have not
been set up in this repository yet. Update this section once dev servers and
tooling exist.
