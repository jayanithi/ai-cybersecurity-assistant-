from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from collections import Counter, defaultdict
from datetime import datetime, timezone
from bson import ObjectId
import traceback

from database import mongodb


# ============================================================
# ANALYTICS BLUEPRINT
# ============================================================

analytics_bp = Blueprint(
    "analytics",
    __name__,
    url_prefix="/analytics"
)


# ============================================================
# DATABASE COLLECTIONS
# ============================================================
# Keep BOTH collections for backward compatibility.
# scan_history is the current primary source; scan_reports is fallback.

scan_reports_collection = getattr(
    mongodb,
    "scan_reports_collection",
    None
)

scan_history_collection = getattr(
    mongodb,
    "scan_history_collection",
    None
)

if scan_history_collection is None:
    scan_history_collection = getattr(
        mongodb,
        "scan_history",
        None
    )


# ============================================================
# GENERIC HELPERS
# ============================================================

def safe_float(value, default=0.0):
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value, default=0):
    if value is None:
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def first_value(*values, default=None):
    """Return first non-empty value without discarding valid zero values."""
    for value in values:
        if value is not None and value != "":
            return value
    return default


def normalize_language(value):
    if not value:
        return "Unknown"
    return str(value).strip() or "Unknown"


def normalize_status(value):
    if not value:
        return ""
    return str(value).strip().lower()


def calculate_grade(risk_score):
    risk_score = safe_float(risk_score)

    if risk_score <= 20:
        return "A"
    elif risk_score <= 40:
        return "B"
    elif risk_score <= 60:
        return "C"
    elif risk_score <= 80:
        return "D"
    return "F"


# ============================================================
# JWT / USER HELPERS
# ============================================================

def current_user_id():
    """Return the current JWT identity as a string."""
    try:
        identity = get_jwt_identity()
        if identity is None or identity == "":
            return None
        return str(identity)
    except Exception:
        return None


def _extract_stored_user_id(doc):
    """Read user id from all user-id field variants used by the project."""
    if not isinstance(doc, dict):
        return None

    stored = first_value(
        doc.get("user_id"),
        doc.get("userId"),
        doc.get("userID"),
        default=None
    )

    if isinstance(stored, dict):
        stored = first_value(
            stored.get("$oid"),
            stored.get("id"),
            stored.get("_id"),
            default=None
        )

    if stored is None:
        return None

    return str(stored)


def _user_id_values(identity):
    """
    Build values that match either a string user_id or an ObjectId user_id.
    """
    if identity is None or identity == "":
        return []

    identity_string = str(identity)
    values = [identity_string]

    try:
        object_id = ObjectId(identity_string)
        values.append(object_id)
    except Exception:
        pass

    # Remove duplicates while preserving order.
    unique = []
    for value in values:
        if value not in unique:
            unique.append(value)
    return unique


def build_user_query(identity):
    """
    Build a STRICT MongoDB ownership query.

    IMPORTANT:
    - Current users only see documents belonging to their JWT identity.
    - Documents with missing user_id are NOT treated as public data.
    - Both string and ObjectId user_id formats are supported.
    """
    values = _user_id_values(identity)

    if not values:
        # Never return {} here. {} would expose every user's data.
        return {"_id": {"$exists": False}}

    user_conditions = [
        {"user_id": {"$in": values}},
        {"userId": {"$in": values}},
        {"userID": {"$in": values}},
    ]

    return {"$or": user_conditions}


def user_matches(doc, identity):
    """
    Strict ownership check for already-loaded documents.

    Unlike the old implementation, records without a user_id are NOT
    visible to authenticated users. This prevents a new account from
    inheriting old/legacy dashboard data.
    """
    if not identity:
        return False

    stored = _extract_stored_user_id(doc)
    if stored is None:
        return False

    identity_string = str(identity)

    if stored == identity_string:
        return True

    # Handle the rare case where one side is an ObjectId representation.
    try:
        return str(ObjectId(stored)) == identity_string
    except Exception:
        return False


# ============================================================
# NESTED SCAN DATA HELPERS
# ============================================================

def scan_result(doc):
    """
    Support all result structures used by the project:
      scan_result
      scanResult
      result
      direct top-level fields
    """
    if not isinstance(doc, dict):
        return {}

    for key in (
        "scan_result",
        "scanResult",
        "result"
    ):
        value = doc.get(key)
        if isinstance(value, dict):
            return value

    return doc


