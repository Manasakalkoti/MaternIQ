# --- Phase 3 ---
# Vital-sign ranges below are researched real-world clinical values for a pregnant woman
# (ACOG / IADPSG / ADA reference points), not the two source docs' conflicting numbers —
# see docs/execution.md Phase 3 notes for the reasoning behind each one.
import os

DEMO_MODE = os.environ.get("SIMULATOR_DEMO_MODE", "true").lower() == "true"

# --- Real vs demo update intervals, per parameter (seconds) ---
REAL_INTERVALS = {
    "hr": 30,
    "spo2": 30,
    "glucose": 120,
    "bp": 3600,
    "sleep": 86400,
    "steps": 86400,
    "kicks": 86400,
    "co2": 30,
}

DEMO_INTERVALS = {
    "hr": 30,
    "spo2": 30,
    "glucose": 60,
    "bp": 30,
    "sleep": 90,
    "steps": 90,
    "kicks": 45,
    "co2": 30,
}


def interval_for(param_type):
    table = DEMO_INTERVALS if DEMO_MODE else REAL_INTERVALS
    return table[param_type]


# --- Normal generation ranges + danger thresholds (real clinical values) ---
HR_NORMAL = (70, 100)          # bpm, resting HR in pregnancy (10-20bpm above pre-pregnancy baseline)
HR_CRISIS = (130, 160)
HR_DANGER_LOW = 50
HR_DANGER_HIGH = 120            # accepted tachycardia cutoff in pregnancy
HR_DEADBAND = 10                # bpm change required to force a transmit outside danger zone

SPO2_NORMAL = (95, 99)          # %
SPO2_CRISIS = (82, 90)
SPO2_DANGER_LOW = 94
SPO2_DEADBAND = 2               # percentage points

GLUCOSE_NORMAL = (70, 110)      # mg/dL, non-fasting-friendly CGM range (fasting mean ~71 mg/dL)
GLUCOSE_CRISIS_HIGH = (150, 200)
GLUCOSE_CRISIS_LOW = (40, 55)
GLUCOSE_DANGER_LOW = 70
GLUCOSE_DANGER_HIGH = 140       # ACOG/ADA 1-hr postprandial GDM management threshold
GLUCOSE_DEADBAND = 5            # mg/dL

BP_SYSTOLIC_NORMAL = (100, 125)
BP_DIASTOLIC_NORMAL = (65, 82)
BP_SYSTOLIC_CRISIS = (150, 175)
BP_DIASTOLIC_CRISIS = (95, 115)
BP_DANGER_SYSTOLIC = 140        # gestational hypertension / preeclampsia threshold
BP_DANGER_DIASTOLIC = 90
BP_SEVERE_SYSTOLIC = 160        # severe-range bypass (immediate CRITICAL, skips averaging buffer)
BP_SEVERE_DIASTOLIC = 110

SLEEP_SCORE_NORMAL = (60, 95)
STEPS_NORMAL = (2000, 12000)

CO2_NORMAL = (400, 600)         # ppm, ambient air quality (not a maternal physiological metric)

# Baby kicks: real ACOG standard is 10 movements within a 2-hour counting session, not a
# flat daily count. A healthy fetus usually reaches 10 within ~30 minutes.
KICK_SESSION_TARGET = 10
KICK_SESSION_WINDOW_SECONDS = 2 * 60 * 60
KICK_HEALTHY_TIME_TO_TARGET = (5 * 60, 30 * 60)   # 5-30 min typical, in seconds

# --- God Mode / autonomous stochastic rules ---
AUTONOMOUS_CRISIS_ROLL_PERCENT = 5      # 1-100 roll, 1-5 triggers autonomous crisis
AUTONOMOUS_CRISIS_DURATION_SECONDS = 90
AUTONOMOUS_TABLE_ROLL_PERCENT = 2       # 1-100 roll, 1-2 triggers autonomous table slippage

HEARTBEAT_SECONDS = 5 * 60              # force-transmit even with no change (edge layer, Phase 3b)
