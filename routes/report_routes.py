# ============================================================
# routes/report_routes.py
# ============================================================

from flask import (
    Blueprint,
    request,
    jsonify,
    send_file,
    after_this_request,
)

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
)

from bson import ObjectId

from datetime import datetime
from io import BytesIO, StringIO
import csv
import os
import tempfile

from database.mongodb import scan_history_collection
from services.scan_history_service import build_user_query

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from reportlab.lib.units import mm


# ============================================================
# BLUEPRINT
# ============================================================

report_bp = Blueprint(
    "reports",
    __name__,
    url_prefix="/reports",
)


# ============================================================
# CONSTANTS
# ============================================================

MAX_LIMIT = 100
DEFAULT_LIMIT = 10

ALLOWED_SORT_FIELDS = {
    "createdAt": "created_at",
    "created_at": "created_at",
    "scanTime": "created_at",
    "riskScore": "risk_score",
    "risk_score": "risk_score",
    "grade": "grade",
    "totalIssues": "total_issues",
    "total_issues": "total_issues",
    "_id": "_id",
}

ALLOWED_SORT_ORDER = {
    "asc": 1,
    "ascending": 1,
    "desc": -1,
    "descending": -1,
}


# ============================================================
# BASIC HELPERS
# ============================================================

def safe_string(value, default=""):
    """Safely convert value to string."""

    if value is None:
        return default

    try:
        return str(value)
    except Exception:
        return default


# ============================================================
# OBJECT ID
# ============================================================

def parse_object_id(value):
    """Convert valid ObjectId string to ObjectId."""

    if value is None:
        return None

    value = safe_string(value).strip()

    if not value:
        return None

    if not ObjectId.is_valid(value):
        return None

    try:
        return ObjectId(value)
    except Exception:
        return None


# ============================================================
# JSON SAFE
# ============================================================

def make_json_safe(value):
    """Recursively convert MongoDB/Python values to JSON safe values."""

    if isinstance(value, ObjectId):
        return str(value)

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, bytes):
        try:
            return value.decode("utf-8")
        except Exception:
            return str(value)

    if isinstance(value, dict):
        return {
            str(key): make_json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            make_json_safe(item)
            for item in value
        ]

    if isinstance(value, tuple):
        return [
            make_json_safe(item)
            for item in value
        ]

    return value


# ============================================================
# NESTED SCAN RESULT
# ============================================================

def get_nested_scan_result(report):
    """Get nested scan_result safely."""

    if not isinstance(report, dict):
        return {}

    nested = (
        report.get("scan_result")
        or report.get("scanResult")
        or {}
    )

    if not isinstance(nested, dict):
        return {}

    return nested


# ============================================================
# VULNERABILITIES
# ============================================================

def get_vulnerabilities(report):
    """Get vulnerabilities from supported field names."""

    if not isinstance(report, dict):
        return []

    nested = get_nested_scan_result(report)

    vulnerabilities = (
        report.get("vulnerabilities")
        or report.get("findings")
        or report.get("issues")
        or nested.get("vulnerabilities")
        or nested.get("findings")
        or nested.get("issues")
        or []
    )

    if not isinstance(vulnerabilities, list):
        return []

    return vulnerabilities


# ============================================================
# RISK SCORE
# ============================================================

def get_risk_score(report):
    """Get normalized risk score."""

    if not isinstance(report, dict):
        return 0

    nested = get_nested_scan_result(report)

    value = (
        report.get("riskScore")
        if report.get("riskScore") is not None
        else report.get("risk_score")
    )

    if value is None:
        value = (
            nested.get("riskScore")
            if nested.get("riskScore") is not None
            else nested.get("risk_score")
        )

    try:
        score = float(value or 0)

        score = max(
            0,
            min(100, score)
        )

        if score.is_integer():
            return int(score)

        return score

    except (TypeError, ValueError):
        return 0


# ============================================================
# TOTAL ISSUES
# ============================================================

def get_total_issues(report):
    """Get total vulnerability count."""

    if not isinstance(report, dict):
        return 0

    nested = get_nested_scan_result(report)
    vulnerabilities = get_vulnerabilities(report)

    value = (
        report.get("totalIssues")
        if report.get("totalIssues") is not None
        else report.get("total_issues")
    )

    if value is None:
        value = (
            report.get("totalVulnerabilities")
            if report.get("totalVulnerabilities") is not None
            else report.get("total_vulnerabilities")
        )

    if value is None:
        value = (
            nested.get("totalIssues")
            if nested.get("totalIssues") is not None
            else nested.get("total_issues")
        )

    if value is None:
        value = len(vulnerabilities)

    try:
        return max(
            0,
            int(value)
        )
    except (TypeError, ValueError):
        return len(vulnerabilities)


# ============================================================
# GRADE
# ============================================================

def calculate_grade_from_score(score):
    """Fallback grade."""

    try:
        score = float(score)
    except (TypeError, ValueError):
        return "F"

    if score <= 20:
        return "A"

    if score <= 40:
        return "B"

    if score <= 60:
        return "C"

    if score <= 80:
        return "D"

    return "F"


