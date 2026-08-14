# --- Phase 3 ---
# Edge computing layer. Runs inside the simulator, before any MQTT publish (Phase 3c) -
# per CLAUDE.md, this logic belongs in the simulator, never in the Flask backend.
#
# Deadband filter (HR, SpO2, Glucose):
#   - always transmit if a danger zone is crossed         -> "CRITICAL"
#   - transmit if the change exceeds the deadband          -> "CHANGE"
#   - force transmit if >5 minutes since the last send     -> "HEARTBEAT"
#   - otherwise suppress - genuinely discarded, not stored anywhere
#
# Moving window average (Blood Pressure):
#   - systolic/diastolic in the severe range bypasses the buffer, transmits immediately
#   - otherwise buffers 3 local readings, publishes the smoothed average, clears the buffer
#
# Daily aggregation (Sleep, Steps, Kicks) and CO2 have no suppression rule in the spec -
# they always transmit on their own scheduled cadence (already handled by engine.py's
# per-parameter interval scheduling), so there's nothing for this module to filter there.

DEADBAND_PARAMS = {
    "hr": ("HR_DEADBAND", "HR_DANGER_LOW", "HR_DANGER_HIGH"),
    "spo2": ("SPO2_DEADBAND", "SPO2_DANGER_LOW", None),
    "glucose": ("GLUCOSE_DEADBAND", "GLUCOSE_DANGER_LOW", "GLUCOSE_DANGER_HIGH"),
}


class EdgeFilter:
    """One instance per connected patient - holds only that patient's last-transmitted
    values and BP buffer, so N patients' edge state never crosses or overlaps."""

    def __init__(self):
        self._last_transmitted = {}   # param_type -> (value, timestamp)
        self._bp_buffer = []          # up to 3 (systolic, diastolic) pairs

    def process_deadband(self, config, param_type, value, now):
        """Returns (should_transmit, reason)."""
        deadband_attr, danger_low_attr, danger_high_attr = DEADBAND_PARAMS[param_type]
        deadband = getattr(config, deadband_attr)
        danger_low = getattr(config, danger_low_attr) if danger_low_attr else None
        danger_high = getattr(config, danger_high_attr) if danger_high_attr else None

        crossed_danger = (danger_low is not None and value <= danger_low) or (
            danger_high is not None and value >= danger_high
        )
        if crossed_danger:
            self._last_transmitted[param_type] = (value, now)
            return True, "CRITICAL"

        last = self._last_transmitted.get(param_type)
        if last is None:
            self._last_transmitted[param_type] = (value, now)
            return True, "first_reading"

        last_value, last_time = last
        if abs(value - last_value) >= deadband:
            self._last_transmitted[param_type] = (value, now)
            return True, "CHANGE"

        if now - last_time >= config.HEARTBEAT_SECONDS:
            self._last_transmitted[param_type] = (value, now)
            return True, "HEARTBEAT"

        return False, "suppressed_duplicate"

    def process_bp(self, config, systolic, diastolic):
        """Returns (should_transmit, avg_systolic, avg_diastolic, reason)."""
        if systolic >= config.BP_SEVERE_SYSTOLIC or diastolic >= config.BP_SEVERE_DIASTOLIC:
            self._bp_buffer.clear()
            return True, systolic, diastolic, "CRITICAL_severe_bypass"

        self._bp_buffer.append((systolic, diastolic))
        if len(self._bp_buffer) < 3:
            return False, None, None, "buffering"

        avg_systolic = round(sum(s for s, _ in self._bp_buffer) / 3)
        avg_diastolic = round(sum(d for _, d in self._bp_buffer) / 3)
        self._bp_buffer.clear()
        return True, avg_systolic, avg_diastolic, "moving_window_average"
