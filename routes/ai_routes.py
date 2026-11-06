import json
import os
import requests

from flask import (
    Blueprint,
    jsonify,
    request,
    Response,
    stream_with_context
)

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)


# ============================================================
# AI SERVICE IMPORTS
# ============================================================

from services.ai_service import (
    get_vulnerability_explanation,
    get_vulnerability_secure_fix,
    get_ai_explanation
)


# ============================================================
# CONVERSATION SERVICE IMPORTS
# ============================================================

from services.conversation_service import (
    create_conversation,
    add_message,
    get_conversation,
    get_user_conversations,
    update_conversation_context,
    delete_conversation
)


# ============================================================
# AI BLUEPRINT
# ============================================================

ai_bp = Blueprint(
    "ai",
    __name__,
    url_prefix="/ai"
)


# ============================================================
# OLLAMA CONFIGURATION
# ============================================================

OLLAMA_URL = os.getenv(
    "OLLAMA_URL",
    "http://127.0.0.1:11434/api/generate"
)

MODEL_NAME = os.getenv(
    "OLLAMA_MODEL",
    "llama3"
)


# ============================================================
# FASTAPI CONFIGURATION
# ============================================================

FASTAPI_URL = os.getenv(
    "FASTAPI_URL",
    "http://127.0.0.1:8000"
)


# ============================================================
# TIMEOUT CONFIGURATION
# ============================================================

CONNECT_TIMEOUT = 10

READ_TIMEOUT = 600

AI_TIMEOUT = (
    CONNECT_TIMEOUT,
    READ_TIMEOUT
)


# ============================================================
# LIMITS
# ============================================================

MAX_MESSAGE_LENGTH = 10000

MAX_CHAT_HISTORY = 10

MAX_HISTORY_MESSAGE_LENGTH = 2000

MAX_VULNERABILITIES = 20

MAX_DESCRIPTION_LENGTH = 1500

MAX_CODE_LENGTH = 50000


# ============================================================
# SECURITY SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are an AI Cybersecurity Assistant.

Your responsibilities include:

1. Explaining software vulnerabilities clearly.
2. Explaining OWASP security concepts.
3. Identifying security risks in source code.
4. Providing secure coding recommendations.
5. Explaining SQL Injection, XSS, CSRF, authentication,
   authorization, API security and other cybersecurity topics.
6. Using provided scanner and vulnerability context when available.

Rules:

- Give technically accurate answers.
- Be concise but useful.
- Prefer defensive and secure coding guidance.
- When scanner context is provided, refer specifically to it.
- Explain vulnerability severity and potential impact when relevant.
- Do not claim a vulnerability exists unless it is supported by
  the provided context or code.
- If information is missing, clearly say what additional
  information is needed.
