# --- Phase 3 ---
# Publishes simulator readings to the self-hosted Mosquitto broker via paho-mqtt.
# Topic structure and QoS levels follow the Phase 3 spec exactly:
#   patients/{id}/vitals/{param}   - QoS 1, normal readings
#   patients/{id}/status/device    - QoS 1, off-body / connectivity status
#   patients/{id}/alert/critical   - QoS 2, critical readings (skips the normal vitals topic)
import json
import os

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

load_dotenv()

MQTT_HOST = os.environ.get("MQTT_HOST", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", 1883))

_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="maternaliq-simulator")
_connected = False


def _ensure_connected():
    global _connected
    if _connected:
        return
    _client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    _client.loop_start()
    _connected = True


def publish_reading(patient_id, param_type, value, priority, reason):
    _ensure_connected()

    if reason == "table_state_supreme":
        topic = f"patients/{patient_id}/status/device"
        payload = {"status": "sensor_off_body"}
        qos = 1
    elif priority == "CRITICAL":
        topic = f"patients/{patient_id}/alert/critical"
        payload = {"param_type": param_type, "value": value, "reason": reason}
        qos = 2
    else:
        topic = f"patients/{patient_id}/vitals/{param_type}"
        payload = {"value": value, "reason": reason}
        qos = 1

    _client.publish(topic, json.dumps(payload), qos=qos)
