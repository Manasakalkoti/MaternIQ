from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from models import db
from models.identity import Doctor

doctor_bp = Blueprint("doctor", __name__, url_prefix="/api/doctor")


@doctor_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    if Doctor.query.filter_by(email=email).first():
        return jsonify({"error": "an account with this email already exists"}), 409

    doctor = Doctor(
        email=email,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
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

    return jsonify({"doctor_id": doctor.doctor_id, "email": doctor.email}), 200
