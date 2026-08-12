import re
import secrets
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from models import db
from models.identity import Hospital, Patient
from models.connection import HospitalDoctor, PatientDoctorAssignment, PatientHospitalMapping
from utils.email import send_access_code_email, send_doctor_credentials_email

hospital_bp = Blueprint("hospital", __name__, url_prefix="/api/hospital")

PINCODE_PATTERN = re.compile(r"^\d{6}$")
EMPLOYMENT_TYPES = {"visiting", "permanent"}


@hospital_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    address = data.get("address")
    pincode = data.get("pincode")
    area = data.get("area")
    district = data.get("district")
    state = data.get("state")

    required = {
        "email": email,
        "password": password,
        "name": name,
        "address": address,
        "pincode": pincode,
        "area": area,
        "district": district,
        "state": state,
    }
    missing = [field for field, value in required.items() if not value]
    if missing:
        return jsonify({"error": f"missing required fields: {', '.join(missing)}"}), 400

    if not PINCODE_PATTERN.match(pincode):
        return jsonify({"error": "pincode must be exactly 6 digits"}), 400

    if Hospital.query.filter_by(email=email).first():
        return jsonify({"error": "an account with this email already exists"}), 409

    hospital = Hospital(
        email=email,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
        name=name,
        address=address,
        pincode=pincode,
        area=area,
        district=district,
        state=state,
    )

    db.session.add(hospital)
    db.session.commit()

    return jsonify({"message": "hospital registered", "hospital_id": hospital.hospital_id}), 201


# --- Phase 2 ---
@hospital_bp.route("/directory", methods=["GET"])
def directory():
    hospitals = Hospital.query.order_by(Hospital.name).all()

    return jsonify(
        [
            {
                "hospital_id": hospital.hospital_id,
                "name": hospital.name,
                "address": hospital.address,
                "pincode": hospital.pincode,
                "area": hospital.area,
                "district": hospital.district,
                "state": hospital.state,
            }
            for hospital in hospitals
        ]
    ), 200


@hospital_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    hospital = Hospital.query.filter_by(email=email).first()

    if not hospital or not check_password_hash(hospital.password_hash, password):
        return jsonify({"error": "invalid email or password"}), 401

    access_token = create_access_token(
        identity=str(hospital.hospital_id),
        additional_claims={"role": "hospital"},
    )

    return jsonify(
        {
            "message": "login successful",
            "hospital_id": hospital.hospital_id,
            "access_token": access_token,
        }
    ), 200


@hospital_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    if get_jwt().get("role") != "hospital":
        return jsonify({"error": "this token is not authorized for a hospital account"}), 403

    hospital = Hospital.query.get(int(get_jwt_identity()))
    if not hospital:
        return jsonify({"error": "hospital not found"}), 404

    return jsonify(
        {
            "hospital_id": hospital.hospital_id,
            "email": hospital.email,
            "name": hospital.name,
            "address": hospital.address,
            "pincode": hospital.pincode,
            "area": hospital.area,
            "district": hospital.district,
            "state": hospital.state,
        }
    ), 200


@hospital_bp.route("/doctors", methods=["POST"])
@jwt_required()
def register_doctor():
    if get_jwt().get("role") != "hospital":
        return jsonify({"error": "this token is not authorized for a hospital account"}), 403

    hospital_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    name = data.get("name")
    qualification = data.get("qualification")
    timings = data.get("timings")
    days_per_week = data.get("days_per_week")
    employment_type = data.get("employment_type")
    login_email = data.get("login_email")
    password = data.get("password")

    required = {
        "name": name,
        "qualification": qualification,
        "timings": timings,
        "days_per_week": days_per_week,
        "employment_type": employment_type,
        "login_email": login_email,
    }
    missing = [field for field, value in required.items() if not value]
    if missing:
        return jsonify({"error": f"missing required fields: {', '.join(missing)}"}), 400

    if employment_type not in EMPLOYMENT_TYPES:
        return jsonify({"error": "employment_type must be 'visiting' or 'permanent'"}), 400

    if not isinstance(days_per_week, int) or not (1 <= days_per_week <= 7):
        return jsonify({"error": "days_per_week must be an integer between 1 and 7"}), 400

    existing = HospitalDoctor.query.filter_by(hospital_id=hospital_id, login_email=login_email).first()
    if existing:
        return jsonify({"error": "a doctor with this login email already exists at this hospital"}), 409

    generated_password = None
    if not password:
        generated_password = secrets.token_urlsafe(9)
        password = generated_password

    hospital_doctor = HospitalDoctor(
        hospital_id=hospital_id,
        name=name,
        qualification=qualification,
        timings=timings,
        days_per_week=days_per_week,
        employment_type=employment_type,
        login_email=login_email,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
    )

    db.session.add(hospital_doctor)
    db.session.commit()

    # --- Phase 2 ---
    hospital = Hospital.query.get(hospital_id)
    email_sent = True
    try:
        send_doctor_credentials_email(
            to_email=login_email,
            doctor_name=name,
            hospital_name=hospital.name,
            login_email=login_email,
            password=password,
        )
    except Exception:
        email_sent = False

    response = {
        "message": "doctor registered",
        "hospital_doctor_id": hospital_doctor.hospital_doctor_id,
        "name": hospital_doctor.name,
        "login_email": hospital_doctor.login_email,
        "email_sent": email_sent,
    }
    if not email_sent and generated_password:
        response["generated_password"] = generated_password

    return jsonify(response), 201