def get_grade(report):
    """Preserve stored grade if available."""

    if not isinstance(report, dict):
        return "F"

    nested = get_nested_scan_result(report)

    grade = (
        report.get("grade")
        or report.get("securityGrade")
        or nested.get("grade")
        or nested.get("securityGrade")
    )

    if grade is not None:
        grade_string = (
            safe_string(grade)
            .strip()
            .upper()
        )

        if grade_string:
            return grade_string

    return calculate_grade_from_score(
        get_risk_score(report)
    )


# ============================================================
# RISK LEVEL
# ============================================================

def get_risk_level(score):
    """Calculate risk level."""

    try:
        score = float(score)
    except (TypeError, ValueError):
        score = 0

    if score >= 90:
        return "Critical"

    if score >= 70:
        return "High"

    if score >= 40:
        return "Medium"

    return "Low"


# ============================================================
# STATUS
# ============================================================

def get_status(report):
    """Preserve stored status or calculate it."""

    if not isinstance(report, dict):
        return "Safe"

    nested = get_nested_scan_result(report)

    status = (
        report.get("status")
        or nested.get("status")
    )

    if status:
        status_string = (
            safe_string(status)
            .strip()
            .lower()
        )

        if status_string == "safe":
            return "Safe"

        if status_string == "unsafe":
            return "Unsafe"

        return safe_string(status).strip()

    if get_total_issues(report) > 0:
        return "Unsafe"

    return "Safe"


# ============================================================
# CONFIDENCE
# ============================================================

def get_confidence(report):
    """Normalize confidence."""

    if not isinstance(report, dict):
        return None

    nested = get_nested_scan_result(report)

    confidence = (
        report.get("confidence")
        if report.get("confidence") is not None
        else nested.get("confidence")
    )

    if confidence is None:
        return None

    if isinstance(confidence, list):

        values = []

        for item in confidence:

            try:

                if isinstance(item, dict):
                    value = (
                        item.get("confidence")
                        if item.get("confidence") is not None
                        else item.get("score")
                    )
                else:
                    value = item

                values.append(float(value))

            except (
                TypeError,
                ValueError,
            ):
                continue

        if not values:
            return None

        confidence = min(values)

    try:

        value = float(confidence)

        value = max(
            0,
            min(100, value)
        )

        if value.is_integer():
            return int(value)

        return value

    except (
        TypeError,
        ValueError,
    ):
        return None


# ============================================================
# SCAN TIME
# ============================================================

def get_scan_time(report):
    """Normalize scan date."""

    if not isinstance(report, dict):
        return None

    nested = get_nested_scan_result(report)

    value = (
        report.get("scanTime")
        or report.get("scan_time")
        or report.get("createdAt")
        or report.get("created_at")
        or report.get("date")
        or report.get("timestamp")
        or nested.get("scanTime")
        or nested.get("scan_time")
        or nested.get("createdAt")
        or nested.get("created_at")
        or nested.get("date")
        or nested.get("timestamp")
    )

    return value


# ============================================================
# LANGUAGE
# ============================================================

def get_language(report):

    if not isinstance(report, dict):
        return "Unknown"

    nested = get_nested_scan_result(report)

    return (
        report.get("language")
        or report.get("programmingLanguage")
        or report.get("programming_language")
        or nested.get("language")
        or nested.get("programmingLanguage")
        or "Unknown"
    )


# ============================================================
# PROJECT NAME
# ============================================================

def get_project_name(report):

    if not isinstance(report, dict):
        return ""

    nested = get_nested_scan_result(report)

    return (
        report.get("projectName")
        or report.get("project_name")
        or nested.get("projectName")
        or nested.get("project_name")
        or ""
    )


# ============================================================
# FILE NAME
# ============================================================

def get_file_name(report):

    if not isinstance(report, dict):
        return ""

    nested = get_nested_scan_result(report)

    return (
        report.get("fileName")
        or report.get("file_name")
        or nested.get("fileName")
        or nested.get("file_name")
        or ""
    )


# ============================================================
# FINDING SEVERITY
# ============================================================

def get_finding_severity(finding):

    if not isinstance(finding, dict):
        return ""

    return safe_string(
        finding.get("severity")
        or finding.get("riskLevel")
        or finding.get("risk_level")
        or ""
    ).strip()


# ============================================================
# NORMALIZE REPORT
# ============================================================