def get_vulnerabilities(report):
    """Support vulnerabilities/issues at both nested and top level."""
    if not isinstance(report, dict):
        return []

    result = scan_result(report)

    vulnerabilities = first_value(
        result.get("vulnerabilities"),
        result.get("issues"),
        report.get("vulnerabilities"),
        report.get("issues"),
        default=[]
    )

    if isinstance(vulnerabilities, dict):
        vulnerabilities = first_value(
            vulnerabilities.get("items"),
            vulnerabilities.get("data"),
            vulnerabilities.get("results"),
            default=[]
        )

    if not isinstance(vulnerabilities, list):
        return []

    return vulnerabilities


# ============================================================
# DATE PARSING
# ============================================================

def parse_report_date(report):
    """Safely detect report date from all supported date fields."""
    if not isinstance(report, dict):
        return None

    result = scan_result(report)

    possible_values = [
        report.get("createdAt"),
        report.get("created_at"),
        report.get("updatedAt"),
        report.get("updated_at"),
        report.get("timestamp"),
        report.get("scannedAt"),
        report.get("scanned_at"),
        report.get("date"),
        report.get("scanTime"),
        result.get("createdAt"),
        result.get("created_at"),
        result.get("timestamp"),
        result.get("scannedAt"),
        result.get("scanned_at"),
        result.get("date"),
        result.get("scanTime"),
    ]

    for value in possible_values:
        if not value:
            continue

        if isinstance(value, datetime):
            return value

        if isinstance(value, dict):
            value = value.get("$date")

        if isinstance(value, (int, float)):
            try:
                timestamp = float(value)
                if timestamp > 100000000000:
                    timestamp /= 1000
                return datetime.fromtimestamp(timestamp, tz=timezone.utc)
            except Exception:
                pass

        if isinstance(value, str):
            text = value.strip()
            if not text:
                continue

            try:
                return datetime.fromisoformat(
                    text.replace("Z", "+00:00")
                )
            except Exception:
                pass

            formats = [
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d",
                "%d-%m-%Y",
                "%d/%m/%Y",
                "%m/%d/%Y",
                "%Y/%m/%d",
            ]

            for date_format in formats:
                try:
                    return datetime.strptime(text, date_format)
                except Exception:
                    continue

    oid = report.get("_id")
    if isinstance(oid, ObjectId):
        try:
            return oid.generation_time
        except Exception:
            pass

    return None


def parse_report_datetime(report):
    """Backward-compatible helper name."""
    return parse_report_date(report)


# ============================================================
# NORMALIZE ONE MONGODB SCAN
# ============================================================

def normalize_scan(doc):
    """Convert a MongoDB scan document into a stable frontend shape."""
    if not isinstance(doc, dict):
        return None

    result = scan_result(doc)
    vulnerabilities = get_vulnerabilities(doc)

    total_issues_value = first_value(
        result.get("totalIssues"),
        result.get("total_issues"),
        result.get("issueCount"),
        result.get("issuesCount"),
        doc.get("totalIssues"),
        doc.get("total_issues"),
        doc.get("issueCount"),
        doc.get("issuesCount"),
        default=len(vulnerabilities)
    )

    total_issues = safe_int(
        total_issues_value,
        default=len(vulnerabilities)
    )

    if total_issues == 0 and vulnerabilities:
        total_issues = len(vulnerabilities)

    risk_value = first_value(
        result.get("riskScore"),
        result.get("risk_score"),
        result.get("risk"),
        doc.get("riskScore"),
        doc.get("risk_score"),
        doc.get("risk"),
        default=0
    )

    risk_score = safe_float(risk_value)
    risk_score = max(0, min(100, round(risk_score, 2)))

    status = first_value(
        result.get("status"),
        doc.get("status")
    )

    if not status:
        status = (
            "Unsafe"
            if total_issues > 0 or risk_score > 0
            else "Safe"
        )
    else:
        status = str(status).strip()

    language = first_value(
        result.get("language"),
        result.get("programmingLanguage"),
        result.get("programming_language"),
        doc.get("language"),
        doc.get("programmingLanguage"),
        doc.get("programming_language"),
        default="Unknown"
    )
    language = normalize_language(language)

    grade_value = first_value(
        result.get("grade"),
        doc.get("grade"),
        default=None
    )
    security_grade = (
        str(grade_value).strip()
        if grade_value
        else calculate_grade(risk_score)
    )

    confidence = safe_float(
        first_value(
            result.get("confidence"),
            doc.get("confidence"),
            default=0
        )
    )

    clean_vulnerabilities = [
        vulnerability
        for vulnerability in vulnerabilities
        if isinstance(vulnerability, dict)
    ]

    created = parse_report_date(doc)
    user_id = _extract_stored_user_id(doc)
    scan_id = str(doc.get("_id", doc.get("id", "")))

    return {
        "id": scan_id,
        "_id": scan_id,
        "user_id": user_id,
        "language": language,
        "riskScore": risk_score,
        "risk_score": risk_score,
        "status": status,
        "grade": security_grade,
        "confidence": confidence,
        "totalIssues": total_issues,
        "total_issues": total_issues,
        "issues": total_issues,
        "vulnerabilities": clean_vulnerabilities,
        "createdAt": created.isoformat() if created else None,
        "date": created.strftime("%Y-%m-%d") if created else None,
    }


