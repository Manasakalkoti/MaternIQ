# --- Phase 3 ---
# Phase 3d: the Flask backend's authoritative processing step for every reading that arrives
# over MQTT. This re-derives priority itself rather than trusting the simulator/edge layer's
# self-reported priority - the edge layer's job (Phase 3b) is deciding *whether* to transmit
# at all, not the clinical severity of what it transmits.
#
# Checked in order, per the Phase 3 spec's "off-body first, then anomaly check" rule:
#   1. Off-body status - Rule 1 is supreme; there is no numeric value to store or evaluate.
#   2. Hard clinical thresholds (deterministic, always checked).
#   3. Isolation Forest multivariate anomaly check - not yet built, next 3d step.
from datetime import datetime

from models import db
from models.vitals import AlertsLog, VitalsHotBuffer

HR_CRITICAL_HIGH = 120
SPO2_CRITICAL_LOW = 94
BP_SYSTOLIC_CRITICAL = 140
GLUCOSE_CRITICAL_HIGH = 140
GLUCOSE_CRITICAL_LOW = 70


def _breaches_hard_threshold(param_type, value):
    if param_type == "hr":
        return value > HR_CRITICAL_HIGH
    if param_type == "spo2":
        return value < SPO2_CRITICAL_LOW
    if param_type == "bp_systolic":
        return value > BP_SYSTOLIC_CRITICAL
    if param_type == "glucose":
        return value > GLUCOSE_CRITICAL_HIGH or value < GLUCOSE_CRITICAL_LOW
    return False


def _resolve_priority(param_type, value, reason):
    if _breaches_hard_threshold(param_type, value):
        return "CRITICAL", reason or "hard_threshold"
    return "NORMAL", reason


def handle_vital(patient_id, category, detail, payload):
    """Called by mqtt_subscriber.set_handler() for every message on the vitals/alert/status
    topics. Must run inside a Flask app context - the MQTT client's network loop is its own
    thread, not a request, so db.session has nothing to bind to otherwise."""
    if category == "status":
        # Off-body: nothing numeric to store. Phase 3e's WebSocket layer forwards this
        # "sensor_off_body" state live; 3d's job is storage + anomaly detection on real values.
        return

    if category == "alert":
        param_type = payload.get("param_type")
    else:
        param_type = detail

    value = payload.get("value")
    if param_type is None or value is None:
        return

    priority, reason = _resolve_priority(param_type, value, payload.get("reason"))

    db.session.add(VitalsHotBuffer(
        patient_id=patient_id,
        param_type=param_type,
        value=value,
        priority=priority,
        source="device",
        recorded_at=datetime.utcnow(),
    ))

    if priority == "CRITICAL":
        db.session.add(AlertsLog(
            patient_id=patient_id,
            param_type=param_type,
            value=value,
            reason=reason,
            triggered_at=datetime.utcnow(),
        ))

    db.session.commit()
