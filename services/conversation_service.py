from datetime import datetime

from bson import ObjectId

from database.mongodb import (
    ai_conversations_collection,
    conversations_collection
)

from models.conversation_model import (
    create_conversation_document,
    create_chat_message
)


# ============================================================
# COLLECTION SELECTION
# ============================================================
# Primary collection:
#     ai_conversations_collection
#
# Fallback collection:
#     conversations_collection
#
# This keeps compatibility with old code/database setup.
# ============================================================

conversation_collection = (
    ai_conversations_collection
    if ai_conversations_collection is not None
    else conversations_collection
)


# ============================================================
# OBJECT ID HELPER
# ============================================================

def _get_object_id(conversation_id):

    try:

        if not conversation_id:
            return None

        return ObjectId(
            str(conversation_id)
        )

    except Exception:

        return None


# ============================================================
# OBJECT ID VALIDATION
# ============================================================

def is_valid_object_id(value):

    return (
        _get_object_id(value)
        is not None
    )


# ============================================================
# SERIALIZE CONVERSATION
# ============================================================
# Converts MongoDB ObjectId / datetime values
# into JSON-safe values.
# ============================================================

def serialize_conversation(conversation):

    if not conversation:

        return None

    # --------------------------------------------------------
    # ObjectId
    # --------------------------------------------------------

    if "_id" in conversation:

        conversation["_id"] = str(
            conversation["_id"]
        )

    # --------------------------------------------------------
    # Created At
    # --------------------------------------------------------

    if (
        "created_at" in conversation
        and isinstance(
            conversation["created_at"],
            datetime
        )
    ):

        conversation["created_at"] = (
            conversation["created_at"].isoformat()
        )

    # --------------------------------------------------------
    # Updated At
    # --------------------------------------------------------

    if (
        "updated_at" in conversation
        and isinstance(
            conversation["updated_at"],
            datetime
        )
    ):

        conversation["updated_at"] = (
            conversation["updated_at"].isoformat()
        )

    # --------------------------------------------------------
    # Message Timestamps
    # --------------------------------------------------------

    for message in conversation.get(
        "messages",
        []
    ):

        if (
            "timestamp" in message
            and isinstance(
                message["timestamp"],
                datetime
            )
        ):

            message["timestamp"] = (
                message["timestamp"].isoformat()
            )

        # ----------------------------------------------------
        # Message ObjectId
        # ----------------------------------------------------

        if (
            "_id" in message
            and isinstance(
                message["_id"],
                ObjectId
            )
        ):

            message["_id"] = str(
                message["_id"]
            )

    return conversation


# ============================================================
# CREATE CONVERSATION
# ============================================================
# Supports:
#     title
#     scan_context
#     vulnerability_context
# ============================================================

def create_conversation(
    user_id,
    title="New Conversation",
    scan_context=None,
    vulnerability_context=None
):

    try:

        if conversation_collection is None:

            print(
                "❌ Conversation collection unavailable"
            )

            return None

        # ----------------------------------------------------
        # Use model document when primary AI collection
        # is available.
        # ----------------------------------------------------

        if (
            ai_conversations_collection is not None
            and conversation_collection
            is ai_conversations_collection
        ):

            conversation = (
                create_conversation_document(
                    user_id=str(user_id),
                    title=(
                        title
                        or "New Conversation"
                    ),
                    scan_context=scan_context
                )
            )

            # Add vulnerability context
            # if provided.

            if vulnerability_context is not None:

                conversation[
                    "vulnerability_context"
                ] = vulnerability_context

        else:

            # ------------------------------------------------
            # Backward-compatible document structure
            # ------------------------------------------------

            now = datetime.utcnow()

            conversation = {

                "user_id":
                    str(user_id),

                "title":
                    str(
                        title
                        or "New Conversation"
                    ).strip(),

                "messages":
                    [],

                "scan_context":
                    scan_context,

                "vulnerability_context":
                    vulnerability_context,

                "created_at":
                    now,

                "updated_at":
                    now
            }

        result = (
            conversation_collection.insert_one(
                conversation
            )
        )

        conversation_id = str(
            result.inserted_id
        )

        print(
            "✅ Conversation created:",
            conversation_id
        )

        return conversation_id

    except Exception as error:

        print(
            "❌ Create Conversation Error:",
            str(error)
        )

        return None


