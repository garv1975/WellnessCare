from models.doctor import Doctor
from models.user import User
from models.profile import Profile
from models.chat_message import ChatMessage
from database import db
from datetime import datetime
import re
import requests
from flask_jwt_extended import decode_token
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# In-memory state for conversation context (per user)
chat_state = {}

# FAQ database
FAQS = {
    'diabetes': {
        'what is diabetes': 'Diabetes is a condition where your body has trouble managing blood sugar levels. Type 1 is autoimmune, while Type 2 is often lifestyle-related. Want to know about symptoms or management?',
        'diabetes symptoms': 'Common symptoms include increased thirst, frequent urination, fatigue, and blurred vision. Should I connect you with a Diabetologist?',
        'diabetes management': 'Manage diabetes with a balanced diet, regular exercise, medication, and monitoring blood sugar. Want to book a consultation for personalized advice?'
    },
    'heart': {
        'heart disease symptoms': 'Symptoms include chest pain, shortness of breath, fatigue, and swelling in legs. Would you like to consult a Cardiologist?',
        'heart care tips': 'Maintain heart health with a low-sodium diet, regular exercise, stress management, and avoiding smoking. Want to schedule a heart check-up?',
        'what is hypertension': 'Hypertension, or high blood pressure, can strain your heart. It’s often managed with lifestyle changes and medication. Need a doctor’s advice?'
    }
}

