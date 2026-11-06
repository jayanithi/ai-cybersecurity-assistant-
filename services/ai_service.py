
import requests

from config import Config


# ============================================================
# AI / OLLAMA CONFIGURATION
# ============================================================

OLLAMA_URL = getattr(
    Config,
    "OLLAMA_URL",
    "http://127.0.0.1:11434/api/generate"
)

MODEL_NAME = getattr(
    Config,
    "OLLAMA_MODEL",
    "llama3"
)


# ============================================================
# FASTAPI CONFIGURATION
# ============================================================

FASTAPI_URL = getattr(
    Config,
    "FASTAPI_URL",
    "http://127.0.0.1:8000"
)


# ============================================================
# HELPER - EXTRACT VULNERABILITY DATA
# ============================================================

def _extract_vulnerability_data(vulnerability):
    """
    Normalize vulnerability data so that all AI functions
    receive the same structure.
    """

    if not isinstance(vulnerability, dict):
        vulnerability = {}

    vulnerability_type = (
        vulnerability.get("type")
        or vulnerability.get("name")
        or vulnerability.get("vulnerability")
        or vulnerability.get("title")
        or "Unknown Vulnerability"
    )

    severity = (
        vulnerability.get("severity")
        or "Unknown"
    )

    cwe = (
        vulnerability.get("cwe")
        or vulnerability.get("CWE")
        or "Unknown"
    )

    description = (
        vulnerability.get("description")
        or "No description available"
    )

    line = (
        vulnerability.get("line")
        if vulnerability.get("line") is not None
        else vulnerability.get("lineNumber")
    )

    if line is None:
        line = "Unknown"

    return {
        "type": str(vulnerability_type),
        "severity": str(severity),
        "cwe": str(cwe),
        "description": str(description),
        "line": str(line)
    }


# ============================================================
# HELPER - CALL OLLAMA
# ============================================================

def _call_ollama(
    prompt,
    timeout=120
):
    """
    Send a prompt to Ollama and return the generated response.

    Returns:
        dict
    """

    try:

        if not prompt or not str(prompt).strip():

            return {
                "success": False,
                "message": "AI prompt is required."
            }


        response = requests.post(

            OLLAMA_URL,

            json={

                "model":
                    MODEL_NAME,

                "prompt":
                    str(prompt),

                "stream":
                    False

            },

            timeout=timeout

        )


        response.raise_for_status()


        data = response.json()


        result = (
            data.get("response")
            or ""
        ).strip()


        if not result:

            return {

                "success":
                    False,

                "message":
                    "AI did not return a response."

            }


        return {

            "success":
                True,

            "response":
                result

        }


    except requests.exceptions.ConnectionError:

        return {

            "success":
                False,

            "message":
                (
                    "Unable to connect to Ollama. "
                    "Make sure Ollama is running."
                )

        }


    except requests.exceptions.Timeout:

        return {

            "success":
                False,

            "message":
                (
                    "AI request timed out. "
                    "Please try again."
                )

        }


    except requests.exceptions.HTTPError as error:

        print(
            "Ollama HTTP Error:",
            str(error)
        )

        return {

            "success":
                False,

            "message":
                "Ollama returned an HTTP error."

        }


    except ValueError as error:

        print(
            "Ollama JSON Error:",
            str(error)
        )

        return {

            "success":
                False,

            "message":
                "Invalid response received from Ollama."

        }


    except Exception as error:

        print(
            "Ollama Error:",
            str(error)
        )

        return {

            "success":
                False,

            "message":
                "Failed to communicate with AI service."

        }


# ============================================================
# AI CYBERSECURITY CHAT
# ============================================================