def serialize_report(report):

    if not report:
        return None

    if not isinstance(report, dict):
        return None

    report_id = report.get("_id")

    if isinstance(report_id, ObjectId):
        report_id = str(report_id)
    elif report_id is not None:
        report_id = str(report_id)

    vulnerabilities = get_vulnerabilities(report)

    risk_score = get_risk_score(report)
    total_issues = get_total_issues(report)
    grade = get_grade(report)
    status = get_status(report)
    risk_level = get_risk_level(risk_score)
    confidence = get_confidence(report)
    scan_time = get_scan_time(report)

    language = get_language(report)
    project_name = get_project_name(report)
    file_name = get_file_name(report)

    nested = get_nested_scan_result(report)

    # --------------------------------------------------------
    # Severity counts
    # --------------------------------------------------------

    severity_counts = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "info": 0,
    }

    for finding in vulnerabilities:

        severity = (
            get_finding_severity(finding)
            .lower()
        )

        if severity in severity_counts:
            severity_counts[severity] += 1

    # --------------------------------------------------------
    # Stored summary
    # --------------------------------------------------------

    stored_summary = (
        report.get("summary")
        or nested.get("summary")
        or {}
    )

    if not isinstance(
        stored_summary,
        dict
    ):
        stored_summary = {}

    def summary_value(key):
        value = stored_summary.get(key)

        if value is None:
            return severity_counts[key]

        try:
            return max(
                0,
                int(value)
            )
        except (
            TypeError,
            ValueError,
        ):
            return severity_counts[key]

    summary = {
        "critical": summary_value("critical"),
        "high": summary_value("high"),
        "medium": summary_value("medium"),
        "low": summary_value("low"),
        "info": summary_value("info"),
    }

    normalized = {
        # IDs
        "id": report_id,
        "_id": report_id,
        "reportId": report_id,
        "report_id": report_id,
        "scanId": report_id,
        "scan_id": report_id,

        # User
        "user_id": safe_string(
            report.get("user_id")
        ),

        # Basic information
        "language": language,
        "programmingLanguage": language,

        "projectName": project_name,
        "project_name": project_name,

        "fileName": file_name,
        "file_name": file_name,

        # Security
        "riskScore": risk_score,
        "risk_score": risk_score,

        "riskLevel": risk_level,

        "grade": grade,
        "securityGrade": grade,

        "status": status,

        "confidence": confidence,

        # Issues
        "totalIssues": total_issues,
        "total_issues": total_issues,

        "totalVulnerabilities": total_issues,
        "total_vulnerabilities": total_issues,

        # Vulnerabilities
        "vulnerabilities": make_json_safe(
            vulnerabilities
        ),

        "findings": make_json_safe(
            vulnerabilities
        ),

        "issues": make_json_safe(
            vulnerabilities
        ),

        # Summary
        "summary": summary,

        # Dates
        "scanTime": make_json_safe(
            scan_time
        ),

        "scan_time": make_json_safe(
            scan_time
        ),

        "createdAt": make_json_safe(
            report.get("created_at")
            or report.get("createdAt")
            or scan_time
        ),

        "created_at": make_json_safe(
            report.get("created_at")
            or report.get("createdAt")
            or scan_time
        ),

        "updatedAt": make_json_safe(
            report.get("updated_at")
            or report.get("updatedAt")
        ),

        "updated_at": make_json_safe(
            report.get("updated_at")
            or report.get("updatedAt")
        ),

        # Original scan result
        "scan_result": make_json_safe(
            nested
        ),

        # Original code
        "code": report.get("code")
        or nested.get("code")
        or "",
    }

    return normalized


# ============================================================
# CURRENT USER QUERY
# ============================================================

def get_current_user_query():

    current_user = get_jwt_identity()

    if current_user is None:
        return None, None

    user_id = safe_string(
        current_user
    ).strip()

    if not user_id:
        return None, None

    query = build_user_query(
        user_id
    )

    return user_id, query


# ============================================================
# FETCH USER REPORTS
# ============================================================

def fetch_user_reports(
    user_query,
    sort_field="created_at",
    sort_order=-1,
):

    cursor = (
        scan_history_collection
        .find(user_query)
        .sort(
            sort_field,
            sort_order
        )
    )

    reports = []

    for document in cursor:

        normalized = serialize_report(
            document
        )

        if normalized:
            reports.append(
                normalized
            )

    return reports


# ============================================================
# SEARCH
# ============================================================

def report_matches_search(
    report,
    search,
):

    if not search:
        return True

    search = (
        safe_string(search)
        .strip()
        .lower()
    )

    if not search:
        return True

    searchable_values = [

        report.get("language"),

        report.get(
            "programmingLanguage"
        ),

        report.get(
            "projectName"
        ),

        report.get(
            "project_name"
        ),

        report.get(
            "fileName"
        ),

        report.get(
            "file_name"
        ),

        report.get(
            "status"
        ),

        report.get(
            "grade"
        ),

        report.get(
            "securityGrade"
        ),

        report.get(
            "riskLevel"
        ),

        report.get(
            "id"
        ),

        report.get(
            "_id"
        ),

        report.get(
            "scanTime"
        ),
    ]

    searchable_text = " ".join(
        safe_string(value)
        for value in searchable_values
        if value is not None
    ).lower()

    return search in searchable_text


# ============================================================
# DATE ONLY
# ============================================================

def date_only(value):

    if value is None:
        return ""

    if isinstance(
        value,
        datetime
    ):
        return value.strftime(
            "%Y-%m-%d"
        )

    value_string = (
        safe_string(value)
        .strip()
    )

    if not value_string:
        return ""

    try:

        parsed = datetime.fromisoformat(
            value_string.replace(
                "Z",
                "+00:00"
            )
        )

        return parsed.strftime(
            "%Y-%m-%d"
        )

    except ValueError:
        pass

    # FIXED:
    # candidate = value_string[:10]
    if len(value_string) >= 10:

        candidate = value_string[:10]

        try:

            datetime.strptime(
                candidate,
                "%Y-%m-%d"
            )

            return candidate

        except ValueError:
            pass

    return ""


# ============================================================
# FILTERS
# ============================================================