# ============================================================
# LOAD SCANS FROM MONGODB - STRICT USER ISOLATION
# ============================================================

def _safe_find(collection, query=None, limit=None):
    """
    Safely query one collection.

    The query is intentionally supplied by the caller so ownership is
    enforced directly in MongoDB instead of loading everybody's data first.
    """
    if collection is None:
        return []

    query = query or {}

    try:
        cursor = collection.find(query).sort("_id", -1)
        if limit is not None:
            cursor = cursor.limit(limit)
        return list(cursor)
    except Exception:
        try:
            cursor = collection.find(query)
            if limit is not None:
                cursor = cursor.limit(limit)
            return list(cursor)
        except Exception:
            traceback.print_exc()
            return []


def _filter_docs_by_user(docs, identity):
    """Final in-Python ownership check for defense in depth."""
    if not identity:
        return []
    return [doc for doc in docs if user_matches(doc, identity)]


def load_scans(identity=None):
    """
    Load ONLY the current authenticated user's scans.

    Priority:
      1. scan_history_collection
      2. scan_reports_collection if no matching scan_history records exist

    Critical isolation rules:
      - JWT identity is required.
      - Missing user_id documents are excluded.
      - No global/all-record fallback is allowed.
      - String and ObjectId user IDs are both supported.
    """
    if not identity:
        print("[Analytics] No JWT user identity. Returning empty dashboard.")
        return []

    identity = str(identity)
    user_query = build_user_query(identity)

    history_docs = _safe_find(
        scan_history_collection,
        user_query
    )

    report_docs = _safe_find(
        scan_reports_collection,
        user_query
    )

    # Defense in depth: even if a MongoDB driver/old schema behaves
    # unexpectedly, never allow a document belonging to another user.
    history_docs = _filter_docs_by_user(history_docs, identity)
    report_docs = _filter_docs_by_user(report_docs, identity)

    print("[Analytics] Current JWT user:", identity)
    print("[Analytics] scan_history matching records:", len(history_docs))
    print("[Analytics] scan_reports matching records:", len(report_docs))

    # scan_history is the current source. Use reports only when this
    # particular user has no history records.
    if history_docs:
        docs = history_docs
        source = "scan_history"
    elif report_docs:
        docs = report_docs
        source = "scan_reports"
    else:
        print("[Analytics] No scans for current user. Fresh dashboard.")
        return []

    normalized = []
    for doc in docs:
        item = normalize_scan(doc)
        if item is not None:
            normalized.append(item)

    print("[Analytics] Source used:", source)
    print("[Analytics] User scans used:", len(normalized))

    return normalized


# ============================================================
# BUILD DASHBOARD DATA
# ============================================================

