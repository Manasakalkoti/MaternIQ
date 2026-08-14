from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from models import db
from models.identity import Patient, Hospital
from models.connection import HospitalDoctor, PatientHospitalMapping, PatientDoctorAssignment

patient_bp = Blueprint("patient", __name__, url_prefix="/api/patient")


@patient_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")

    if not email or not password or not full_name:
        return jsonify({"error": "full_name, email and password are required"}), 400

    if Patient.query.filter_by(email=email).first():
        return jsonify({"error": "an account with this email already exists"}), 409

    patient = Patient(
        email=email,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
        full_name=full_name,
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
            "address": patient.address,
            "age": patient.age,
            "gender": patient.gender,
            "trimester": patient.trimester,
            "due_date": patient.due_date.isoformat() if patient.due_date else None,
            "conditions": patient.conditions,
            "job_type": patient.job_type,
            "profile_completed": patient.profile_completed,
        }
    ), 200


@patient_bp.route("/profile", methods=["PATCH"])
@jwt_required()
def update_profile():
    if get_jwt().get("role") != "patient":
        return jsonify({"error": "this token is not authorized for a patient account"}), 403

    patient = Patient.query.get(int(get_jwt_identity()))
    if not patient:
        return jsonify({"error": "patient not found"}), 404

    data = request.get_json(silent=True) or {}

    required = {
        "phone": data.get("phone"),
        "address": data.get("address"),
        "age": data.get("age"),
        "gender": data.get("gender"),
        "trimester": data.get("trimester"),
        "due_date": data.get("due_date"),
        "job_type": data.get("job_type"),
    }
    missing = [field for field, value in required.items() if not value]
    if missing:
        return jsonify({"error": f"missing required fields: {', '.join(missing)}"}), 400

    try:
        due_date = datetime.strptime(data["due_date"], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "due_date must be in YYYY-MM-DD format"}), 400

    patient.phone = data["phone"]
    patient.address = data["address"]
    patient.age = data["age"]
    patient.gender = data["gender"]
    patient.trimester = data["trimester"]
    patient.due_date = due_date
    patient.conditions = data.get("conditions")
    patient.job_type = data["job_type"]
    patient.profile_completed = True

    db.session.commit()

    return jsonify({"message": "profile updated", "profile_completed": True}), 200


# --- Phase 2 ---
@patient_bp.route("/redeem-code", methods=["POST"])
@jwt_required()
def redeem_code():
    if get_jwt().get("role") != "patient":
        return jsonify({"error": "this token is not authorized for a patient account"}), 403

    patient_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    access_code = data.get("access_code")
    share_pre_connection_history = data.get("share_pre_connection_history")

    if not access_code:
        return jsonify({"error": "access_code is required"}), 400
    if not isinstance(share_pre_connection_history, bool):
        return jsonify({"error": "share_pre_connection_history must be true or false"}), 400

    mapping = PatientHospitalMapping.query.filter_by(access_code=access_code).first()
    if not mapping:
        return jsonify({"error": "invalid access code"}), 404

    if mapping.code_status == "used":
        return jsonify({"error": "this access code has already been used"}), 409

    if mapping.code_status == "expired" or datetime.utcnow() > mapping.code_expires_at:
        mapping.code_status = "expired"
        db.session.commit()
        return jsonify({"error": "this access code has expired"}), 410

    mapping.patient_id = patient_id
    mapping.code_status = "used"
    mapping.code_used_at = datetime.utcnow()
    mapping.share_pre_connection_history = share_pre_connection_history

    assignment = PatientDoctorAssignment(
        patient_id=patient_id,
        hospital_doctor_id=mapping.hospital_doctor_id,
        hospital_id=mapping.hospital_id,
    )
    db.session.add(assignment)
    db.session.commit()

    return jsonify(
        {
            "message": "hospital connected",
            "assignment_id": assignment.assignment_id,
            "hospital_id": assignment.hospital_id,
            "hospital_doctor_id": assignment.hospital_doctor_id,
        }
    ), 200


# --- Phase 2 ---
@patient_bp.route("/connected-hospitals", methods=["GET"])
@jwt_required()
def connected_hospitals():
    if get_jwt().get("role") != "patient":
        return jsonify({"error": "this token is not authorized for a patient account"}), 403

    patient_id = int(get_jwt_identity())

    rows = (
        db.session.query(PatientDoctorAssignment, HospitalDoctor, Hospital.name.label("hospital_name"))
        .join(HospitalDoctor, PatientDoctorAssignment.hospital_doctor_id == HospitalDoctor.hospital_doctor_id)
        .join(Hospital, PatientDoctorAssignment.hospital_id == Hospital.hospital_id)
        .filter(PatientDoctorAssignment.patient_id == patient_id)
        .order_by(Hospital.name)
        .all()
    )

    return jsonify(
        [
            {
                "assignment_id": assignment.assignment_id,
                "hospital_id": assignment.hospital_id,
                "hospital_name": hospital_name,
                "doctor_name": hospital_doctor.name,
                "qualification": hospital_doctor.qualification,
                "is_active": assignment.is_active,
                "doctor_is_active": hospital_doctor.is_active,
            }
            for assignment, hospital_doctor, hospital_name in rows
        ]
    ), 200
