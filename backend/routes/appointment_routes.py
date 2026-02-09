from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.appointment import Appointment
from models.doctor import Doctor
from models.reminder import Reminder
from database import db
from datetime import datetime, timedelta
import logging
import re
import os
import time

# Improved Agora token builder import with better error handling
AGORA_AVAILABLE = False
RtcTokenBuilder = None
Role_Publisher = None

try:
    # Try the most common import pattern first
    from agora_token_builder import RtcTokenBuilder
    from agora_token_builder.RtcTokenBuilder import Role_Publisher
    AGORA_AVAILABLE = True
    AGORA_IMPORT_METHOD = 'standard'
    print("Successfully imported agora-token-builder (standard method)")
except ImportError:
    try:
        # Alternative import pattern
        from agora_token_builder.RtcTokenBuilder import RtcTokenBuilder, Role_Publisher
        AGORA_AVAILABLE = True
        AGORA_IMPORT_METHOD = 'alternative'
        print("Successfully imported agora-token-builder (alternative method)")
    except ImportError:
        try:
            # Try direct import
            import agora_token_builder
            RtcTokenBuilder = agora_token_builder.RtcTokenBuilder
            Role_Publisher = 1  # Publisher role constant
            AGORA_AVAILABLE = True
            AGORA_IMPORT_METHOD = 'direct'
            print("Successfully imported agora-token-builder (direct method)")
        except ImportError:
            print("ERROR: agora-token-builder not installed. Please install it with: pip install agora-token-builder")
            AGORA_AVAILABLE = False

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

appointment_bp = Blueprint('appointment', __name__, url_prefix='/api')

def validate_agora_credentials():
    """Validate that Agora credentials are properly set"""
    app_id = os.getenv('AGORA_APP_ID')
    app_certificate = os.getenv('AGORA_APP_CERTIFICATE')
    
    if not app_id or app_id == 'your_agora_app_id_here':
        logger.error("AGORA_APP_ID environment variable not set or using placeholder value")
        return False, "Invalid Agora App ID"
    
    if not app_certificate or app_certificate == 'your_agora_app_certificate_here':
        logger.error("AGORA_APP_CERTIFICATE environment variable not set or using placeholder value")
        return False, "Invalid Agora App Certificate"
    
    return True, "Valid credentials"

def generate_agora_token(app_id, app_certificate, channel_name, uid, role, expiration_time):
    """
    Generate Agora RTC token with proper error handling
    """
    if not AGORA_AVAILABLE:
        logger.error("Agora token builder not available - cannot generate real token")
        raise Exception("Agora SDK not properly installed")
    
    # Validate credentials
    is_valid, message = validate_agora_credentials()
    if not is_valid:
        logger.error(f"Invalid Agora credentials: {message}")
        raise Exception(f"Invalid Agora credentials: {message}")
    
    try:
        logger.debug(f"Generating token with method: {AGORA_IMPORT_METHOD}")
        logger.debug(f"Parameters - Channel: {channel_name}, UID: {uid}, Role: {role}, Expiration: {expiration_time}")
        
        if AGORA_IMPORT_METHOD == 'standard':
            # Standard import method
            token = RtcTokenBuilder.buildTokenWithUid(
                app_id, app_certificate, channel_name, int(uid), Role_Publisher, expiration_time
            )
        elif AGORA_IMPORT_METHOD == 'alternative':
            # Alternative import method
            token = RtcTokenBuilder.buildTokenWithUid(
                app_id, app_certificate, channel_name, int(uid), Role_Publisher, expiration_time
            )
        elif AGORA_IMPORT_METHOD == 'direct':
            # Direct import method
            token = RtcTokenBuilder.buildTokenWithUid(
                app_id, app_certificate, channel_name, int(uid), Role_Publisher, expiration_time
            )
        else:
            raise Exception("No valid Agora import method available")
        
        if not token or token.startswith('mock_'):
            raise Exception("Failed to generate valid token")
        
        logger.info(f"Successfully generated Agora token for channel: {channel_name}")
        return token
        
    except Exception as e:
        logger.error(f"Failed to generate Agora token: {str(e)}")
        raise Exception(f"Token generation failed: {str(e)}")