def chat_ai(
    message,
    chat_history=None
):
    """
    Generate a cybersecurity-focused AI chat response
    using Ollama directly.

    Supports previous conversation history.
    """

    try:

        # ----------------------------------------------------
        # VALIDATE MESSAGE
        # ----------------------------------------------------

        if not message or not str(message).strip():

            return {

                "success":
                    False,

                "message":
                    "Message is required."

            }


        # ----------------------------------------------------
        # BUILD CHAT HISTORY
        # ----------------------------------------------------

        history_text = ""


        if (
            chat_history
            and isinstance(chat_history, list)
        ):

            for chat in chat_history[-10:]:

                if not isinstance(
                    chat,
                    dict
                ):
                    continue


                role = (
                    chat.get("role")
                    or "user"
                )


                content = (
                    chat.get("content")
                    or chat.get("message")
                    or ""
                )


                if content:

                    history_text += (
                        f"{str(role).upper()}: "
                        f"{str(content)}\n"
                    )


        # ----------------------------------------------------
        # AI SYSTEM PROMPT
        # ----------------------------------------------------

        prompt = f"""
You are an AI Cybersecurity Assistant.

Your role is to help software developers understand:

- Software vulnerabilities
- Secure coding practices
- OWASP security concepts
- SQL Injection
- Cross-Site Scripting (XSS)
- Authentication security
- Authorization security
- Password security
- API security
- Python security
- JavaScript security
- Java security
- PHP security
- Secure code remediation
- Application security
- Web security
- API security testing
- Defensive cybersecurity

You should provide:

1. Clear explanations
2. Practical secure coding guidance
3. High-level examples when useful
4. Professional cybersecurity recommendations
5. Defensive remediation guidance

Important safety rules:

- Do not provide harmful malware.
- Do not provide destructive payloads.
- Do not provide instructions for attacking real systems.
- Do not provide credential theft instructions.
- Do not provide persistence or evasion techniques.
- Focus on defensive cybersecurity.
- If a request appears harmful, provide a safe defensive alternative.
- For security testing, keep examples limited to authorized,
  controlled, defensive environments.

Previous Conversation:

{history_text if history_text else "No previous conversation."}

USER MESSAGE:

{str(message).strip()}

Respond clearly and professionally.
"""


        # ----------------------------------------------------
        # CALL OLLAMA
        # ----------------------------------------------------

        ai_result = _call_ollama(
            prompt,
            timeout=180
        )


        # ----------------------------------------------------
        # HANDLE AI FAILURE
        # ----------------------------------------------------

        if not ai_result.get("success"):

            return {

                "success":
                    False,

                "message":
                    (
                        ai_result.get("message")
                        or
                        "Failed to generate AI response."
                    )

            }


        # ----------------------------------------------------
        # RETURN RESPONSE
        # ----------------------------------------------------

        return {

            "success":
                True,

            "response":
                ai_result.get(
                    "response",
                    ""
                ).strip()

        }


    except Exception as error:

        print(
            "AI Chat Service Error:",
            str(error)
        )

        return {

            "success":
                False,

            "message":
                "Failed to generate AI response."

        }


# ============================================================
# AI VULNERABILITY EXPLANATION
# ============================================================

def get_vulnerability_explanation(
    vulnerability,
    language=None,
    code=None
):
    """
    Generate a detailed AI explanation for a
    detected security vulnerability.

    Uses Ollama directly.
    """

    try:

        # ----------------------------------------------------
        # NORMALIZE VULNERABILITY
        # ----------------------------------------------------

        vulnerability_data = (
            _extract_vulnerability_data(
                vulnerability
            )
        )


        vulnerability_type = (
            vulnerability_data["type"]
        )

        severity = (
            vulnerability_data["severity"]
        )

        cwe = (
            vulnerability_data["cwe"]
        )

        description = (
            vulnerability_data["description"]
        )

        line = (
            vulnerability_data["line"]
        )


        # ----------------------------------------------------
        # AI PROMPT
        # ----------------------------------------------------

        prompt = f"""
You are an expert cybersecurity analyst.

Analyze the following detected software vulnerability.

Vulnerability:
{vulnerability_type}

Severity:
{severity}

CWE:
{cwe}

Scanner Description:
{description}

Programming Language:
{language or "Unknown"}

Detected Line:
{line}

Relevant Source Code:
{code or "Not provided"}

Provide the response using EXACTLY these sections:

1. Vulnerability Overview

Explain clearly what this vulnerability is
and what is happening in the source code.

2. Why It Is Dangerous

Explain the security risk and why developers
should take this issue seriously.

3. Possible Attack Scenario

Describe a realistic high-level attack scenario.
Do not provide weaponized exploit code,
payloads, or step-by-step attack instructions.

4. Potential Impact

Explain the possible consequences to the
application, users, data, or infrastructure.

5. Secure Recommendation

Provide practical remediation guidance
for the developer.

6. Developer Checklist

Provide 3 to 5 concrete security actions.

Keep the explanation professional,
clear, concise, and useful for developers.

Do not provide dangerous exploit instructions.
"""


        # ----------------------------------------------------
        # CALL OLLAMA
        # ----------------------------------------------------

        ai_result = _call_ollama(
            prompt,
            timeout=120
        )


        # ----------------------------------------------------
        # HANDLE AI FAILURE
        # ----------------------------------------------------

        if not ai_result.get("success"):

            return {

                "success":
                    False,

                "message":
                    (
                        ai_result.get("message")
                        or
                        "Failed to generate AI explanation."
                    )

            }


        explanation = (
            ai_result.get("response")
            or ""
        ).strip()


        if not explanation:

            return {

                "success":
                    False,

                "message":
                    "AI did not return an explanation."

            }


        # ----------------------------------------------------
        # RETURN RESPONSE
        # ----------------------------------------------------

        return {

            "success":
                True,

            "explanation":
                explanation,

            "vulnerability": {

                "type":
                    vulnerability_type,

                "severity":
                    severity,

                "cwe":
                    cwe,

                "description":
                    description,

                "line":
                    line

            }

        }


    except Exception as error:

        print(
            "AI Vulnerability Explanation Error:",
            str(error)
        )

        return {

            "success":
                False,

            "message":
                "Failed to generate AI vulnerability explanation."

        }


