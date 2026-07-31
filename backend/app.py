from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from flask_socketio import SocketIO

from config import Config
from models import db

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
migrate = Migrate(app, db)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")


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