@appointment_bp.route('/doctors', methods=['GET'])
def get_doctors():
    try:
        logger.debug("Fetching all doctors")
        doctors = Doctor.query.all()
        logger.info(f"Doctors fetched: {len(doctors)} doctors")
        return jsonify([{
            "id": d.id, 
            "name": d.name, 
            "specialization": d.specialization, 
            "availability": d.availability
        } for d in doctors]), 200
    except Exception as e:
        logger.error(f"Failed to fetch doctors: {str(e)}")
        return jsonify({"msg": f"Failed to fetch doctors: {str(e)}"}), 500

@appointment_bp.route('/doctors/<int:doctor_id>', methods=['GET'])
def get_doctor(doctor_id):
    try:
        logger.debug(f"Fetching doctor with ID: {doctor_id}")
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            logger.warning(f"Doctor not found: ID {doctor_id}")
            return jsonify({"msg": "Doctor not found"}), 404
        logger.info(f"Doctor fetched: {doctor.name}")
        return jsonify({
            "id": doctor.id,
            "name": doctor.name,
            "specialization": doctor.specialization,
            "availability": doctor.availability
        }), 200
    except Exception as e:
        logger.error(f"Failed to fetch doctor: {str(e)}")
        return jsonify({"msg": f"Failed to fetch doctor: {str(e)}"}), 500

@appointment_bp.route('/appointments/book', methods=['POST'])
@jwt_required()
def book_appointment():
    try:
        user_id = get_jwt_identity()
        user_id_int = int(user_id)
        data = request.json
        logger.debug(f"Booking request received: User ID {user_id}, Data {data}")
        
        if not data.get('doctor_id') or not data.get('time') or not data.get('reason'):
            logger.warning(f"Missing required fields: {data}")
            return jsonify({"msg": "Doctor ID, time, and reason are required"}), 400
        
        doctor = Doctor.query.get(data['doctor_id'])
        if not doctor:
            logger.warning(f"Doctor not found: ID {data['doctor_id']}")
            return jsonify({"msg": "Doctor not found"}), 404
        
        try:
            appointment_time = datetime.strptime(data['time'], '%Y-%m-%d %H:%M')
            current_time = datetime.now()
            logger.debug(f"Parsed appointment time: {appointment_time}, Current time: {current_time}")
            if appointment_time < current_time:
                logger.warning(f"Attempted to book past appointment: {data['time']}")
                return jsonify({"msg": "Cannot book appointments in the past"}), 400
        except ValueError:
            logger.error(f"Invalid time format: {data['time']}")
            return jsonify({"msg": "Invalid time format. Use YYYY-MM-DD HH:MM"}), 400
        
        existing_appointment = Appointment.query.filter_by(
            doctor_id=data['doctor_id'],
            time=data['time'],
            status='Scheduled'
        ).first()
        if existing_appointment:
            logger.warning(f"Time slot conflict: Doctor ID {data['doctor_id']}, Time {data['time']}")
            return jsonify({"msg": "This time slot is already booked"}), 409
        
        appointment = Appointment(
            user_id=user_id_int,
            doctor_id=data['doctor_id'],
            time=appointment_time,
            reason=data['reason'],
            status='Scheduled'
        )
        
        db.session.add(appointment)
        db.session.commit()
        logger.info(f"Appointment booked successfully: ID {appointment.id}, User {user_id_int}")
        
        return jsonify({
            "msg": "Appointment booked successfully", 
            "appointment_id": appointment.id
        }), 201
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Booking failed: {str(e)}")
        return jsonify({"msg": f"Booking failed: {str(e)}"}), 500

@appointment_bp.route('/appointments/my', methods=['GET'])
@jwt_required()
def my_appointments():
    try:
        user_id = get_jwt_identity()
        user_id_int = int(user_id)
        logger.debug(f"Fetching appointments for user ID: {user_id}")
        appointments = Appointment.query.filter_by(user_id=user_id_int).all()
        logger.info(f"Fetched {len(appointments)} appointments for user {user_id_int}")
        
        result = []
        for a in appointments:
            doctor = Doctor.query.get(a.doctor_id)
            result.append({
                "id": a.id,
                "doctor_name": doctor.name if doctor else "Unknown Doctor",
                "doctor_id": a.doctor_id,
                "time": a.time,
                "status": a.status,
                "reason": a.reason
            })
        
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Failed to fetch appointments: {str(e)}")
        return jsonify({"msg": f"Failed to fetch appointments: {str(e)}"}), 500

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['DELETE'])
@jwt_required()
def cancel_appointment(appointment_id):
    try:
        user_id = get_jwt_identity()
        user_id_int = int(user_id)
        logger.debug(f"Cancel request for appointment ID: {appointment_id} by user ID: {user_id}")
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            logger.warning(f"Appointment not found: ID {appointment_id}")
            return jsonify({"msg": "Appointment not found"}), 404
        
        if appointment.user_id != user_id_int:
            logger.warning(f"Unauthorized attempt to cancel appointment ID {appointment_id} by user {user_id_int}")
            return jsonify({"msg": "Unauthorized to cancel this appointment"}), 403
        
        if appointment.status == 'Cancelled':
            logger.warning(f"Appointment already cancelled: ID {appointment_id}")
            return jsonify({"msg": "Appointment is already cancelled"}), 400
        
        appointment.status = 'Cancelled'
        db.session.commit()
        logger.info(f"Appointment cancelled successfully: ID {appointment_id}")
        
        return jsonify({"msg": "Appointment cancelled successfully"}), 200
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to cancel appointment: {str(e)}")
        return jsonify({"msg": f"Failed to cancel appointment: {str(e)}"}), 500