"""


# ============================================================
# HELPER - SAFE STRING
# ============================================================

def safe_string(
    value,
    default=""
):

    if value is None:
        return default

    try:
        return str(value)
    except Exception:
        return default


# ============================================================
# HELPER - LIMIT TEXT
# ============================================================

def limit_text(
    value,
    max_length=2000
):

    if value is None:
        return ""

    value = safe_string(value)

    if len(value) > max_length:

        return (
            value[:max_length]
            + "\n[Content truncated]"
        )

    return value


# ============================================================
# HELPER - REQUEST JSON
# ============================================================

def get_request_json():

    data = request.get_json(
        silent=True
    )

    if not isinstance(
        data,
        dict
    ):

        return {}

    return data


# ============================================================
# HELPER - USER ID
# ============================================================

def get_user_id():

    current_user = get_jwt_identity()

    if current_user:

        return str(
            current_user
        )

    return "guest_user"


# ============================================================
# HELPER - CONVERSATION TITLE
# ============================================================

def generate_title(
    message
):

    message = safe_string(
        message
    ).strip()

    if not message:

        return "New Conversation"

    if len(message) > 45:

        return (
            message[:45]
            + "..."
        )

    return message


# ============================================================
# HELPER - CONVERSATION ID
# ============================================================

def normalize_conversation_id(
    conversation
):

    if conversation is None:

        return None

    if isinstance(
        conversation,
        str
    ):

        return conversation

    if isinstance(
        conversation,
        dict
    ):

        conversation_id = (

            conversation.get(
                "_id"
            )

            or

            conversation.get(
                "id"
            )

            or

            conversation.get(
                "conversation_id"
            )
        )

        if conversation_id is not None:

            return str(
                conversation_id
            )

    return None


# ============================================================
# HELPER - CLEAN CHAT HISTORY
# ============================================================

def clean_chat_history(
    chat_history,
    limit=MAX_CHAT_HISTORY
):

    if not isinstance(
        chat_history,
        list
    ):

        return []

    cleaned_history = []

    for item in chat_history[-limit:]:

        if not isinstance(
            item,
            dict
        ):

            continue

        role = safe_string(
            item.get(
                "role",
                ""
            )
        ).strip().lower()

        content = safe_string(
            item.get(
                "content",
                ""
            )
        ).strip()

        if role not in [
            "user",
            "assistant"
        ]:

            continue

        if not content:

            continue

        cleaned_history.append({

            "role":
                role,

            "content":
                limit_text(
                    content,
                    MAX_HISTORY_MESSAGE_LENGTH
                )

        })

    return cleaned_history


# ============================================================
# HELPER - CLEAN SCAN CONTEXT
# ============================================================

def clean_scan_context(
    scan_context
):

    if not isinstance(
        scan_context,
        dict
    ):

        return None

    vulnerabilities = scan_context.get(
        "vulnerabilities",
        []
    )

    cleaned_vulnerabilities = []

    if isinstance(
        vulnerabilities,
        list
    ):

        for vulnerability in vulnerabilities[
            :MAX_VULNERABILITIES
        ]:

            if not isinstance(
                vulnerability,
                dict
            ):

                continue

            vulnerability_type = (

                vulnerability.get(
                    "type"
                )

                or

                vulnerability.get(
                    "title"
                )

                or

                "Unknown"
            )

            severity = (

                vulnerability.get(
                    "severity"
                )

                or

                "Unknown"
            )

            description = (

                vulnerability.get(
                    "description"
                )

                or

                ""
            )

            line = vulnerability.get(
                "line"
            )

            cwe = (

                vulnerability.get(
                    "cwe"
                )

                or

                "Unknown"
            )

            cleaned_vulnerabilities.append({

                "type":
                    limit_text(
                        vulnerability_type,
                        500
                    ),

                "severity":
                    limit_text(
                        severity,
                        100
                    ),

                "description":
                    limit_text(
                        description,
                        MAX_DESCRIPTION_LENGTH
                    ),

                "line":
                    (
                        line
                        if line is not None
                        else "Unknown"
                    ),

                "cwe":
                    limit_text(
                        cwe,
                        100
                    )
            })

    return {

        "language":
            limit_text(
                scan_context.get(
                    "language",
                    ""
                ),
                100
            ),

        "riskScore":
            scan_context.get(
                "riskScore",
                scan_context.get(
                    "risk_score",
                    0
                )
            ),

        "totalIssues":
            scan_context.get(
                "totalIssues",
                scan_context.get(
                    "total_issues",
                    0
                )
            ),

        "grade":
            limit_text(
                scan_context.get(
                    "grade",
                    ""
                ),
                50
            ),

        "vulnerabilities":
            cleaned_vulnerabilities
    }


# ============================================================
# HELPER - CLEAN VULNERABILITY CONTEXT
# ============================================================

def clean_vulnerability_context(
    vulnerability_context
):

    if not isinstance(
        vulnerability_context,
        dict
    ):

        return None

    vulnerability_type = (

        vulnerability_context.get(
            "type"
        )

        or

        vulnerability_context.get(
            "title"
        )

        or

        "Unknown"
    )

    severity = (

        vulnerability_context.get(
            "severity"
        )

        or

        "Unknown"
    )

    description = (

        vulnerability_context.get(
            "description"
        )

        or

        ""
    )

    line = vulnerability_context.get(
        "line"
    )

    cwe = (

        vulnerability_context.get(
            "cwe"
        )

        or

        "Unknown"
    )

    code = (

        vulnerability_context.get(
            "code"
        )

        or

        vulnerability_context.get(
            "snippet"
        )

        or

        ""
    )

    vulnerability_id = (
        vulnerability_context.get(
            "id"
        )
    )

    language = (
        vulnerability_context.get(
            "language"
        )
    )

    cleaned = {

        "type":
            limit_text(
                vulnerability_type,
                500
            ),

        "severity":
            limit_text(
                severity,
                100
            ),

        "description":
            limit_text(
                description,
                MAX_DESCRIPTION_LENGTH
            ),

        "line":
            (
                line
                if line is not None
                else "Unknown"
            ),

        "cwe":
            limit_text(
                cwe,
                100
            ),

        "code":
            limit_text(
                code,
                MAX_CODE_LENGTH
            )
    }

    if vulnerability_id is not None:

        cleaned["id"] = limit_text(
            vulnerability_id,
            200
        )

    if language is not None:

        cleaned["language"] = limit_text(
            language,
            100
        )

    return cleaned


# ============================================================
# HELPER - BUILD OLLAMA CONTEXT
# ============================================================

def build_context_text(
    chat_history,
    scan_context,
    vulnerability_context
):

    sections = []

    # --------------------------------------------------------
    # SYSTEM
    # --------------------------------------------------------

    sections.append(
        "SYSTEM INSTRUCTIONS:\n"
        + SYSTEM_PROMPT.strip()
    )

    # --------------------------------------------------------
    # HISTORY
    # --------------------------------------------------------

    if chat_history:

        history_lines = []

        for item in chat_history:

            role = (
                "User"
                if item["role"] == "user"
                else "Assistant"
            )

            history_lines.append(
                f"{role}: {item['content']}"
            )

        sections.append(
            "CONVERSATION HISTORY:\n"
            + "\n".join(
                history_lines
            )
        )

    # --------------------------------------------------------
    # SCAN CONTEXT
    # --------------------------------------------------------

    if scan_context:

        scan_lines = []

        language = scan_context.get(
            "language",
            ""
        )

        risk_score = scan_context.get(
            "riskScore",
            ""
        )

        total_issues = scan_context.get(
            "totalIssues",
            ""
        )

        grade = scan_context.get(
            "grade",
            ""
        )

        if language:

            scan_lines.append(
                f"Language: {language}"
            )

        if risk_score != "":

            scan_lines.append(
                f"Risk Score: {risk_score}/100"
            )

        if total_issues != "":

            scan_lines.append(
                f"Total Issues: {total_issues}"
            )

        if grade:

            scan_lines.append(
                f"Security Grade: {grade}"
            )

        vulnerabilities = scan_context.get(
            "vulnerabilities",
            []
        )

        if vulnerabilities:

            scan_lines.append(
                "\nDetected Vulnerabilities:"
            )

            for index, vulnerability in enumerate(
                vulnerabilities,
                start=1
            ):

                scan_lines.append(
                    f"{index}. "
                    f"Type: "
                    f"{vulnerability.get('type', '')}"
                )

                scan_lines.append(
                    f"   Severity: "
                    f"{vulnerability.get('severity', '')}"
                )

                scan_lines.append(
                    f"   Description: "
                    f"{vulnerability.get('description', '')}"
                )

                if vulnerability.get(
                    "line"
                ) not in [
                    None,
                    "",
                    "Unknown"
                ]:

                    scan_lines.append(
                        f"   Line: "
                        f"{vulnerability.get('line')}"
                    )

                if vulnerability.get(
                    "cwe"
                ) not in [
                    None,
                    "",
                    "Unknown"
                ]:

                    scan_lines.append(
                        f"   CWE: "
                        f"{vulnerability.get('cwe')}"
                    )

        if scan_lines:

            sections.append(
                "LATEST SCANNER CONTEXT:\n"
                + "\n".join(
                    scan_lines
                )
            )

    # --------------------------------------------------------
    # SELECTED VULNERABILITY
    # --------------------------------------------------------

    if vulnerability_context:

        vulnerability_lines = []

        for key, value in vulnerability_context.items():

            if value in [
                "",
                None
            ]:

                continue

            readable_key = (
                key
                .replace(
                    "_",
                    " "
                )
                .title()
            )

            vulnerability_lines.append(
                f"{readable_key}: {value}"
            )

        if vulnerability_lines:

            sections.append(
                "SELECTED VULNERABILITY CONTEXT:\n"
                + "\n".join(
                    vulnerability_lines
                )
            )

    return "\n\n".join(
        sections
    )


# ============================================================
# HELPER - DIRECT OLLAMA CALL
# ============================================================

def call_ollama(
    prompt
):

    payload = {

        "model":
            MODEL_NAME,

        "prompt":
            prompt,

        "stream":
            False,

        "options": {

            "temperature":
                0.2,

            "num_predict":
                800
        }
    }

    try:

        response = requests.post(

            OLLAMA_URL,

            json=payload,

            timeout=AI_TIMEOUT
        )

    except requests.exceptions.ConnectionError:

        raise ConnectionError(
            "Cannot connect to Ollama. "
            "Make sure Ollama is running."
        )

    except requests.exceptions.Timeout:

        raise TimeoutError(
            "The local AI model took too long "
            "to respond."
        )

    if response.status_code != 200:

        raise RuntimeError(
            f"Ollama returned HTTP "
            f"{response.status_code}: "
            f"{response.text[:2000]}"
        )

    try:

        response_data = response.json()

    except ValueError:

        raise RuntimeError(
            "Ollama returned an invalid response."
        )

    ai_response = (

        response_data.get(
            "response"
        )

        or

        response_data.get(
            "message"
        )

        or

        response_data.get(
            "content"
        )

        or

        ""
    )

    ai_response = safe_string(
        ai_response
    ).strip()

    if not ai_response:

        raise RuntimeError(
            "The AI model returned an empty response."
        )

    return ai_response


# ============================================================
# HELPER - EXTRACT AI RESPONSE
# ============================================================

def extract_ai_response(
    data
):

    if not isinstance(
        data,
        dict
    ):

        return ""

    response = (

        data.get(
            "response"
        )

        or

        data.get(
            "answer"
        )

        or

        data.get(
            "reply"
        )

        or

        data.get(
            "content"
        )

        or

        data.get(
            "chat"
        )

        or

        data.get(
            "message"
        )

        or

        ""
    )

    return safe_string(
        response
    ).strip()


# ============================================================
# HELPER - SERVICE RESULT
# ============================================================

def handle_ai_service_result(
    result,
    default_message="AI request failed."
):

    if not isinstance(
        result,
        dict
    ):

        return jsonify({

            "success":
                False,

            "message":
                default_message

        }), 500

    if not result.get(
        "success",
        False
    ):

        message = (

            result.get(
                "message"
            )

            or

            default_message
        )

        message_lower = str(
            message
        ).lower()

        if (
            "connect" in message_lower
            or
            "connection" in message_lower
            or
            "ollama" in message_lower
        ):

            return jsonify({

                "success":
                    False,

                "message":
                    message

            }), 503

        if (
            "timeout" in message_lower
            or
            "timed out" in message_lower
        ):

            return jsonify({

                "success":
                    False,

                "message":
                    message

            }), 504

        return jsonify({

            "success":
                False,

            "message":
                message

        }), 500

    return jsonify(
        result
    ), 200


# ============================================================
# HELPER - READ FASTAPI NDJSON STREAM
# ============================================================

def consume_fastapi_stream(
    response
):

    complete_response = []

    final_data = {}

    for line in response.iter_lines(
        decode_unicode=True
    ):

        if not line:
            continue

        try:

            data = json.loads(
                line
            )

        except ValueError:

            continue

        if data.get(
            "success"
        ) is False:

            return {

                "success":
                    False,

                "message":
                    (
                        data.get(
                            "error"
                        )
                        or
                        data.get(
                            "message"
                        )
                        or
                        "FastAPI AI request failed."
                    )
            }

        chunk = data.get(
            "chunk"
        )

        if chunk:

            complete_response.append(
                safe_string(chunk)
            )

        if data.get(
            "done"
        ) is True:

            final_data = data

    ai_response = "".join(
        complete_response
    ).strip()

    if not ai_response:

        return {

            "success":
                False,

            "message":
                "FastAPI did not return an AI response."
        }

    return {

        "success":
            True,

        "response":
            ai_response,

        "model":
            final_data.get(
                "model",
                MODEL_NAME
            ),

        "context_used":
            final_data.get(
                "context_used",
                {}
            )
    }


# ============================================================
# AI HEALTH
# GET /ai/health
# ============================================================

@ai_bp.route(
    "/health",
    methods=["GET"]
)
def ai_health():

    try:

        tags_url = OLLAMA_URL.replace(
            "/api/generate",
            "/api/tags"
        )

        response = requests.get(

            tags_url,

            timeout=(
                5,
                10
            )
        )

        if response.status_code != 200:

            return jsonify({

                "success":
                    False,

                "message":
                    "Ollama is not available",

                "model":
                    MODEL_NAME

            }), 503

        data = response.json()

        available_models = []

        for model in data.get(
            "models",
            []
        ):

            model_name = model.get(
                "name",
                ""
            )

            if model_name:

                available_models.append(
                    model_name
                )

        return jsonify({

            "success":
                True,

            "message":
                "AI service is running",

            "model":
                MODEL_NAME,

            "available_models":
                available_models

        }), 200

    except requests.exceptions.ConnectionError:

        return jsonify({

            "success":
                False,

            "message":
                "Cannot connect to Ollama",

            "model":
                MODEL_NAME,

            "solution":
                "Run: ollama serve"

        }), 503

    except requests.exceptions.Timeout:

        return jsonify({

            "success":
                False,

            "message":
                "Ollama health check timed out."

        }), 504

    except Exception as error:

        return jsonify({

            "success":
                False,

            "message":
                "AI health check failed",

            "error":
                str(error)

        }), 500


# ============================================================
# MAIN AI CHAT - STREAMING
# POST /ai/chat
#
# React
#   ↓
# Flask /ai/chat
#   ↓
# FastAPI /chat
#   ↓
# Ollama stream=True
# ============================================================

@ai_bp.route(
    "/chat",
    methods=[
        "POST",
        "OPTIONS"
    ]
)
@jwt_required(optional=True)
def chat():

    if request.method == "OPTIONS":

        return "", 200

    try:

        print("\n")
        print("=" * 60)
        print("AI CYBERSECURITY CHAT - STREAMING")
        print("=" * 60)

        data = get_request_json()

        if not data:

            return jsonify({

                "success":
                    False,

                "message":
                    "Request body is required."

            }), 400

        # ====================================================
        # MESSAGE
        # ====================================================

        message = safe_string(
            data.get(
                "message",
                ""
            )
        ).strip()

        if not message:

            return jsonify({

                "success":
                    False,

                "message":
                    "Message cannot be empty."

            }), 400

        if len(message) > MAX_MESSAGE_LENGTH:

            return jsonify({

                "success":
                    False,

                "message":
                    "Message is too long."

            }), 400

        # ====================================================
        # USER
        # ====================================================

        user_id = get_user_id()

        # ====================================================
        # CONVERSATION
        # ====================================================

        conversation_id = data.get(
            "conversation_id"
        )

        conversation = None

        # ====================================================
        # SCAN CONTEXT
        # ====================================================

        scan_context = clean_scan_context(
            data.get(
                "scan_context"
            )
        )

        # ====================================================
        # VULNERABILITY CONTEXT
        # ====================================================

        vulnerability_context = data.get(
            "vulnerability_context"
        )

        if vulnerability_context is None:

            vulnerability_context = data.get(
                "selected_vulnerability"
            )

        vulnerability_context = (
            clean_vulnerability_context(
                vulnerability_context
            )
        )

        # ====================================================
        # EXISTING CONVERSATION
        # ====================================================

        if conversation_id:

            conversation = get_conversation(

                conversation_id,

                user_id

            )

            if not conversation:

                return jsonify({

                    "success":
                        False,

                    "message":
                        "Conversation not found",

                    "conversation_id":
                        str(
                            conversation_id
                        )

                }), 404

        # ====================================================
        # CREATE NEW CONVERSATION
        # ====================================================

        if conversation is None:

            created = create_conversation(

                user_id=user_id,

                title=generate_title(
                    message
                ),

                scan_context=scan_context,

                vulnerability_context=(
                    vulnerability_context
                )
            )

            conversation_id = (
                normalize_conversation_id(
                    created
                )
            )

            if not conversation_id:

                return jsonify({

                    "success":
                        False,

                    "message":
                        "Failed to create conversation"

                }), 500

            if isinstance(
                created,
                dict
            ):

                conversation = created

            else:

                conversation = {

                    "_id":
                        conversation_id,

                    "messages":
                        [],

                    "scan_context":
                        scan_context,

                    "vulnerability_context":
                        vulnerability_context
                }

        # ====================================================
        # UPDATE EXISTING CONTEXT
        # ====================================================

        else:

            if (
                scan_context is not None
                or
                vulnerability_context is not None
            ):

                update_conversation_context(

                    conversation_id=(
                        conversation_id
                    ),

                    scan_context=(
                        scan_context
                    ),

                    vulnerability_context=(
                        vulnerability_context
                    )
                )

                updated_conversation = (
                    get_conversation(

                        conversation_id,

                        user_id

                    )
                )

                if updated_conversation:

                    conversation = (
                        updated_conversation
                    )

        # ====================================================
        # STORED CONTEXT
        # ====================================================

        stored_scan_context = (

            scan_context

            if scan_context is not None

            else

            conversation.get(
                "scan_context"
            )
        )

        stored_vulnerability_context = (

            vulnerability_context

            if vulnerability_context is not None

            else

            (
                conversation.get(
                    "vulnerability_context"
                )

                or

                conversation.get(
                    "selected_vulnerability"
                )
            )
        )

        stored_scan_context = (
            clean_scan_context(
                stored_scan_context
            )
        )

        stored_vulnerability_context = (
            clean_vulnerability_context(
                stored_vulnerability_context
            )
        )

        # ====================================================
        # CHAT HISTORY
        # ====================================================

        stored_messages = conversation.get(
            "messages",
            []
        )

        chat_history = clean_chat_history(
            stored_messages
        )

        print(
            "User:",
            user_id
        )

        print(
            "Conversation:",
            conversation_id
        )

        print(
            "History:",
            len(chat_history)
        )

        print(
            "Scan Context:",
            stored_scan_context is not None
        )

        print(
            "Vulnerability Context:",
            stored_vulnerability_context is not None
        )

        # ====================================================
        # SAVE USER MESSAGE
        # ====================================================

        user_message_saved = add_message(

            conversation_id=(
                conversation_id
            ),

            role="user",

            content=message,

            metadata={

                "scan_context":
                    (
                        stored_scan_context
                        is not None
                    ),

                "vulnerability_context":
                    (
                        stored_vulnerability_context
                        is not None
                    )
            }
        )

        # ====================================================
        # FASTAPI PAYLOAD
        # ====================================================

        fastapi_payload = {

            "message":
                message,

            "chat_history":
                chat_history,

            "scan_context":
                stored_scan_context,

            "vulnerability_context":
                stored_vulnerability_context,

            "selected_vulnerability":
                stored_vulnerability_context
        }

        print(
            "\nForwarding AI request to FastAPI..."
        )

        # ====================================================
        # FASTAPI STREAM REQUEST
        # ====================================================

        fastapi_response = requests.post(

            f"{FASTAPI_URL}/chat",

            json=fastapi_payload,

            headers={
                "Content-Type":
                    "application/json"
            },

            stream=True,

            timeout=AI_TIMEOUT
        )

        print(
            "FastAPI Status:",
            fastapi_response.status_code
        )

        # ====================================================
        # FASTAPI ERROR
        # ====================================================

        if fastapi_response.status_code != 200:

            error_text = (
                fastapi_response.text[:2000]
            )

            fastapi_response.close()

            return jsonify({

                "success":
                    False,

                "message":
                    "FastAPI AI service returned an error.",

                "fastapi_status":
                    fastapi_response.status_code,

                "error":
                    error_text

            }), 502

        # ====================================================
        # STREAM GENERATOR
        # ====================================================

        def generate_stream():

            full_response = []

            assistant_message_saved = False

            try:

                for line in fastapi_response.iter_lines(
                    decode_unicode=True
                ):

                    if not line:

                        continue

                    try:

                        chunk_data = json.loads(
                            line
                        )

                    except ValueError:

                        print(
                            "Invalid FastAPI stream line:",
                            line
                        )

                        continue

                    # ========================================
                    # FASTAPI ERROR
                    # ========================================

                    if (
                        chunk_data.get(
                            "success"
                        ) is False
                    ):

                        error_message = (

                            chunk_data.get(
                                "error"
                            )

                            or

                            chunk_data.get(
                                "message"
                            )

                            or

                            "AI streaming failed."
                        )

                        yield (
                            json.dumps({

                                "success":
                                    False,

                                "error":
                                    error_message

                            }, ensure_ascii=False)
                            + "\n"
                        )

                        return

                    # ========================================
                    # AI CHUNK
                    # ========================================

                    chunk = chunk_data.get(
                        "chunk"
                    )

                    if chunk:

                        chunk = safe_string(
                            chunk
                        )

                        full_response.append(
                            chunk
                        )

                        # Forward immediately
                        yield (
                            json.dumps({

                                "success":
                                    True,

                                "chunk":
                                    chunk

                            }, ensure_ascii=False)
                            + "\n"
                        )

                    # ========================================
                    # STREAM DONE
                    # ========================================

                    if (
                        chunk_data.get(
                            "done"
                        ) is True
                    ):

                        complete_response = (
                            "".join(
                                full_response
                            ).strip()
                        )

                        # ====================================
                        # SAVE COMPLETE AI RESPONSE
                        # ====================================

                        if complete_response:

                            assistant_message_saved = bool(

                                add_message(

                                    conversation_id=(
                                        conversation_id
                                    ),

                                    role="assistant",

                                    content=(
                                        complete_response
                                    ),

                                    metadata={

                                        "model":
                                            MODEL_NAME,

                                        "streaming":
                                            True
                                    }
                                )
                            )

                        print(
                            "\nAI STREAM COMPLETED"
                        )

                        print(
                            "Response Length:",
                            len(
                                complete_response
                            )
                        )

                        print(
                            "Assistant Saved:",
                            assistant_message_saved
                        )

                        # ====================================
                        # FINAL DATA
                        # ====================================

                        yield (
                            json.dumps({

                                "success":
                                    True,

                                "done":
                                    True,

                                "conversation_id":
                                    str(
                                        conversation_id
                                    ),

                                "model":
                                    MODEL_NAME,

                                "context_used": {

                                    "scan_context":
                                        (
                                            stored_scan_context
                                            is not None
                                        ),

                                    "vulnerability_context":
                                        (
                                            stored_vulnerability_context
                                            is not None
                                        ),

                                    "selected_vulnerability":
                                        (
                                            stored_vulnerability_context
                                            is not None
                                        ),

                                    "history_messages":
                                        len(
                                            chat_history
                                        )
                                },

                                "saved": {

                                    "user_message":
                                        bool(
                                            user_message_saved
                                        ),

                                    "assistant_message":
                                        bool(
                                            assistant_message_saved
                                        )
                                }

                            }, ensure_ascii=False)
                            + "\n"
                        )

            except GeneratorExit:

                print(
                    "Client disconnected from AI stream."
                )

            except Exception as error:

                print(
                    "Flask AI Streaming Error:",
                    str(error)
                )

                yield (
                    json.dumps({

                        "success":
                            False,

                        "error":
                            "AI streaming failed."

                    }, ensure_ascii=False)
                    + "\n"
                )

            finally:

                try:

                    fastapi_response.close()

                except Exception:

                    pass

        # ====================================================
        # RETURN STREAM
        # ====================================================

        return Response(

            stream_with_context(
                generate_stream()
            ),

            mimetype=(
                "application/x-ndjson"
            ),

            headers={

                "Cache-Control":
                    "no-cache, no-store, must-revalidate",

                "Pragma":
                    "no-cache",

                "Expires":
                    "0",

                "X-Accel-Buffering":
                    "no",

                "Connection":
                    "keep-alive"
            }
        )

    # ========================================================
    # ERRORS
    # ========================================================

    except requests.exceptions.ConnectTimeout:

        return jsonify({

            "success":
                False,

            "message":
                "Unable to connect to FastAPI AI service."

        }), 504

    except requests.exceptions.ReadTimeout:

        return jsonify({

            "success":
                False,

            "message":
                (
                    "FastAPI AI service took too long "
                    "to respond."
                )

        }), 504

    except requests.exceptions.ConnectionError as error:

        print(
            "AI Chat Connection Error:",
            str(error)
        )

        return jsonify({

            "success":
                False,

            "message":
                (
                    "Cannot connect to FastAPI AI service. "
                    "Make sure FastAPI is running on port 8000."
                ),

            "error":
                str(error)

        }), 502

    except requests.exceptions.Timeout:

        return jsonify({

            "success":
                False,

            "message":
                "AI request timed out."

        }), 504

    except Exception as error:

        print(
            "AI Chat Error:",
            str(error)
        )

        return jsonify({

            "success":
                False,

            "message":
                "Failed to generate AI response.",

            "error":
                str(error)

        }), 500


# ============================================================
# DIRECT OLLAMA CHAT
# POST /ai/ollama-chat
# ============================================================

@ai_bp.route(
    "/ollama-chat",
    methods=[
        "POST",
        "OPTIONS"
    ]
)
@jwt_required(optional=True)
def ollama_chat():

    if request.method == "OPTIONS":

        return "", 200

    try:

        data = get_request_json()

        if not data:

            return jsonify({

                "success":
                    False,

                "message":
                    "Request body is required."

            }), 400

        message = safe_string(
            data.get(
                "message",
                ""
            )
        ).strip()

        if not message:

            return jsonify({

                "success":
                    False,

                "message":
                    "Message is required."

            }), 400

        if len(message) > MAX_MESSAGE_LENGTH:

            return jsonify({

                "success":
                    False,

                "message":
                    "Message is too long."

            }), 400

        chat_history = clean_chat_history(
            data.get(
                "chat_history",
                []
            )
        )

        scan_context = clean_scan_context(
            data.get(
                "scan_context"
            )
        )

        vulnerability_context = data.get(
            "vulnerability_context"
        )

        if vulnerability_context is None:

            vulnerability_context = data.get(
                "selected_vulnerability"
            )

        vulnerability_context = (
            clean_vulnerability_context(
                vulnerability_context
            )
        )

        context_text = build_context_text(

            chat_history,

            scan_context,

            vulnerability_context
        )

        final_prompt = f"""
{context_text}