def apply_report_filters(
    reports,
    search="",
    status="",
    grade="",
    risk_level="",
    severity="",
    scan_date="",
):

    selected_status = (
        safe_string(status)
        .strip()
        .lower()
    )

    selected_grade = (
        safe_string(grade)
        .strip()
        .upper()
    )

    selected_risk = (
        safe_string(risk_level)
        .strip()
        .lower()
    )

    selected_severity = (
        safe_string(severity)
        .strip()
        .lower()
    )

    selected_date = (
        safe_string(scan_date)
        .strip()
    )

    filtered = []

    for report in reports:

        # Search
        if not report_matches_search(
            report,
            search
        ):
            continue

        # Status
        if selected_status:

            report_status = (
                safe_string(
                    report.get("status")
                )
                .strip()
                .lower()
            )

            if report_status != selected_status:
                continue

        # Grade
        if selected_grade:

            report_grade = (
                safe_string(
                    report.get("grade")
                )
                .strip()
                .upper()
            )

            if report_grade != selected_grade:
                continue

        # Risk Level
        if selected_risk:

            report_risk = (
                safe_string(
                    report.get("riskLevel")
                )
                .strip()
                .lower()
            )

            if report_risk != selected_risk:
                continue

        # Severity
        if selected_severity:

            severity_found = False

            for finding in report.get(
                "vulnerabilities",
                []
            ):

                finding_severity = (
                    get_finding_severity(
                        finding
                    )
                    .strip()
                    .lower()
                )

                if (
                    finding_severity
                    == selected_severity
                ):
                    severity_found = True
                    break

            if not severity_found:
                continue

        # Date
        if selected_date:

            report_date = date_only(
                report.get(
                    "scanTime"
                )
            )

            if report_date != selected_date:
                continue

        filtered.append(report)

    return filtered


# ============================================================
# GET USER REPORT BY ID
# ============================================================

def get_user_report_by_id(
    report_id,
    user_query,
):

    object_id = parse_object_id(
        report_id
    )

    if object_id is None:
        return None

    query = {
        "_id": object_id,
    }

    query.update(
        user_query
    )

    document = (
        scan_history_collection
        .find_one(query)
    )

    if not document:
        return None

    return serialize_report(
        document
    )


# ============================================================
# GET REPORTS
# ============================================================

@report_bp.route(
    "/",
    methods=["GET"]
)
@jwt_required()
def get_reports():

    try:

        user_id, user_query = (
            get_current_user_query()
        )

        if not user_id:

            return jsonify({
                "success": False,
                "message":
                    "Authenticated user not found.",
            }), 401

        page = request.args.get(
            "page",
            1,
            type=int
        )

        limit = request.args.get(
            "limit",
            DEFAULT_LIMIT,
            type=int
        )

        search = request.args.get(
            "search",
            "",
            type=str
        )

        status = request.args.get(
            "status",
            "",
            type=str
        )

        grade = request.args.get(
            "grade",
            "",
            type=str
        )

        risk_level = request.args.get(
            "riskLevel",
            "",
            type=str
        )

        severity = request.args.get(
            "severity",
            "",
            type=str
        )

        scan_date = request.args.get(
            "scanDate",
            "",
            type=str
        )

        sort_by = request.args.get(
            "sortBy",
            "createdAt",
            type=str
        )

        sort_order = request.args.get(
            "sortOrder",
            "desc",
            type=str
        ).lower()

        page = max(
            1,
            page
        )

        limit = max(
            1,
            min(
                MAX_LIMIT,
                limit
            )
        )

        sort_field = (
            ALLOWED_SORT_FIELDS.get(
                sort_by,
                "created_at"
            )
        )

        mongo_sort_order = (
            ALLOWED_SORT_ORDER.get(
                sort_order,
                -1
            )
        )

        reports = fetch_user_reports(
            user_query=user_query,
            sort_field=sort_field,
            sort_order=mongo_sort_order,
        )

        filtered_reports = apply_report_filters(
            reports=reports,
            search=search,
            status=status,
            grade=grade,
            risk_level=risk_level,
            severity=severity,
            scan_date=scan_date,
        )

        total_reports = len(
            filtered_reports
        )

        total_pages = max(
            1,
            (
                total_reports
                + limit
                - 1
            ) // limit
        )

        if page > total_pages:
            page = total_pages

        skip = (
            page - 1
        ) * limit

        paginated_reports = (
            filtered_reports[
                skip:
                skip + limit
            ]
        )

        return jsonify({

            "success": True,

            "message":
                "Reports fetched successfully.",

            "count":
                len(paginated_reports),

            "data":
                paginated_reports,

            "reports":
                paginated_reports,

            "pagination": {

                "page":
                    page,

                "limit":
                    limit,

                "totalReports":
                    total_reports,

                "totalPages":
                    total_pages,

                "hasNextPage":
                    page < total_pages,

                "hasPreviousPage":
                    page > 1,
            },

        }), 200

    except Exception as e:

        print(
            "GET REPORTS ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message":
                "Failed to fetch reports.",
            "error":
                str(e),
        }), 500


# ============================================================
# INDIVIDUAL PDF DOWNLOAD
# ============================================================