@appointment_bp.route('/appointments/<int:appointment_id>/delete', methods=['DELETE'])
@jwt_required()
def delete_appointment(appointment_id):
    try:
        user_id = get_jwt_identity()
        user_id_int = int(user_id)
        logger.debug(f"Delete request for appointment ID: {appointment_id} by user ID: {user_id}")
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            logger.warning(f"Appointment not found: ID {appointment_id}")
            return jsonify({"msg": "Appointment not found"}), 404
        
        if appointment.user_id != user_id_int:
            logger.warning(f"Unauthorized attempt to delete appointment ID {appointment_id} by user {user_id_int}")
            return jsonify({"msg": "Unauthorized to delete this appointment"}), 403
        
        db.session.delete(appointment)
        db.session.commit()
        logger.info(f"Appointment deleted successfully: ID {appointment_id}")
        
        return jsonify({"msg": "Appointment deleted successfully"}), 200
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete appointment: {str(e)}")
        return jsonify({"msg": f"Failed to delete appointment: {str(e)}"}), 500

@appointment_bp.route('/appointments/<int:appointment_id>', methods=['PUT'])
@jwt_required()
def reschedule_appointment(appointment_id):
    try:
        user_id = get_jwt_identity()
        user_id_int = int(user_id)
        data = request.json
        logger.debug(f"Reschedule request for appointment ID: {appointment_id} by user ID: {user_id}, Data: {data}")
        
        if not data.get('time'):
            logger.warning(f"Missing time field in reschedule request: {data}")
            return jsonify({"msg": "Time is required"}), 400
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            logger.warning(f"Appointment not found: ID {appointment_id}")
            return jsonify({"msg": "Appointment not found"}), 404
        
        if appointment.user_id != user_id_int:
            logger.warning(f"Unauthorized attempt to reschedule appointment ID {appointment_id} by user {user_id_int}")
            return jsonify({"msg": "Unauthorized to reschedule this appointment"}), 403
        
        if appointment.status != 'Scheduled':
            logger.warning(f"Cannot reschedule appointment with status {appointment.status}: ID {appointment_id}")
            return jsonify({"msg": "Can only reschedule scheduled appointments"}), 400
        
        try:
            new_time = datetime.strptime(data['time'], '%Y-%m-%d %H:%M')
            current_time = datetime.now()
            if new_time < current_time:
                logger.warning(f"Attempted to reschedule to past time: {data['time']}")
                return jsonify({"msg": "Cannot reschedule to a past time"}), 400
        except ValueError:
            logger.error(f"Invalid time format: {data['time']}")
            return jsonify({"msg": "Invalid time format. Use YYYY-MM-DD HH:MM"}), 400
        
        existing_appointment = Appointment.query.filter_by(
            doctor_id=appointment.doctor_id,
            time=data['time'],
            status='Scheduled'
        ).first()
        if existing_appointment and existing_appointment.id != appointment_id:
            logger.warning(f"Time slot conflict: Doctor ID {appointment.doctor_id}, Time {data['time']}")
            return jsonify({"msg": "This time slot is already booked"}), 409
        
        appointment.time = data['time']
        db.session.commit()
        logger.info(f"Appointment rescheduled successfully: ID {appointment_id} to {data['time']}")
        
        return jsonify({
            "msg": "Appointment rescheduled successfully", 
            "appointment_id": appointment_id
        }), 200
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to reschedule appointment: {str(e)}")
        return jsonify({"msg": f"Failed to reschedule appointment: {str(e)}"}), 500

