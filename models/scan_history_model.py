from datetime import datetime


# ============================================================
# CREATE SCAN HISTORY DOCUMENT
# ============================================================

def create_scan_history_document(
    user_id,
    code,
    language,
    scan_result
):

    if scan_result is None:
        scan_result = {}


    # ========================================================
    # EXTRACT VULNERABILITIES
    # ========================================================

    vulnerabilities = (
        scan_result.get(
            "vulnerabilities",
            []
        )
        or
        scan_result.get(
            "issues",
            []
        )
        or
        []
    )


    # ========================================================
    # EXTRACT RISK SCORE
    # ========================================================

    risk_score = (
        scan_result.get(
            "risk_score"
        )
        or
        scan_result.get(
            "riskScore"
        )
        or
        0
    )


    # ========================================================
    # EXTRACT GRADE
    # ========================================================

    grade = (
        scan_result.get(
            "grade"
        )
        or
        "Unknown"
    )


    # ========================================================
    # CREATE DOCUMENT
    # ========================================================

    document = {

        "user_id": str(user_id)
        if user_id
        else None,

        "code": code,

        "language": language,

        "risk_score": risk_score,

        "grade": grade,

        "total_issues":
        len(vulnerabilities),

        "vulnerabilities":
        vulnerabilities,

        "scan_result":
        scan_result,

        "created_at":
        datetime.utcnow(),

        "updated_at":
        datetime.utcnow()
    }


    return document