# ============================================================
# AI VULNERABILITY-SPECIFIC SECURE FIX
# ============================================================

def get_vulnerability_secure_fix(
    vulnerability,
    code,
    language
):
    """
    Generate a secure fix for a specific vulnerability.

    Uses Ollama directly and focuses specifically on
    the vulnerability detected by the scanner.
    """

    try:

        # ----------------------------------------------------
        # VALIDATE SOURCE CODE
        # ----------------------------------------------------

        if not code or not str(code).strip():

            return {

                "success":
                    False,

                "message":
                    (
                        "Source code is required to "
                        "generate a secure fix."
                    )

            }


        # ----------------------------------------------------
        # VALIDATE LANGUAGE
        # ----------------------------------------------------

        if not language or not str(language).strip():

            return {

                "success":
                    False,

                "message":
                    "Programming language is required."

            }


        # ----------------------------------------------------
        # NORMALIZE VULNERABILITY
        # ----------------------------------------------------

        vulnerability_data = (
            _extract_vulnerability_data(
                vulnerability
            )
        )


        vulnerability_type = (
            vulnerability_data["type"]
        )

        severity = (
            vulnerability_data["severity"]
        )

        cwe = (
            vulnerability_data["cwe"]
        )

        description = (
            vulnerability_data["description"]
        )

        line = (
            vulnerability_data["line"]
        )


        # ----------------------------------------------------
        # AI PROMPT
        # ----------------------------------------------------

        prompt = f"""
You are an expert secure software developer
and cybersecurity engineer.

A security scanner detected the following
vulnerability in source code.

Vulnerability Type:
{vulnerability_type}

Severity:
{severity}

CWE:
{cwe}

Description:
{description}

Detected Line:
{line}

Programming Language:
{language}

============================================================
ORIGINAL SOURCE CODE
============================================================

{code}

============================================================
TASK
============================================================

Generate a secure remediation for THIS SPECIFIC
vulnerability.

Follow these requirements:

1. Identify the vulnerable part of the code.

2. Explain why that code is vulnerable.

3. Generate corrected secure code.

4. Preserve the original application functionality
   as much as possible.

5. Focus specifically on fixing:
   {vulnerability_type}

6. Do not introduce unnecessary unrelated changes.

7. Follow secure coding best practices for:
   {language}

8. Do not provide dangerous exploit instructions.

9. The fixed code should be practical and usable
   by a software developer.

Return your response using EXACTLY these sections:

## Vulnerability Identified

Briefly explain the detected vulnerability.

## Security Issue

Explain why this specific code is vulnerable.

## Secure Fixed Code

Provide the complete corrected source code
inside a proper code block.

## Fix Explanation

Explain exactly what security changes were made.

## Additional Security Recommendations

Provide 3 to 5 additional security recommendations.

Make the response professional,
practical, and developer-friendly.
"""


        # ----------------------------------------------------
        # CALL OLLAMA
        # ----------------------------------------------------

        ai_result = _call_ollama(
            prompt,
            timeout=180
        )


        # ----------------------------------------------------
        # HANDLE AI FAILURE
        # ----------------------------------------------------

        if not ai_result.get("success"):

            return {

                "success":
                    False,

                "message":
                    (
                        ai_result.get("message")
                        or
                        "Failed to generate secure fix."
                    )

            }


        fix = (
            ai_result.get("response")
            or ""
        ).strip()


        if not fix:

            return {

                "success":
                    False,

                "message":
                    "AI did not return a secure fix."

            }


        # ----------------------------------------------------
        # RETURN RESPONSE
        # ----------------------------------------------------

        return {

            "success":
                True,

            "fix":
                fix,

            "vulnerability": {

                "type":
                    vulnerability_type,

                "severity":
                    severity,

                "cwe":
                    cwe,

                "description":
                    description,

                "line":
                    line

            }

        }


    except Exception as error:

        print(
            "AI Vulnerability Secure Fix Error:",
            str(error)
        )

        return {

            "success":
                False,

            "message":
                (
                    "Failed to generate "
                    "vulnerability-specific secure fix."
                )

        }


