# ============================================================
# SCAN HISTORY SERVICE - USER ISOLATED + REPORTS MIRROR VERSION
# ============================================================
#
# Existing logic preserved:
# - Scan history save
# - Scan history retrieval
# - Single scan retrieval
# - Scan deletion
# - ObjectId / string user_id compatibility
# - Confidence normalization
# - Severity normalization
# - Risk score normalization
# - Backward-compatible delete_scan_history()
#
# Bug fix:
# - Every NEW completed scan is saved to scan_history AND scan_reports.
# - Both collections receive the SAME MongoDB _id.
# - Existing history/retrieval behavior remains based on scan_history.
# - Delete removes the scan from both collections.
# - If scan_reports is unavailable, scan_history still works.
# - User isolation is preserved for both collections.
#
# Important:
# - scan_reports is a mirror/report collection.
# - Existing records already present only in scan_history are NOT
#   silently exposed to other users.
# ============================================================

from datetime import datetime
from copy import deepcopy

from bson import ObjectId

from database.mongodb import (
    scan_history_collection,
    scan_reports_collection
)

from models.scan_history_model import (
    create_scan_history_document
)


# ============================================================
# HELPER: CONVERT OBJECT ID SAFELY
# ============================================================

def convert_object_id(value):
    """
    Safely convert a value to MongoDB ObjectId.

    If conversion fails, the original value is returned
    as a string.
    """

    if value is None:
        return None

    if isinstance(value, ObjectId):
        return value

    try:
        return ObjectId(str(value))

    except Exception:
        return str(value)


# ============================================================
# HELPER: NORMALIZE USER ID
# ============================================================

def normalize_user_id(user_id):
    """
    Convert authenticated user identity into a stable string.
    """

    if user_id is None:
        return None

    value = str(user_id).strip()

    if not value:
        return None

    return value


# ============================================================
# HELPER: BUILD USER ID QUERY
# ============================================================

def build_user_query(user_id):
    """
    Build a STRICT MongoDB user_id query.

    Supports:
        1. String user IDs
        2. MongoDB ObjectId user IDs

    If user_id is missing, an impossible query is returned.
    """

    normalized_user_id = normalize_user_id(user_id)

    if normalized_user_id is None:
        return {
            "user_id": {
                "$exists": False,
                "$eq": "__INVALID_USER_ID__"
            }
        }

    query_values = [normalized_user_id]

    try:
        object_id = ObjectId(normalized_user_id)

        if object_id not in query_values:
            query_values.append(object_id)

    except Exception:
        pass

    if len(query_values) == 1:
        return {
            "user_id": query_values[0]
        }

    return {
        "user_id": {
            "$in": query_values
        }
    }


# ============================================================
# HELPER: GET ACTIVE COLLECTION
# ============================================================

def get_scan_collection():
    """
    Return the existing primary scan-history collection.

    Primary:
        scan_history_collection

    Fallback:
        scan_reports_collection
    """

    if scan_history_collection is not None:
        return scan_history_collection

    if scan_reports_collection is not None:
        return scan_reports_collection

    return None


# ============================================================
# HELPER: CHECK WHETHER COLLECTIONS ARE THE SAME
# ============================================================

def _same_collection(first, second):
    """
    Safely determine whether two MongoDB Collection objects
    point to the same database/collection.

    This prevents inserting the same document twice if both
    imported variables happen to reference one collection.
    """

    if first is None or second is None:
        return False

    try:
        return (
            first.database.name == second.database.name
            and first.name == second.name
        )

    except Exception:
        return first is second


# ============================================================
# HELPER: SAFE INTEGER
# ============================================================

def safe_int(value, default=0):
    """
    Safely convert a value to int.
    """

    try:
        return int(value or 0)

    except Exception:
        return default


# ============================================================
# HELPER: SERIALIZE MONGODB DOCUMENT
# ============================================================