CURRENT USER QUESTION:

{message}

Provide a helpful cybersecurity answer.
"""

        ai_response = call_ollama(
            final_prompt
        )

        return jsonify({

            "success":
                True,

            "response":
                ai_response,

            "model":
                MODEL_NAME,

            "context_used": {

                "scan_context":
                    scan_context is not None,

                "vulnerability_context":
                    vulnerability_context is not None,

                "history_messages":
                    len(chat_history)
            }

        }), 200

    except ConnectionError as error:

        return jsonify({

            "success":
                False,

            "message":
                str(error)

        }), 503

    except TimeoutError as error:

        return jsonify({

            "success":
                False,

            "message":
                str(error)

        }), 504

    except Exception as error:

        print(
            "Ollama Chat Error:",
            str(error)
        )

        return jsonify({

            "success":
                False,

            "message":
                "Failed to generate AI response.",

            "error":
                str(error)

        }), 500


# ============================================================
# VULNERABILITY EXPLANATION
# POST /ai/explain-vulnerability
# ============================================================

@ai_bp.route(
    "/explain-vulnerability",
    methods=["POST"]
)
@jwt_required()
def explain_vulnerability():

    try:

        data = get_request_json()

        if not data:

            return jsonify({

                "success":
                    False,

                "message":
                    "Request body is required."

            }), 400

        vulnerability = data.get(
            "vulnerability"
        )

        if not vulnerability:

            return jsonify({

                "success":
                    False,

                "message":
                    "Vulnerability information is required."

            }), 400

        if not isinstance(
            vulnerability,
            dict
        ):

            return jsonify({

                "success":
                    False,

                "message":
                    "Vulnerability must be an object."

            }), 400

        language = safe_string(
            data.get(
                "language"
            )
        ).strip()

        code = limit_text(

            data.get(
                "code"
            ) or "",

            MAX_CODE_LENGTH
        )

        result = get_vulnerability_explanation(

            vulnerability=vulnerability,

            language=language,

            code=code
        )

        return handle_ai_service_result(

            result,

            "Failed to generate AI explanation."
        )

    except requests.exceptions.ConnectionError:

        return jsonify({

            "success":
                False,

            "message":
                "Unable to connect to AI service."

        }), 503

    except requests.exceptions.Timeout:

        return jsonify({

            "success":
                False,

            "message":
                "AI explanation request timed out."

        }), 504

    except Exception as error:

        print(
            "Explain Vulnerability Error:",
            str(error)
        )

        return jsonify({

            "success":
                False,

            "message":
                "Internal server error.",

            "error":
                str(error)

        }), 500


# ============================================================
# VULNERABILITY SECURE FIX
# POST /ai/vulnerability-fix
# ============================================================

@ai_bp.route(
    "/vulnerability-fix",
    methods=["POST"]
)
@jwt_required()
def vulnerability_fix():

    try:

        data = get_request_json()

        if not data:

            return jsonify({

                "success":
                    False,

                "message":
                    "Request body is required."

            }), 400

        vulnerability = data.get(
            "vulnerability"
        )

        code = data.get(
            "code",
            ""
        )

        language = safe_string(
            data.get(
                "language"
            )
        ).strip()

        if not vulnerability:

            return jsonify({

                "success":
                    False,

                "message":
                    "Vulnerability information is required."

            }), 400

        if not isinstance(
            vulnerability,
            dict
        ):

            return jsonify({

                "success":
                    False,

                "message":
                    "Vulnerability must be an object."

            }), 400

        if not code:

            return jsonify({

                "success":
                    False,

                "message":
                    "Source code is required."

            }), 400

        if not language:

            return jsonify({

                "success":
                    False,

                "message":
                    "Programming language is required."

            }), 400

        code = limit_text(
            code,
            MAX_CODE_LENGTH
        )

        result = get_vulnerability_secure_fix(

            vulnerability=vulnerability,

            code=code,

            language=language
        )

        return handle_ai_service_result(

            result,

            "Failed to generate secure fix."
        )

    except requests.exceptions.ConnectionError:

        return jsonify({

            "success":
                False,

            "message":
                "Unable to connect to AI service."

        }), 503

    except requests.exceptions.Timeout:

        return jsonify({

            "success":
                False,

            "message":
                "AI secure fix request timed out."

        }), 504

    except Exception as error:

        print(
            "Vulnerability Fix Error:",
            str(error)
        )

        return jsonify({

            "success":
                False,

            "message":
                "Internal server error.",

            "error":
                str(error)

        }), 500


# ============================================================
# GENERAL AI EXPLANATION
# POST /ai/explain
# ============================================================

@ai_bp.route(
    "/explain",
    methods=["POST"]
)
@jwt_required()
def explain():

    try:

        data = get_request_json()

        if not data:

            return jsonify({

                "success":
                    False,

                "message":
                    "Request body is required."

            }), 400

        vulnerability = data.get(
            "vulnerability"
        )

        if not vulnerability:

            return jsonify({

                "success":
                    False,

                "message":
                    "Vulnerability is required."

            }), 400

        if not isinstance(
            vulnerability,
            dict
        ):

            return jsonify({

                "success":
                    False,

                "message":
                    "Vulnerability must be an object."

            }), 400

        result = get_ai_explanation(
            vulnerability
        )

        return handle_ai_service_result(

            result,

            "AI explanation failed."
        )

    except requests.exceptions.ConnectionError:

        return jsonify({

            "success":
                False,

            "message":
                "Unable to connect to AI service."

        }), 503

    except requests.exceptions.Timeout:

        return jsonify({

            "success":
                False,

            "message":
                "AI explanation request timed out."

        }), 504

    except Exception as error:

        print(
            "AI Explanation Error:",
            str(error)
        )

        return jsonify({

            "success":
                False,

            "message":
                "AI explanation failed.",

            "error":
                str(error)

        }), 500


# ============================================================
# GENERAL SECURE FIX
# POST /ai/fix
# ============================================================

@ai_bp.route(
    "/fix",
    methods=[
        "POST",
        "OPTIONS"
    ]
)
@jwt_required(optional=True)
def generate_secure_fix():

    if request.method == "OPTIONS":

        return "", 200

    try:

        data = get_request_json()

        if not data:

            return jsonify({

                "success":
                    False,

                "message":
                    "Request body is required."

            }), 400

        code = safe_string(
            data.get(
                "code",
                ""
            )
        ).strip()

        language = safe_string(
            data.get(
                "language",
                ""
            )
        ).strip()

        if not code:

            return jsonify({

                "success":
                    False,

                "message":
                    "Source code is required."

            }), 400

        if not language:

            return jsonify({

                "success":
                    False,

                "message":
                    "Programming language is required."

            }), 400

        if len(code) > MAX_CODE_LENGTH:

            return jsonify({

                "success":
                    False,

                "message":
                    "Source code is too large."

            }), 400

        response = requests.post(

            f"{FASTAPI_URL}/fix",

            json={

                "code":
                    code,

                "language":
                    language,

                "fast_mode":
                    True
            },

            headers={

                "Content-Type":
                    "application/json"
            },

            timeout=AI_TIMEOUT
        )

        if response.status_code != 200:

            return jsonify({

                "success":
                    False,

                "message":
                    "AI service returned an error.",

                "fastapi_status":
                    response.status_code,

                "error":
                    response.text[:2000]

            }), 502

        try:

            fastapi_data = response.json()

        except ValueError:

            return jsonify({

                "success":
                    False,

                "message":
                    "FastAPI returned an invalid response."

            }), 502

        if fastapi_data.get(
            "success"
        ) is False:

            return jsonify({

                "success":
                    False,

                "message": (

                    fastapi_data.get(
                        "message"
                    )

                    or

                    fastapi_data.get(
                        "detail"
                    )

                    or

                    "AI secure fix failed."
                )

            }), 502

        fix = (

            fastapi_data.get(
                "fix"
            )

            or

            fastapi_data.get(
                "secure_fix"
            )

            or

            fastapi_data.get(
                "response"
            )

            or

            fastapi_data.get(
                "answer"
            )

            or

            fastapi_data.get(
                "content"
            )
        )

        if not fix:

            return jsonify({

                "success":
                    False,

                "message":
                    "AI did not generate a secure fix."

            }), 502

        return jsonify({

            "success":
                True,

            "message":
                "Secure fix generated successfully.",

            "fix":
                safe_string(
                    fix
                ).strip(),

            "model":
                fastapi_data.get(
                    "model",
                    MODEL_NAME
                )

        }), 200

    except requests.exceptions.ConnectTimeout:

        return jsonify({

            "success":
                False,

            "message":
                "Unable to connect to AI service."

        }), 504

    except requests.exceptions.ReadTimeout:

        return jsonify({

            "success":
                False,

            "message":
                "AI secure fix request timed out."

        }), 504

    except requests.exceptions.ConnectionError as error:

        return jsonify({

            "success":
                False,

            "message":
                (
                    "Cannot connect to FastAPI AI service. "
                    "Make sure FastAPI is running on port 8000."
                ),

            "error":
                str(error)

        }), 502

    except requests.exceptions.Timeout:

        return jsonify({

            "success":
                False,

            "message":
                "AI secure fix request timed out."

        }), 504

    except Exception as error:

        print(
            "AI Secure Fix Error:",
            str(error)
        )

        return jsonify({

            "success":
                False,

            "message":
                "Failed to generate secure fix.",

            "error":
                str(error)

        }), 500


# ============================================================
# DIRECT FASTAPI CHAT
# POST /ai/fastapi-chat
#
# This endpoint consumes FastAPI streaming internally and
# returns the final response as normal JSON.
# ============================================================

@ai_bp.route(
    "/fastapi-chat",
    methods=[
        "POST",
        "OPTIONS"
    ]
)
@jwt_required(optional=True)
def fastapi_chat():

    if request.method == "OPTIONS":

        return "", 200

    try:

        data = get_request_json()

        if not data:

            return jsonify({

                "success":
                    False,

                "message":
                    "Request body is required."

            }), 400

        message = safe_string(
            data.get(
                "message",
                ""
            )
        ).strip()

        if not message:

            return jsonify({

                "success":
                    False,

                "message":
                    "Message is required."

            }), 400

        if len(message) > MAX_MESSAGE_LENGTH:

            return jsonify({

                "success":
                    False,

                "message":
                    "Message is too long."

            }), 400

        chat_history = clean_chat_history(
            data.get(
                "chat_history",
                []
            )
        )

        scan_context = clean_scan_context(
            data.get(
                "scan_context"
            )
        )

        vulnerability_context = data.get(
            "vulnerability_context"
        )

        if vulnerability_context is None:

            vulnerability_context = data.get(
                "selected_vulnerability"
            )

        vulnerability_context = (
            clean_vulnerability_context(
                vulnerability_context
            )
        )

        payload = {

            "message":
                message,

            "chat_history":
                chat_history,

            "scan_context":
                scan_context,

            "vulnerability_context":
                vulnerability_context,

            "selected_vulnerability":
                vulnerability_context
        }

        print("\n")
        print("=" * 60)
        print("DIRECT FASTAPI AI CHAT")
        print("=" * 60)

        response = requests.post(

            f"{FASTAPI_URL}/chat",

            json=payload,

            headers={

                "Content-Type":
                    "application/json"
            },

            stream=True,

            timeout=AI_TIMEOUT
        )

        if response.status_code != 200:

            error_text = (
                response.text[:2000]
            )

            response.close()

            return jsonify({

                "success":
                    False,

                "message":
                    "FastAPI AI chat returned an error.",

                "fastapi_status":
                    response.status_code,

                "error":
                    error_text

            }), 502

        try:

            result = consume_fastapi_stream(
                response
            )

        finally:

            response.close()

        if not result.get(
            "success"
        ):

            return jsonify(
                result
            ), 502

        return jsonify({

            "success":
                True,

            "response":
                result.get(
                    "response",
                    ""
                ),

            "model":
                result.get(
                    "model",
                    MODEL_NAME
                ),

            "context_used":
                result.get(
                    "context_used",
                    {

                        "scan_context":
                            scan_context is not None,

                        "vulnerability_context":
                            vulnerability_context is not None,

                        "selected_vulnerability":
                            vulnerability_context is not None,

                        "history_messages":
                            len(chat_history)
                    }
                )

        }), 200

    except requests.exceptions.ConnectTimeout:

        return jsonify({

            "success":
                False,

            "message":
                "AI service connection timed out."

        }), 504

    except requests.exceptions.ReadTimeout:

        return jsonify({

            "success":
                False,

            "message":
                "AI service response timed out."

        }), 504

    except requests.exceptions.ConnectionError as error:

        return jsonify({

            "success":
                False,

            "message":
                (
                    "Cannot connect to FastAPI AI service. "
                    "Make sure FastAPI is running on port 8000."
                ),

            "error":
                str(error)

        }), 502

    except requests.exceptions.Timeout:

        return jsonify({

            "success":
                False,

            "message":
                "AI service request timed out."

        }), 504

    except Exception as error:

        print(
            "FastAPI Chat Error:",
            str(error)
        )

        return jsonify({

            "success":
                False,

            "message":
                "Failed to communicate with FastAPI.",

            "error":
                str(error)

        }), 500


# ============================================================
# OPTIONAL CONVERSATION ENDPOINTS
# ============================================================
#
# These are kept here only if your frontend calls them through
# the AI blueprint.
# ============================================================


# ============================================================
# GET USER CONVERSATIONS
# GET /ai/conversations
# ============================================================

@ai_bp.route(
    "/conversations",
    methods=["GET"]
)
@jwt_required(optional=True)
def conversations():

    try:

        user_id = get_user_id()

        result = get_user_conversations(
            user_id
        )

        if result is None:

            result = []

        return jsonify({

            "success":
                True,

            "conversations":
                result

        }), 200

    except Exception as error:

        print(
            "Conversation List Error:",
            str(error)
        )

        return jsonify({

            "success":
                False,

            "message":
                "Failed to load conversations.",

            "error":
                str(error)

        }), 500


# ============================================================
# GET SINGLE CONVERSATION
# GET /ai/conversations/<conversation_id>
# ============================================================

@ai_bp.route(
    "/conversations/<conversation_id>",
    methods=["GET"]
)
@jwt_required(optional=True)
def conversation_details(
    conversation_id
):

    try:

        user_id = get_user_id()

        conversation = get_conversation(

            conversation_id,

            user_id
        )

        if not conversation:

            return jsonify({

                "success":
                    False,

                "message":
                    "Conversation not found."

            }), 404

        return jsonify({

            "success":
                True,

            "conversation":
                conversation

        }), 200

    except Exception as error:

        print(
            "Conversation Details Error:",
            str(error)
        )

        return jsonify({

            "success":
                False,

            "message":
                "Failed to load conversation.",

            "error":
                str(error)

        }), 500


# ============================================================
# DELETE CONVERSATION
# DELETE /ai/conversations/<conversation_id>
# ============================================================

@ai_bp.route(
    "/conversations/<conversation_id>",
    methods=["DELETE"]
)
@jwt_required(optional=True)
def remove_conversation(
    conversation_id
):

    try:

        user_id = get_user_id()

        result = delete_conversation(

            conversation_id,

            user_id
        )

        if not result:

            return jsonify({

                "success":
                    False,

                "message":
                    "Conversation not found."

            }), 404

        return jsonify({

            "success":
                True,

            "message":
                "Conversation deleted successfully.",

            "conversation_id":
                str(
                    conversation_id
                )

        }), 200

    except Exception as error:

        print(
            "Conversation Delete Error:",
            str(error)
        )

        return jsonify({

            "success":
                False,

            "message":
                "Failed to delete conversation.",

            "error":
                str(error)

        }), 500