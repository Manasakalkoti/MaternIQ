import os

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_socketio import SocketIO

import mqtt_subscriber
import vitals_processing
from config import Config
from models import db
from routes.doctor import doctor_bp
from routes.hospital import hospital_bp
from routes.patient import patient_bp
from routes.vitals import vitals_bp

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
migrate = Migrate(app, db)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
jwt = JWTManager(app)

app.register_blueprint(patient_bp)
app.register_blueprint(doctor_bp)
app.register_blueprint(hospital_bp)
app.register_blueprint(vitals_bp)

# --- Phase 3 ---
# Guarded so the Werkzeug debug reloader's watcher process doesn't also open a second
# MQTT connection - only the actual running worker process starts the subscriber.
if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    def _on_vital_message(patient_id, category, detail, payload):
        # MQTT's network loop runs on its own thread, not a Flask request - handle_vital's
        # db.session calls need an app context pushed manually here.
        with app.app_context():
            vitals_processing.handle_vital(patient_id, category, detail, payload)

    mqtt_subscriber.set_handler(_on_vital_message)
    mqtt_subscriber.start()


@app.route("/")
def index():
    return {"status": "MaternIQ backend is running"}


if __name__ == "__main__":
    socketio.run(app, debug=True)

# app.py is the file that turns our project from "a bunch of separate pieces" into one actual running program.
#
# Up to now, we've built individual pieces that don't do anything by themselves:
# - config.py — just a list of settings, sitting there.
# - models/ — just descriptions of what our database tables should look like, sitting there.
#
# None of that runs anything on its own. app.py is the file that:
#
# 1. Actually starts a web server — a program that sits and listens for requests, the same way a receptionist sits and waits for visitors.
#    Before this file, nothing was "listening" for anything.
# 2. Plugs in every other piece we built — it takes the settings from config.py and hands them to the server; it takes the database
#    blueprints from models/ and connects them to a real database connection.
#
# Think of it like a restaurant: config.py is the recipe book, models/ is the menu describing each dish, and app.py is the moment the
# kitchen actually opens for the day, turns the stove on, and starts taking orders — nothing edible happens until this file runs.
#
# Right now it doesn't have any real functionality yet (no actual login/register logic) — it's the skeleton that everything else will get
# plugged into. The database tables (patients, doctors, hospitals) get created in MySQL via a Flask-Migrate migration, not by this file
# directly — this file just defines what those tables should look like through the imported models.