def build_dashboard(scans):
    total_scans = len(scans)

    safe_scans = sum(
        1
        for scan in scans
        if normalize_status(scan.get("status")) == "safe"
    )

    unsafe_scans = total_scans - safe_scans

    risk_scores = [
        safe_float(scan.get("riskScore"))
        for scan in scans
    ]

    average_risk = (
        round(sum(risk_scores) / len(risk_scores), 2)
        if risk_scores
        else 0
    )

    severity_count = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
    }

    language_count = Counter()
    total_vulnerabilities = 0
    trend_scores = defaultdict(list)

    for scan in scans:
        language_count[
            normalize_language(scan.get("language"))
        ] += 1

        vulnerabilities = scan.get("vulnerabilities") or []
        total_vulnerabilities += safe_int(
            scan.get("totalIssues"),
            default=len(vulnerabilities)
        )

        for vulnerability in vulnerabilities:
            if not isinstance(vulnerability, dict):
                continue

            severity = str(
                first_value(
                    vulnerability.get("severity"),
                    vulnerability.get("level"),
                    default=""
                )
            ).strip().lower()

            if severity in severity_count:
                severity_count[severity] += 1

        date_key = scan.get("date")
        if date_key:
            trend_scores[date_key].append(
                safe_float(scan.get("riskScore"))
            )

    risk_trend = []

    for date_key in sorted(trend_scores.keys()):
        scores = trend_scores[date_key]
        if not scores:
            continue

        risk_trend.append({
            "date": date_key,
            "riskScore": round(sum(scores) / len(scores), 2),
            "scans": len(scores),
            "count": len(scores)
        })

    if not risk_trend and scans:
        fallback_scans = scans[:10]
        fallback_scans.reverse()

        for index, scan in enumerate(fallback_scans, start=1):
            risk_trend.append({
                "date": f"Scan {index}",
                "riskScore": safe_float(scan.get("riskScore")),
                "scans": 1,
                "count": 1
            })

    recent_scans = scans[:10]

    source = (
        "scan_history"
        if scan_history_collection is not None
        else "scan_reports"
    )

    return {
        "success": True,
        "source": source,
        "totalScans": total_scans,
        "safeScans": safe_scans,
        "unsafeScans": unsafe_scans,
        "safeProjects": safe_scans,
        "unsafeProjects": unsafe_scans,
        "averageRisk": average_risk,
        "averageRiskScore": average_risk,
        "securityGrade": calculate_grade(average_risk),
        "totalVulnerabilities": total_vulnerabilities,
        "severity": severity_count,
        "critical": severity_count["critical"],
        "high": severity_count["high"],
        "medium": severity_count["medium"],
        "low": severity_count["low"],
        "languages": dict(language_count),
        "recentScans": recent_scans,
        "riskTrend": risk_trend
    }


# ============================================================
# DASHBOARD ANALYTICS
# ============================================================

@analytics_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def get_dashboard_analytics():
    try:
        print("\n================================")
        print("Dashboard API Started")
        print("================================")

        identity = current_user_id()
        scans = load_scans(identity)
        response = build_dashboard(scans)

        print("[Analytics] JWT user:", identity)
        print("[Analytics] MongoDB scans used:", len(scans))
        print("[Analytics] Dashboard Response:", response)

        print("================================")
        print("Dashboard API Success")
        print("================================")

        return jsonify(response), 200

    except Exception as e:
        print("\n================================")
        print("Dashboard Analytics Error")
        print("Error:", str(e))
        traceback.print_exc()
        print("================================")

        return jsonify({
            "success": False,
            "message": "Failed to load dashboard analytics",
            "error": str(e)
        }), 500


# ============================================================
# LANGUAGE STATISTICS
# ============================================================

@analytics_bp.route("/languages", methods=["GET"])
@jwt_required()
def language_stats():
    try:
        scans = load_scans(current_user_id())
        language_count = Counter()

        for scan in scans:
            language_count[
                normalize_language(scan.get("language"))
            ] += 1

        result = [
            {"language": language, "count": count}
            for language, count in language_count.items()
        ]
        result.sort(key=lambda item: item["count"], reverse=True)

        return jsonify(result), 200

    except Exception as e:
        print("Language statistics error:", str(e))
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": "Failed to load language statistics",
            "error": str(e)
        }), 500


# ============================================================
# STATUS STATISTICS
# ============================================================

@analytics_bp.route("/status", methods=["GET"])
@jwt_required()
def status_stats():
    try:
        scans = load_scans(current_user_id())

        safe = sum(
            1
            for scan in scans
            if normalize_status(scan.get("status")) == "safe"
        )
        unsafe = len(scans) - safe

        return jsonify([
            {"name": "Safe", "value": safe},
            {"name": "Unsafe", "value": unsafe}
        ]), 200

    except Exception as e:
        print("Status statistics error:", str(e))
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": "Failed to load status statistics",
            "error": str(e)
        }), 500


# ============================================================
# SEVERITY STATISTICS
# ============================================================

