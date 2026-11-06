from flask import (
    Blueprint,
    request,
    jsonify
)

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

from bson import ObjectId

from services.conversation_service import (
    create_conversation,
    get_user_conversations,
    get_conversation,
    get_conversation_by_id,
    update_conversation_context,
    update_conversation_title,
    delete_conversation,
    delete_all_conversations,
    clear_conversation_messages
)


# ============================================================
# CONVERSATION BLUEPRINT
# ============================================================

conversation_bp = Blueprint(
    "conversations",
    __name__,
    url_prefix="/conversations"
)


# ============================================================
# HELPER - CURRENT USER
# ============================================================

def get_current_user():

    current_user = get_jwt_identity()

    if not current_user:

        return "guest"

    return str(current_user)


# ============================================================
# SERIALIZE VALUE
# ============================================================
# Converts MongoDB ObjectId / datetime values
# into JSON-safe values.
# ============================================================

def serialize_value(value):

    if isinstance(
        value,
        ObjectId
    ):

        return str(value)


    if hasattr(
        value,
        "isoformat"
    ):

        return value.isoformat()


    if isinstance(
        value,
        list
    ):

        return [
            serialize_value(item)
            for item in value
        ]


    if isinstance(
        value,
        dict
    ):

        return {

            key:
                serialize_value(item)

            for key, item
            in value.items()

        }


    return value


# ============================================================
# SERIALIZE CONVERSATION
# ============================================================

def serialize_conversation(
    conversation,
    include_messages=True
):

    if not conversation:

        return None


    conversation_id = (

        conversation.get("_id")
        or conversation.get("id")

    )


    data = {

        "id":
            str(conversation_id)
            if conversation_id
            else None,


        "_id":
            str(conversation_id)
            if conversation_id
            else None,


        "title":
            conversation.get(
                "title",
                "New Conversation"
            ),


        "user_id":
            str(
                conversation.get(
                    "user_id",
                    ""
                )
            ),


        "scan_context":
            serialize_value(
                conversation.get(
                    "scan_context"
                )
            ),


        "vulnerability_context":
            serialize_value(
                conversation.get(
                    "vulnerability_context"
                )
            ),


        "created_at":
            serialize_value(
                conversation.get(
                    "created_at"
                )
            ),


        "updated_at":
            serialize_value(
                conversation.get(
                    "updated_at"
                )
            )

    }


    # ========================================================
    # INCLUDE MESSAGES
    # ========================================================

    if include_messages:

        data["messages"] = serialize_value(

            conversation.get(
                "messages",
                []
            )

        )

    else:

        data["message_count"] = len(

            conversation.get(
                "messages",
                []
            )

        )


    return data


# ============================================================
# CREATE NEW CONVERSATION
# POST /conversations
# ============================================================

@conversation_bp.route(
    "",
    methods=["POST"]
)
@jwt_required(optional=True)
def create_new_conversation():

    try:

        current_user = get_current_user()


        data = request.get_json(
            silent=True
        ) or {}


        # ====================================================
        # TITLE
        # ====================================================

        title = str(

            data.get(
                "title",
                "New Conversation"
            )

        ).strip()


        if not title:

            title = "New Conversation"


        # ====================================================
        # CONTEXT
        # ====================================================

        scan_context = data.get(
            "scan_context"
        )


        vulnerability_context = data.get(
            "vulnerability_context"
        )


        # ====================================================
        # CREATE CONVERSATION
        # ====================================================

        conversation_id = create_conversation(

            user_id=
                current_user,

            title=
                title,

            scan_context=
                scan_context,

            vulnerability_context=
                vulnerability_context

        )


        if not conversation_id:

            return jsonify({

                "success": False,

                "message":
                    "Failed to create conversation"

            }), 500


        # ====================================================
        # FETCH CREATED CONVERSATION
        # ====================================================

        conversation = get_conversation(

            conversation_id=
                conversation_id,

            user_id=
                current_user

        )


        return jsonify({

            "success": True,

            "message":
                "Conversation created successfully",

            "conversation":
                serialize_conversation(
                    conversation
                )

        }), 201


    except Exception as error:

        print(
            "❌ Create Conversation API Error:",
            str(error)
        )


        return jsonify({

            "success": False,

            "message":
                "Failed to create conversation",

            "error":
                str(error)

        }), 500


