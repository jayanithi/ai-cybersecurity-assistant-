from flask import Blueprint, jsonify
from database.mongodb import reports_collection

dashboard_bp = Blueprint(
    "dashboard",
    __name__,
    url_prefix="/dashboard"
)

@dashboard_bp.route("/stats", methods=["GET"])
def get_dashboard_stats():
    reports = list(reports_collection.find())

    total_scans = len(reports)

    critical = 0
    medium = 0
    safe = 0

    recent_scans = []

    for report in reports:
        if report["status"] == "Safe":
            safe += 1

        for vuln in report.get("vulnerabilities", []):
            if vuln["severity"] == "Critical":
                critical += 1

            elif vuln["severity"] == "Medium":
                medium += 1

    latest = reports_collection.find().sort("_id", -1).limit(5)

    for scan in latest:
        recent_scans.append({
            "id": str(scan["_id"]),
            "language": scan["language"],
            "status": scan["status"],
            "riskScore": scan["riskScore"],
            "totalIssues": scan["totalIssues"]
        })

    return jsonify({
        "totalScans": total_scans,
        "critical": critical,
        "medium": medium,
        "safe": safe,
        "recentScans": recent_scans
    }), 200