def get_bot_response(message, user_id=None, token=None):
    message = message.lower().strip()
    if not user_id:
        user_id = 'anonymous'

    # Save user message
    if user_id != 'anonymous':
        user_message = ChatMessage(user_id=int(user_id), sender='user', text=message)
        db.session.add(user_message)
        db.session.commit()

    # Initialize state if not exists
    if user_id not in chat_state:
        chat_state[user_id] = {'step': None, 'data': {}}

    state = chat_state[user_id]

    # Check for restricted actions
    restricted_actions = ['book appointment', 'set reminder', 'show appointments', 'cancel appointment']
    if user_id == 'anonymous' and any(action in message for action in restricted_actions):
        response = "Please log in to book appointments, set reminders, view appointments, or cancel appointments."
        save_bot_message(user_id, response)
        return response

    # Handle greetings
    if 'hello' in message or 'hi' in message:
        user = User.query.get(int(user_id)) if user_id != 'anonymous' else None
        greeting = f"Hello{' ' + user.email.split('@')[0] if user else ''}! I’m your health assistant. How can I help today?"
        response = greeting + " Try asking about appointments, doctors, diabetes, heart care, reminders, or onboarding."
        save_bot_message(user_id, response)
        return response

    # Handle FAQs
    for category, faqs in FAQS.items():
        for question, answer in faqs.items():
            if question in message or any(word in message for word in question.split()):
                save_bot_message(user_id, answer)
                return answer

    # Handle doctor intro and availability
    if 'doctor' in message or 'doctors' in message:
        doctors = Doctor.query.all()
        if not doctors:
            response = "No doctors available at the moment. Please check back later."
            save_bot_message(user_id, response)
            return response
        response = "Our doctors:\n" + "\n".join([f"- {d.name} ({d.specialization}, Available: {d.availability})" for d in doctors])
        response += "\nWould you like to book an appointment?"
        save_bot_message(user_id, response)
        return response

    # Handle showing appointments
    if 'show appointments' in message or state['step'] == 'show_appointments':
        if user_id == 'anonymous':
            response = "Please log in to view your appointments."
            save_bot_message(user_id, response)
            return response
        try:
            headers = {'Authorization': f'Bearer {token}'}
            response = requests.get('http://localhost:5000/api/appointments/my', headers=headers)
            if response.status_code == 200:
                appointments = response.json()
                if not appointments:
                    response_text = "You have no appointments scheduled."
                else:
                    response_text = "Your appointments:\n" + "\n".join([
                        f"- ID {appt['id']}: {appt['doctor_name']} on {appt['time']} (Reason: {appt['reason']}, Status: {appt['status']})"
                        for appt in appointments
                    ])
            else:
                response_text = f"Failed to fetch appointments: {response.json().get('msg', 'Unknown error')}"
            state['step'] = None
            state['data'] = {}
            save_bot_message(user_id, response_text)
            return response_text
        except Exception as e:
            logger.error("Error fetching appointments: %s", str(e))
            response_text = f"Error fetching appointments: {str(e)}"
            save_bot_message(user_id, response_text)
            return response_text

    # Handle canceling appointments
    if 'cancel appointment' in message or state['step'] == 'cancel_appointment':
        if user_id == 'anonymous':
            response = "Please log in to cancel an appointment."
            save_bot_message(user_id, response)
            return response
        if state['step'] != 'cancel_appointment':
            state['step'] = 'cancel_appointment'
            state['data'] = {'step': 'select_appointment'}
            try:
                headers = {'Authorization': f'Bearer {token}'}
                response = requests.get('http://localhost:5000/api/appointments/my', headers=headers)
                if response.status_code == 200:
                    appointments = response.json()
                    if not appointments:
                        response_text = "You have no appointments to cancel."
                        state['step'] = None
                        state['data'] = {}
                        save_bot_message(user_id, response_text)
                        return response_text
                    response_text = "Your appointments:\n" + "\n".join([
                        f"- ID {appt['id']}: {appt['doctor_name']} on {appt['time']} (Reason: {appt['reason']}, Status: {appt['status']})"
                        for appt in appointments
                    ])
                    response_text += "\nPlease reply with the appointment ID (e.g., '1') to cancel."
                    save_bot_message(user_id, response_text)
                    return response_text
                else:
                    response_text = f"Failed to fetch appointments: {response.json().get('msg', 'Unknown error')}"
                    state['step'] = None
                    state['data'] = {}
                    save_bot_message(user_id, response_text)
                    return response_text
            except Exception as e:
                logger.error("Error fetching appointments for cancellation: %s", str(e))
                response_text = f"Error fetching appointments: {str(e)}"
                state['step'] = None
                state['data'] = {}
                save_bot_message(user_id, response_text)
                return response_text

        if state['data']['step'] == 'select_appointment':
            try:
                appointment_id = int(re.search(r'\d+', message).group())
                headers = {'Authorization': f'Bearer {token}'}
                response = requests.delete(f'http://localhost:5000/api/appointments/{appointment_id}', headers=headers)
                if response.status_code == 200:
                    response_text = "Appointment cancelled successfully!"
                else:
                    response_text = f"Failed to cancel appointment: {response.json().get('msg', 'Unknown error')}"
                state['step'] = None
                state['data'] = {}
                save_bot_message(user_id, response_text)
                return response_text
            except (ValueError, AttributeError):
                response_text = "Please provide a valid appointment ID (e.g., '1')."
                save_bot_message(user_id, response_text)
                return response_text
            except Exception as e:
                logger.error("Error cancelling appointment: %s", str(e))
                response_text = f"Error cancelling appointment: {str(e)}"
                state['step'] = None
                state['data'] = {}
                save_bot_message(user_id, response_text)
                return response_text

    # Handle appointment scheduling
    if 'book appointment' in message or state['step'] == 'appointment':
        if user_id == 'anonymous':
            response = "Please log in to book an appointment."
            save_bot_message(user_id, response)
            return response
        if state['step'] != 'appointment':
            state['step'] = 'appointment'
            state['data'] = {'step': 'select_doctor'}
            doctors = Doctor.query.all()
            response = "Let’s book an appointment. Available doctors:\n" + "\n".join([f"- {d.id}: {d.name} ({d.specialization})" for d in doctors])
            response += "\nReply with the doctor’s ID (e.g., '1') to select."
            save_bot_message(user_id, response)
            return response

        if state['data']['step'] == 'select_doctor':
            try:
                doctor_id = int(re.search(r'\d+', message).group())
                doctor = Doctor.query.get(doctor_id)
                if not doctor:
                    response = "Invalid doctor ID. Please select a valid ID from the list."
                    save_bot_message(user_id, response)
                    return response
                state['data']['doctor_id'] = doctor_id
                state['data']['step'] = 'select_time'
                response = f"Selected {doctor.name}. Please provide the appointment time (e.g., '2025-06-08 14:00')."
                save_bot_message(user_id, response)
                return response
            except (ValueError, AttributeError):
                response = "Please provide a valid doctor ID (e.g., '1')."
                save_bot_message(user_id, response)
                return response

        if state['data']['step'] == 'select_time':
            try:
                appt_time = datetime.strptime(message, '%Y-%m-%d %H:%M')
                if appt_time < datetime.now():
                    response = "Cannot book appointments in the past. Please choose a future time."
                    save_bot_message(user_id, response)
                    return response
                state['data']['time'] = message
                state['data']['step'] = 'reason'
                response = "Great! What’s the reason for your visit?"
                save_bot_message(user_id, response)
                return response
            except ValueError:
                response = "Invalid time format. Please use 'YYYY-MM-DD HH:MM' (e.g., '2025-06-08 14:00')."
                save_bot_message(user_id, response)
                return response

        if state['data']['step'] == 'reason':
            if len(message) < 5:
                response = "Please provide a detailed reason for the visit."
                save_bot_message(user_id, response)
                return response
            state['data']['reason'] = message
            appt_data = {
                'doctor_id': state['data']['doctor_id'],
                'time': state['data']['time'],
                'reason': state['data']['reason']
            }
            try:
                headers = {'Authorization': f'Bearer {token}'}
                response = requests.post(
                    'http://localhost:5000/api/appointments/book',
                    json=appt_data,
                    headers=headers
                )
                if response.status_code == 201:
                    response_text = "Appointment booked successfully! Check your dashboard for details."
                else:
                    response_text = f"Failed to book appointment: {response.json().get('msg', 'Unknown error')}"
            except Exception as e:
                logger.error("Error booking appointment: %s", str(e))
                response_text = f"Error booking appointment: {str(e)}"
            state['step'] = None
            state['data'] = {}
            save_bot_message(user_id, response_text)
            return response_text

    # Handle medication reminders
    if 'reminder' in message or state['step'] == 'reminder':
        if user_id == 'anonymous':
            response = "Please log in to set a reminder."
            save_bot_message(user_id, response)
            return response
        if state['step'] != 'reminder':
            state['step'] = 'reminder'
            state['data'] = {'step': 'medication_name'}
            response = "Let’s set a medication reminder. What’s the medication name (e.g., Insulin)?"
            save_bot_message(user_id, response)
            return response

        if state['data']['step'] == 'medication_name':
            if len(message.strip()) < 2:
                response = "Please provide a valid medication name (at least 2 characters)."
                save_bot_message(user_id, response)
                return response
            state['data']['medication_name'] = message.strip()
            state['data']['step'] = 'time'
            response = f"Got it, {message.strip()}. What time should I remind you (e.g., '08:00')?"
            save_bot_message(user_id, response)
            return response

        if state['data']['step'] == 'time':
            if not re.match(r'^\d{2}:\d{2}$', message):
                response = "Please provide a valid time in HH:MM format (e.g., '08:00')."
                save_bot_message(user_id, response)
                return response
            state['data']['time'] = message
            reminder_data = {
                'medication': state['data']['medication_name'],
                'time': message
            }
            try:
                headers = {'Authorization': f'Bearer {token}'}
                response = requests.post(
                    'http://localhost:5000/api/reminders',
                    json=reminder_data,
                    headers=headers
                )
                logger.debug("Reminder POST response: %s, Status: %d", response.json(), response.status_code)
                if response.status_code == 201:
                    response_text = f"Reminder set for {reminder_data['medication']} at {reminder_data['time']} daily! Check your dashboard for details."
                else:
                    response_text = f"Failed to set reminder: {response.json().get('msg', 'Unknown error')}"
            except Exception as e:
                logger.error("Error setting reminder: %s", str(e))
                response_text = f"Error setting reminder: {str(e)}"
            state['step'] = None
            state['data'] = {}
            save_bot_message(user_id, response_text)
            return response_text

    # Handle onboarding
    if 'onboard' in message or state['step'] == 'onboard':
        if user_id == 'anonymous':
            response = "Please log in to complete onboarding."
            save_bot_message(user_id, response)
            return response
        profile = Profile.query.filter_by(user_id=int(user_id)).first()
        if profile:
            response = "You’ve already completed onboarding! Want to update your profile?"
            save_bot_message(user_id, response)
            return response

        if state['step'] != 'onboard':
            state['step'] = 'onboard'
            state['data'] = {'step': 'name'}
            response = "Let’s set up your profile. What’s your full name?"
            save_bot_message(user_id, response)
            return response

        if state['data']['step'] == 'name':
            if len(message) < 2:
                response = "Please provide a valid name."
                save_bot_message(user_id, response)
                return response
            state['data']['name'] = message
            state['data']['step'] = 'age'
            response = "Thanks! How old are you?"
            save_bot_message(user_id, response)
            return response

        if state['data']['step'] == 'age':
            try:
                age = int(message)
                if age < 1 or age > 120:
                    raise ValueError
                state['data']['age'] = age
                state['data']['step'] = 'medical_history'
                response = "Got it. Please share any relevant medical history (e.g., conditions, allergies) or type 'none'."
                save_bot_message(user_id, response)
                return response
            except ValueError:
                response = "Please provide a valid age (e.g., '30')."
                save_bot_message(user_id, response)
                return response

        if state['data']['step'] == 'medical_history':
            state['data']['medical_history'] = message if message.lower() != 'none' else ''
            profile = Profile(
                user_id=int(user_id),
                name=state['data']['name'],
                age=state['data']['age'],
                medical_history=state['data']['medical_history']
            )
            db.session.add(profile)
            db.session.commit()
            state['step'] = None
            state['data'] = {}
            response = "Onboarding complete! Your profile is set up. Want to book an appointment or explore FAQs?"
            save_bot_message(user_id, response)
            return response

    # Default response
    response = "I’m not sure I understand. Try asking about appointments, doctors, diabetes, heart care, reminders, or onboarding."
    save_bot_message(user_id, response)
    return response

def save_bot_message(user_id, text):
    if user_id != 'anonymous':
        bot_message = ChatMessage(user_id=int(user_id), sender='bot', text=text)
        db.session.add(bot_message)
        db.session.commit()