# ============================================================
# GET ALL USER CONVERSATIONS
# GET /conversations
# ============================================================

@conversation_bp.route(
    "",
    methods=["GET"]
)
@jwt_required(optional=True)
def get_all_conversations():

    try:

        current_user = get_current_user()


        # ====================================================
        # LIMIT
        # ====================================================

        limit = request.args.get(
            "limit",
            default=50,
            type=int
        )


        limit = min(
            max(limit, 1),
            100
        )


        # ====================================================
        # GET CONVERSATIONS
        # ====================================================

        conversations = get_user_conversations(

            user_id=
                current_user,

            limit=
                limit

        )


        # ====================================================
        # FORMAT FOR SIDEBAR
        # ====================================================

        formatted_conversations = []


        for conversation in conversations:

            formatted_conversations.append({

                "id":
                    str(
                        conversation.get(
                            "_id"
                        )
                    ),


                "_id":
                    str(
                        conversation.get(
                            "_id"
                        )
                    ),


                "title":
                    conversation.get(
                        "title",
                        "New Conversation"
                    ),


                "created_at":
                    serialize_value(
                        conversation.get(
                            "created_at"
                        )
                    ),


                "updated_at":
                    serialize_value(
                        conversation.get(
                            "updated_at"
                        )
                    ),


                "message_count":
                    len(
                        conversation.get(
                            "messages",
                            []
                        )
                    )

            })


        return jsonify({

            "success": True,

            "count":
                len(
                    formatted_conversations
                ),

            "conversations":
                formatted_conversations

        }), 200


    except Exception as error:

        print(
            "❌ Get Conversations API Error:",
            str(error)
        )


        return jsonify({

            "success": False,

            "message":
                "Failed to load conversations",

            "error":
                str(error)

        }), 500


# ============================================================
# GET SINGLE CONVERSATION
# GET /conversations/<conversation_id>
# ============================================================

@conversation_bp.route(
    "/<conversation_id>",
    methods=["GET"]
)
@jwt_required(optional=True)
def get_single_conversation(
    conversation_id
):

    try:

        current_user = get_current_user()


        # ====================================================
        # GET CONVERSATION WITH OWNERSHIP CHECK
        # ====================================================

        conversation = get_conversation(

            conversation_id=
                conversation_id,

            user_id=
                current_user

        )


        if not conversation:

            return jsonify({

                "success": False,

                "message":
                    "Conversation not found"

            }), 404


        return jsonify({

            "success": True,

            "conversation":
                serialize_conversation(

                    conversation,

                    include_messages=True

                )

        }), 200


    except Exception as error:

        print(
            "❌ Get Single Conversation API Error:",
            str(error)
        )


        return jsonify({

            "success": False,

            "message":
                "Failed to load conversation",

            "error":
                str(error)

        }), 500


# ============================================================
# UPDATE CONVERSATION CONTEXT
# PUT /conversations/<conversation_id>/context
# ============================================================

