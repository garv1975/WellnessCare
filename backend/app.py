from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from datetime import timedelta
import logging
import os
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta

from database import db
from routes.auth_routes import auth_bp
from routes.appointment_routes import appointment_bp
from routes.chatbot_routes import chatbot_bp
from routes.doctor_routes import doctor_bp

app = Flask(__name__)

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s: %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Configure CORS
CORS(app, resources={r"/api/*": {
    "origins": "http://localhost:3000",
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": True
}})

# Configurations
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:garv1975@localhost:5432/healthcare_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID')
app.config['GOOGLE_CLIENT_SECRET'] = os.getenv('GOOGLE_CLIENT_SECRET')

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)

# Custom JWT error handlers
@jwt.invalid_token_loader
def invalid_token_callback(error):
    logger.error("JWT Invalid Token Error: %s", str(error))
    return jsonify({"msg": "Invalid token. Please log in again."}), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    logger.error("JWT Expired Token Error")
    return jsonify({"msg": "Token has expired. Please log in again."}), 401

@jwt.unauthorized_loader
def unauthorized_callback(error):
    logger.error("JWT Unauthorized Error: %s", str(error))
    return jsonify({"msg": "Missing or invalid token. Please log in again."}), 401

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(appointment_bp)
app.register_blueprint(chatbot_bp)
app.register_blueprint(doctor_bp)

# Create tables and sample data
def create_sample_data():
    from models.doctor import Doctor
    from models.user import User
    
    if Doctor.query.first() is None:
        doctors = [
            Doctor(name="Dr. Rajesh Kumar", specialization="Cardiologist", availability="Mon-Fri 9AM-5PM", zego_user_id="doctor_rajesh"),
            Doctor(name="Dr. Priya Sharma", specialization="Endocrinologist", availability="Tue-Sat 10AM-6PM", zego_user_id="doctor_priya"),
            Doctor(name="Dr. Amit Patel", specialization="Diabetologist", availability="Mon-Wed-Fri 2PM-8PM", zego_user_id="doctor_amit"),
            Doctor(name="Dr. Sunita Gupta", specialization="General Physician", availability="Daily 9AM-1PM", zego_user_id="doctor_sunita"),
        ]
        
        for doctor in doctors:
            db.session.add(doctor)
        
        db.session.commit()
        logger.info("Sample doctors created!")

# Function to clean up expired appointments
def cleanup_expired_appointments():
    with app.app_context():
        try:
            from models.appointment import Appointment
            current_time = datetime.now()
            expired_appointments = Appointment.query.filter(
                Appointment.status == 'Scheduled',
                db.func.datetime(Appointment.time) < db.func.datetime(current_time - timedelta(minutes=30))
            ).all()
            
            for appointment in expired_appointments:
                logger.info(f"Deleting expired appointment ID {appointment.id}, scheduled at {appointment.time}")
                db.session.delete(appointment)
            
            db.session.commit()
            logger.info(f"Deleted {len(expired_appointments)} expired appointments")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to clean up expired appointments: {str(e)}")

with app.app_context():
    from models import user, doctor, appointment, profile, chat_message, reminder
    try:
        db.create_all()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error("Failed to create database tables: %s", str(e))
        raise
    create_sample_data()

# Initialize scheduler for periodic cleanup
scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_expired_appointments, 'interval', hours=1)
scheduler.start()

@app.route('/api/health', methods=['GET'])
def health_check():
    return {"status": "API is working!"}, 200

@app.route('/api/test-doctor', methods=['GET'])
def test_doctor():
    return {"status": "Doctor routes are accessible!"}, 200

if __name__ == '__main__':
    try:
        app.run(debug=True, port=5000)
    finally:
        scheduler.shutdown()