# --- Phase 3 ---
# On-demand simulation lifecycle: one background thread per connected patient (scale-to-zero),
# spawned on Connect, killed only on Disconnect (never on Logout). N patients run N fully
# isolated threads/loops with no shared state between them.
import threading
import time

from . import config, generators
from .edge import EdgeFilter
from .state_machine import PatientDeviceState, resolve_tick


class PatientSimulator:
    def __init__(self, patient_id, on_reading=None):
        self.patient_id = patient_id
        self.state = PatientDeviceState(patient_id)
        self.edge = EdgeFilter()
        self.on_reading = on_reading
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._next_due = {param: 0 for param in config.REAL_INTERVALS}

    def start(self):
        self._thread.start()

    def stop(self):
        self._stop_event.set()
        self._thread.join(timeout=5)

    def _emit(self, param_type, value, priority, reason):
        if self.on_reading:
            self.on_reading(self.patient_id, param_type, value, priority, reason)

    def _run(self):
        while not self._stop_event.is_set():
            now = time.time()
            mode, reason = resolve_tick(self.state, config)

            for param_type in list(self._next_due):
                if now < self._next_due[param_type]:
                    continue
                self._next_due[param_type] = now + config.interval_for(param_type)
                self._generate_and_emit(param_type, mode, now)

            self._stop_event.wait(1)

    def _generate_and_emit(self, param_type, mode, now):
        if mode == "off_body":
            self._emit(param_type, None, "off_body", "table_state_supreme")
            return

        if param_type == "hr":
            value = generators.generate_hr(mode)
            transmit, edge_reason = self.edge.process_deadband(config, "hr", value, now)
            if transmit:
                priority = "CRITICAL" if edge_reason == "CRITICAL" else "NORMAL"
                self._emit("hr", value, priority, edge_reason)
        elif param_type == "spo2":
            value = generators.generate_spo2(mode)
            transmit, edge_reason = self.edge.process_deadband(config, "spo2", value, now)
            if transmit:
                priority = "CRITICAL" if edge_reason == "CRITICAL" else "NORMAL"
                self._emit("spo2", value, priority, edge_reason)
        elif param_type == "glucose":
            value = generators.generate_glucose(mode)
            transmit, edge_reason = self.edge.process_deadband(config, "glucose", value, now)
            if transmit:
                priority = "CRITICAL" if edge_reason == "CRITICAL" else "NORMAL"
                self._emit("glucose", value, priority, edge_reason)
        elif param_type == "bp":
            systolic, diastolic = generators.generate_bp(mode)
            transmit, avg_sys, avg_dia, edge_reason = self.edge.process_bp(config, systolic, diastolic)
            if transmit:
                priority = "CRITICAL" if edge_reason == "CRITICAL_severe_bypass" or (
                    avg_sys >= config.BP_DANGER_SYSTOLIC or avg_dia >= config.BP_DANGER_DIASTOLIC
                ) else "NORMAL"
                self._emit("bp_systolic", avg_sys, priority, edge_reason)
                self._emit("bp_diastolic", avg_dia, priority, edge_reason)
        elif param_type == "co2":
            self._emit("co2", generators.generate_co2(), "NORMAL", "unfiltered")
        elif param_type == "sleep":
            self._emit("sleep", generators.generate_sleep_score(), "NORMAL", "daily_aggregation")
        elif param_type == "steps":
            self._emit("steps", generators.generate_steps(), "NORMAL", "daily_aggregation")
        elif param_type == "kicks":
            self._emit("kicks", generators.generate_kick_session_duration(), "NORMAL", "daily_aggregation")


class SimulatorManager:
    """Registry of currently-connected patients' simulator threads. One instance lives for
    the lifetime of the Flask process (imported as a module-level singleton below)."""

    def __init__(self):
        self._lock = threading.Lock()
        self._simulators = {}

    def is_connected(self, patient_id):
        with self._lock:
            return patient_id in self._simulators

    def connect(self, patient_id, on_reading=None):
        with self._lock:
            if patient_id in self._simulators:
                return False
            simulator = PatientSimulator(patient_id, on_reading=on_reading)
            self._simulators[patient_id] = simulator
            simulator.start()
            return True

    def disconnect(self, patient_id):
        with self._lock:
            simulator = self._simulators.pop(patient_id, None)
        if not simulator:
            return False
        simulator.stop()
        return True

    def _get(self, patient_id):
        with self._lock:
            return self._simulators.get(patient_id)

    def force_spike(self, patient_id):
        simulator = self._get(patient_id)
        if not simulator:
            return False
        simulator.state.force_spike()
        return True

    def force_table(self, patient_id):
        simulator = self._get(patient_id)
        if not simulator:
            return False
        simulator.state.force_table()
        return True

    def reset_overrides(self, patient_id):
        simulator = self._get(patient_id)
        if not simulator:
            return False
        simulator.state.reset_overrides()
        return True


manager = SimulatorManager()