@conversation_bp.route(
    "/<conversation_id>/context",
    methods=["PUT"]
)
@jwt_required(optional=True)
def update_context_route(
    conversation_id
):

    try:

        current_user = get_current_user()


        data = request.get_json(
            silent=True
        ) or {}


        # ====================================================
        # CONTEXT
        # ====================================================

        scan_context = data.get(
            "scan_context"
        )


        vulnerability_context = data.get(
            "vulnerability_context"
        )


        # ====================================================
        # VALIDATION
        # ====================================================

        if (

            scan_context is None

            and

            vulnerability_context is None

        ):

            return jsonify({

                "success": False,

                "message":
                    "At least one conversation context is required"

            }), 400


        # ====================================================
        # UPDATE
        # ====================================================

        updated = update_conversation_context(

            conversation_id=
                conversation_id,

            scan_context=
                scan_context,

            vulnerability_context=
                vulnerability_context,

            user_id=
                current_user

        )


        if not updated:

            return jsonify({

                "success": False,

                "message":
                    "Conversation not found or could not be updated"

            }), 404


        # ====================================================
        # FETCH UPDATED CONVERSATION
        # ====================================================

        conversation = get_conversation(

            conversation_id=
                conversation_id,

            user_id=
                current_user

        )


        return jsonify({

            "success": True,

            "message":
                "Conversation context updated successfully",

            "conversation":
                serialize_conversation(
                    conversation
                )

        }), 200


    except Exception as error:

        print(
            "❌ Update Conversation Context API Error:",
            str(error)
        )


        return jsonify({

            "success": False,

            "message":
                "Failed to update conversation context",

            "error":
                str(error)

        }), 500


# ============================================================
# UPDATE SCAN CONTEXT
# PUT /conversations/<conversation_id>/scan-context
# ============================================================

@conversation_bp.route(
    "/<conversation_id>/scan-context",
    methods=["PUT"]
)
@jwt_required(optional=True)
def update_scan_context_route(
    conversation_id
):

    try:

        current_user = get_current_user()


        data = request.get_json(
            silent=True
        ) or {}


        scan_context = data.get(
            "scan_context"
        )


        # ====================================================
        # VALIDATION
        # ====================================================

        if scan_context is None:

            return jsonify({

                "success": False,

                "message":
                    "scan_context is required"

            }), 400


        # ====================================================
        # UPDATE
        # ====================================================

        updated = update_conversation_context(

            conversation_id=
                conversation_id,

            scan_context=
                scan_context,

            user_id=
                current_user

        )


        if not updated:

            return jsonify({

                "success": False,

                "message":
                    "Conversation not found or could not be updated"

            }), 404


        return jsonify({

            "success": True,

            "message":
                "Scan context updated successfully"

        }), 200


    except Exception as error:

        print(
            "❌ Update Scan Context API Error:",
            str(error)
        )


        return jsonify({

            "success": False,

            "message":
                "Failed to update scan context",

            "error":
                str(error)

        }), 500


# ============================================================
# UPDATE CONVERSATION TITLE
# PUT /conversations/<conversation_id>
# ============================================================
# Compatibility route.
#
# Frontend:
# {
#     "title": "My Chat"
# }
# ============================================================

@conversation_bp.route(
    "/<conversation_id>",
    methods=["PUT"]
)
@jwt_required(optional=True)
def update_conversation_route(
    conversation_id
):

    try:

        current_user = get_current_user()


        data = request.get_json(
            silent=True
        ) or {}


        title = str(

            data.get(
                "title",
                ""
            )

        ).strip()


        if not title:

            return jsonify({

                "success": False,

                "message":
                    "Conversation title is required"

            }), 400


        # ====================================================
        # UPDATE TITLE
        # ====================================================

        updated = update_conversation_title(

            conversation_id=
                conversation_id,

            title=
                title,

            user_id=
                current_user

        )


        if not updated:

            return jsonify({

                "success": False,

                "message":
                    "Conversation not found or could not be updated"

            }), 404


        # ====================================================
        # FETCH UPDATED CONVERSATION
        # ====================================================

        conversation = get_conversation(

            conversation_id=
                conversation_id,

            user_id=
                current_user

        )


        return jsonify({

            "success": True,

            "message":
                "Conversation renamed successfully",

            "conversation":
                serialize_conversation(
                    conversation
                )

        }), 200


    except Exception as error:

        print(
            "❌ Update Conversation API Error:",
            str(error)
        )


        return jsonify({

            "success": False,

            "message":
                "Failed to update conversation",

            "error":
                str(error)

        }), 500


# ============================================================
# UPDATE CONVERSATION TITLE
# PUT /conversations/<conversation_id>/title
# ============================================================
# Backward-compatible explicit title route.
# ============================================================

