# --- Phase 3 ---
# The 4-quadrant state machine (Phase 3 spec, "God Mode — Dual-Trigger Anomaly System").
#
#                    Intentional (Manual)          Automatic (Stochastic)
# Crisis Mode        Q1 - Forced Spike              Q2 - Autonomous Spike (5% roll, 90s)
# Table Mode         Q3 - Forced Table State         Q4 - Autonomous Slippage (2% roll)
#
# Priority hierarchy, checked in this exact order every tick:
#   Rule 1 - Table state is supreme. If the device is on a table (Q3 or Q4), nothing else
#            matters - vitals=None, status="sensor_off_body", even if a manual crisis was
#            also forced.
#   Rule 2 - Manual overrides beat automatic rolls. If worn, a manual crisis click (Q1)
#            instantly overrides an ongoing autonomous spike (Q2).
#   Default - roll the two independent dice every tick; otherwise generate normal values.
import random
import time


class PatientDeviceState:
    """Per-patient mutable state read/written by the running simulator thread and by the
    Flask request handlers that implement Connect/Disconnect/God Mode."""

    def __init__(self, patient_id):
        self.patient_id = patient_id
        self.placement = "worn"          # "worn" | "table_manual" | "table_auto"
        self.crisis_manual = False       # Q1 - hidden control-panel FORCE_SPIKE
        self.autonomous_crisis_until = None  # epoch seconds; set by a Q2 roll, cleared after 90s

    # --- God Mode manual triggers ---
    def force_spike(self):
        self.crisis_manual = True

    def force_table(self):
        self.placement = "table_manual"

    def reset_overrides(self):
        """Clears every manual/automatic override and returns the device to a normal worn state."""
        self.placement = "worn"
        self.crisis_manual = False
        self.autonomous_crisis_until = None


def resolve_tick(state, config):
    """Runs the full priority hierarchy for one simulator loop tick.

    Returns (mode, reason) where mode is one of "off_body" | "crisis" | "normal".
    """
    now = time.time()

    # Rule 1 - table state is supreme, beats everything including a forced manual crisis.
    if state.placement in ("table_manual", "table_auto"):
        reason = "Q3_forced_table" if state.placement == "table_manual" else "Q4_autonomous_slippage"
        return "off_body", reason

    # Rule 2 - manual crisis override beats any autonomous roll.
    if state.crisis_manual:
        return "crisis", "Q1_forced_spike"

    # Still inside an earlier autonomous crisis's 90-second duration window.
    if state.autonomous_crisis_until and now < state.autonomous_crisis_until:
        return "crisis", "Q2_autonomous_spike"
    if state.autonomous_crisis_until and now >= state.autonomous_crisis_until:
        state.autonomous_crisis_until = None  # window expired, self-corrects back to normal

    # Two independent dice rolls, each on a 1-100 draw.
    crisis_roll = random.randint(1, 100)
    if crisis_roll <= config.AUTONOMOUS_CRISIS_ROLL_PERCENT:
        state.autonomous_crisis_until = now + config.AUTONOMOUS_CRISIS_DURATION_SECONDS
        return "crisis", "Q2_autonomous_spike"

    table_roll = random.randint(1, 100)
    if table_roll <= config.AUTONOMOUS_TABLE_ROLL_PERCENT:
        state.placement = "table_auto"
        return "off_body", "Q4_autonomous_slippage"

    return "normal", "default"
