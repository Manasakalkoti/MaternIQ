# MaternIQ — Execution Roadmap

This file synthesizes the seven source documents in the project root into a single, actionable
build plan. Where documents disagree, the **Phase 1–4 roadmap docs win** — they were written
last and explicitly override older architecture notes (e.g. any mention of a local Gemma model
or FastAPI is superseded by the Phase 3/4 tech-stack notes below).

## Source Documents

| Document | Role |
|---|---|
| `Phase1_Foundation_Auth_and_Dashboards.pdf` | Authoritative spec for Phase 1 |
| `Phase2_Hospital_Doctor_Patient_Connection.pdf` | Authoritative spec for Phase 2 |
| `Phase3_Vitals_Simulation_Pipeline.pdf` | Authoritative spec for Phase 3 |
| `Phase4_LLM_Assistant_Security_Notifications.pdf` | Authoritative spec for Phase 4 |
| `Doc, pat, hos user_flows.pdf` | Detailed UX flows (Patient/Doctor/Hospital) the phase specs were derived from — use for UI/edge-case detail |
| `Complete_Data_Flow_UpdatedStack.pdf` | Layer-by-layer technical data flow on the **current** stack (React+Vite, Flask, MySQL, Mosquitto) — use for backend/wiring detail |
| `simulation and LLM.pdf` | Deeper theory for the simulator lifecycle and the LLM's 12 conversational aspects — background rationale only; defer to Phase 3/4 docs on any stack conflict |

## Tech Stack (fixed — see `CLAUDE.md`)

Frontend: React + Vite · Backend: Flask (sync) · DB: MySQL, accessed via **SQLAlchemy ORM**
(models below, driver = PyMySQL, connection string `mysql+pymysql://...` — not raw
`mysql-connector`/`%s` queries as the older data-flow doc describes) ·
Real-time: Flask-SocketIO · MQTT: self-hosted Mosquitto · Jobs: Redis RQ · LLM: Groq API,
single model `openai/gpt-oss-120b`.

**Confirmed decisions (override any conflicting source-doc text below):**
- Exactly **three** user profiles — Maternal Patient, Doctor, Hospital. No General/Other User
  profile, despite it appearing in the Phase 1 doc and user-flow doc.
- Groq model slug is `openai/gpt-oss-120b` (not `openai/gpt 120b`).
- All schema changes go through **SQLAlchemy models + Flask-Migrate (Alembic) migrations** —
  never hand-written `CREATE TABLE`/`ALTER TABLE` SQL.

## Database Schema (SQLAlchemy ORM)

All tables below are SQLAlchemy `db.Model` classes backed by MySQL. Each table lists the fields
required by the phase specs; add SQLAlchemy relationship/back-reference wiring as models are
implemented. `PK` = primary key, `FK` = foreign key.

### Phase 1 — Identity

**`patients`**
| Field | Type | Notes |
|---|---|---|
| `patient_id` | INTEGER, PK | |
| `email` | VARCHAR, unique, not null | primary login identifier |
| `password_hash` | VARCHAR, not null | |
| `trimester` | INTEGER, nullable | |
| `due_date` | DATE, nullable | |
| `conditions` | TEXT/JSON, nullable | gestational diabetes, high BP, anaemia, thyroid, etc. |
| `job_type` | VARCHAR, nullable | desk / physical — used by LLM exercise guidance |
| `full_name` | VARCHAR, nullable | |
| `phone` | VARCHAR, nullable | matched against hospital-side mapping by phone |
| `age` | INTEGER, nullable | shown "Not provided" if blank |
| `gender` | VARCHAR, nullable | |
| `is_active` | BOOLEAN, default true | deactivate, never delete |
| `created_at` | DATETIME | |

**`doctors`** (personal account, independent of any hospital)
| Field | Type | Notes |
|---|---|---|
| `doctor_id` | INTEGER, PK | |
| `email` | VARCHAR, unique, not null | doctor's own personal email — never a hospital-issued one |
| `password_hash` | VARCHAR, not null | |
| `created_at` | DATETIME | |