@analytics_bp.route("/severity", methods=["GET"])
@jwt_required()
def severity_stats():
    try:
        scans = load_scans(current_user_id())

        severity_count = {
            "Critical": 0,
            "High": 0,
            "Medium": 0,
            "Low": 0
        }

        for scan in scans:
            for vulnerability in scan.get("vulnerabilities") or []:
                if not isinstance(vulnerability, dict):
                    continue

                severity = str(
                    first_value(
                        vulnerability.get("severity"),
                        vulnerability.get("level"),
                        default="low"
                    )
                ).strip().lower()

                if severity == "critical":
                    severity_count["Critical"] += 1
                elif severity == "high":
                    severity_count["High"] += 1
                elif severity == "medium":
                    severity_count["Medium"] += 1
                elif severity == "low":
                    severity_count["Low"] += 1

        return jsonify([
            {"name": name, "value": value}
            for name, value in severity_count.items()
        ]), 200

    except Exception as e:
        print("Severity statistics error:", str(e))
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": "Failed to load severity statistics",
            "error": str(e)
        }), 500


# ============================================================
# CWE STATISTICS
# ============================================================

@analytics_bp.route("/cwe", methods=["GET"])
@jwt_required()
def cwe_statistics():
    try:
        scans = load_scans(current_user_id())
        cwe_count = Counter()

        for scan in scans:
            for vulnerability in scan.get("vulnerabilities") or []:
                if not isinstance(vulnerability, dict):
                    continue

                cwe = first_value(
                    vulnerability.get("cwe"),
                    vulnerability.get("CWE"),
                    vulnerability.get("cwe_id"),
                    vulnerability.get("cweId"),
                    default="Unknown"
                )

                cwe = str(cwe).strip() or "Unknown"
                cwe_count[cwe] += 1

        result = [
            {"cwe": cwe, "count": count}
            for cwe, count in cwe_count.most_common(10)
        ]

        return jsonify(result), 200

    except Exception as e:
        print("CWE statistics error:", str(e))
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": "Failed to load CWE statistics",
            "error": str(e)
        }), 500


# ============================================================
# RISK TREND
# ============================================================

@analytics_bp.route("/risk-trend", methods=["GET"])
@jwt_required()
def risk_trend():
    try:
        scans = load_scans(current_user_id())
        trend_scores = defaultdict(list)

        for scan in scans:
            date_key = scan.get("date")
            if not date_key:
                continue

            trend_scores[date_key].append(
                safe_float(scan.get("riskScore"))
            )

        result = []

        for date_key in sorted(trend_scores.keys()):
            scores = trend_scores[date_key]
            if not scores:
                continue

            result.append({
                "date": date_key,
                "riskScore": round(sum(scores) / len(scores), 2),
                "scans": len(scores),
                "count": len(scores)
            })

        if not result and scans:
            fallback_scans = scans[:10]
            fallback_scans.reverse()

            for index, scan in enumerate(fallback_scans, start=1):
                result.append({
                    "date": f"Scan {index}",
                    "riskScore": safe_float(scan.get("riskScore")),
                    "scans": 1,
                    "count": 1
                })

        return jsonify(result), 200

    except Exception as e:
        print("Risk trend error:", str(e))
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": "Failed to load risk trend",
            "error": str(e)
        }), 500


# ============================================================
# RECENT SCANS
# ============================================================

@analytics_bp.route("/recent", methods=["GET"])
@jwt_required()
def recent_scans():
    try:
        scans = load_scans(current_user_id())
        result = []

        for scan in scans[:10]:
            result.append({
                "id": scan.get("id", ""),
                "_id": scan.get("_id", scan.get("id", "")),
                "user_id": scan.get("user_id"),
                "language": normalize_language(scan.get("language")),
                "riskScore": safe_float(scan.get("riskScore")),
                "status": scan.get("status") or "Safe",
                "issues": safe_int(
                    scan.get("issues"),
                    default=safe_int(scan.get("totalIssues"))
                ),
                "totalIssues": safe_int(
                    scan.get("totalIssues"),
                    default=safe_int(scan.get("issues"))
                ),
                "grade": scan.get("grade") or calculate_grade(
                    scan.get("riskScore")
                ),
                "confidence": safe_float(scan.get("confidence")),
                "createdAt": scan.get("createdAt"),
                "date": scan.get("date")
            })

        return jsonify(result), 200

    except Exception as e:
        print("Recent scans error:", str(e))
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": "Failed to load recent scans",
            "error": str(e)
        }), 500
