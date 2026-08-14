# --- Phase 3 ---
# Pure value-generation functions. Each one takes the current per-patient mode
# ("normal" or "crisis") and returns a raw reading — no transmission/storage logic here,
# that lives in the edge layer (Phase 3b) and MQTT wiring (Phase 3c).
import random

from . import config


def generate_hr(mode):
    if mode == "crisis":
        return random.randint(*config.HR_CRISIS)
    return random.randint(*config.HR_NORMAL)


def generate_spo2(mode):
    if mode == "crisis":
        return random.randint(*config.SPO2_CRISIS)
    return random.randint(*config.SPO2_NORMAL)


def generate_glucose(mode):
    if mode == "crisis":
        low_roll, high_roll = config.GLUCOSE_CRISIS_LOW, config.GLUCOSE_CRISIS_HIGH
        return random.choice([random.uniform(*low_roll), random.uniform(*high_roll)])
    return round(random.uniform(*config.GLUCOSE_NORMAL), 1)


def generate_bp(mode):
    if mode == "crisis":
        systolic = random.randint(*config.BP_SYSTOLIC_CRISIS)
        diastolic = random.randint(*config.BP_DIASTOLIC_CRISIS)
    else:
        systolic = random.randint(*config.BP_SYSTOLIC_NORMAL)
        diastolic = random.randint(*config.BP_DIASTOLIC_NORMAL)
    return systolic, diastolic


def generate_co2():
    return round(random.uniform(*config.CO2_NORMAL), 1)


def generate_sleep_score():
    return random.randint(*config.SLEEP_SCORE_NORMAL)


def generate_steps():
    return random.randint(*config.STEPS_NORMAL)


def generate_kick_session_duration():
    """Seconds it takes a healthy fetus to reach the 10-kick target (ACOG Count-to-Ten)."""
    return random.randint(*config.KICK_HEALTHY_TIME_TO_TARGET)
