from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from models import db
from models.identity import Doctor, Hospital
from models.connection import HospitalDoctor

doctor_bp = Blueprint("doctor", __name__, url_prefix="/api/doctor")


@doctor_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")

    if not email or not password or not full_name:
        return jsonify({"error": "full_name, email and password are required"}), 400

    if Doctor.query.filter_by(email=email).first():
        return jsonify({"error": "an account with this email already exists"}), 409

    doctor = Doctor(
        email=email,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
        full_name=full_name,
    )

    db.session.add(doctor)
    db.session.commit()

    return jsonify({"message": "doctor registered", "doctor_id": doctor.doctor_id}), 201


@doctor_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    doctor = Doctor.query.filter_by(email=email).first()

    if not doctor or not check_password_hash(doctor.password_hash, password):
        return jsonify({"error": "invalid email or password"}), 401

    access_token = create_access_token(
        identity=str(doctor.doctor_id),
        additional_claims={"role": "doctor"},
    )

    return jsonify(
        {
            "message": "login successful",
            "doctor_id": doctor.doctor_id,
            "access_token": access_token,
        }
    ), 200


@doctor_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    if get_jwt().get("role") != "doctor":
        return jsonify({"error": "this token is not authorized for a doctor account"}), 403

    doctor = Doctor.query.get(int(get_jwt_identity()))
    if not doctor:
        return jsonify({"error": "doctor not found"}), 404

    return jsonify(
        {
            "doctor_id": doctor.doctor_id,
            "email": doctor.email,
            "full_name": doctor.full_name,
            "gender": doctor.gender,
            "qualification": doctor.qualification,
            "specialization": doctor.specialization,
            "hospitals_text": doctor.hospitals_text,
            "hospital_timings": doctor.hospital_timings,
            "profile_completed": doctor.profile_completed,
        }
    ), 200


@doctor_bp.route("/profile", methods=["PATCH"])
@jwt_required()
def update_profile():
    if get_jwt().get("role") != "doctor":
        return jsonify({"error": "this token is not authorized for a doctor account"}), 403

    doctor = Doctor.query.get(int(get_jwt_identity()))
    if not doctor:
        return jsonify({"error": "doctor not found"}), 404

    data = request.get_json(silent=True) or {}

    required = {
        "gender": data.get("gender"),
        "qualification": data.get("qualification"),
        "specialization": data.get("specialization"),
        "hospitals_text": data.get("hospitals_text"),
        "hospital_timings": data.get("hospital_timings"),
    }
    missing = [field for field, value in required.items() if not value]
    if missing:
        return jsonify({"error": f"missing required fields: {', '.join(missing)}"}), 400

    doctor.gender = data["gender"]
    doctor.qualification = data["qualification"]
    doctor.specialization = data["specialization"]
    doctor.hospitals_text = data["hospitals_text"]
    doctor.hospital_timings = data["hospital_timings"]
    doctor.profile_completed = True

    db.session.commit()

    return jsonify({"message": "profile updated", "profile_completed": True}), 200


@doctor_bp.route("/directory", methods=["GET"])
def directory():
    rows = (
        db.session.query(HospitalDoctor, Hospital.name.label("hospital_name"))
        .join(Hospital, HospitalDoctor.hospital_id == Hospital.hospital_id)
        .filter(HospitalDoctor.is_active.is_(True))
        .order_by(HospitalDoctor.name)
        .all()
    )

    return jsonify(
        [
            {
                "hospital_doctor_id": hospital_doctor.hospital_doctor_id,
                "name": hospital_doctor.name,
                "qualification": hospital_doctor.qualification,
                "timings": hospital_doctor.timings,
                "days_per_week": hospital_doctor.days_per_week,
                "employment_type": hospital_doctor.employment_type,
                "hospital_id": hospital_doctor.hospital_id,
                "hospital_name": hospital_name,
            }
            for hospital_doctor, hospital_name in rows
        ]
    ), 200


# --- Phase 2 ---
@doctor_bp.route("/unlock-hospital", methods=["POST"])
@jwt_required()
def unlock_hospital():
    if get_jwt().get("role") != "doctor":
        return jsonify({"error": "this token is not authorized for a doctor account"}), 403

    doctor_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    hospital_id = data.get("hospital_id")
    login_email = data.get("login_email")
    password = data.get("password")
    new_password = data.get("new_password")

    if not hospital_id or not login_email or not password or not new_password:
        return jsonify(
            {"error": "hospital_id, login_email, password and new_password are required"}
        ), 400

    hospital = Hospital.query.get(hospital_id)
    if not hospital:
        return jsonify({"error": "no hospital found with this id"}), 404

    hospital_doctor = HospitalDoctor.query.filter_by(
        hospital_id=hospital.hospital_id, login_email=login_email
    ).first()

    if not hospital_doctor or not check_password_hash(hospital_doctor.password_hash, password):
        return jsonify({"error": "invalid hospital-issued credentials"}), 401

    if not hospital_doctor.is_active:
        return jsonify({"error": "this doctor profile has been deactivated by the hospital"}), 403

    if hospital_doctor.doctor_id and hospital_doctor.doctor_id != doctor_id:
        return jsonify({"error": "this hospital profile is already unlocked by another doctor account"}), 409

    # --- Phase 2 ---
    # Replace the hospital-issued password with one only the doctor knows, so the
    # hospital staff who set/saw the original password can no longer use it.
    hospital_doctor.doctor_id = doctor_id
    hospital_doctor.password_hash = generate_password_hash(new_password, method="pbkdf2:sha256")
    db.session.commit()

    return jsonify(
        {
            "message": "hospital unlocked",
            "hospital_doctor_id": hospital_doctor.hospital_doctor_id,
            "hospital_id": hospital.hospital_id,
            "hospital_name": hospital.name,
        }
    ), 200


# --- Phase 2 ---
@doctor_bp.route("/unlocked-hospitals", methods=["GET"])
@jwt_required()
def unlocked_hospitals():
    if get_jwt().get("role") != "doctor":
        return jsonify({"error": "this token is not authorized for a doctor account"}), 403

    doctor_id = int(get_jwt_identity())

    rows = (
        db.session.query(HospitalDoctor, Hospital.name.label("hospital_name"))
        .join(Hospital, HospitalDoctor.hospital_id == Hospital.hospital_id)
        .filter(HospitalDoctor.doctor_id == doctor_id)
        .order_by(Hospital.name)
        .all()
    )

    return jsonify(
        [
            {
                "hospital_doctor_id": hospital_doctor.hospital_doctor_id,
                "hospital_id": hospital_doctor.hospital_id,
                "hospital_name": hospital_name,
                "qualification": hospital_doctor.qualification,
                "timings": hospital_doctor.timings,
                "days_per_week": hospital_doctor.days_per_week,
                "employment_type": hospital_doctor.employment_type,
                "is_active": hospital_doctor.is_active,
            }
            for hospital_doctor, hospital_name in rows
        ]
    ), 200
