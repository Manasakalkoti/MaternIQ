# --- Phase 3 ---
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from simulator import mqtt_publisher
from simulator.engine import manager

vitals_bp = Blueprint("vitals", __name__, url_prefix="/api/patient/wearable")


def _on_reading(patient_id, param_type, value, priority, reason):
    # Edge-layer suppression already happened before this is called - anything reaching
    # here has already been decided as worth transmitting. Publishes over MQTT to Mosquitto;
    # Phase 3d's real handle_vital() picks it up on the backend's subscriber side.
    mqtt_publisher.publish_reading(patient_id, param_type, value, priority, reason)


@vitals_bp.route("/connect", methods=["POST"])
@jwt_required()
def connect_wearable():
    if get_jwt().get("role") != "patient":
        return jsonify({"error": "patients only"}), 403

    patient_id = int(get_jwt_identity())
    started = manager.connect(patient_id, on_reading=_on_reading)

    if not started:
        return jsonify({"message": "already connected"}), 200

    return jsonify({"message": "Device connected — live vitals active"}), 200


@vitals_bp.route("/disconnect", methods=["POST"])
@jwt_required()
def disconnect_wearable():
    if get_jwt().get("role") != "patient":
        return jsonify({"error": "patients only"}), 403

    patient_id = int(get_jwt_identity())
    stopped = manager.disconnect(patient_id)

    if not stopped:
        return jsonify({"message": "was not connected"}), 200

    return jsonify({"message": "Disconnected"}), 200


@vitals_bp.route("/status", methods=["GET"])
@jwt_required()
def wearable_status():
    if get_jwt().get("role") != "patient":
        return jsonify({"error": "patients only"}), 403

    patient_id = int(get_jwt_identity())
    return jsonify({"connected": manager.is_connected(patient_id)}), 200


# --- God Mode (hidden control-panel triggers, per Phase 3 spec) ---


@vitals_bp.route("/god-mode/force-spike", methods=["POST"])
@jwt_required()
def god_mode_force_spike():
    if get_jwt().get("role") != "patient":
        return jsonify({"error": "patients only"}), 403

    patient_id = int(get_jwt_identity())
    if not manager.force_spike(patient_id):
        return jsonify({"error": "device is not connected"}), 409

    return jsonify({"message": "crisis override forced"}), 200


@vitals_bp.route("/god-mode/force-table", methods=["POST"])
@jwt_required()
def god_mode_force_table():
    if get_jwt().get("role") != "patient":
        return jsonify({"error": "patients only"}), 403

    patient_id = int(get_jwt_identity())
    if not manager.force_table(patient_id):
        return jsonify({"error": "device is not connected"}), 409

    return jsonify({"message": "table state forced"}), 200


@vitals_bp.route("/god-mode/reset", methods=["POST"])
@jwt_required()
def god_mode_reset():
    if get_jwt().get("role") != "patient":
        return jsonify({"error": "patients only"}), 403

    patient_id = int(get_jwt_identity())
    if not manager.reset_overrides(patient_id):
        return jsonify({"error": "device is not connected"}), 409

    return jsonify({"message": "overrides cleared"}), 200
