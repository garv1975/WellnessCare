from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, decode_token
from services.chatbot_engine import get_bot_response
from models.chat_message import ChatMessage
from database import db
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

chatbot_bp = Blueprint('chatbot', __name__, url_prefix='/api')

@chatbot_bp.route('/chatbot', methods=['POST'])
def chatbot():
    if not request.is_json:
        logger.warning("Invalid request: JSON required")
        return jsonify({"msg": "Request must be JSON"}), 400
    
    data = request.json
    message = data.get('message', '')
    user_id = data.get('user_id')
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if not isinstance(message, str) or not message.strip():
        logger.warning("Invalid message: Non-empty string required")
        return jsonify({"msg": "Message must be a non-empty string"}), 400
    
    try:
        # Use authenticated user ID if available
        if not user_id and token:
            try:
                decoded_token = decode_token(token)
                user_id = decoded_token['sub']
                logger.debug("Authenticated user ID: %s", user_id)
            except Exception:
                logger.debug("No authenticated user")
                user_id = None
        
        response = get_bot_response(message, user_id, token)
        logger.info("Chatbot response generated for message: %s", message)
        return jsonify({"response": response})
    except Exception as e:
        logger.error("Chatbot error: %s", str(e))
        return jsonify({"msg": f"Chatbot error: {str(e)}"}), 500

@chatbot_bp.route('/chatbot/history', methods=['GET'])
def get_chat_history():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({"msg": "Missing token"}), 401
        
        decoded_token = decode_token(token)
        user_id = decoded_token['sub']
        
        messages = ChatMessage.query.filter_by(user_id=int(user_id)).order_by(ChatMessage.timestamp.asc()).all()
        history = [{"sender": m.sender, "text": m.text} for m in messages]
        
        logger.info("Chat history retrieved for user: %s", user_id)
        return jsonify({"history": history})
    except Exception as e:
        logger.error("Chat history error: %s", str(e))
        return jsonify({"msg": f"Failed to fetch chat history: {str(e)}"}), 500