# --- Phase 3 ---
from datetime import datetime

from . import db


class VitalsHotBuffer(db.Model):
    """Tier 1 - 24h rolling window, TTL-wiped by the midnight compression cron."""

    __tablename__ = "vitals_hot_buffer"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.patient_id"), nullable=False)

    param_type = db.Column(db.String(20), nullable=False)
    value = db.Column(db.Float, nullable=False)
    priority = db.Column(db.Enum("NORMAL", "CRITICAL", name="vitals_priority_enum"), nullable=False)
    source = db.Column(db.Enum("device", "self", name="vitals_source_enum"), nullable=False)

    recorded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)


class VitalsWarmTrend(db.Model):
    """Tier 2 - 7 days of hourly baselines, written only by the midnight compression cron."""

    __tablename__ = "vitals_warm_trend"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.patient_id"), nullable=False)

    param_type = db.Column(db.String(20), nullable=False)
    avg_value = db.Column(db.Float, nullable=False)
    hour_bucket = db.Column(db.DateTime, nullable=False)


class VitalsColdLedger(db.Model):
    """Tier 3 - ~270 days, one row/day, written only by the midnight compression cron.

    Never written directly outside that cron job - see CLAUDE.md's data-isolation rules.
    """

    __tablename__ = "vitals_cold_ledger"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.patient_id"), nullable=False)

    param_type = db.Column(db.String(20), nullable=False)
    avg_value = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False)


class AlertsLog(db.Model):
    __tablename__ = "alerts_log"

    alert_id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.patient_id"), nullable=False)

    param_type = db.Column(db.String(20), nullable=False)
    value = db.Column(db.Float, nullable=False)
    reason = db.Column(db.String(255), nullable=True)

    triggered_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
