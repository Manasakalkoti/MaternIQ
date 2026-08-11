from datetime import datetime

from . import db


class HospitalDoctor(db.Model):
    __tablename__ = "hospital_doctors"
    __table_args__ = (
        db.UniqueConstraint("hospital_id", "login_email", name="uq_hospital_doctor_login_email"),
    )

    hospital_doctor_id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.hospital_id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.doctor_id"), nullable=True)

    name = db.Column(db.String(255), nullable=False)
    qualification = db.Column(db.String(255), nullable=False)
    timings = db.Column(db.String(255), nullable=False)
    days_per_week = db.Column(db.Integer, nullable=False)
    employment_type = db.Column(db.Enum("visiting", "permanent", name="employment_type_enum"), nullable=False)

    login_email = db.Column(db.String(255), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


# --- Phase 2 ---
class PatientHospitalMapping(db.Model):
    __tablename__ = "patient_hospital_mappings"

    mapping_id = db.Column(db.Integer, primary_key=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.hospital_id"), nullable=False)
    hospital_doctor_id = db.Column(db.Integer, db.ForeignKey("hospital_doctors.hospital_doctor_id"), nullable=False)

    patient_name = db.Column(db.String(255), nullable=False)
    patient_phone = db.Column(db.String(20), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.patient_id"), nullable=True)

    access_code = db.Column(db.String(13), unique=True, nullable=False)
    code_status = db.Column(db.Enum("active", "used", "expired", name="code_status_enum"), nullable=False)
    code_generated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    code_expires_at = db.Column(db.DateTime, nullable=False)
    code_used_at = db.Column(db.DateTime, nullable=True)

    share_pre_connection_history = db.Column(db.Boolean, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


# --- Phase 2 ---
class PatientDoctorAssignment(db.Model):
    __tablename__ = "patient_doctor_assignments"

    assignment_id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.patient_id"), nullable=False)
    hospital_doctor_id = db.Column(db.Integer, db.ForeignKey("hospital_doctors.hospital_doctor_id"), nullable=False)
    hospital_id = db.Column(db.Integer, db.ForeignKey("hospitals.hospital_id"), nullable=False)

    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
