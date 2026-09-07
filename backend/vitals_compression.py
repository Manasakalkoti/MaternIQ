# --- Phase 3 ---
# Phase 3d: manually-triggered compression of VitalsHotBuffer (raw readings, 24h rolling) into
# VitalsWarmTrend (hourly averages, kept up to 7 days) - see docs/setup.md item 34. Not yet wired
# into an automatic scheduler; called by hand until the Cloud Cron worker (item 32) exists.
from collections import defaultdict

from models import db
from models.vitals import VitalsHotBuffer, VitalsWarmTrend


def compress_hot_buffer_to_warm_trend():
    """Groups every VitalsHotBuffer row by (patient_id, param_type, hour), averages the value
    within each group, and writes one VitalsWarmTrend row per group. Does not delete anything
    from VitalsHotBuffer - its own 24h TTL wipe is a separate mechanism."""
    groups = defaultdict(list)

    for row in VitalsHotBuffer.query.all():
        hour_bucket = row.recorded_at.replace(minute=0, second=0, microsecond=0)
        groups[(row.patient_id, row.param_type, hour_bucket)].append(row.value)

    for (patient_id, param_type, hour_bucket), values in groups.items():
        db.session.add(VitalsWarmTrend(
            patient_id=patient_id,
            param_type=param_type,
            avg_value=sum(values) / len(values),
            hour_bucket=hour_bucket,
        ))

    db.session.commit()