@appointment_bp.route('/reminders', methods=['POST'])
@jwt_required()
def create_reminder():
    try:
        user_id = get_jwt_identity()
        user_id_int = int(user_id)
        data = request.json
        logger.debug(f"Reminder creation request: User ID {user_id}, Data {data}")
        
        if not data.get('medication') or not data.get('time'):
            logger.warning(f"Missing required fields: {data}")
            return jsonify({"msg": "Medication and time are required"}), 400
        
        medication = data['medication'].strip()
        if len(medication) < 2:
            logger.warning(f"Medication name too short: {medication}")
            return jsonify({"msg": "Medication name must be at least 2 characters"}), 400
        
        if not re.match(r'^\d{2}:\d{2}$', data['time']):
            logger.warning(f"Invalid time format: {data['time']}")
            return jsonify({"msg": "Invalid time format. Use HH:MM (e.g., '08:00')"}), 400
        
        reminder = Reminder(
            user_id=user_id_int,
            medication=medication,
            time=data['time']
        )
        
        db.session.add(reminder)
        db.session.commit()
        logger.info(f"Reminder created successfully: ID {reminder.id}, User {user_id_int}, Medication {medication}")
        
        return jsonify({
            "msg": "Reminder created successfully", 
            "reminder_id": reminder.id
        }), 201
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Reminder creation failed: {str(e)}")
        return jsonify({"msg": f"Reminder creation failed: {str(e)}"}), 500

@appointment_bp.route('/reminders/my', methods=['GET'])
@jwt_required()
def my_reminders():
    try:
        user_id = get_jwt_identity()
        user_id_int = int(user_id)
        logger.debug(f"Fetching reminders for user ID: {user_id}")
        
        reminders = Reminder.query.filter_by(user_id=user_id_int).all()
        logger.info(f"Fetched {len(reminders)} reminders for user {user_id_int}")
        
        return jsonify([{
            "id": r.id,
            "medication": r.medication,
            "time": r.time,
            "created_at": r.created_at.isoformat()
        } for r in reminders]), 200
    
    except Exception as e:
        logger.error(f"Failed to fetch reminders: {str(e)}")
        return jsonify({"msg": f"Failed to fetch reminders: {str(e)}"}), 500

@appointment_bp.route('/reminders/<int:reminder_id>', methods=['DELETE'])
@jwt_required()
def delete_reminder(reminder_id):
    try:
        user_id = get_jwt_identity()
        user_id_int = int(user_id)
        logger.debug(f"Delete request for reminder ID: {reminder_id} by user ID: {user_id}")
        
        reminder = Reminder.query.get(reminder_id)
        if not reminder:
            logger.warning(f"Reminder not found: ID {reminder_id}")
            return jsonify({"msg": "Reminder not found"}), 404
        
        if reminder.user_id != user_id_int:
            logger.warning(f"Unauthorized attempt to delete reminder ID {reminder_id} by user {user_id_int}")
            return jsonify({"msg": "Unauthorized to delete this reminder"}), 403
        
        db.session.delete(reminder)
        db.session.commit()
        logger.info(f"Reminder deleted successfully: ID {reminder_id}")
        
        return jsonify({"msg": "Reminder deleted successfully"}), 200
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete reminder: {str(e)}")
        return jsonify({"msg": f"Failed to delete reminder: {str(e)}"}), 500

