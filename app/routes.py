from flask import Blueprint, request, jsonify
from app.config import Config
from app.services import get_ai_response
from app.db import create_session, add_message, get_messages
from app.db import create_session, add_message, get_messages, get_all_sessions, delete_session, update_session_title

main_bp = Blueprint('main', __name__)

@main_bp.route('/models', methods=['GET'])
def get_models():
    return jsonify(Config.AVAILABLE_MODELS)

@main_bp.route('/start_chat', methods=['POST'])
def start_chat():
    data = request.json
    model_id = data.get('model')

    if not model_id:
        return jsonify({"error": "Model ID is required"}), 400

    session_id = create_session(model_id)

    return jsonify({
        "session_id": session_id,
        "message": "New chat session started"
    })


@main_bp.route('/chat', methods=['POST'])
def chat():
    data = request.json
    session_id = data.get('session_id')
    user_message = data.get('message')
    model_id = data.get('model')

    if not session_id or not user_message or not model_id:
        return jsonify({"error": "Missing session_id, model, or message"}), 400

    add_message(session_id, "user", user_message)

    history = get_messages(session_id)

    ai_reply = get_ai_response(model_id, history)

    add_message(session_id, "assistant", ai_reply)

    return jsonify({
        "reply": ai_reply,
        "session_id": session_id
    })

@main_bp.route('/sessions', methods=['GET'])
def get_sessions():
    sessions = get_all_sessions()
    return jsonify(sessions)

@main_bp.route('/history/<session_id>', methods=['GET'])
def get_history(session_id):
    messages = get_messages(session_id)
    return jsonify(messages)

@main_bp.route('/sessions/<session_id>', methods=['DELETE'])
def delete_chat_session(session_id):
    delete_session(session_id)
    return jsonify({"message": "Deleted"})

@main_bp.route('/sessions/<session_id>/title', methods=['PUT'])
def update_title(session_id):
    data = request.json
    new_title = data.get('title')
    update_session_title(session_id, new_title)
    return jsonify({"message": "Updated"})
