from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .identity import Patient, Doctor, Hospital  # noqa: E402,F401