@appointment_bp.route('/appointments/<int:appointment_id>/video-access', methods=['GET'])
@jwt_required()
def verify_video_access(appointment_id):
    try:
        user_id = get_jwt_identity()
        user_id_int = int(user_id)
        logger.debug(f"Video access request for appointment ID: {appointment_id} by user ID: {user_id}")
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            logger.warning(f"Appointment not found: ID {appointment_id}")
            return jsonify({"msg": "Appointment not found"}), 404
        
        if appointment.user_id != user_id_int:
            logger.warning(f"Unauthorized attempt to access video for appointment ID {appointment_id} by user {user_id_int}")
            return jsonify({"msg": "Unauthorized to access this video call"}), 403
        
        if appointment.status != 'Scheduled':
            logger.warning(f"Cannot access video for appointment with status {appointment.status}: ID {appointment_id}")
            return jsonify({"msg": "Video call is only available for scheduled appointments"}), 400
        
        try:
            appointment_time = datetime.strptime(appointment.time, '%Y-%m-%d %H:%M')
            current_time = datetime.now()
            start_window = appointment_time - timedelta(minutes=5)
            end_window = appointment_time + timedelta(minutes=30)
            
            if not (start_window <= current_time <= end_window):
                logger.warning(f"Video call access outside time window: Appointment ID {appointment_id}, Current time {current_time}")
                return jsonify({
                    "msg": "Video call is only available within 5 minutes before to 30 minutes after the scheduled time"
                }), 403
        except ValueError:
            logger.error(f"Invalid appointment time format: {appointment.time}")
            return jsonify({"msg": "Invalid appointment time format"}), 400
        
        doctor = Doctor.query.get(appointment.doctor_id)
        if not doctor:
            logger.warning(f"Doctor not found for appointment ID {appointment_id}")
            return jsonify({"msg": "Doctor not found"}), 404
        
        # Get Agora credentials from environment
        app_id = os.getenv('AGORA_APP_ID')
        app_certificate = os.getenv('AGORA_APP_CERTIFICATE')
        
        if not app_id or not app_certificate:
            logger.error("Agora credentials not configured in environment variables")
            return jsonify({
                "msg": "Video service not configured. Please contact support."
            }), 500
        
        # Generate channel name and user ID
        channel_name = f"appointment_{appointment.id}"
        uid = str(user_id_int)
        
        # Token expires in 1 hour
        expiration_time = int(time.time()) + 3600
        
        logger.debug(f"Attempting to generate Agora token for channel: {channel_name}, UID: {uid}")
        
        try:
            # Generate the Agora token
            token = generate_agora_token(
                app_id, app_certificate, channel_name, uid, Role_Publisher, expiration_time
            )
            
            logger.info(f"Successfully generated video access token for appointment {appointment_id}")
            
            return jsonify({
                "msg": "Access granted",
                "appointment_id": appointment.id,
                "room_id": f"appointment_{appointment.id}",
                "doctor_user_id": str(doctor.id),
                "patient_user_id": str(user_id_int),
                "token": token,
                "app_id": app_id,
                "channel_name": channel_name,
                "uid": uid,
                "doctor_name": doctor.name,
                "appointment_time": appointment.time
            }), 200
            
        except Exception as token_error:
            logger.error(f"Token generation failed: {str(token_error)}")
            return jsonify({
                "msg": f"Failed to generate video access token: {str(token_error)}"
            }), 500
    
    except Exception as e:
        logger.error(f"Failed to verify video access: {str(e)}")
        return jsonify({"msg": f"Failed to verify video access: {str(e)}"}), 500

@appointment_bp.route('/appointments/cleanup', methods=['POST'])
@jwt_required()
def cleanup_expired_appointments_endpoint():
    """
    Endpoint to manually trigger cleanup of expired appointments (for testing or admin purposes)
    Requires authentication to prevent unauthorized access
    """
    try:
        user_id = get_jwt_identity()
        logger.debug(f"Manual cleanup request by user ID: {user_id}")
        
        # Optional: Add admin check here if you want to restrict this endpoint
        current_time = datetime.now()
        expired_appointments = Appointment.query.filter(
            Appointment.status == 'Scheduled',
            db.func.datetime(Appointment.time) < db.func.datetime(current_time - timedelta(minutes=30))
        ).all()
        
        deleted_count = 0
        for appointment in expired_appointments:
            logger.info(f"Deleting expired appointment ID {appointment.id}, scheduled at {appointment.time}")
            db.session.delete(appointment)
            deleted_count += 1
        
        db.session.commit()
        logger.info(f"Manually deleted {deleted_count} expired appointments")
        
        return jsonify({
            "msg": f"Successfully deleted {deleted_count} expired appointments"
        }), 200
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to clean up expired appointments: {str(e)}")
        return jsonify({"msg": f"Failed to clean up expired appointments: {str(e)}"}), 500

# Health check endpoint for Agora service
@appointment_bp.route('/video/health', methods=['GET'])
def video_health_check():
    """Check if video service is properly configured"""
    is_valid, message = validate_agora_credentials()
    return jsonify({
        "agora_available": AGORA_AVAILABLE,
        "credentials_valid": is_valid,
        "message": message,
        "import_method": AGORA_IMPORT_METHOD if AGORA_AVAILABLE else None
    }), 200 if (AGORA_AVAILABLE and is_valid) else 503