# --- Phase 2 ---
import smtplib
from email.mime.text import MIMEText

from flask import current_app


def _send_email(to_email, subject, body):
    message = MIMEText(body)
    message["Subject"] = subject
    message["From"] = current_app.config["EMAIL_USER"]
    message["To"] = to_email

    with smtplib.SMTP(current_app.config["EMAIL_HOST"], int(current_app.config["EMAIL_PORT"])) as server:
        server.starttls()
        server.login(current_app.config["EMAIL_USER"], current_app.config["EMAIL_PASSWORD"])
        server.send_message(message)


def send_access_code_email(to_email, patient_name, hospital_name, doctor_name, access_code, code_expires_at):
    body = (
        f"Hi {patient_name},\n\n"
        f"{hospital_name} has generated an access code to connect you with Dr. {doctor_name} on MaternIQ.\n\n"
        f"Access code: {access_code}\n"
        f"Expires: {code_expires_at.strftime('%d %b %Y')}\n\n"
        f"Log in to MaternIQ, open Hospital Management, and enter this code to connect.\n\n"
        f"— MaternIQ Notifications"
    )
    _send_email(to_email, f"Your access code from {hospital_name}", body)


# --- Phase 2 ---
def send_doctor_credentials_email(to_email, doctor_name, hospital_name, login_email, password):
    body = (
        f"Hi Dr. {doctor_name},\n\n"
        f"{hospital_name} has registered you on MaternIQ. Use these credentials to log in and unlock "
        f"your profile at {hospital_name} from your doctor dashboard:\n\n"
        f"Login email: {login_email}\n"
        f"Password: {password}\n\n"
        f"You'll be asked to unlock {hospital_name} from your MaternIQ doctor dashboard using these details.\n\n"
        f"— MaternIQ Notifications"
    )
    _send_email(to_email, f"Your MaternIQ login from {hospital_name}", body)
