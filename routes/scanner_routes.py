# ============================================================
# SCANNER ROUTES - MERGED VERSION
# ============================================================
# Merged from the two provided scanner route versions.
#
# Final behavior:
# - JWT authentication is required for scan/history/detail/delete.
# - Scan history is saved per authenticated user.
# - Confidence normalization handles numeric values and
#   legacy list-based vulnerability confidence.
# - /scanner/history supports limit=1..100.
# - /scanner/history/<scan_id> supports GET and DELETE.
# ============================================================

from flask import (
    Blueprint,
    request,
    jsonify
)

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

from services.scanner_engine import (
    scan_code
)

from services.scan_history_service import (
    save_scan_history,
    get_scan_history,
    get_scan_by_id,
    delete_scan_history
)


# ============================================================
# SCANNER BLUEPRINT
# ============================================================

scanner_bp = Blueprint(
    "scanner",
    __name__,
    url_prefix="/scanner"
)


# ============================================================
# POST /scanner/scan
# ============================================================

@scanner_bp.route(
    "/scan",
    methods=["POST", "OPTIONS"]
)
@jwt_required()
def scan():

    """
    Security Scanner API

    JWT authentication is required.

    Request:

    {
        "language": "python",
        "code": "print('Hello World')"
    }
    """

    # ========================================================
    # HANDLE CORS PREFLIGHT
    # ========================================================

    if request.method == "OPTIONS":
        return "", 200

    try:

        # ====================================================
        # GET JSON REQUEST BODY
        # ====================================================

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        # ====================================================
        # GET CODE
        # ====================================================

        code = data.get(
            "code",
            ""
        )

        # ====================================================
        # GET LANGUAGE
        # ====================================================

        language = data.get(
            "language",
            ""
        )

        # ====================================================
        # SAFE STRING CONVERSION
        # ====================================================

        if not isinstance(code, str):

            code = (
                str(code)
                if code is not None
                else ""
            )

        if not isinstance(language, str):

            language = (
                str(language)
                if language is not None
                else ""
            )

        # ====================================================
        # CLEAN INPUT
        # ====================================================

        code = code.strip()

        language = (
            language
            .strip()
            .lower()
        )

        # ====================================================
        # VALIDATE CODE
        # ====================================================

        if not code:

            return jsonify({
                "success": False,
                "message": "Code cannot be empty"
            }), 400

        # ====================================================
        # VALIDATE LANGUAGE
        # ====================================================

        if not language:

            return jsonify({
                "success": False,
                "message": "Programming language is required"
            }), 400

        # ====================================================
        # GET CURRENT USER
        # ====================================================

        current_user = get_jwt_identity()

        if current_user is None:

            return jsonify({
                "success": False,
                "message": "Authentication required"
            }), 401

        # ====================================================
        # DEBUG INFORMATION
        # ====================================================

        print(
            "\n========== SCANNER REQUEST =========="
        )

        print(
            "Language:",
            language
        )

        print(
            "User ID:",
            current_user
        )

        print(
            "Code Length:",
            len(code)
        )

        # ====================================================
        # RUN SECURITY SCANNER
        # ====================================================

        scan_result = scan_code(
            code=code,
            language=language
        )

        # ====================================================
        # NORMALIZE SCANNER RESULT
        # ====================================================

        if scan_result is None:
            scan_result = {}

        if not isinstance(
            scan_result,
            dict
        ):

            scan_result = {
                "result": scan_result
            }

        # ====================================================
        # GET VULNERABILITIES
        # ====================================================

        vulnerabilities = (
            scan_result.get(
                "vulnerabilities",
                []
            )
        )

        if not isinstance(
            vulnerabilities,
            list
        ):

            vulnerabilities = []

        scan_result[
            "vulnerabilities"
        ] = vulnerabilities

        # ====================================================
        # TOTAL ISSUES
        # ====================================================

        scan_result[
            "totalIssues"
        ] = scan_result.get(

            "totalIssues",

            scan_result.get(
                "total_issues",
                len(vulnerabilities)
            )
        )

        # ====================================================
        # RISK SCORE
        # ====================================================

        scan_result[
            "riskScore"
        ] = scan_result.get(

            "riskScore",

            scan_result.get(
                "risk_score",
                0
            )
        )

        # ====================================================
        # NORMALIZE RISK SCORE
        # ====================================================

        try:

            scan_result[
                "riskScore"
            ] = int(
                scan_result[
                    "riskScore"
                ]
            )

        except Exception:

            scan_result[
                "riskScore"
            ] = 0

        # ====================================================
        # PROTECT RISK SCORE RANGE
        # ====================================================

        scan_result[
            "riskScore"
        ] = max(
            0,
            min(
                scan_result[
                    "riskScore"
                ],
                100
            )
        )

        # ====================================================
        # GRADE
        # ====================================================

        grade = scan_result.get(
            "grade"
        )

        if not grade:

            risk_score = (
                scan_result[
                    "riskScore"
                ]
            )

            if risk_score >= 90:
                grade = "F"

            elif risk_score >= 75:
                grade = "D"

            elif risk_score >= 60:
                grade = "C"

            elif risk_score >= 40:
                grade = "B"

            elif risk_score >= 20:
                grade = "A"

            else:
                grade = "A+"

        scan_result[
            "grade"
        ] = grade

        # ====================================================
        # CONFIDENCE
        # ============================================================
        #
        # If scanner_engine.py provides scan-level confidence:
        #     use it.
        #
        # If there are NO vulnerabilities:
        #     confidence = 100
        #
        # If vulnerabilities exist but no scan-level confidence:
        #     calculate average confidence from findings.
        #
        # ====================================================

        confidence = scan_result.get(
            "confidence"
        )


        # ====================================================
        # CASE 1: NO VULNERABILITIES
        # ====================================================

        if not vulnerabilities:

            confidence = 100


        # ====================================================
        # CASE 2: VULNERABILITIES EXIST
        # ====================================================

        else:

            # ------------------------------------------------
            # If scan-level confidence is missing,
            # calculate it from vulnerability findings.
            # ------------------------------------------------

            if confidence is None:

                finding_confidences = []


                for finding in vulnerabilities:

                    if not isinstance(
                        finding,
                        dict
                    ):

                        continue


                    finding_confidence = (
                        finding.get(
                            "confidence"
                        )
                    )


                    if (
                        finding_confidence
                        is not None
                    ):

                        try:

                            finding_confidences.append(

                                float(
                                    finding_confidence
                                )

                            )

                        except Exception:

                            pass


                # --------------------------------------------
                # Calculate average confidence
                # --------------------------------------------

                if finding_confidences:

                    confidence = round(

                        sum(
                            finding_confidences
                        )
                        /
                        len(
                            finding_confidences
                        )

                    )

                else:

                    confidence = 0


        # ====================================================
        # NORMALIZE CONFIDENCE
        # ====================================================

        try:

            confidence = float(
                confidence
            )

        except Exception:

            confidence = 0


        # ====================================================
        # PROTECT CONFIDENCE RANGE
        # ====================================================

        confidence = max(

            0,

            min(

                confidence,

                100

            )

        )


        # ====================================================
        # CONVERT INTEGER WHEN POSSIBLE
        # ====================================================

        if confidence.is_integer():

            confidence = int(
                confidence
            )


        scan_result[
            "confidence"
        ] = confidence


        # ====================================================
        # STATUS
        # ====================================================

        status = scan_result.get(
            "status"
        )

        if not status:

            if vulnerabilities:
                status = "Unsafe"
            else:
                status = "Safe"

        scan_result[
            "status"
        ] = status

        # ====================================================
        # DEBUG SCAN RESULT
        # ====================================================

        print(
            "\n========== SCAN RESULT =========="
        )

        print(
            "Risk Score:",
            scan_result.get(
                "riskScore"
            )
        )

        print(
            "Grade:",
            scan_result.get(
                "grade"
            )
        )

        print(
            "Confidence:",
            scan_result.get(
                "confidence"
            )
        )

        print(
            "Status:",
            scan_result.get(
                "status"
            )
        )

        print(
            "Total Issues:",
            scan_result.get(
                "totalIssues"
            )
        )

        print(
            "Vulnerabilities:",
            len(
                vulnerabilities
            )
        )

        # ====================================================
        # SAVE SCAN HISTORY
        # ====================================================

        scan_id = None

        try:

            scan_id = save_scan_history(

                user_id=current_user,

                code=code,

                language=language,

                scan_result=scan_result
            )

            if scan_id:

                print(
                    "✅ Scan saved successfully."
                )

                print(
                    "Scan ID:",
                    scan_id
                )

            else:

                print(
                    "⚠️ Scan completed but history "
                    "was not saved."
                )

        except Exception as history_error:

            print(
                "❌ Scan history save error:",
                str(history_error)
            )

            scan_id = None

        # ====================================================
        # SUCCESS RESPONSE
        # ====================================================

        return jsonify({

            "success": True,

            "message":
                "Security scan completed successfully",

            "data":
                scan_result,

            "scan_id":
                scan_id

        }), 200

    # ========================================================
    # UNEXPECTED ERROR
    # ========================================================

    except Exception as error:

        print(
            "\n❌ Scanner API Error:",
            str(error)
        )

        return jsonify({

            "success": False,

            "message":
                "Scanner failed",

            "error":
                str(error)

        }), 500


