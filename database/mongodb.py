from pymongo import MongoClient

from config import Config


# ============================================================
# MONGODB CONNECTION
# ============================================================

try:

    # --------------------------------------------------------
    # MongoDB URI
    # --------------------------------------------------------

    mongo_uri = getattr(
        Config,
        "MONGO_URI",
        "mongodb://localhost:27017"
    )

    # --------------------------------------------------------
    # MongoDB Client
    # --------------------------------------------------------

    mongo_client = MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=5000
    )

    # --------------------------------------------------------
    # Check MongoDB Connection
    # --------------------------------------------------------

    mongo_client.admin.command("ping")

    # --------------------------------------------------------
    # Database Name
    # --------------------------------------------------------
    # Supports:
    #   Config.MONGO_DB_NAME
    #   Config.DATABASE_NAME
    #
    # Default:
    #   ai_cybersecurity_assistant
    # --------------------------------------------------------

    database_name = getattr(
        Config,
        "MONGO_DB_NAME",
        None
    )

    if not database_name:
        database_name = getattr(
            Config,
            "DATABASE_NAME",
            None
        )

    if not database_name:
        database_name = "ai_cybersecurity_assistant"

    # --------------------------------------------------------
    # Database
    # --------------------------------------------------------

    database = mongo_client[
        database_name
    ]

    # --------------------------------------------------------
    # Backward-Compatible Aliases
    # --------------------------------------------------------

    client = mongo_client

    db = database

    print(
        "✅ MongoDB Connected Successfully"
    )


except Exception as error:

    print(
        "❌ MongoDB Connection Failed:",
        str(error)
    )

    # --------------------------------------------------------
    # Keep connection variables safe when MongoDB is
    # unavailable.
    # --------------------------------------------------------

    mongo_client = None

    client = None

    database = None

    db = None


# ============================================================
# COLLECTIONS
# ============================================================

if database is not None:

    # ========================================================
    # USERS
    # ========================================================

    users_collection = database[
        "users"
    ]

    # ========================================================
    # SCAN REPORTS
    # ========================================================
    # Main/current collection.
    # ========================================================

    scan_reports_collection = database[
        "scan_reports"
    ]

    # ========================================================
    # REPORTS
    # ========================================================
    # Backward-compatible alias.
    #
    # Existing code using reports_collection will continue
    # to work with scan_reports.
    # ========================================================

    reports_collection = scan_reports_collection

    # ========================================================
    # SCAN HISTORY
    # ========================================================

    scan_history_collection = database[
        "scan_history"
    ]

    # ========================================================
    # AI CONVERSATIONS
    # ========================================================
    # Main collection used by the AI conversation system.
    # ========================================================

    ai_conversations_collection = database[
        "ai_conversations"
    ]

    # ========================================================
    # CONVERSATIONS
    # ========================================================
    # Backward-compatible alias for older code that uses
    # conversations_collection.
    #
    # Both names point to the same AI conversations collection.
    # ========================================================

    conversations_collection = ai_conversations_collection


else:

    # ========================================================
    # MONGODB UNAVAILABLE
    # ========================================================

    users_collection = None

    scan_reports_collection = None

    reports_collection = None

    scan_history_collection = None

    ai_conversations_collection = None

    conversations_collection = None