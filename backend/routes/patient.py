from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from models import db
from models.identity import Patient

patient_bp = Blueprint("patient", __name__, url_prefix="/api/patient")


@patient_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    if Patient.query.filter_by(email=email).first():
        return jsonify({"error": "an account with this email already exists"}), 409

    due_date = data.get("due_date")
    if due_date:
        due_date = datetime.strptime(due_date, "%Y-%m-%d").date()

    patient = Patient(
        email=email,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
        full_name=data.get("full_name"),
        phone=data.get("phone"),
        age=data.get("age"),
        gender=data.get("gender"),
        trimester=data.get("trimester"),
        due_date=due_date,
        conditions=data.get("conditions"),
        job_type=data.get("job_type"),
    )

    db.session.add(patient)
    db.session.commit()

    return jsonify({"message": "patient registered", "patient_id": patient.patient_id}), 201


@patient_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    patient = Patient.query.filter_by(email=email).first()

    if not patient or not check_password_hash(patient.password_hash, password):
        return jsonify({"error": "invalid email or password"}), 401

    if not patient.is_active:
        return jsonify({"error": "account is deactivated"}), 403

    access_token = create_access_token(
        identity=str(patient.patient_id),
        additional_claims={"role": "patient"},
    )

    return jsonify(
        {
            "message": "login successful",
            "patient_id": patient.patient_id,
            "access_token": access_token,
        }
    ), 200


@patient_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    if get_jwt().get("role") != "patient":
        return jsonify({"error": "this token is not authorized for a patient account"}), 403

    patient = Patient.query.get(int(get_jwt_identity()))
    if not patient:
        return jsonify({"error": "patient not found"}), 404

    return jsonify(
        {
            "patient_id": patient.patient_id,
            "email": patient.email,
            "full_name": patient.full_name,
            "phone": patient.phone,
            "age": patient.age,
            "gender": patient.gender,
            "trimester": patient.trimester,
            "due_date": patient.due_date.isoformat() if patient.due_date else None,
            "conditions": patient.conditions,
            "job_type": patient.job_type,
        }
    ), 200