# ============================================================
# GET /scanner/history
# ============================================================

@scanner_bp.route(
    "/history",
    methods=["GET"]
)
@jwt_required()
def scan_history():

    """
    Get authenticated user's scan history.

    Example:

        /scanner/history?limit=50
    """

    try:

        # ====================================================
        # GET LIMIT
        # ====================================================

        limit = request.args.get(
            "limit",
            50,
            type=int
        )

        if limit is None:
            limit = 50

        limit = min(
            max(
                limit,
                1
            ),
            100
        )

        # ====================================================
        # GET CURRENT USER
        # ====================================================

        current_user = get_jwt_identity()

        if current_user is None:

            return jsonify({
                "success": False,
                "message": "Authentication required"
            }), 401

        # ====================================================
        # DEBUG
        # ====================================================

        print(
            "\n========== HISTORY REQUEST =========="
        )

        print(
            "JWT USER ID:",
            current_user
        )

        # ====================================================
        # GET HISTORY
        # ====================================================

        scans = get_scan_history(

            user_id=current_user,

            limit=limit

        )

        # ====================================================
        # DEBUG
        # ====================================================

        print(
            "HISTORY RECORDS:",
            len(scans)
        )

        print(
            "====================================\n"
        )

        # ====================================================
        # SUCCESS
        # ====================================================

        return jsonify({

            "success": True,

            "count":
                len(scans),

            "data":
                scans

        }), 200

    except Exception as error:

        print(
            "❌ Scan History API Error:",
            str(error)
        )

        return jsonify({

            "success": False,

            "message":
                "Failed to load scan history",

            "error":
                str(error)

        }), 500