@report_bp.route(
    "/download/<report_id>",
    methods=["GET"]
)
@jwt_required()
def download_report_pdf(
    report_id
):

    temp_path = None

    try:

        user_id, user_query = (
            get_current_user_query()
        )

        if not user_id:

            return jsonify({
                "success": False,
                "message":
                    "Authenticated user not found.",
            }), 401

        report = get_user_report_by_id(
            report_id,
            user_query
        )

        if not report:

            return jsonify({
                "success": False,
                "message":
                    "Report not found.",
            }), 404

        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        )

        temp_path = temp_file.name

        temp_file.close()

        generate_single_pdf(
            report,
            temp_path
        )

        @after_this_request
        def cleanup(response):

            try:

                if (
                    temp_path
                    and os.path.exists(temp_path)
                ):
                    os.remove(temp_path)

            except Exception as cleanup_error:

                print(
                    "PDF CLEANUP ERROR:",
                    str(cleanup_error)
                )

            return response

        return send_file(
            temp_path,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=(
                f"Security_Report_"
                f"{report_id}.pdf"
            ),
        )

    except Exception as e:

        if (
            temp_path
            and os.path.exists(temp_path)
        ):
            try:
                os.remove(temp_path)
            except Exception:
                pass

        print(
            "INDIVIDUAL PDF ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message":
                "Failed to generate report PDF.",
            "error":
                str(e),
        }), 500


# ============================================================
# INDIVIDUAL REPORT DETAILS
# ============================================================

@report_bp.route(
    "/<report_id>",
    methods=["GET"]
)
@jwt_required()
def get_report(
    report_id
):

    try:

        user_id, user_query = (
            get_current_user_query()
        )

        if not user_id:

            return jsonify({
                "success": False,
                "message":
                    "Authenticated user not found.",
            }), 401

        report = get_user_report_by_id(
            report_id,
            user_query
        )

        if not report:

            return jsonify({
                "success": False,
                "message":
                    "Report not found.",
            }), 404

        return jsonify({
            "success": True,
            "data": report,
            "report": report,
        }), 200

    except Exception as e:

        print(
            "GET REPORT ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message":
                "Failed to fetch report.",
            "error":
                str(e),
        }), 500


# ============================================================
# DELETE REPORT
# ============================================================

@report_bp.route(
    "/<report_id>",
    methods=["DELETE"]
)
@jwt_required()
def delete_report(
    report_id
):

    try:

        user_id, user_query = (
            get_current_user_query()
        )

        if not user_id:

            return jsonify({
                "success": False,
                "message":
                    "Authenticated user not found.",
            }), 401

        object_id = parse_object_id(
            report_id
        )

        if object_id is None:

            return jsonify({
                "success": False,
                "message":
                    "Invalid report ID.",
            }), 400

        query = {
            "_id": object_id,
        }

        query.update(
            user_query
        )

        result = (
            scan_history_collection
            .delete_one(query)
        )

        if result.deleted_count == 0:

            return jsonify({
                "success": False,
                "message":
                    "Report not found.",
            }), 404

        return jsonify({
            "success": True,
            "message":
                "Report deleted successfully.",
            "deletedId":
                str(report_id),
        }), 200

    except Exception as e:

        print(
            "DELETE REPORT ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message":
                "Failed to delete report.",
            "error":
                str(e),
        }), 500


# ============================================================
# CSV EXPORT
# ============================================================

@report_bp.route(
    "/export/csv",
    methods=["GET"]
)
@jwt_required()
def export_reports_csv():

    try:

        user_id, user_query = (
            get_current_user_query()
        )

        if not user_id:

            return jsonify({
                "success": False,
                "message":
                    "Authenticated user not found.",
            }), 401

        search = request.args.get(
            "search",
            "",
            type=str
        )

        status = request.args.get(
            "status",
            "",
            type=str
        )

        grade = request.args.get(
            "grade",
            "",
            type=str
        )

        risk_level = request.args.get(
            "riskLevel",
            "",
            type=str
        )

        severity = request.args.get(
            "severity",
            "",
            type=str
        )

        scan_date = request.args.get(
            "scanDate",
            "",
            type=str
        )

        reports = fetch_user_reports(
            user_query=user_query,
            sort_field="created_at",
            sort_order=-1,
        )

        reports = apply_report_filters(
            reports=reports,
            search=search,
            status=status,
            grade=grade,
            risk_level=risk_level,
            severity=severity,
            scan_date=scan_date,
        )

        output = StringIO()

        writer = csv.writer(
            output
        )

        writer.writerow([
            "Report ID",
            "Language",
            "Project Name",
            "File Name",
            "Risk Score",
            "Risk Level",
            "Security Grade",
            "Status",
            "Confidence",
            "Total Issues",
            "Critical",
            "High",
            "Medium",
            "Low",
            "Info",
            "Scan Date",
        ])

        for report in reports:

            summary = (
                report.get(
                    "summary"
                )
                or {}
            )

            writer.writerow([

                report.get(
                    "id",
                    ""
                ),

                report.get(
                    "language",
                    ""
                ),

                report.get(
                    "projectName",
                    ""
                ),

                report.get(
                    "fileName",
                    ""
                ),

                report.get(
                    "riskScore",
                    0
                ),

                report.get(
                    "riskLevel",
                    ""
                ),

                report.get(
                    "grade",
                    ""
                ),

                report.get(
                    "status",
                    ""
                ),

                report.get(
                    "confidence",
                    ""
                ),

                report.get(
                    "totalIssues",
                    0
                ),

                summary.get(
                    "critical",
                    0
                ),

                summary.get(
                    "high",
                    0
                ),

                summary.get(
                    "medium",
                    0
                ),

                summary.get(
                    "low",
                    0
                ),

                summary.get(
                    "info",
                    0
                ),

                safe_string(
                    report.get(
                        "scanTime",
                        ""
                    )
                ),
            ])

        csv_bytes = (
            output
            .getvalue()
            .encode(
                "utf-8-sig"
            )
        )

        output.close()

        file_object = BytesIO(
            csv_bytes
        )

        file_object.seek(0)

        return send_file(
            file_object,
            mimetype="text/csv",
            as_attachment=True,
            download_name=(
                "Security_Scan_Reports.csv"
            ),
        )

    except Exception as e:

        print(
            "CSV EXPORT ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message":
                "Failed to export CSV.",
            "error":
                str(e),
        }), 500


