from datetime import datetime


# ============================================================
# CREATE AI CONVERSATION DOCUMENT
# ============================================================

def create_conversation_document(
    user_id,
    title=None,
    scan_context=None
):

    if scan_context is None:
        scan_context = {}


    # ========================================================
    # DEFAULT TITLE
    # ========================================================

    if not title:

        title = (
            "New Cybersecurity Conversation"
        )


    # ========================================================
    # DOCUMENT
    # ========================================================

    document = {

        "user_id":
        str(user_id)
        if user_id
        else None,

        "title":
        title,

        "messages":
        [],

        "scan_context":
        scan_context,

        "created_at":
        datetime.utcnow(),

        "updated_at":
        datetime.utcnow()
    }


    return document


# ============================================================
# CREATE CHAT MESSAGE
# ============================================================

def create_chat_message(
    role,
    content
):

    return {

        "role":
        role,

        "content":
        str(content),

        "timestamp":
        datetime.utcnow()
    }