def serialize_scan(scan):
    """
    Convert MongoDB scan document into JSON-safe dictionary.
    """

    if not scan:
        return None

    vulnerabilities = scan.get(
        "vulnerabilities",
        []
    )

    if not isinstance(vulnerabilities, list):
        vulnerabilities = []

    summary = scan.get(
        "summary",
        {}
    )

    if not isinstance(summary, dict):
        summary = {}

    critical = summary.get(
        "critical",
        scan.get(
            "critical",
            scan.get(
                "criticalCount",
                0
            )
        )
    )

    high = summary.get(
        "high",
        scan.get(
            "high",
            scan.get(
                "highCount",
                0
            )
        )
    )

    medium = summary.get(
        "medium",
        scan.get(
            "medium",
            scan.get(
                "mediumCount",
                0
            )
        )
    )

    low = summary.get(
        "low",
        scan.get(
            "low",
            scan.get(
                "lowCount",
                0
            )
        )
    )

    normalized_summary = {
        "critical": safe_int(critical),
        "high": safe_int(high),
        "medium": safe_int(medium),
        "low": safe_int(low)
    }

    user_id = scan.get("user_id")

    serialized_user_id = (
        str(user_id)
        if user_id is not None
        else None
    )

    created_at = scan.get("created_at")

    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()

    elif created_at is not None:
        created_at = str(created_at)

    updated_at = scan.get("updated_at")

    if isinstance(updated_at, datetime):
        updated_at = updated_at.isoformat()

    elif updated_at is not None:
        updated_at = str(updated_at)

    scan_time = scan.get(
        "scanTime",
        scan.get(
            "scan_time",
            created_at
        )
    )

    if isinstance(scan_time, datetime):
        scan_time = scan_time.isoformat()

    elif scan_time is not None:
        scan_time = str(scan_time)

    risk_score = scan.get(
        "riskScore",
        scan.get(
            "risk_score",
            0
        )
    )

    try:
        risk_score = float(risk_score)

        if risk_score.is_integer():
            risk_score = int(risk_score)

    except Exception:
        risk_score = 0

    grade = scan.get(
        "grade",
        "A+"
    )

    confidence = scan.get(
        "confidence",
        100 if not vulnerabilities else 0
    )

    if isinstance(confidence, list):

        confidence_values = []

        for finding in confidence:

            if not isinstance(finding, dict):
                continue

            value = finding.get("confidence")

            if isinstance(value, (int, float)):
                confidence_values.append(float(value))

        if confidence_values:
            confidence = min(confidence_values)

        else:
            confidence = (
                100
                if not vulnerabilities
                else 0
            )

    try:
        confidence = float(confidence)

        confidence = min(
            max(confidence, 0),
            100
        )

        if confidence.is_integer():
            confidence = int(confidence)

    except Exception:
        confidence = (
            100
            if not vulnerabilities
            else 0
        )

    total_issues = scan.get(
        "totalIssues",
        scan.get(
            "total_issues",
            len(vulnerabilities)
        )
    )

    try:
        total_issues = int(total_issues)

    except Exception:
        total_issues = len(vulnerabilities)

    status = scan.get("status")

    if not status:
        status = (
            "Safe"
            if total_issues == 0
            else "Unsafe"
        )

    return {
        "id": str(scan.get("_id")),
        "user_id": serialized_user_id,
        "code": scan.get("code", ""),
        "language": scan.get("language", ""),
        "vulnerabilities": vulnerabilities,
        "totalIssues": total_issues,
        "riskScore": risk_score,
        "grade": grade,
        "status": status,
        "confidence": confidence,
        "summary": normalized_summary,
        "critical": normalized_summary["critical"],
        "high": normalized_summary["high"],
        "medium": normalized_summary["medium"],
        "low": normalized_summary["low"],
        "scanTime": scan_time,
        "created_at": created_at,
        "updated_at": updated_at
    }


# ============================================================
# HELPER: MIRROR DOCUMENT INTO scan_reports
# ============================================================

def _save_report_mirror(document):
    """
    Save the same completed scan document into scan_reports.

    The same _id is intentionally reused so that:
        scan_history._id == scan_reports._id

    This makes report lookup/download/delete consistent.
    """

    if scan_reports_collection is None:
        return False

    if _same_collection(
        scan_history_collection,
        scan_reports_collection
    ):
        return False

    report_document = deepcopy(document)

    scan_reports_collection.insert_one(
        report_document
    )

    return True


# ============================================================
# HELPER: REMOVE REPORT MIRROR
# ============================================================