# ============================================================
# PDF EXPORT
# ============================================================

@report_bp.route(
    "/export/pdf",
    methods=["GET"]
)
@jwt_required()
def export_reports_pdf():

    try:

        user_id, user_query = (
            get_current_user_query()
        )

        if not user_id:

            return jsonify({
                "success": False,
                "message":
                    "Authenticated user not found.",
            }), 401

        search = request.args.get(
            "search",
            "",
            type=str
        )

        status = request.args.get(
            "status",
            "",
            type=str
        )

        grade = request.args.get(
            "grade",
            "",
            type=str
        )

        risk_level = request.args.get(
            "riskLevel",
            "",
            type=str
        )

        severity = request.args.get(
            "severity",
            "",
            type=str
        )

        scan_date = request.args.get(
            "scanDate",
            "",
            type=str
        )

        reports = fetch_user_reports(
            user_query=user_query,
            sort_field="created_at",
            sort_order=-1,
        )

        reports = apply_report_filters(
            reports=reports,
            search=search,
            status=status,
            grade=grade,
            risk_level=risk_level,
            severity=severity,
            scan_date=scan_date,
        )

        pdf_buffer = generate_combined_pdf(
            reports
        )

        pdf_buffer.seek(0)

        return send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=(
                "Security_Scan_Reports.pdf"
            ),
        )

    except Exception as e:

        print(
            "PDF EXPORT ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message":
                "Failed to export PDF.",
            "error":
                str(e),
        }), 500


# ============================================================
# SINGLE PDF GENERATOR
# ============================================================

def generate_single_pdf(
    report,
    filename
):

    document = SimpleDocTemplate(
        filename,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = styles["Title"]
    title_style.alignment = TA_CENTER

    heading_style = styles["Heading2"]
    normal_style = styles["BodyText"]

    story = []

    story.append(
        Paragraph(
            "AI Cybersecurity Scan Report",
            title_style
        )
    )

    story.append(
        Spacer(
            1,
            10
        )
    )

    basic_data = [

        [
            "Report ID",
            safe_string(
                report.get(
                    "id",
                    ""
                )
            ),
        ],

        [
            "Language",
            safe_string(
                report.get(
                    "language",
                    "Unknown"
                )
            ),
        ],

        [
            "Project",
            safe_string(
                report.get(
                    "projectName",
                    ""
                )
            ),
        ],

        [
            "File",
            safe_string(
                report.get(
                    "fileName",
                    ""
                )
            ),
        ],

        [
            "Risk Score",
            safe_string(
                report.get(
                    "riskScore",
                    0
                )
            ),
        ],

        [
            "Risk Level",
            safe_string(
                report.get(
                    "riskLevel",
                    "Low"
                )
            ),
        ],

        [
            "Security Grade",
            safe_string(
                report.get(
                    "grade",
                    "F"
                )
            ),
        ],

        [
            "Status",
            safe_string(
                report.get(
                    "status",
                    "Safe"
                )
            ),
        ],

        [
            "Confidence",
            (
                f"{report.get('confidence')}%"
                if report.get(
                    "confidence"
                ) is not None
                else "N/A"
            ),
        ],

        [
            "Total Issues",
            safe_string(
                report.get(
                    "totalIssues",
                    0
                )
            ),
        ],

        [
            "Scan Date",
            safe_string(
                report.get(
                    "scanTime",
                    ""
                )
            ),
        ],
    ]

    basic_table = Table(
        basic_data,
        colWidths=[
            45 * mm,
            125 * mm,
        ],
    )

    basic_table.setStyle(
        TableStyle([

            (
                "BACKGROUND",
                (0, 0),
                (0, -1),
                colors.HexColor(
                    "#E5E7EB"
                ),
            ),

            (
                "TEXTCOLOR",
                (0, 0),
                (-1, -1),
                colors.black,
            ),

            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.grey,
            ),

            (
                "FONTNAME",
                (0, 0),
                (0, -1),
                "Helvetica-Bold",
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP",
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                6,
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                6,
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                5,
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                5,
            ),
        ])
    )

    story.append(
        basic_table
    )

    story.append(
        Spacer(
            1,
            15
        )
    )

    story.append(
        Paragraph(
            "Detected Vulnerabilities",
            heading_style
        )
    )

    story.append(
        Spacer(
            1,
            8
        )
    )

    vulnerabilities = (
        report.get(
            "vulnerabilities"
        )
        or []
    )

    if not vulnerabilities:

        story.append(
            Paragraph(
                "No vulnerabilities detected.",
                normal_style
            )
        )

    else:

        vulnerability_rows = [[
            "Severity",
            "CWE",
            "Description",
            "Line",
            "Fix",
        ]]

        for finding in vulnerabilities:

            if not isinstance(
                finding,
                dict
            ):
                continue

            severity = (
                finding.get(
                    "severity"
                )
                or finding.get(
                    "riskLevel"
                )
                or finding.get(
                    "risk_level"
                )
                or "Unknown"
            )

            cwe = (
                finding.get(
                    "cwe"
                )
                or finding.get(
                    "cweId"
                )
                or finding.get(
                    "cwe_id"
                )
                or "-"
            )

            description = (
                finding.get(
                    "description"
                )
                or finding.get(
                    "message"
                )
                or finding.get(
                    "title"
                )
                or "Security issue detected."
            )

            line = (
                finding.get(
                    "line"
                )
                or finding.get(
                    "lineNumber"
                )
                or finding.get(
                    "line_number"
                )
                or "-"
            )

            fix = (
                finding.get(
                    "aiFix"
                )
                or finding.get(
                    "fix"
                )
                or finding.get(
                    "recommendation"
                )
                or finding.get(
                    "solution"
                )
                or "-"
            )

            vulnerability_rows.append([

                safe_string(
                    severity
                ),

                safe_string(
                    cwe
                ),

                Paragraph(
                    safe_string(
                        description
                    ),
                    normal_style
                ),

                safe_string(
                    line
                ),

                Paragraph(
                    safe_string(
                        fix
                    ),
                    normal_style
                ),
            ])

        if len(vulnerability_rows) > 1:

            vulnerability_table = Table(
                vulnerability_rows,
                repeatRows=1,
                colWidths=[
                    25 * mm,
                    20 * mm,
                    60 * mm,
                    15 * mm,
                    55 * mm,
                ],
            )

            vulnerability_table.setStyle(
                TableStyle([

                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, 0),
                        colors.HexColor(
                            "#1F2937"
                        ),
                    ),

                    (
                        "TEXTCOLOR",
                        (0, 0),
                        (-1, 0),
                        colors.white,
                    ),

                    (
                        "FONTNAME",
                        (0, 0),
                        (-1, 0),
                        "Helvetica-Bold",
                    ),

                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.5,
                        colors.grey,
                    ),

                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "TOP",
                    ),

                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        4,
                    ),

                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        4,
                    ),

                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        4,
                    ),

                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        4,
                    ),
                ])
            )

            story.append(
                vulnerability_table
            )

    document.build(
        story
    )


