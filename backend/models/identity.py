from datetime import datetime

from . import db


class Patient(db.Model):
    __tablename__ = "patients"

    patient_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    full_name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.String(500))
    age = db.Column(db.Integer)
    gender = db.Column(db.String(20))

    trimester = db.Column(db.Integer)
    due_date = db.Column(db.Date)
    conditions = db.Column(db.Text)
    job_type = db.Column(db.String(100))

    is_active = db.Column(db.Boolean, default=True, nullable=False)
    profile_completed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Doctor(db.Model):
    __tablename__ = "doctors"

    doctor_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    full_name = db.Column(db.String(255), nullable=False)
    gender = db.Column(db.String(20))
    qualification = db.Column(db.String(255))
    specialization = db.Column(db.String(255))
    hospitals_text = db.Column(db.Text)
    hospital_timings = db.Column(db.Text)

    profile_completed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Hospital(db.Model):
    __tablename__ = "hospitals"

    hospital_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    address = db.Column(db.String(500), nullable=False)
    pincode = db.Column(db.String(6), nullable=False)
    area = db.Column(db.String(255), nullable=False)
    district = db.Column(db.String(255), nullable=False)
    state = db.Column(db.String(255), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
