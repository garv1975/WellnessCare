# doctor_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models.doctor import Doctor
from models.appointment import Appointment
from models.user import User
from database import db
from datetime import datetime, timedelta
import logging
import os
import time

# Try different import methods for Agora token builder
try:
    from agora_token_builder import RtcTokenBuilder
    from agora_token_builder.RtcTokenBuilder import Role_Publisher
    AGORA_IMPORT_METHOD = 'v1'
except ImportError:
    try:
        from agora_token_builder.RtcTokenBuilder import RtcTokenBuilder, Role_Publisher
        AGORA_IMPORT_METHOD = 'v2'
    except ImportError:
        try:
            import agora_token_builder as agora
            AGORA_IMPORT_METHOD = 'v3'
        except ImportError:
            AGORA_IMPORT_METHOD = None
            print("Warning: agora-token-builder not installed")

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

doctor_bp = Blueprint('doctor', __name__, url_prefix='/api/doctor')

# Temporary doctor credentials (in production, use proper authentication)
DOCTOR_CREDENTIALS = {
    'doctor_rajesh@clinic.com': {'password': 'doctor123', 'doctor_id': 'doctor_rajesh'},
    'doctor_priya@clinic.com': {'password': 'doctor123', 'doctor_id': 'doctor_priya'},
    'doctor_amit@clinic.com': {'password': 'doctor123', 'doctor_id': 'doctor_amit'},
    'doctor_sunita@clinic.com': {'password': 'doctor123', 'doctor_id': 'doctor_sunita'}
}

def generate_agora_token(app_id, app_certificate, channel_name, uid, role, expiration_time):
    """
    Generate Agora RTC token with compatibility for different versions
    """
    try:
        # Ensure UID is an integer
        uid_int = int(uid) if uid else 0
        
        if AGORA_IMPORT_METHOD == 'v1':
            try:
                token = RtcTokenBuilder.buildTokenWithUid(
                    app_id, app_certificate, channel_name, uid_int, role, expiration_time
                )
            except AttributeError:
                # Fallback method for v1
                token = RtcTokenBuilder.build_token_with_uid(
                    app_id, app_certificate, channel_name, uid_int, role, expiration_time
                )
        elif AGORA_IMPORT_METHOD == 'v2':
            token = RtcTokenBuilder.buildTokenWithUid(
                app_id, app_certificate, channel_name, uid_int, role, expiration_time
            )
        elif AGORA_IMPORT_METHOD == 'v3':
            token = agora.RtcTokenBuilder.buildTokenWithUid(
                app_id, app_certificate, channel_name, uid_int, role, expiration_time
            )
        else:
            # Fallback - generate a mock token for development
            logger.warning("Agora token builder not available, generating mock token")
            token = f"mock_token_{channel_name}_{uid}_{int(time.time())}"
        
        logger.info(f"Generated Agora token successfully for channel: {channel_name}, UID: {uid_int}")
        return token
    except Exception as e:
        logger.error(f"Failed to generate Agora token: {str(e)}")
        # Return a mock token for development/testing
        return f"mock_token_{channel_name}_{uid}_{int(time.time())}"

@doctor_bp.route('/test', methods=['GET'])
def test_doctor_routes():
    """Test endpoint to verify doctor routes are working"""
    return jsonify({"msg": "Doctor routes are working!"}), 200