# ============================================================
# COMBINED PDF
# ============================================================

def generate_combined_pdf(
    reports
):

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=10 * mm,
        leftMargin=10 * mm,
        topMargin=10 * mm,
        bottomMargin=10 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = styles["Title"]
    title_style.alignment = TA_CENTER

    heading_style = styles["Heading2"]
    normal_style = styles["BodyText"]

    story = []

    story.append(
        Paragraph(
            "AI Cybersecurity Scan Reports",
            title_style
        )
    )

    story.append(
        Spacer(
            1,
            10
        )
    )

    story.append(
        Paragraph(
            f"Total Reports: {len(reports)}",
            normal_style
        )
    )

    story.append(
        Spacer(
            1,
            12
        )
    )

    if not reports:

        story.append(
            Paragraph(
                "No security scan reports found.",
                normal_style
            )
        )

        document.build(
            story
        )

        buffer.seek(0)

        return buffer

    summary_rows = [[
        "Report ID",
        "Language",
        "Risk",
        "Level",
        "Grade",
        "Status",
        "Issues",
        "Confidence",
        "Scan Date",
    ]]

    for report in reports:

        confidence = report.get(
            "confidence"
        )

        confidence_text = (
            f"{confidence}%"
            if confidence is not None
            else "N/A"
        )

        summary_rows.append([

            safe_string(
                report.get(
                    "id",
                    ""
                )
            ),

            safe_string(
                report.get(
                    "language",
                    "Unknown"
                )
            ),

            safe_string(
                report.get(
                    "riskScore",
                    0
                )
            ),

            safe_string(
                report.get(
                    "riskLevel",
                    "Low"
                )
            ),

            safe_string(
                report.get(
                    "grade",
                    "F"
                )
            ),

            safe_string(
                report.get(
                    "status",
                    "Safe"
                )
            ),

            safe_string(
                report.get(
                    "totalIssues",
                    0
                )
            ),

            confidence_text,

            safe_string(
                report.get(
                    "scanTime",
                    ""
                )
            ),
        ])

    summary_table = Table(
        summary_rows,
        repeatRows=1,
        colWidths=[
            35 * mm,
            25 * mm,
            18 * mm,
            22 * mm,
            18 * mm,
            25 * mm,
            18 * mm,
            25 * mm,
            45 * mm,
        ],
    )

    summary_table.setStyle(
        TableStyle([

            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.HexColor(
                    "#111827"
                ),
            ),

            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white,
            ),

            (
                "FONTNAME",
                (0, 0),
                (-1, 0),
                "Helvetica-Bold",
            ),

            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.grey,
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE",
            ),

            (
                "ALIGN",
                (0, 0),
                (-1, -1),
                "CENTER",
            ),

            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                4,
            ),

            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                4,
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                5,
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                5,
            ),
        ])
    )

    story.append(
        summary_table
    )

    # --------------------------------------------------------
    # Detailed reports
    # --------------------------------------------------------

    for index, report in enumerate(
        reports
    ):

        story.append(
            PageBreak()
        )

        story.append(
            Paragraph(
                (
                    "Report "
                    f"{index + 1}: "
                    f"{safe_string(report.get('id'))}"
                ),
                heading_style
            )
        )

        story.append(
            Spacer(
                1,
                8
            )
        )

        details = [

            [
                "Language",
                safe_string(
                    report.get(
                        "language",
                        "Unknown"
                    )
                ),
            ],

            [
                "Risk Score",
                safe_string(
                    report.get(
                        "riskScore",
                        0
                    )
                ),
            ],

            [
                "Risk Level",
                safe_string(
                    report.get(
                        "riskLevel",
                        "Low"
                    )
                ),
            ],

            [
                "Security Grade",
                safe_string(
                    report.get(
                        "grade",
                        "F"
                    )
                ),
            ],

            [
                "Status",
                safe_string(
                    report.get(
                        "status",
                        "Safe"
                    )
                ),
            ],

            [
                "Total Issues",
                safe_string(
                    report.get(
                        "totalIssues",
                        0
                    )
                ),
            ],
        ]

        details_table = Table(
            details,
            colWidths=[
                45 * mm,
                80 * mm,
            ],
        )

        details_table.setStyle(
            TableStyle([

                (
                    "BACKGROUND",
                    (0, 0),
                    (0, -1),
                    colors.HexColor(
                        "#E5E7EB"
                    ),
                ),

                (
                    "FONTNAME",
                    (0, 0),
                    (0, -1),
                    "Helvetica-Bold",
                ),

                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.grey,
                ),

                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),

                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),

                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),

                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),

                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
            ])
        )

        story.append(
            details_table
        )

        story.append(
            Spacer(
                1,
                10
            )
        )

        story.append(
            Paragraph(
                "Vulnerabilities",
                heading_style
            )
        )

        story.append(
            Spacer(
                1,
                6
            )
        )

        vulnerabilities = (
            report.get(
                "vulnerabilities"
            )
            or []
        )

        if not vulnerabilities:

            story.append(
                Paragraph(
                    "No vulnerabilities detected.",
                    normal_style
                )
            )

            continue

        vulnerability_rows = [[
            "Severity",
            "CWE",
            "Description",
            "Line",
            "Recommendation",
        ]]

        for finding in vulnerabilities:

            if not isinstance(
                finding,
                dict
            ):
                continue

            severity = (
                finding.get(
                    "severity"
                )
                or finding.get(
                    "riskLevel"
                )
                or finding.get(
                    "risk_level"
                )
                or "Unknown"
            )

            cwe = (
                finding.get(
                    "cwe"
                )
                or finding.get(
                    "cweId"
                )
                or finding.get(
                    "cwe_id"
                )
                or "-"
            )

            description = (
                finding.get(
                    "description"
                )
                or finding.get(
                    "message"
                )
                or finding.get(
                    "title"
                )
                or "Security issue detected."
            )

            line = (
                finding.get(
                    "line"
                )
                or finding.get(
                    "lineNumber"
                )
                or finding.get(
                    "line_number"
                )
                or "-"
            )

            recommendation = (
                finding.get(
                    "aiFix"
                )
                or finding.get(
                    "fix"
                )
                or finding.get(
                    "recommendation"
                )
                or finding.get(
                    "solution"
                )
                or "-"
            )

            vulnerability_rows.append([

                safe_string(
                    severity
                ),

                safe_string(
                    cwe
                ),

                Paragraph(
                    safe_string(
                        description
                    ),
                    normal_style
                ),

                safe_string(
                    line
                ),

                Paragraph(
                    safe_string(
                        recommendation
                    ),
                    normal_style
                ),
            ])

        if len(vulnerability_rows) > 1:

            vulnerability_table = Table(
                vulnerability_rows,
                repeatRows=1,
                colWidths=[
                    25 * mm,
                    20 * mm,
                    80 * mm,
                    15 * mm,
                    80 * mm,
                ],
            )

            vulnerability_table.setStyle(
                TableStyle([

                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, 0),
                        colors.HexColor(
                            "#1F2937"
                        ),
                    ),

                    (
                        "TEXTCOLOR",
                        (0, 0),
                        (-1, 0),
                        colors.white,
                    ),

                    (
                        "FONTNAME",
                        (0, 0),
                        (-1, 0),
                        "Helvetica-Bold",
                    ),

                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.5,
                        colors.grey,
                    ),

                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "TOP",
                    ),

                    (
                        "LEFTPADDING",
                        (0, 0),
                        (-1, -1),
                        4,
                    ),

                    (
                        "RIGHTPADDING",
                        (0, 0),
                        (-1, -1),
                        4,
                    ),

                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        4,
                    ),

                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        4,
                    ),
                ])
            )

            story.append(
                vulnerability_table
            )

    document.build(
        story
    )

    buffer.seek(0)

    return buffer