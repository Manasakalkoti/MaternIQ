# --- Phase 3 ---
# Flask backend's MQTT subscriber. Per the Phase 3 spec: "The Flask backend subscribes once
# using a single wildcard pattern... the broker routes every patient's packets to the backend,
# which then sorts by patient_id internally."
#
# Phase 3d's handle_vital() (see vitals_processing.py) is wired in via set_handler() from
# app.py. The _default_handler below only fires if that wiring is ever skipped.
import json
import re

import paho.mqtt.client as mqtt

from config import Config

TOPIC_VITALS = "patients/+/vitals/+"
TOPIC_STATUS = "patients/+/status/device"
TOPIC_ALERT = "patients/+/alert/critical"

_TOPIC_PATTERN = re.compile(
    r"^patients/(?P<patient_id>\d+)/(?P<category>vitals|status|alert)(?:/(?P<detail>\w+))?$"
)

_handler = None


def set_handler(handler):
    """handler(patient_id, category, detail, payload_dict) is called for every message received."""
    global _handler
    _handler = handler


def _default_handler(patient_id, category, detail, payload):
    print(f"[mqtt-subscriber] patient={patient_id} category={category} detail={detail} payload={payload}")


def _on_connect(client, userdata, flags, reason_code, properties=None):
    client.subscribe(TOPIC_VITALS, qos=1)
    client.subscribe(TOPIC_STATUS, qos=1)
    client.subscribe(TOPIC_ALERT, qos=2)


def _on_message(client, userdata, msg):
    match = _TOPIC_PATTERN.match(msg.topic)
    if not match:
        return

    patient_id = int(match.group("patient_id"))
    category = match.group("category")
    detail = match.group("detail")

    try:
        payload = json.loads(msg.payload.decode())
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = {}

    handler = _handler or _default_handler
    handler(patient_id, category, detail, payload)


_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="maternaliq-backend-subscriber")
_client.on_connect = _on_connect
_client.on_message = _on_message


def start():
    _client.connect(Config.MQTT_HOST, Config.MQTT_PORT, keepalive=60)
    _client.loop_start()