# ============================================================
# ADD MESSAGE
# ============================================================
# Main function used by ai_routes.py
#
# Supports optional metadata.
# ============================================================

def add_message(
    conversation_id,
    role,
    content,
    metadata=None
):

    try:

        if (
            conversation_collection is None
            or not conversation_id
        ):

            return False

        object_id = _get_object_id(
            conversation_id
        )

        if object_id is None:

            return False

        # ----------------------------------------------------
        # Use model message structure when available.
        # ----------------------------------------------------

        if (
            ai_conversations_collection is not None
            and conversation_collection
            is ai_conversations_collection
        ):

            message = create_chat_message(
                role=str(role),
                content=str(content)
            )

            # Add metadata if supplied.

            if metadata is not None:

                message[
                    "metadata"
                ] = metadata or {}

        else:

            message = {

                "role":
                    str(role),

                "content":
                    str(content),

                "timestamp":
                    datetime.utcnow(),

                "metadata":
                    metadata or {}
            }

        result = (
            conversation_collection.update_one(

                {
                    "_id":
                        object_id
                },

                {

                    "$push": {

                        "messages":
                            message
                    },

                    "$set": {

                        "updated_at":
                            datetime.utcnow()
                    }
                }
            )
        )

        if result.matched_count == 0:

            print(
                "❌ Conversation not found:",
                conversation_id
            )

            return False

        return True

    except Exception as error:

        print(
            "❌ Add Message Error:",
            str(error)
        )

        return False


# ============================================================
# ADD CONVERSATION MESSAGE
# ============================================================
# Backward-compatible wrapper.
# ============================================================

def add_conversation_message(
    conversation_id,
    role,
    content,
    metadata=None
):

    return add_message(

        conversation_id=
            conversation_id,

        role=
            role,

        content=
            content,

        metadata=
            metadata
    )


# ============================================================
# GET SINGLE CONVERSATION
# ============================================================

def get_conversation(
    conversation_id,
    user_id=None
):

    try:

        if conversation_collection is None:

            return None

        object_id = _get_object_id(
            conversation_id
        )

        if object_id is None:

            return None

        query = {

            "_id":
                object_id
        }

        # ----------------------------------------------------
        # Optional user ownership check
        # ----------------------------------------------------

        if user_id is not None:

            query[
                "user_id"
            ] = str(user_id)

        conversation = (
            conversation_collection.find_one(
                query
            )
        )

        if not conversation:

            return None

        return serialize_conversation(
            conversation
        )

    except Exception as error:

        print(
            "❌ Get Conversation Error:",
            str(error)
        )

        return None


# ============================================================
# GET CONVERSATION BY ID
# ============================================================
# Backward-compatible wrapper.
# ============================================================

def get_conversation_by_id(
    conversation_id,
    user_id=None
):

    return get_conversation(

        conversation_id=
            conversation_id,

        user_id=
            user_id
    )


# ============================================================
# GET ALL USER CONVERSATIONS
# ============================================================

def get_user_conversations(
    user_id,
    limit=50
):

    try:

        if conversation_collection is None:

            return []

        conversations = list(

            conversation_collection.find(

                {
                    "user_id":
                        str(user_id)
                }
            )

            .sort(
                "updated_at",
                -1
            )

            .limit(
                int(limit)
            )
        )

        return [

            serialize_conversation(
                conversation
            )

            for conversation
            in conversations
        ]

    except Exception as error:

        print(
            "❌ Get User Conversations Error:",
            str(error)
        )

        return []


# ============================================================
# GET CONVERSATIONS
# ============================================================
# Backward-compatible wrapper.
# ============================================================

def get_conversations(
    user_id,
    limit=50
):

    return get_user_conversations(

        user_id=
            user_id,

        limit=
            limit
    )


# ============================================================
# UPDATE CONVERSATION CONTEXT
# ============================================================
# Supports:
#     scan_context
#     vulnerability_context
# ============================================================