**`hospitals`**
| Field | Type | Notes |
|---|---|---|
| `hospital_id` | INTEGER, PK | |
| `name` | VARCHAR, not null | |
| `email` | VARCHAR, unique, not null | primary login identifier |
| `password_hash` | VARCHAR, not null | |
| `address` | VARCHAR, not null | |
| `pincode` | VARCHAR(6), not null | validated 6-digit |
| `area` | VARCHAR, not null | |
| `district` | VARCHAR, not null | |
| `created_at` | DATETIME | |

### Phase 2 — Hospital ↔ Doctor ↔ Patient Connection

**`hospital_doctors`** (a doctor's hospital-specific, hospital-issued profile — separate per hospital)
| Field | Type | Notes |
|---|---|---|
| `hospital_doctor_id` | INTEGER, PK | |
| `hospital_id` | INTEGER, FK → `hospitals.hospital_id` | |
| `doctor_id` | INTEGER, FK → `doctors.doctor_id`, nullable | filled in only once the doctor "unlocks" this hospital from his personal dashboard |
| `name` | VARCHAR, not null | |
| `qualification` | VARCHAR, not null | |
| `timings` | VARCHAR, not null | e.g. "10am–4pm" |
| `days_per_week` | INTEGER, not null | |
| `employment_type` | ENUM('visiting','permanent') | |
| `login_email` | VARCHAR, unique per hospital, not null | hospital-issued credential — unlock key only, not a second account |
| `password_hash` | VARCHAR, not null | |
| `is_active` | BOOLEAN, default true | deactivate, never delete |
| `created_at` | DATETIME | |

**`patient_hospital_mappings`** (the access-code staging record)
| Field | Type | Notes |
|---|---|---|
| `mapping_id` | INTEGER, PK | |
| `hospital_id` | INTEGER, FK → `hospitals.hospital_id` | |
| `hospital_doctor_id` | INTEGER, FK → `hospital_doctors.hospital_doctor_id` | |
| `patient_name` | VARCHAR, not null | entered by hospital before patient account may even exist |
| `patient_phone` | VARCHAR, not null | used to detect duplicate registration |
| `patient_id` | INTEGER, FK → `patients.patient_id`, nullable | filled once the code is redeemed |
| `access_code` | VARCHAR(13), unique, not null | format `HOSPITALPREFIX-####` |
| `code_status` | ENUM('active','used','expired') | |
| `code_generated_at` | DATETIME | |
| `code_expires_at` | DATETIME | generated + 30 days |
| `code_used_at` | DATETIME, nullable | |
| `share_pre_connection_history` | BOOLEAN, nullable | patient's one-time choice on first connect |
| `created_at` | DATETIME | |

**`patient_doctor_assignments`** (the authoritative, fast-lookup link used by the Zero Trust WebSocket check and vitals sharing — created once a mapping's code is redeemed)
| Field | Type | Notes |
|---|---|---|
| `assignment_id` | INTEGER, PK | |
| `patient_id` | INTEGER, FK → `patients.patient_id` | |
| `hospital_doctor_id` | INTEGER, FK → `hospital_doctors.hospital_doctor_id` | |
| `hospital_id` | INTEGER, FK → `hospitals.hospital_id` | |
| `is_active` | BOOLEAN, default true | false if hospital reassigns/deactivates |
| `created_at` | DATETIME | |

**`tele_consultation_messages`** (human-to-human chat — fully separate from Phase 4's LLM chat log)
| Field | Type | Notes |
|---|---|---|
| `message_id` | INTEGER, PK | |
| `assignment_id` | INTEGER, FK → `patient_doctor_assignments.assignment_id` | |
| `sender_type` | ENUM('patient','doctor') | |
| `message_text` | TEXT, not null | |
| `sent_at` | DATETIME | |

**`reports`**
| Field | Type | Notes |
|---|---|---|
| `report_id` | INTEGER, PK | |
| `assignment_id` | INTEGER, FK → `patient_doctor_assignments.assignment_id` | |
| `report_type` | VARCHAR | blood test, scan, etc. |
| `file_url` | VARCHAR, not null | stored PDF location |
| `uploaded_at` | DATETIME | |

**`appointments`**
| Field | Type | Notes |
|---|---|---|
| `appointment_id` | INTEGER, PK | |
| `assignment_id` | INTEGER, FK → `patient_doctor_assignments.assignment_id` | |
| `slot_datetime` | DATETIME, not null | |
| `status` | ENUM('pending','confirmed','declined','completed','no_show_doctor','no_show_patient','missed') | |
| `created_at` | DATETIME | |

**`prescriptions`**
| Field | Type | Notes |
|---|---|---|
| `prescription_id` | INTEGER, PK | |
| `assignment_id` | INTEGER, FK → `patient_doctor_assignments.assignment_id` | |
| `medicine_details` | TEXT/JSON, not null | |
| `issued_at` | DATETIME | |

**`medicine_orders`**
| Field | Type | Notes |
|---|---|---|
| `order_id` | INTEGER, PK | |
| `prescription_id` | INTEGER, FK → `prescriptions.prescription_id` | |
| `patient_id` | INTEGER, FK → `patients.patient_id` | |
| `amount` | DECIMAL, not null | |
| `razorpay_payment_id` | VARCHAR, nullable | |
| `order_status` | ENUM('placed','dispatched','delivered') | |
| `created_at` | DATETIME | |

**`hospital_audit_log`**
| Field | Type | Notes |
|---|---|---|
| `log_id` | INTEGER, PK | |
| `hospital_id` | INTEGER, FK → `hospitals.hospital_id` | |
| `event_type` | VARCHAR, not null | appointment_requested, video_requested, medicine_ordered, doctor_attendance |
| `patient_id` | INTEGER, FK → `patients.patient_id`, nullable | |
| `hospital_doctor_id` | INTEGER, FK → `hospital_doctors.hospital_doctor_id`, nullable | |
| `status` | VARCHAR, nullable | pending/confirmed/declined, or attended/no-show/missed |
| `timestamp` | DATETIME | |

### Phase 3 — Vitals Pipeline

**`patient_device_state`** (current 4-quadrant simulator state per patient)
| Field | Type | Notes |
|---|---|---|
| `patient_id` | INTEGER, PK, FK → `patients.patient_id` | |
| `connection_status` | ENUM('connected','disconnected') | Connect/Disconnect, independent of login/logout |
| `placement_state` | ENUM('worn','table_manual','table_auto') | Rule 1 supreme state |
| `crisis_override` | BOOLEAN, default false | manual God Mode force-spike flag |
| `updated_at` | DATETIME | |

**`vitals_hot_buffer`** (Tier 1 — 24h, TTL-wiped)
| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER, PK | |
| `patient_id` | INTEGER, FK → `patients.patient_id` | |
| `param_type` | VARCHAR, not null | hr, spo2, glucose, bp_systolic, bp_diastolic, sleep, steps, kicks, co2 |
| `value` | FLOAT, not null | |
| `priority` | ENUM('NORMAL','CRITICAL') | |
| `source` | ENUM('device','self') | `self` = pre-hospital-connection self-recorded, per Phase 3 §12 |
| `recorded_at` | DATETIME, indexed | TTL/cron deletes rows older than 24h |

**`vitals_warm_trend`** (Tier 2 — 7 days of hourly baselines, written by midnight cron)
| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER, PK | |
| `patient_id` | INTEGER, FK → `patients.patient_id` | |
| `param_type` | VARCHAR, not null | |
| `avg_value` | FLOAT, not null | |
| `hour_bucket` | DATETIME, not null | |

**`vitals_cold_ledger`** (Tier 3 — ~270 days, one row/day, written by midnight cron — never written directly)
| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER, PK | |
| `patient_id` | INTEGER, FK → `patients.patient_id` | |
| `param_type` | VARCHAR, not null | |
| `avg_value` | FLOAT, not null | |
| `date` | DATE, not null | |

**`alerts_log`**
| Field | Type | Notes |
|---|---|---|
| `alert_id` | INTEGER, PK | |
| `patient_id` | INTEGER, FK → `patients.patient_id` | |
| `param_type` | VARCHAR, not null | |
| `value` | FLOAT, not null | |
| `reason` | VARCHAR, nullable | e.g. bp_spike, spo2_crash |
| `triggered_at` | DATETIME | |

**`patient_doctor_vitals_sharing`** (per-doctor live toggle — independent of wearable/hospital connection)
| Field | Type | Notes |
|---|---|---|
| `assignment_id` | INTEGER, PK, FK → `patient_doctor_assignments.assignment_id` | |
| `live_sharing_enabled` | BOOLEAN, default false | toggle ON/OFF; historical data always visible regardless |
| `updated_at` | DATETIME | |

### Phase 4 — LLM & Notifications

**`patient_chat_logs`** (encrypted, patient-only — never joined to doctor-facing tables)
| Field | Type | Notes |
|---|---|---|
| `chat_id` | INTEGER, PK | |
| `patient_id` | INTEGER, FK → `patients.patient_id` | |
| `role` | ENUM('patient','assistant') | |
| `message_encrypted` | TEXT, not null | anonymized input / filtered output only |
| `created_at` | DATETIME | |

**`notifications`**
| Field | Type | Notes |
|---|---|---|
| `notification_id` | INTEGER, PK | |
| `recipient_type` | ENUM('patient','doctor','hospital') | |
| `recipient_id` | INTEGER, not null | polymorphic FK to `patients`/`doctors`/`hospitals` by `recipient_type` |
| `notification_type` | VARCHAR, not null | e.g. critical_vitals_alert, doctor_message, appointment_reminder |
| `payload` | JSON, nullable | |
| `delivery_method` | ENUM('push','sms','push_and_sms') | |
| `is_read` | BOOLEAN, default false | |
| `created_at` | DATETIME | |

Note: the RAG knowledge base (ChromaDB, `persist_directory="./chroma_db"`) is a separate embedded
vector store, not a SQLAlchemy/MySQL table — it holds guideline document chunks + embeddings, not
relational data.

## Build Order

Sequential, each phase assumes the previous is complete:

```
Phase 1 — Foundation (auth, landing page, dashboard shells)
        │
Phase 2 — Hospital ↔ Doctor ↔ Patient connection + clinical features
        │
Phase 3 — Wearable simulation, vitals pipeline, real-time dashboards
        │
Phase 4 — LLM assistant, security layers, notifications
```

Phase 3 and Phase 2 are technically independent of each other (vitals pipeline doesn't need
hospital mapping to function — self-recording works standalone), but the roadmap builds them
in this order. Phase 4 depends on Phase 1 (dashboard shell) and is otherwise isolated from
Phases 2–3 except for reading vitals on demand.

---

## Phase 1 — Foundation: Auth, Landing Page & Core Dashboards

**Depends on:** nothing. **Builds:** identity layer + dashboard shells only — no vitals, no LLM, no hospital mapping.

- [ ] Landing page with exactly three profile options: Maternal Patient, Doctor, Hospital
      (confirmed — do not add a General/Other User profile, despite it appearing in the source
      Phase 1 and user-flow docs; those docs' "keep only 3 profiles" note wins)
- [ ] Patient auth: email + password + OTP once → direct login after
- [ ] Doctor auth: **personal** email + password + OTP once → direct login after (hospital-issued
      credentials are never accepted here — they only unlock a hospital in Phase 2)
- [ ] Hospital auth: 8 mandatory fields (name, email, password, OTP, address, pincode, area,
      district) → direct login after
- [ ] Edge cases: duplicate email/already-registered blocking, resend-OTP (10 min validity, 3
      attempts), forgot-password resets scoped to the correct credential set, invalid pincode
      inline validation, hospital-chain branches registering as fully independent accounts
- [ ] Patient dashboard shells (two independent, non-interacting areas):
  - LLM Dashboard (Lifestyle Companion) — shell + nav only, full behavior in Phase 4
  - Hospital Management Dashboard — three always-visible sections: My Wearable Device (Phase 3),
    My Connected Hospitals (Phase 2), All Registered Hospitals (Phase 2)
- [ ] Doctor dashboard shell — single dashboard centered on a public hospital search bar; "My
      Unlocked Hospitals" section (empty until Phase 2's unlock flow runs)
- [ ] Hospital dashboard shell — single management hub, no LLM chat; sections: My Doctors, My
      Patients, Register New Doctor, Register New Patient/Generate Access Code, Hospital Public
      Profile, Notifications (all built out in Phase 2/4)

**Design principles established here (apply platform-wide from now on):**
- One-time registration + OTP, direct login every time after — identical pattern for all three roles
- Hospital-issued doctor credentials are a one-time *unlock key*, never a second account
- Deactivate, never hard-delete, wherever medical/audit history could exist
- Per-hospital isolation is a platform-wide rule from Phase 2 onward
- Connecting to a hospital and connecting the wearable device are two separate actions — never
  let one trigger the other, even though both ship later

---

## Phase 2 — Hospital ↔ Doctor ↔ Patient Connection & Clinical Features

**Depends on:** Phase 1 shells. **Builds:** doctor registration, public doctor directory, the
access-code mapping mechanism, and every clinical feature that unlocks on connection.

- [ ] Hospital registers doctors: name, qualification, timings, days/week, visiting/permanent,
      login email, password (set or auto-generated) → doctor instantly visible in public directory
- [ ] Multi-hospital doctors: each hospital registration is fully independent (separate profile,
      credentials, patient list) — no automatic reconciliation across hospitals
- [ ] Doctor edit/deactivate: edits propagate immediately everywhere; deactivation disables login,
      keeps patients' historical read-only access, blocks new appointments, shows a banner to
      connected patients, and forces reassignment of affected patients
- [ ] Public doctor directory: fully public, read-only, browsable by anyone with no login —
      never shows patient data
- [ ] Patient-doctor mapping via access code:
  - Hospital never creates the patient's login — only a mapping + 8-char code
      (`HOSPITALPREFIX-####`), 30-day validity, single-use
  - Code lifecycle states: Active/Unused (green), Used (grey), Expired (red) → regenerate
  - Patient enters code from her dashboard → instantly unlocks: assigned doctor's details,
    tele-consultation chat, My Reports (PDF), Book Appointment, Video Consultation (Zegocloud),
    My Prescriptions, Order Medicines (Razorpay UPI), live vitals sharing toggle (Phase 3)
  - Multi-hospital patients: each hospital connection is fully separate (own chat room, reports,
    appointments); WebSocket rooms isolated per patient-doctor pair
- [ ] Doctor-side hospital unlock: doctor enters hospital-issued credentials once from his own
      dashboard to permanently reveal that hospital's mapped patient list (not a second account)
  - Deactivation by hospital instantly revokes the unlock; doctor's personal account and other
    unlocked hospitals are unaffected
- [ ] Clinical features to build: Tele-Consultation Chat (human-to-human, fully separate from
      Phase 4's LLM chat), My Reports (PDF upload/view), Book Appointment, Video Consultation
      (Zegocloud), My Prescriptions + Order Medicines (Razorpay UPI)
- [ ] Ongoing hospital management: live per-doctor patient counts, reassign patient between
      doctors, search patients by name/phone, check access-code status at a glance
- [ ] Known prototype limitations to accept (per spec, not bugs): last-save-wins on concurrent
      staff edits, single shared hospital login (no per-staff accounts)

---

## Phase 3 — Wearable Simulation, Vitals Pipeline & Real-Time Dashboards

**Depends on:** nothing structurally (works standalone via self-recording), but assumes Phase 1
dashboard shells exist to render into. **Independent of Phase 2 and Phase 4.**

### 3a. Simulation engine (Python, background worker on Render/Railway)
- [ ] Generate HR, SpO₂, glucose (CGM), BP, baby kicks, sleep, steps, CO₂ per the normal-range/
      generation-method table in the Phase 3 spec
- [ ] 4-quadrant state machine, priority order:
      1. Table state supreme (Q3/Q4 → `vitals=None`, `status=sensor_off_body`) beats everything
      2. Manual crisis override (Q1) beats autonomous roll (Q2)
      3. Autonomous stochastic spike — 5% roll/cycle, 90s duration window
      4. Autonomous table slippage — separate 2% roll, vitals → null/0, connection stays green
- [ ] On-demand lifecycle: Connect spawns an isolated thread per patient (scale-to-zero);
      Disconnect kills it; **Logout does NOT kill it** — only Disconnect does
- [ ] Concurrency: N patients run N fully isolated threads/loops, no shared state
- [ ] God Mode manual triggers: hidden control-panel `FORCE_SPIKE` / `FORCE_TABLE` per patient

### 3b. Edge layer (inside the simulator, before any MQTT publish)
- [ ] Deadband filter for HR/SpO₂/glucose (thresholds: HR ±10bpm danger 50/120, SpO₂ ±2% danger
      <94, glucose ±5mg/dL danger 70/140) — suppress genuine duplicates, always transmit on
      danger-zone crossing
- [ ] Moving-window average for BP (3 local readings → smoothed hourly publish; systolic >160
      bypasses buffer and transmits immediately as CRITICAL)
- [ ] Daily aggregation for sleep/steps/kicks → one `daily_summary` packet at midnight
- [ ] 5-minute heartbeat rule — force-transmit even with no change, so the doctor's chart never
      looks "stuck" vs. "offline"

### 3c. Transport (MQTT via self-hosted Mosquitto)
- [ ] `paho-mqtt` publish over TLS to topics `patients/{id}/vitals/{param}`,
      `patients/{id}/status/device`, `patients/{id}/alert/critical`
- [ ] QoS 1 for normal readings, QoS 2 for critical alerts (never QoS 0 for vitals)
- [ ] Backend subscribes once with wildcard `patients/+/vitals/+`, sorts by `patient_id` internally

### 3d. Flask backend — processing & storage
- [ ] `on_message` → parse topic → `handle_vital()`; off-body check first (supreme rule), then
      Isolation Forest anomaly check + hard thresholds (HR>120, SpO₂<94, systolic BP>140,
      glucose>140 or <70) → priority CRITICAL/NORMAL
- [ ] Three-tier MySQL storage via SQLAlchemy models (`VitalsHotBuffer`, `VitalsWarmTrend`,
      `VitalsColdLedger` — see Database Schema section above): Hot Buffer (24h, TTL-wiped) →
      Warm Trend (7d hourly, midnight cron compression) → Cold Ledger (~270d, one row/day,
      midnight cron) — **never write directly to Cold Ledger**
- [ ] Cloud cron job for BP-hourly/daily-summary metrics, independent of whether any patient's
      on-demand thread is alive (fixes the "disconnected for hours" data gap) — remember Render
      free tier sleeps after 15 min; use an external pinger (e.g. cron-job.org) to keep it firing

### 3e. WebSocket delivery (Flask-SocketIO)
- [ ] One room per patient (`room_{patient_id}`); JWT verify on connect; Zero Trust check against
      `patient_doctor_assignments` before joining a room (403 if unauthorized)
- [ ] `vitals_update` for normal readings, `critical_alert` immediately (no cycle wait) + write to
      `alerts_log`

### 3f. Dashboards (React + Vite)
- [ ] Patient: Connect/Disconnect wearable control, three simultaneous views (live / daily /
      weekly / monthly averages), independent per-doctor live-sharing toggle (separate from both
      wearable connection and hospital connection — three distinct controls, never conflated)
- [ ] Self-recording before any hospital connection: rows stored `doctor_id=null,
      hospital_id=null, source="self"`; one-time share-or-not prompt on first hospital connection
- [ ] Doctor: three UI patterns — exception-based alerts inbox, color-coded triage patient grid
      (green/red/yellow/grey), on-demand trend analytics (`range=24h|7d|9m` pulling the correct
      tier)
- [ ] Partial-history ("Day 3") handling: pad missing days as N/A, vertical onboarding-date line,
      average = sum ÷ enrolled days (not the full window) — applies identically on both dashboards
      since they read the same shared ledger

---

## Phase 4 — LLM Assistant, Security Layers & Notifications

**Depends on:** Phase 1 dashboard shell (LLM chat lives there); reads Phase 3's vitals DB
on-demand only; **has zero connection to Phase 2's doctor-facing surfaces.**

### 4a. LLM pipeline (single model, no router, no local model)
- [ ] Fixed pipeline for every patient message: **PII Anonymizer (Presidio) → Prompt Injection
      Defender → RAG retrieval (ChromaDB) → single Groq API call (`openai/gpt-oss-120b`) → Response
      Filter → patient chat window only**
- [ ] PII Anonymizer strips name/phone/location before anything downstream sees the text
- [ ] Injection defender blocks jailbreak patterns *and* boundary-violation phrases (dosage, mg,
      tablet, prescri, stop taking, overdose) — blocked messages never reach the LLM
- [ ] RAG layer retrieves verified maternal-health guideline chunks (e.g. ICMR) relevant to the query
- [ ] System prompt = patient profile (trimester, conditions, job type) + RAG context + fixed
      hard rules (no medicine/dosage/diagnosis, always end with safety disclaimer, no doctor
      notification capability)
- [ ] Response filter scans for blocked phrases (mg, dosage, "you have", "diagnosed with", "you
      should stop", etc.) before delivery; blocked → fixed safe redirect message
- [ ] Blind Vitals Rule: LLM has **no standing DB access**; "Attach My Current Vitals" passes a
      one-time snapshot, wiped from context after that single response
- [ ] Golden rule enforced everywhere: LLM output is saved only to an encrypted patient-only chat
      log; it is never forwarded to the doctor dashboard, never triggers a doctor notification

### 4b. The 12 supported conversational aspects
Diet & nutrition · Exercise & physical activity · Emotional/mental wellbeing (incl. mandatory
self-harm redirect) · Sleep & rest · Hydration · Trimester-specific proactive tips · Baby kick
tracking (10/day minimum, escalating response ladder) · General pregnancy Q&A (4-step decision
framework) · Report explanation (translator only, mandatory closing redirect line) · "Ask the
Doctor" question generator (never answers its own generated questions) · On-demand vitals
analysis (describes, never fixes — mandatory redirect line on any out-of-range reading) ·
Companion/lightweight conversation mode (same single pipeline, tone-shifted by system prompt —
**not** a separate local model, despite older docs referencing Gemma)

### 4c. The 8 hard refusals
Prescription queries, medicine names/dosages, changing/stopping medication, diagnosing symptoms,
report treatment advice, emergency medical situations, surgical/clinical decisions, autonomous
vitals-fix instructions — all redirect to "contact your doctor through the consultation section,"
no partial answers.

### 4d. Notifications system (backend-driven, NOT the LLM)
- [ ] Patient (6 types): critical vitals alert (push+SMS simultaneous), doctor message, appointment
      reminder (push 1h before + SMS), daily kick-count reminder, medicine order status, new report uploaded
- [ ] Doctor (4 types): critical vitals alert, new patient assigned, access deactivated, tele-consultation message
- [ ] Hospital (4 types): new patient connected, appointment booked, critical vitals alert
      (delivered to the doctor, not separately to the hospital account), access code expiring soon
- [ ] Web Push API for browser push (works closed/minimized, permission requested on first login);
      SMS reserved for critical vitals alerts and appointment reminders
- [ ] Explicitly confirm: vitals-threshold detection and notification dispatch are entirely a
      Phase 3 backend concern — the LLM has no wiring into this pipeline at all

---

## Cross-Cutting Rules (apply in every phase, not just where first introduced)

1. **Deactivate, never hard-delete** anything with medical or audit history.
2. **Per-hospital isolation** — a doctor at two hospitals is two fully separate records; never auto-link.
3. **One-time registration + OTP, direct login after** — identical pattern for patient, doctor, hospital.
4. **Three independent patient controls** — hospital access code, wearable connect/disconnect,
   per-doctor live-sharing toggle. None of the three ever triggers another.
5. **LLM ↔ doctor wall** — absolute, no exceptions, no "just this once."
6. **Never write directly to the Cold Ledger** — only scheduled compression jobs populate it.
7. **MQTT topics** follow `patients/{patient_id}/vitals/{parameter}`.
8. **Edge-layer logic** (deadband, moving window, daily aggregation) lives in the simulator
   script, not the Flask backend.

## Open Items

- [ ] Server setup docs (per-service install/run commands with every flag explained) are still
      pending — to be written under `docs/` as each service is actually scaffolded, per earlier
      discussion in this session.

## Not Yet Covered

Build/lint/test commands remain unset in `CLAUDE.md` — fill those in once Phase 1 scaffolding
(frontend + backend projects) actually exists.