@doctor_bp.route('/login', methods=['POST', 'OPTIONS'])
def doctor_login():
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        logger.debug("Doctor login request received: %s", data)
        
        if not data:
            logger.warning("No JSON data received")
            return jsonify({"msg": "No data provided"}), 400
        
        if not data.get('email') or not data.get('password'):
            logger.warning("Missing email or password in doctor login request")
            return jsonify({"msg": "Email and password are required"}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        logger.debug("Attempting login for email: %s", email)
        logger.debug("Available doctor emails: %s", list(DOCTOR_CREDENTIALS.keys()))
        
        # Check credentials (case-insensitive email comparison)
        doctor_cred = None
        for cred_email, cred_data in DOCTOR_CREDENTIALS.items():
            if cred_email.lower() == email:
                doctor_cred = cred_data
                break
        
        if not doctor_cred or doctor_cred['password'] != password:
            logger.warning("Invalid doctor credentials for email: %s", email)
            return jsonify({"msg": "Invalid doctor credentials"}), 401
        
        # Find doctor by doctor_id
        doctor_id = doctor_cred['doctor_id']
        logger.debug("Looking for doctor with doctor_id: %s", doctor_id)
        
        doctor = Doctor.query.filter_by(zego_user_id=doctor_id).first()
        
        if not doctor:
            logger.warning("Doctor not found for doctor_id: %s", doctor_id)
            all_doctors = Doctor.query.all()
            logger.debug("All doctors in database: %s", [(d.id, d.name, d.zego_user_id) for d in all_doctors])
            return jsonify({"msg": "Doctor not found in database"}), 404
        
        access_token = create_access_token(identity=f"doctor_{doctor.id}")
        logger.info("Doctor logged in successfully: %s (ID: %d)", email, doctor.id)
        
        return jsonify({
            "msg": "Doctor logged in successfully",
            "token": access_token,
            "doctor_id": doctor.id,
            "role": "doctor",
            "doctor_info": {
                "name": doctor.name,
                "specialization": doctor.specialization,
                "doctor_id": doctor.zego_user_id
            }
        }), 200
    
    except Exception as e:
        logger.error("Doctor login failed with exception: %s", str(e), exc_info=True)
        return jsonify({"msg": f"Login failed: {str(e)}"}), 500

@doctor_bp.route('/me', methods=['GET'])
@jwt_required()
def get_doctor_info():
    try:
        token_data = get_jwt_identity()
        logger.debug("Fetching doctor info for token: %s", token_data)
        
        if not token_data.startswith('doctor_'):
            logger.warning("Invalid token format for doctor access: %s", token_data)
            return jsonify({"msg": "Doctor access required"}), 403
        
        doctor_id = int(token_data.replace('doctor_', ''))
        doctor = Doctor.query.get(doctor_id)
        
        if not doctor:
            logger.warning("Doctor not found: ID %d", doctor_id)
            return jsonify({"msg": "Doctor not found"}), 404
        
        logger.info("Doctor info fetched successfully: %s", doctor.name)
        return jsonify({
            "id": doctor.id,
            "name": doctor.name,
            "specialization": doctor.specialization,
            "availability": doctor.availability,
            "doctor_id": doctor.zego_user_id
        }), 200
    
    except Exception as e:
        logger.error("Failed to fetch doctor info: %s", str(e))
        return jsonify({"msg": f"Failed to fetch doctor info: {str(e)}"}), 500

@doctor_bp.route('/appointments', methods=['GET'])
@jwt_required()
def get_doctor_appointments():
    try:
        token_data = get_jwt_identity()
        logger.debug("Fetching appointments for doctor token: %s", token_data)
        
        if not token_data.startswith('doctor_'):
            return jsonify({"msg": "Doctor access required"}), 403
        
        doctor_id = int(token_data.replace('doctor_', ''))
        
        today = datetime.now().date()
        
        appointments = Appointment.query.filter_by(
            doctor_id=doctor_id,
            status='Scheduled'
        ).all()
        
        result = []
        for appointment in appointments:
            try:
                appointment_datetime = datetime.strptime(appointment.time, '%Y-%m-%d %H:%M')
                patient = User.query.get(appointment.user_id)
                patient_email = patient.email if patient else "Unknown"
                
                result.append({
                    "id": appointment.id,
                    "patient_email": patient_email,
                    "patient_id": appointment.user_id,
                    "time": appointment.time,
                    "reason": appointment.reason,
                    "status": appointment.status,
                    "is_today": appointment_datetime.date() == today,
                    "is_current": is_appointment_current(appointment_datetime)
                })
            except ValueError:
                logger.error("Invalid time format for appointment %d: %s", appointment.id, appointment.time)
                continue
        
        result.sort(key=lambda x: x['time'])
        
        logger.info("Fetched %d appointments for doctor %d", len(result), doctor_id)
        return jsonify(result), 200
    
    except Exception as e:
        logger.error("Failed to fetch doctor appointments: %s", str(e))
        return jsonify({"msg": f"Failed to fetch appointments: {str(e)}"}), 500

@doctor_bp.route('/appointments/<int:appointment_id>/video-access', methods=['GET'])
@jwt_required()
def verify_doctor_video_access(appointment_id):
    try:
        token_data = get_jwt_identity()
        logger.debug("Doctor video access request for appointment %d, token: %s", appointment_id, token_data)
        
        if not token_data.startswith('doctor_'):
            return jsonify({"msg": "Doctor access required"}), 403
        
        doctor_id = int(token_data.replace('doctor_', ''))
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            logger.warning("Appointment not found: ID %d", appointment_id)
            return jsonify({"msg": "Appointment not found"}), 404
        
        if appointment.doctor_id != doctor_id:
            logger.warning("Unauthorized doctor access to appointment %d by doctor %d", appointment_id, doctor_id)
            return jsonify({"msg": "Unauthorized to access this appointment"}), 403
        
        if appointment.status != 'Scheduled':
            logger.warning("Cannot access video for appointment with status %s: ID %d", appointment.status, appointment_id)
            return jsonify({"msg": "Video call is only available for scheduled appointments"}), 400
        
        try:
            appointment_time = datetime.strptime(appointment.time, '%Y-%m-%d %H:%M')
            current_time = datetime.now()
            start_window = appointment_time - timedelta(minutes=5)
            end_window = appointment_time + timedelta(minutes=30)
            
            if not (start_window <= current_time <= end_window):
                logger.warning("Doctor video call access outside time window: Appointment ID %d", appointment_id)
                return jsonify({"msg": "Video call is only available within 5 minutes before to 30 minutes after the scheduled time"}), 403
        except ValueError:
            logger.error("Invalid appointment time format: %s", appointment.time)
            return jsonify({"msg": "Invalid appointment time format"}), 400
        
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            logger.warning("Doctor not found: ID %d", doctor_id)
            return jsonify({"msg": "Doctor not found"}), 404
        
        # Generate Agora token
        app_id = os.getenv('AGORA_APP_ID', 'your_agora_app_id_here')
        app_certificate = os.getenv('AGORA_APP_CERTIFICATE', 'your_agora_app_certificate_here')
        
        # Validate Agora credentials
        if app_id == 'your_agora_app_id_here' or app_certificate == 'your_agora_app_certificate_here':
            logger.error("Agora credentials not properly configured")
            return jsonify({"msg": "Video service not properly configured"}), 500
        
        channel_name = f"appointment_{appointment.id}"
        # Use a unique UID for doctor based on appointment and doctor ID
        uid = int(f"1{doctor_id:03d}")  # Doctor UIDs start with 1
        
        # Define role - use 1 for publisher (can send and receive)
        try:
            if AGORA_IMPORT_METHOD in ['v1', 'v2']:
                role = Role_Publisher
            else:
                role = 1  # Publisher role
        except:
            role = 1  # Default publisher role
        
        expiration_time = int(time.time()) + 3600  # Token valid for 1 hour

        logger.debug(f"Generating Agora token - App ID: {app_id[:8]}..., Channel: {channel_name}, UID: {uid}, Role: {role}")
        
        # Generate token using the helper function
        token = generate_agora_token(
            app_id, app_certificate, channel_name, uid, role, expiration_time
        )

        logger.info("Doctor video access granted for appointment %d", appointment_id)
        return jsonify({
            "msg": "Access granted",
            "appointment_id": appointment.id,
            "room_id": channel_name,
            "doctor_user_id": str(uid),
            "patient_user_id": str(int(f"2{appointment.user_id:03d}")),  # Patient UIDs start with 2
            "doctor_name": doctor.name,
            "patient_id": appointment.user_id,
            "token": token,
            "app_id": app_id,
            "channel_name": channel_name
        }), 200
    
    except Exception as e:
        logger.error("Failed to verify doctor video access: %s", str(e))
        return jsonify({"msg": f"Failed to verify video access: {str(e)}"}), 500

@doctor_bp.route('/appointments/<int:appointment_id>/complete', methods=['PUT'])
@jwt_required()
def complete_appointment(appointment_id):
    try:
        token_data = get_jwt_identity()
        
        if not token_data.startswith('doctor_'):
            return jsonify({"msg": "Doctor access required"}), 403
        
        doctor_id = int(token_data.replace('doctor_', ''))
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"msg": "Appointment not found"}), 404
        
        if appointment.doctor_id != doctor_id:
            return jsonify({"msg": "Unauthorized"}), 403
        
        appointment.status = 'Completed'
        db.session.commit()
        
        logger.info("Appointment %d marked as completed by doctor %d", appointment_id, doctor_id)
        return jsonify({"msg": "Appointment marked as completed"}), 200
    
    except Exception as e:
        db.session.rollback()
        logger.error("Failed to complete appointment: %s", str(e))
        return jsonify({"msg": f"Failed to complete appointment: {str(e)}"}), 500

def is_appointment_current(appointment_datetime):
    """Check if appointment is within the video call time window"""
    current_time = datetime.now()
    start_window = appointment_datetime - timedelta(minutes=5)
    end_window = appointment_datetime + timedelta(minutes=30)
    return start_window <= current_time <= end_window