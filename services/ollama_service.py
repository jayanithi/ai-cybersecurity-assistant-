import json
import requests
from fastapi import HTTPException


# ============================================================
# OLLAMA CONFIGURATION
# ============================================================

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL_NAME = "llama3"

OLLAMA_CONNECT_TIMEOUT = 10
OLLAMA_READ_TIMEOUT = 300

OLLAMA_TIMEOUT = (
    OLLAMA_CONNECT_TIMEOUT,
    OLLAMA_READ_TIMEOUT
)


# ============================================================
# COMMON OLLAMA REQUEST
# ============================================================

def _call_ollama(prompt, num_predict=500):

    try:

        print("\n========== OLLAMA REQUEST ==========")

        response = requests.post(
            OLLAMA_URL,

            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,

                "options": {
                    "temperature": 0.3,
                    "num_predict": num_predict
                }
            },

            timeout=OLLAMA_TIMEOUT
        )

        print(
            "Ollama Status:",
            response.status_code
        )

        response.raise_for_status()

        data = response.json()

        ai_response = (
            data.get(
                "response",
                ""
            )
            .strip()
        )

        if not ai_response:

            raise Exception(
                "Ollama returned an empty response"
            )

        return ai_response


    except requests.exceptions.Timeout:

        print(
            "Ollama Error: Request timed out"
        )

        raise HTTPException(
            status_code=504,
            detail=(
                "Ollama took too long "
                "to generate a response."
            )
        )


    except requests.exceptions.ConnectionError:

        print(
            "Ollama Error: Cannot connect"
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Cannot connect to Ollama. "
                "Make sure Ollama is running."
            )
        )


    except requests.exceptions.HTTPError as error:

        print(
            "Ollama HTTP Error:",
            str(error)
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Ollama returned an HTTP error: "
                f"{str(error)}"
            )
        )


    except ValueError:

        print(
            "Ollama Error: Invalid JSON response"
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Ollama returned an invalid response."
            )
        )


    except Exception as error:

        print(
            "Ollama Error:",
            str(error)
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ============================================================
# STREAMING OLLAMA RESPONSE
# ============================================================

def stream_ollama_response(
    prompt,
    num_predict=500
):
    """
    Stream Ollama response chunk-by-chunk.

    This generator is used by FastAPI StreamingResponse.
    """

    response = None

    try:

        print(
            "\n========== OLLAMA STREAM REQUEST =========="
        )

        response = requests.post(

            OLLAMA_URL,

            json={
                "model": MODEL_NAME,
                "prompt": prompt,

                # IMPORTANT
                "stream": True,

                "options": {
                    "temperature": 0.3,

                    # Keep response reasonably fast
                    "num_predict": num_predict
                }
            },

            # IMPORTANT
            stream=True,

            timeout=OLLAMA_TIMEOUT
        )

        print(
            "Ollama Stream Status:",
            response.status_code
        )

        response.raise_for_status()

        first_chunk = True

        # Ollama returns NDJSON chunks
        for line in response.iter_lines(
            decode_unicode=True
        ):

            if not line:
                continue

            try:

                data = json.loads(line)

                chunk = (
                    data.get(
                        "response",
                        ""
                    )
                    or ""
                )

                if chunk:

                    if first_chunk:

                        print(
                            "First AI response "
                            "chunk received."
                        )

                        first_chunk = False

                    # Send chunk immediately
                    yield chunk

                if data.get(
                    "done"
                ) is True:

                    break

            except json.JSONDecodeError:

                # Ignore invalid stream line
                continue


    except requests.exceptions.ConnectTimeout:

        print(
            "Ollama Stream Error: "
            "Connection timeout"
        )

        raise HTTPException(
            status_code=504,
            detail=(
                "Cannot connect to Ollama. "
                "Connection timed out."
            )
        )


    except requests.exceptions.ReadTimeout:

        print(
            "Ollama Stream Error: "
            "Read timeout"
        )

        raise HTTPException(
            status_code=504,
            detail=(
                "Ollama took too long "
                "to generate a response."
            )
        )


    except requests.exceptions.ConnectionError:

        print(
            "Ollama Stream Error: "
            "Cannot connect"
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Cannot connect to Ollama. "
                "Make sure Ollama is running."
            )
        )


    except requests.exceptions.HTTPError as error:

        print(
            "Ollama Stream HTTP Error:",
            str(error)
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Ollama returned an HTTP error."
            )
        )


    except Exception as error:

        print(
            "Ollama Stream Error:",
            str(error)
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


    finally:

        if response is not None:

            response.close()


# ============================================================
# AI CHAT RESPONSE
# ============================================================

def get_ai_chat_response(prompt):

    return _call_ollama(
        prompt,
        num_predict=300
    )


# ============================================================
# VULNERABILITY EXPLANATION
# ============================================================

def explain_vulnerability(
    vulnerability
):

    prompt = f"""
You are a professional Cybersecurity Expert.

Explain the following cybersecurity vulnerability in detail:

{vulnerability}

Include:

1. What the vulnerability is
2. Why the vulnerability occurs
3. How attackers can exploit it
4. Real-world security impact
5. Severity and risk
6. Prevention techniques
7. Secure coding recommendations

Give the explanation in a clear and professional way.
"""

    return _call_ollama(
        prompt,
        num_predict=500
    )


# ============================================================
# SECURE CODE FIX
# ============================================================

def generate_secure_fix(
    code,
    language
):

    prompt = f"""
You are a Secure Coding Expert and Cybersecurity Engineer.

Programming Language:
{language}

Source Code:
{code}

Perform the following tasks:

1. Identify all security vulnerabilities
2. Explain each security issue
3. Explain why each issue is dangerous
4. Generate secure and corrected code
5. Preserve the original functionality
6. Follow secure coding best practices
7. Explain the changes made in the fixed code

Return a professional and easy-to-understand response.
"""

    return _call_ollama(
        prompt,
        num_predict=700
    )


# ============================================================
# SIMPLE AI CHAT
# ============================================================

def chat_with_ai(
    message
):

    prompt = f"""
You are an AI Cybersecurity Assistant.

User Question:
{message}

Provide a professional cybersecurity answer.

Requirements:

- Be technically accurate
- Explain concepts clearly
- Give practical recommendations
- Focus on defensive and secure coding practices
- Use examples when useful
"""

    return _call_ollama(
        prompt,
        num_predict=500
    )