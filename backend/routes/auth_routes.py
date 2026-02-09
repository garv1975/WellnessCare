from flask import Blueprint, request, jsonify, redirect, url_for
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models.user import User
from models.chat_message import ChatMessage
from database import db
import logging
from services.chatbot_engine import chat_state
import requests
import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        logger.debug("Register request received: %s", data)
        
        if not data.get('email') or not data.get('password'):
            logger.warning("Missing email or password in register request: %s", data)
            return jsonify({"msg": "Email and password are required"}), 400
        
        if User.query.filter_by(email=data['email']).first():
            logger.warning("User already exists: %s", data['email'])
            return jsonify({"msg": "User already exists"}), 400
        
        user = User(email=data['email'])
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        logger.info("User registered successfully: %s", user.email)
        
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "msg": "User registered successfully",
            "token": access_token,
            "user_id": str(user.id)
        }), 201
    
    except Exception as e:
        db.session.rollback()
        logger.error("Registration failed: %s", str(e))
        return jsonify({"msg": f"Registration failed: {str(e)}"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        logger.debug("Login request received: %s", data)
        
        if not data.get('email') or not data.get('password'):
            logger.warning("Missing email or password in login request: %s", data)
            return jsonify({"msg": "Email and password are required"}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        if not user or not user.check_password(data['password']):
            logger.warning("Invalid credentials for email: %s", data['email'])
            return jsonify({"msg": "Invalid credentials"}), 401
        
        # Clear chat state for user
        if str(user.id) in chat_state:
            del chat_state[str(user.id)]
        
        # Clear previous chat history
        ChatMessage.query.filter_by(user_id=user.id).delete()
        db.session.commit()
        
        access_token = create_access_token(identity=str(user.id))
        logger.info("User logged in successfully: %s, Token issued: %s", user.email, access_token)
        
        return jsonify({
            "msg": "Logged in successfully",
            "token": access_token,
            "user_id": str(user.id)
        }), 200
    
    except Exception as e:
        logger.error("Login failed: %s", str(e))
        return jsonify({"msg": f"Login failed: {str(e)}"}), 500

@auth_bp.route('/google', methods=['POST'])
def google_login():
    try:
        data = request.json
        credential = data.get('credential')
        if not credential:
            logger.warning("No credential provided in Google login request")
            return jsonify({"msg": "Credential missing"}), 400

        google_client_id = os.getenv('GOOGLE_CLIENT_ID')
        if not google_client_id:
            logger.error("Google Client ID not configured")
            return jsonify({"msg": "Google authentication not configured"}), 500

        # Verify the Google ID token
        id_info = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            google_client_id
        )

        email = id_info.get('email')
        if not email:
            logger.error("No email found in Google ID token")
            return jsonify({"msg": "Failed to fetch user info from Google"}), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            # Create new user (signup)
            import secrets
            random_password = secrets.token_urlsafe(16)  # Generate secure random password
            user = User(email=email)
            user.set_password(random_password)
            db.session.add(user)
            db.session.commit()
            logger.info("New user created via Google: %s", email)
        else:
            logger.info("Existing user logged in via Google: %s", email)

        # Clear chat state and history
        if str(user.id) in chat_state:
            del chat_state[str(user.id)]
        ChatMessage.query.filter_by(user_id=user.id).delete()
        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        logger.info("Google login successful for user: %s, Token issued: %s", email, access_token)

        return jsonify({
            "msg": "Google login successful",
            "token": access_token,
            "user_id": str(user.id)
        }), 200

    except ValueError as e:
        logger.error("Invalid Google ID token: %s", str(e))
        return jsonify({"msg": "Invalid Google credential"}), 400
    except Exception as e:
        db.session.rollback()
        logger.error("Google login failed: %s", str(e))
        return jsonify({"msg": f"Google authentication failed: {str(e)}"}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        identity = get_jwt_identity()
        logger.debug("Logout request for identity: %s", identity)

        # CASE 1: Doctor token
        if isinstance(identity, str) and identity.startswith("doctor_"):
            logger.info("Doctor logout detected, no chat cleanup needed")
            return jsonify({"msg": "Doctor logged out successfully"}), 200

        # CASE 2: User token
        user_id = int(identity)

        if str(user_id) in chat_state:
            del chat_state[str(user_id)]

        ChatMessage.query.filter_by(user_id=user_id).delete()
        db.session.commit()

        logger.info("User logged out successfully: %s", user_id)
        return jsonify({"msg": "Logged out successfully"}), 200

    except Exception as e:
        logger.error("Logout failed: %s", str(e))
        return jsonify({"msg": f"Logout failed: {str(e)}"}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    try:
        user_id = get_jwt_identity()
        logger.debug("Fetching user with ID: %s", user_id)
        
        user = User.query.get(int(user_id))
        if not user:
            logger.warning("User not found: ID %s", user_id)
            return jsonify({"msg": "User not found"}), 404
        
        logger.info("User fetched successfully: %s", user.email)
        return jsonify({"email": user.email, "user_id": user_id}), 200
    
    except Exception as e:
        logger.error("Failed to fetch user: %s", str(e))
        return jsonify({"msg": f"Failed to fetch user: {str(e)}"}), 500