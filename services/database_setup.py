from pymongo import ASCENDING, DESCENDING

from database.mongodb import (
    users_collection,
    reports_collection,
    scan_history_collection,
    ai_conversations_collection,
    conversations_collection
)


# ============================================================
# HELPER
# SAFELY CREATE INDEX
# ============================================================

def ensure_index(
    collection,
    keys,
    name=None,
    **options
):

    try:

        # ----------------------------------------------------
        # COLLECTION CHECK
        # ----------------------------------------------------

        if collection is None:

            return False


        # ----------------------------------------------------
        # GET EXISTING INDEXES
        # ----------------------------------------------------

        existing_indexes = (
            collection.index_information()
        )


        # ----------------------------------------------------
        # CHECK WHETHER SAME INDEX ALREADY EXISTS
        # ----------------------------------------------------

        normalized_keys = tuple(
            keys
        )


        for existing_name, index_info in (
            existing_indexes.items()
        ):

            existing_keys = tuple(
                index_info.get(
                    "key",
                    []
                )
            )


            # Same field combination already exists
            if existing_keys == normalized_keys:

                print(
                    f"ℹ️ Index already exists: "
                    f"{collection.name} -> "
                    f"{existing_name}"
                )

                return True


        # ----------------------------------------------------
        # CREATE NEW INDEX
        # ----------------------------------------------------

        if name:

            collection.create_index(

                keys,

                name=name,

                **options
            )

        else:

            collection.create_index(

                keys,

                **options
            )


        print(
            f"✅ Index created: "
            f"{collection.name} -> "
            f"{name or keys}"
        )


        return True


    except Exception as error:

        print(
            f"❌ Index Creation Error "
            f"for {collection.name}:",
            str(error)
        )

        return False


# ============================================================
# SETUP DATABASE INDEXES
# ============================================================

def setup_database_indexes():

    try:

        print(
            "\n========== DATABASE INDEX SETUP =========="
        )


        # ====================================================
        # USERS COLLECTION
        # ====================================================

        if users_collection is not None:

            ensure_index(

                users_collection,

                [
                    (
                        "email",
                        ASCENDING
                    )
                ],

                name="email_unique_index",

                unique=True
            )


        # ====================================================
        # SCAN HISTORY COLLECTION
        # ====================================================

        if scan_history_collection is not None:

            ensure_index(

                scan_history_collection,

                [
                    (
                        "user_id",
                        ASCENDING
                    ),

                    (
                        "created_at",
                        DESCENDING
                    )
                ],

                name="scan_history_user_created_index"
            )


            ensure_index(

                scan_history_collection,

                [
                    (
                        "language",
                        ASCENDING
                    )
                ],

                name="scan_history_language_index"
            )


        # ====================================================
        # REPORTS COLLECTION
        # ====================================================

        if reports_collection is not None:

            ensure_index(

                reports_collection,

                [
                    (
                        "user_id",
                        ASCENDING
                    ),

                    (
                        "created_at",
                        DESCENDING
                    )
                ],

                name="reports_user_created_index"
            )


        # ====================================================
        # AI CONVERSATIONS COLLECTION
        # ====================================================

        conversation_collection = None


        if ai_conversations_collection is not None:

            conversation_collection = (
                ai_conversations_collection
            )


        elif conversations_collection is not None:

            conversation_collection = (
                conversations_collection
            )


        if conversation_collection is not None:

            # ------------------------------------------------
            # USER CONVERSATION HISTORY INDEX
            # ------------------------------------------------

            ensure_index(

                conversation_collection,

                [
                    (
                        "user_id",
                        ASCENDING
                    ),

                    (
                        "created_at",
                        DESCENDING
                    )
                ],

                name="conversation_user_created_index"
            )


            # ------------------------------------------------
            # UPDATED TIME INDEX
            # ------------------------------------------------

            ensure_index(

                conversation_collection,

                [
                    (
                        "user_id",
                        ASCENDING
                    ),

                    (
                        "updated_at",
                        DESCENDING
                    )
                ],

                name="conversation_user_updated_index"
            )


        print(
            "✅ Database indexes setup completed"
        )


        print(
            "==========================================\n"
        )


        return True


    except Exception as error:

        print(
            "❌ Database Index Setup Error:",
            str(error)
        )

        return False