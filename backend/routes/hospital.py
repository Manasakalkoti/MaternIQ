import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from models import db
from models.identity import Hospital

hospital_bp = Blueprint("hospital", __name__, url_prefix="/api/hospital")

PINCODE_PATTERN = re.compile(r"^\d{6}$")


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

    required = {
        "email": email,
        "password": password,
        "name": name,
        "address": address,
        "pincode": pincode,
        "area": area,
        "district": district,
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
    )

    db.session.add(hospital)
    db.session.commit()

    return jsonify({"message": "hospital registered", "hospital_id": hospital.hospital_id}), 201


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
        }
    ), 200