# --- Phase 2 ---
@hospital_bp.route("/doctors", methods=["GET"])
@jwt_required()
def list_doctors():
    if get_jwt().get("role") != "hospital":
        return jsonify({"error": "this token is not authorized for a hospital account"}), 403

    hospital_id = int(get_jwt_identity())

    doctors = (
        HospitalDoctor.query.filter_by(hospital_id=hospital_id).order_by(HospitalDoctor.name).all()
    )

    return jsonify(
        [
            {
                "hospital_doctor_id": doctor.hospital_doctor_id,
                "name": doctor.name,
                "qualification": doctor.qualification,
                "timings": doctor.timings,
                "days_per_week": doctor.days_per_week,
                "employment_type": doctor.employment_type,
                "login_email": doctor.login_email,
                "is_active": doctor.is_active,
                "unlocked": doctor.doctor_id is not None,
            }
            for doctor in doctors
        ]
    ), 200


# --- Phase 2 ---
def _generate_access_code(hospital_name):
    prefix = re.sub(r"[^A-Za-z0-9]", "", hospital_name).upper()[:8] or "HOSP"
    for _ in range(10):
        code = f"{prefix}-{secrets.randbelow(10000):04d}"
        if not PatientHospitalMapping.query.filter_by(access_code=code).first():
            return code
    raise RuntimeError("could not generate a unique access code")


# --- Phase 2 ---
@hospital_bp.route("/access-codes", methods=["POST"])
@jwt_required()
def create_access_code():
    if get_jwt().get("role") != "hospital":
        return jsonify({"error": "this token is not authorized for a hospital account"}), 403

    hospital_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    patient_name = data.get("patient_name")
    patient_phone = data.get("patient_phone")
    patient_email = data.get("patient_email")
    hospital_doctor_id = data.get("hospital_doctor_id")

    required = {
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "patient_email": patient_email,
        "hospital_doctor_id": hospital_doctor_id,
    }
    missing = [field for field, value in required.items() if not value]
    if missing:
        return jsonify({"error": f"missing required fields: {', '.join(missing)}"}), 400

    hospital = Hospital.query.get(hospital_id)

    hospital_doctor = HospitalDoctor.query.filter_by(
        hospital_doctor_id=hospital_doctor_id, hospital_id=hospital_id
    ).first()
    if not hospital_doctor:
        return jsonify({"error": "no such doctor registered at this hospital"}), 404
    if not hospital_doctor.is_active:
        return jsonify({"error": "this doctor has been deactivated"}), 400
    # --- Phase 2 --- doctor must have unlocked (claimed) their profile before patients can be assigned to them
    if hospital_doctor.doctor_id is None:
        return jsonify(
            {"error": "this doctor has not unlocked their account yet — ask them to log in and unlock it first"}
        ), 400

    generated_at = datetime.utcnow()
    mapping = PatientHospitalMapping(
        hospital_id=hospital_id,
        hospital_doctor_id=hospital_doctor_id,
        patient_name=patient_name,
        patient_phone=patient_phone,
        patient_email=patient_email,
        access_code=_generate_access_code(hospital.name),
        code_status="active",
        code_generated_at=generated_at,
        code_expires_at=generated_at + timedelta(days=30),
    )

    db.session.add(mapping)
    db.session.commit()

    email_sent = True
    try:
        send_access_code_email(
            to_email=patient_email,
            patient_name=patient_name,
            hospital_name=hospital.name,
            doctor_name=hospital_doctor.name,
            access_code=mapping.access_code,
            code_expires_at=mapping.code_expires_at,
        )
    except Exception:
        email_sent = False

    return jsonify(
        {
            "message": "access code generated",
            "mapping_id": mapping.mapping_id,
            "access_code": mapping.access_code,
            "patient_name": mapping.patient_name,
            "assigned_doctor": hospital_doctor.name,
            "code_expires_at": mapping.code_expires_at.isoformat(),
            "email_sent": email_sent,
        }
    ), 201


# --- Phase 2 ---
@hospital_bp.route("/patients", methods=["GET"])
@jwt_required()
def list_patients():
    if get_jwt().get("role") != "hospital":
        return jsonify({"error": "this token is not authorized for a hospital account"}), 403

    hospital_id = int(get_jwt_identity())

    rows = (
        db.session.query(PatientDoctorAssignment, HospitalDoctor, Patient)
        .join(HospitalDoctor, PatientDoctorAssignment.hospital_doctor_id == HospitalDoctor.hospital_doctor_id)
        .join(Patient, PatientDoctorAssignment.patient_id == Patient.patient_id)
        .filter(PatientDoctorAssignment.hospital_id == hospital_id)
        .order_by(Patient.full_name)
        .all()
    )

    return jsonify(
        [
            {
                "assignment_id": assignment.assignment_id,
                "patient_name": patient.full_name,
                "doctor_name": hospital_doctor.name,
                "is_active": assignment.is_active,
            }
            for assignment, hospital_doctor, patient in rows
        ]
    ), 200