def _delete_report_mirror(
    scan_id,
    user_id
):
    """
    Delete the corresponding scan_reports document.

    User ID is always included in the query.
    """

    if scan_reports_collection is None:
        return 0

    if _same_collection(
        scan_history_collection,
        scan_reports_collection
    ):
        return 0

    try:
        object_id = ObjectId(str(scan_id))

    except Exception:
        return 0

    query = {
        "_id": object_id
    }

    query.update(
        build_user_query(user_id)
    )

    result = scan_reports_collection.delete_one(
        query
    )

    return result.deleted_count


# ============================================================
# SAVE SCAN HISTORY + REPORT
# ============================================================

def save_scan_history(
    user_id,
    code,
    language,
    scan_result
):
    """
    Save completed security scan into MongoDB.

    Existing scan-history behavior is preserved.

    NEW FIX:
        The completed scan is also mirrored into
        scan_reports_collection.

    Security:
        user_id is mandatory.
    """

    try:

        collection = get_scan_collection()

        if collection is None:
            raise Exception(
                "MongoDB scan history collection is unavailable"
            )

        normalized_user_id = normalize_user_id(
            user_id
        )

        if normalized_user_id is None:
            raise ValueError(
                "Authenticated user_id is required"
            )

        if not isinstance(
            scan_result,
            dict
        ):
            scan_result = {}

        document = create_scan_history_document(
            user_id=normalized_user_id,
            code=code,
            language=language,
            scan_result=scan_result
        )

        if not isinstance(
            document,
            dict
        ):
            raise Exception(
                "Invalid scan history document"
            )

        document["user_id"] = normalized_user_id

        # ----------------------------------------------------
        # Ensure both collections use the SAME _id.
        # ----------------------------------------------------

        if "_id" not in document:
            document["_id"] = ObjectId()

        inserted_id = str(
            document["_id"]
        )

        # ----------------------------------------------------
        # Primary scan history insert.
        # ----------------------------------------------------

        history_inserted = False
        report_inserted = False

        try:

            collection.insert_one(
                document
            )

            history_inserted = True

            # ------------------------------------------------
            # Mirror to scan_reports.
            # ------------------------------------------------

            report_inserted = _save_report_mirror(
                document
            )

            print(
                "✅ Scan History Saved:",
                inserted_id
            )

            if report_inserted:
                print(
                    "✅ Scan Report Saved:",
                    inserted_id
                )

            elif scan_reports_collection is None:
                print(
                    "⚠️ scan_reports collection unavailable; "
                    "scan_history saved normally."
                )

            elif _same_collection(
                scan_history_collection,
                scan_reports_collection
            ):
                print(
                    "ℹ️ scan_history and scan_reports "
                    "reference the same collection."
                )

            print(
                "Saved User ID:",
                normalized_user_id
            )

            return inserted_id

        except Exception:

            # If history was inserted but report mirror failed,
            # rollback the history insert so the two collections
            # do not silently diverge.
            if history_inserted and not report_inserted:

                try:
                    collection.delete_one({
                        "_id": document["_id"],
                        **build_user_query(
                            normalized_user_id
                        )
                    })

                except Exception as rollback_error:
                    print(
                        "⚠️ History rollback error:",
                        str(rollback_error)
                    )

            raise

    except Exception as error:

        print(
            "❌ Save Scan History Error:",
            str(error)
        )

        raise


# ============================================================
# GET USER SCAN HISTORY
# ============================================================

def get_user_scan_history(
    user_id,
    limit=50
):
    """
    Get scan history for a specific user.
    """

    return get_scan_history(
        user_id=user_id,
        limit=limit
    )


# ============================================================
# GET USER SCAN HISTORY
# ============================================================