# ============================================================
# GET /scanner/history/<scan_id>
# ============================================================

@scanner_bp.route(
    "/history/<scan_id>",
    methods=["GET"]
)
@jwt_required()
def get_single_scan(scan_id):

    """
    Get one scan history record.
    """

    try:

        if not scan_id:

            return jsonify({

                "success": False,

                "message":
                    "Scan ID is required"

            }), 400

        # ====================================================
        # GET CURRENT USER
        # ====================================================

        current_user = get_jwt_identity()

        if current_user is None:

            return jsonify({

                "success": False,

                "message":
                    "Authentication required"

            }), 401

        # ====================================================
        # GET SCAN
        # ====================================================

        scan = get_scan_by_id(

            scan_id=scan_id,

            user_id=current_user

        )

        # ====================================================
        # CHECK
        # ====================================================

        if not scan:

            return jsonify({

                "success": False,

                "message":
                    "Scan history not found"

            }), 404

        # ====================================================
        # SUCCESS
        # ====================================================

        return jsonify({

            "success": True,

            "data":
                scan

        }), 200

    except Exception as error:

        print(
            "❌ Get Single Scan Error:",
            str(error)
        )

        return jsonify({

            "success": False,

            "message":
                "Failed to load scan",

            "error":
                str(error)

        }), 500


# ============================================================
# DELETE /scanner/history/<scan_id>
# ============================================================

@scanner_bp.route(
    "/history/<scan_id>",
    methods=["DELETE", "OPTIONS"]
)
@jwt_required()
def delete_scan(scan_id):

    """
    Delete one scan history record.
    """

    # ========================================================
    # HANDLE CORS PREFLIGHT
    # ========================================================

    if request.method == "OPTIONS":
        return "", 200

    try:

        # ====================================================
        # VALIDATE SCAN ID
        # ====================================================

        if not scan_id:

            return jsonify({

                "success": False,

                "message":
                    "Scan ID is required"

            }), 400

        # ====================================================
        # GET CURRENT USER
        # ====================================================

        current_user = get_jwt_identity()

        if current_user is None:

            return jsonify({

                "success": False,

                "message":
                    "Authentication required"

            }), 401

        # ====================================================
        # DELETE
        # ====================================================

        deleted = delete_scan_history(

            scan_id=scan_id,

            user_id=current_user

        )

        # ====================================================
        # CHECK
        # ====================================================

        if not deleted:

            return jsonify({

                "success": False,

                "message":
                    "Scan not found or could not be deleted"

            }), 404

        # ====================================================
        # SUCCESS
        # ====================================================

        return jsonify({

            "success": True,

            "message":
                "Scan history deleted successfully"

        }), 200

    except Exception as error:

        print(
            "❌ Delete Scan Error:",
            str(error)
        )

        return jsonify({

            "success": False,

            "message":
                "Failed to delete scan history",

            "error":
                str(error)

        }), 500