# ============================================================
# FASTAPI HELPER
# ============================================================

def _call_fastapi(
    endpoint,
    payload,
    timeout=120
):
    """
    Generic helper for communicating with the existing
    FastAPI AI service.
    """

    try:

        response = requests.post(

            f"{FASTAPI_URL.rstrip('/')}/{endpoint.lstrip('/')}",

            json=payload,

            timeout=timeout

        )


        response.raise_for_status()


        return {

            "success":
                True,

            "data":
                response.json()

        }


    except requests.exceptions.ConnectionError:

        return {

            "success":
                False,

            "message":
                "Unable to connect to FastAPI server."

        }


    except requests.exceptions.Timeout:

        return {

            "success":
                False,

            "message":
                "FastAPI request timed out."

        }


    except requests.exceptions.HTTPError as error:

        print(
            "FastAPI HTTP Error:",
            str(error)
        )

        return {

            "success":
                False,

            "message":
                "FastAPI returned an HTTP error."

        }


    except ValueError as error:

        print(
            "FastAPI JSON Error:",
            str(error)
        )

        return {

            "success":
                False,

            "message":
                "Invalid JSON response received from FastAPI."

        }


    except Exception as error:

        print(
            "FastAPI Error:",
            str(error)
        )

        return {

            "success":
                False,

            "message":
                "Failed to communicate with FastAPI service."

        }


# ============================================================
# FASTAPI - AI VULNERABILITY EXPLANATION
# ============================================================

def get_ai_explanation(
    vulnerability
):
    """
    Call existing FastAPI /explain endpoint.

    This keeps the existing FastAPI integration unchanged.
    """

    try:

        if not vulnerability:

            return {

                "success":
                    False,

                "message":
                    "Vulnerability data is required."

            }


        result = _call_fastapi(

            "explain",

            {
                "vulnerability":
                    vulnerability
            },

            timeout=120

        )


        if not result.get("success"):

            return result


        return result.get(
            "data",
            {
                "success":
                    False,

                "message":
                    "Empty response received from FastAPI."
            }
        )


    except Exception as error:

        print(
            "FastAPI Explanation Error:",
            str(error)
        )

        return {

            "success":
                False,

            "message":
                "Failed to get AI explanation from FastAPI."

        }


# ============================================================
# FASTAPI - GENERIC SECURE CODE FIX
# ============================================================

def get_secure_fix(
    code,
    language
):
    """
    Call existing FastAPI /fix endpoint.

    This is the generic secure-code fix function.
    """

    try:

        if not code or not str(code).strip():

            return {

                "success":
                    False,

                "message":
                    "Source code is required."

            }


        if not language or not str(language).strip():

            return {

                "success":
                    False,

                "message":
                    "Programming language is required."

            }


        result = _call_fastapi(

            "fix",

            {

                "code":
                    code,

                "language":
                    language

            },

            timeout=180

        )


        if not result.get("success"):

            return result


        return result.get(
            "data",
            {
                "success":
                    False,

                "message":
                    "Empty response received from FastAPI."
            }
        )


    except Exception as error:

        print(
            "FastAPI Secure Fix Error:",
            str(error)
        )

        return {

            "success":
                False,

            "message":
                "Failed to generate secure code fix."

        }


# ============================================================
# FASTAPI - AI CHAT
# ============================================================

def chat_ai_fastapi(
    message
):
    """
    Call existing FastAPI /chat endpoint.

    This function is intentionally named differently from
    chat_ai() because chat_ai() is the direct Ollama chat.
    """

    try:

        # ----------------------------------------------------
        # VALIDATE MESSAGE
        # ----------------------------------------------------

        if not message or not str(message).strip():

            return {

                "success":
                    False,

                "message":
                    "Message is required."

            }


        result = _call_fastapi(

            "chat",

            {

                "message":
                    str(message).strip()

            },

            timeout=180

        )


        if not result.get("success"):

            return result


        return result.get(
            "data",
            {
                "success":
                    False,

                "message":
                    "Empty response received from FastAPI."
            }
        )


    except Exception as error:

        print(
            "FastAPI Chat Error:",
            str(error)
        )

        return {

            "success":
                False,

            "message":
                "Failed to communicate with AI chat service."

        }