def get_scan_history(
    user_id=None,
    limit=50
):
    """
    Get scan history for the authenticated user.

    Security:
        user_id is required.
    """

    try:

        collection = get_scan_collection()

        if collection is None:

            print(
                "❌ MongoDB scan history collection "
                "is unavailable"
            )

            return []

        normalized_user_id = normalize_user_id(
            user_id
        )

        if normalized_user_id is None:

            print(
                "⚠️ Scan history request rejected: "
                "missing user_id"
            )

            return []

        try:
            limit = int(limit)

        except Exception:
            limit = 50

        limit = max(
            1,
            min(
                limit,
                100
            )
        )

        query = build_user_query(
            normalized_user_id
        )

        print(
            "\n========== HISTORY DATABASE QUERY =========="
        )

        print(
            "USER ID:",
            normalized_user_id
        )

        print(
            "QUERY:",
            query
        )

        documents = list(
            collection
            .find(query)
            .sort(
                "created_at",
                -1
            )
            .limit(limit)
        )

        print(
            "DATABASE RECORD COUNT:",
            len(documents)
        )

        return [
            serialize_scan(document)
            for document in documents
        ]

    except Exception as error:

        print(
            "❌ Get Scan History Error:",
            str(error)
        )

        return []


# ============================================================
# GET SINGLE SCAN
# ============================================================

def get_scan_by_id(
    scan_id,
    user_id=None
):
    """
    Get a single scan by MongoDB ID.

    Security:
        user_id is required.
    """

    try:

        collection = get_scan_collection()

        if collection is None:

            print(
                "❌ MongoDB scan history collection "
                "is unavailable"
            )

            return None

        normalized_user_id = normalize_user_id(
            user_id
        )

        if normalized_user_id is None:

            print(
                "⚠️ Single scan request rejected: "
                "missing user_id"
            )

            return None

        try:

            object_id = ObjectId(
                str(scan_id)
            )

        except Exception:

            print(
                "❌ Invalid scan ID:",
                scan_id
            )

            return None

        query = {
            "_id": object_id
        }

        query.update(
            build_user_query(
                normalized_user_id
            )
        )

        print(
            "\n========== SINGLE SCAN QUERY =========="
        )

        print(
            "SCAN ID:",
            scan_id
        )

        print(
            "USER ID:",
            normalized_user_id
        )

        print(
            "QUERY:",
            query
        )

        document = collection.find_one(
            query
        )

        return serialize_scan(
            document
        )

    except Exception as error:

        print(
            "❌ Get Scan By ID Error:",
            str(error)
        )

        return None


# ============================================================
# DELETE SCAN BY ID
# ============================================================

def delete_scan_by_id(
    scan_id,
    user_id=None
):
    """
    Delete a scan by MongoDB ID.

    Security:
        user_id is required.

    Deletes from:
        1. scan_history
        2. scan_reports
    """

    try:

        collection = get_scan_collection()

        if collection is None:

            print(
                "❌ MongoDB scan history collection "
                "is unavailable"
            )

            return False

        normalized_user_id = normalize_user_id(
            user_id
        )

        if normalized_user_id is None:

            print(
                "⚠️ Delete request rejected: "
                "missing user_id"
            )

            return False

        try:

            object_id = ObjectId(
                str(scan_id)
            )

        except Exception:

            print(
                "❌ Invalid scan ID:",
                scan_id
            )

            return False

        query = {
            "_id": object_id
        }

        query.update(
            build_user_query(
                normalized_user_id
            )
        )

        print(
            "\n========== DELETE SCAN QUERY =========="
        )

        print(
            "SCAN ID:",
            scan_id
        )

        print(
            "USER ID:",
            normalized_user_id
        )

        print(
            "QUERY:",
            query
        )

        result = collection.delete_one(
            query
        )

        if result.deleted_count > 0:

            # ------------------------------------------------
            # Delete matching report document too.
            # ------------------------------------------------

            deleted_report_count = (
                _delete_report_mirror(
                    scan_id=scan_id,
                    user_id=normalized_user_id
                )
            )

            print(
                "✅ Scan History Deleted:",
                scan_id
            )

            print(
                "Deleted By User:",
                normalized_user_id
            )

            print(
                "Scan Reports Deleted:",
                deleted_report_count
            )

            return True

        print(
            "⚠️ Scan History Not Found:",
            scan_id
        )

        return False

    except Exception as error:

        print(
            "❌ Delete Scan Error:",
            str(error)
        )

        return False


# ============================================================
# BACKWARD COMPATIBILITY
# ============================================================

def delete_scan_history(
    scan_id,
    user_id=None
):
    """
    Backward-compatible alias for delete_scan_by_id().
    """

    return delete_scan_by_id(
        scan_id=scan_id,
        user_id=user_id
    )