def update_conversation_context(
    conversation_id,
    scan_context=None,
    vulnerability_context=None,
    user_id=None
):

    try:

        if conversation_collection is None:

            return False

        object_id = _get_object_id(
            conversation_id
        )

        if object_id is None:

            return False

        query = {

            "_id":
                object_id
        }

        # ----------------------------------------------------
        # Optional user ownership check
        # ----------------------------------------------------

        if user_id is not None:

            query[
                "user_id"
            ] = str(user_id)

        update_data = {

            "updated_at":
                datetime.utcnow()
        }

        # ----------------------------------------------------
        # Scan Context
        # ----------------------------------------------------

        if scan_context is not None:

            update_data[
                "scan_context"
            ] = scan_context

        # ----------------------------------------------------
        # Vulnerability Context
        # ----------------------------------------------------

        if vulnerability_context is not None:

            update_data[
                "vulnerability_context"
            ] = vulnerability_context

        result = (
            conversation_collection.update_one(

                query,

                {

                    "$set":
                        update_data
                }
            )
        )

        return (
            result.matched_count > 0
        )

    except Exception as error:

        print(
            "❌ Update Conversation Context Error:",
            str(error)
        )

        return False


# ============================================================
# UPDATE SCAN CONTEXT
# ============================================================

def update_conversation_scan_context(
    conversation_id,
    scan_context,
    user_id=None
):

    return update_conversation_context(

        conversation_id=
            conversation_id,

        scan_context=
            scan_context,

        user_id=
            user_id
    )


# ============================================================
# UPDATE CONVERSATION TITLE
# ============================================================

def update_conversation_title(
    conversation_id,
    title,
    user_id=None
):

    try:

        if (
            conversation_collection is None
            or not conversation_id
            or not title
        ):

            return False

        object_id = _get_object_id(
            conversation_id
        )

        if object_id is None:

            return False

        title = str(
            title
        ).strip()

        if not title:

            return False

        query = {

            "_id":
                object_id
        }

        # ----------------------------------------------------
        # Optional user ownership check
        # ----------------------------------------------------

        if user_id is not None:

            query[
                "user_id"
            ] = str(user_id)

        result = (
            conversation_collection.update_one(

                query,

                {

                    "$set": {

                        "title":
                            title,

                        "updated_at":
                            datetime.utcnow()
                    }
                }
            )
        )

        return (
            result.matched_count > 0
        )

    except Exception as error:

        print(
            "❌ Update Conversation Title Error:",
            str(error)
        )

        return False


# ============================================================
# DELETE SINGLE CONVERSATION
# ============================================================

def delete_conversation(
    conversation_id,
    user_id=None
):

    try:

        if conversation_collection is None:

            return False

        object_id = _get_object_id(
            conversation_id
        )

        if object_id is None:

            return False

        query = {

            "_id":
                object_id
        }

        # ----------------------------------------------------
        # Optional user ownership check
        # ----------------------------------------------------

        if user_id is not None:

            query[
                "user_id"
            ] = str(user_id)

        result = (
            conversation_collection.delete_one(
                query
            )
        )

        return (
            result.deleted_count > 0
        )

    except Exception as error:

        print(
            "❌ Delete Conversation Error:",
            str(error)
        )

        return False


# ============================================================
# DELETE ALL USER CONVERSATIONS
# ============================================================

def delete_all_conversations(
    user_id
):

    try:

        if conversation_collection is None:

            return False

        result = (
            conversation_collection.delete_many(

                {
                    "user_id":
                        str(user_id)
                }
            )
        )

        return (
            result.deleted_count > 0
        )

    except Exception as error:

        print(
            "❌ Delete All Conversations Error:",
            str(error)
        )

        return False


# ============================================================
# CLEAR CONVERSATION MESSAGES
# ============================================================

def clear_conversation_messages(
    conversation_id,
    user_id=None
):

    try:

        if conversation_collection is None:

            return False

        object_id = _get_object_id(
            conversation_id
        )

        if object_id is None:

            return False

        query = {

            "_id":
                object_id
        }

        # ----------------------------------------------------
        # Optional user ownership check
        # ----------------------------------------------------

        if user_id is not None:

            query[
                "user_id"
            ] = str(user_id)

        result = (
            conversation_collection.update_one(

                query,

                {

                    "$set": {

                        "messages":
                            [],

                        "updated_at":
                            datetime.utcnow()
                    }
                }
            )
        )

        return (
            result.matched_count > 0
        )

    except Exception as error:

        print(
            "❌ Clear Conversation Messages Error:",
            str(error)
        )

        return False