@conversation_bp.route(
    "/<conversation_id>/title",
    methods=["PUT"]
)
@jwt_required(optional=True)
def update_title_route(
    conversation_id
):

    try:

        current_user = get_current_user()


        data = request.get_json(
            silent=True
        ) or {}


        title = str(

            data.get(
                "title",
                ""
            )

        ).strip()


        if not title:

            return jsonify({

                "success": False,

                "message":
                    "Conversation title is required"

            }), 400


        # ====================================================
        # UPDATE TITLE
        # ====================================================

        updated = update_conversation_title(

            conversation_id=
                conversation_id,

            title=
                title,

            user_id=
                current_user

        )


        if not updated:

            return jsonify({

                "success": False,

                "message":
                    "Conversation not found or could not be updated"

            }), 404


        # ====================================================
        # FETCH UPDATED CONVERSATION
        # ====================================================

        conversation = get_conversation(

            conversation_id=
                conversation_id,

            user_id=
                current_user

        )


        return jsonify({

            "success": True,

            "message":
                "Conversation title updated successfully",

            "conversation":
                serialize_conversation(
                    conversation
                )

        }), 200


    except Exception as error:

        print(
            "❌ Update Title API Error:",
            str(error)
        )


        return jsonify({

            "success": False,

            "message":
                "Failed to update conversation title",

            "error":
                str(error)

        }), 500


# ============================================================
# DELETE SINGLE CONVERSATION
# DELETE /conversations/<conversation_id>
# ============================================================

@conversation_bp.route(
    "/<conversation_id>",
    methods=["DELETE"]
)
@jwt_required(optional=True)
def delete_single_conversation(
    conversation_id
):

    try:

        current_user = get_current_user()


        # ====================================================
        # DELETE
        # ====================================================

        deleted = delete_conversation(

            conversation_id=
                conversation_id,

            user_id=
                current_user

        )


        if not deleted:

            return jsonify({

                "success": False,

                "message":
                    "Conversation not found or could not be deleted"

            }), 404


        return jsonify({

            "success": True,

            "message":
                "Conversation deleted successfully"

        }), 200


    except Exception as error:

        print(
            "❌ Delete Conversation Error:",
            str(error)
        )


        return jsonify({

            "success": False,

            "message":
                "Failed to delete conversation",

            "error":
                str(error)

        }), 500


# ============================================================
# DELETE ALL USER CONVERSATIONS
# DELETE /conversations
# ============================================================

@conversation_bp.route(
    "",
    methods=["DELETE"]
)
@jwt_required(optional=True)
def delete_all_user_conversations():

    try:

        current_user = get_current_user()


        deleted = delete_all_conversations(

            user_id=
                current_user

        )


        return jsonify({

            "success": True,

            "message":
                "All conversations deleted successfully",

            "deleted":
                deleted

        }), 200


    except Exception as error:

        print(
            "❌ Delete All Conversations Error:",
            str(error)
        )


        return jsonify({

            "success": False,

            "message":
                "Failed to delete conversations",

            "error":
                str(error)

        }), 500


# ============================================================
# CLEAR CONVERSATION MESSAGES
# DELETE /conversations/<conversation_id>/messages
# ============================================================

@conversation_bp.route(
    "/<conversation_id>/messages",
    methods=["DELETE"]
)
@jwt_required(optional=True)
def clear_messages_route(
    conversation_id
):

    try:

        current_user = get_current_user()


        # ====================================================
        # CLEAR MESSAGES
        # ====================================================

        cleared = clear_conversation_messages(

            conversation_id=
                conversation_id,

            user_id=
                current_user

        )


        if not cleared:

            return jsonify({

                "success": False,

                "message":
                    "Conversation not found or messages could not be cleared"

            }), 404


        return jsonify({

            "success": True,

            "message":
                "Conversation messages cleared successfully"

        }), 200


    except Exception as error:

        print(
            "❌ Clear Messages Error:",
            str(error)
        )


        return jsonify({

            "success": False,

            "message":
                "Failed to clear conversation messages",

            "error":
                str(error)

        }), 500