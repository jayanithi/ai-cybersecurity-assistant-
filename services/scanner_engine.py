from datetime import datetime
import re

from services.python_rules import scan_python
from services.javascript_rules import scan_javascript
from services.php_rules import scan_php
from services.java_rules import scan_java

from services.regex_engine import regex_scan
from services.duplicate_engine import remove_duplicates

from services.risk_calculator import calculate_risk

from services.severity_engine import (
    calculate_risk_score,
    calculate_grade,
    calculate_confidence
)


# ============================================================
# SEVERITY ORDER
# ============================================================

SEVERITY_ORDER = {
    "Critical": 4,
    "High": 3,
    "Medium": 2,
    "Low": 1,
    "Info": 0
}


# ============================================================
# SORT FINDINGS BY SEVERITY
# ============================================================

def sort_findings(findings):
    """
    Sort vulnerabilities from Critical -> Info.
    """

    if not findings:
        return []

    return sorted(
        findings,
        key=lambda finding: SEVERITY_ORDER.get(
            str(finding.get("severity", "Info")).strip().title(),
            0
        ),
        reverse=True
    )


# ============================================================
# NORMALIZE FINDING
# ============================================================

def normalize_finding(finding):
    """
    Makes sure every finding has a consistent structure.
    """

    if not isinstance(finding, dict):
        return {
            "severity": "Info",
            "cwe": "-",
            "owasp": "-",
            "description": str(finding),
            "recommendation": "Review this finding manually.",
            "line": "-"
        }

    normalized = dict(finding)

    severity = str(
        normalized.get("severity", "Info")
    ).strip().title()

    if severity not in SEVERITY_ORDER:
        severity = "Info"

    normalized["severity"] = severity

    normalized.setdefault("cwe", "-")
    normalized.setdefault("owasp", "-")
    normalized.setdefault(
        "description",
        "Security issue detected."
    )
    normalized.setdefault(
        "recommendation",
        "Review and remediate this security issue."
    )
    normalized.setdefault("line", "-")

    return normalized


# ============================================================
# JAVASCRIPT XSS DETECTION
# ============================================================

def scan_javascript_xss(code):
    """
    Lightweight JavaScript XSS detection.

    Detects cases where user-controlled input such as:

        req.query
        req.body
        req.params

    is later inserted directly into an HTML response such as:

        res.send(...)
        res.end(...)

    CWE:
        CWE-79 - Improper Neutralization of Input During Web Page Generation
    """

    findings = []

    if not code:
        return findings

    lines = code.splitlines()

    # --------------------------------------------------------
    # User-controlled variable detection
    # --------------------------------------------------------

    user_input_variables = set()

    user_input_patterns = [
        r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*req\.query\b",
        r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*req\.body\b",
        r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*req\.params\b",
        r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*request\.query\b",
        r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*request\.body\b",
        r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*request\.params\b"
    ]

    for line in lines:
        for pattern in user_input_patterns:
            match = re.search(pattern, line)

            if match:
                user_input_variables.add(
                    match.group(1)
                )

    # --------------------------------------------------------
    # Direct user input inside response
    # --------------------------------------------------------

    direct_xss_patterns = [
        r"\bres\.send\s*\([^)]*req\.query",
        r"\bres\.send\s*\([^)]*req\.body",
        r"\bres\.send\s*\([^)]*req\.params",
        r"\bres\.end\s*\([^)]*req\.query",
        r"\bres\.end\s*\([^)]*req\.body",
        r"\bres\.end\s*\([^)]*req\.params"
    ]

    for line_number, line in enumerate(lines, start=1):

        for pattern in direct_xss_patterns:

            if re.search(
                pattern,
                line,
                re.IGNORECASE
            ):

                findings.append({
                    "severity": "High",
                    "cwe": "CWE-79",
                    "owasp": "A03:2021-Injection",
                    "description": (
                        "Possible Cross-Site Scripting (XSS) "
                        "through unsanitized user input in "
                        "an HTML response."
                    ),
                    "recommendation": (
                        "Validate and sanitize user input "
                        "before rendering it in HTML. "
                        "Prefer safe templating or output "
                        "encoding."
                    ),
                    "line": line_number
                })

                break

    # --------------------------------------------------------
    # User-controlled variable used in response
    # --------------------------------------------------------

    if user_input_variables:

        for line_number, line in enumerate(lines, start=1):

            # Only inspect response rendering functions
            if not re.search(
                r"\bres\.(send|end)\s*\(",
                line,
                re.IGNORECASE
            ):
                continue

            for variable in user_input_variables:

                # Check whether the user-controlled variable
                # is inserted into the response.
                if re.search(
                    rf"\b{re.escape(variable)}\b",
                    line
                ):

                    findings.append({
                        "severity": "High",
                        "cwe": "CWE-79",
                        "owasp": "A03:2021-Injection",
                        "description": (
                            "Possible Cross-Site Scripting "
                            "(XSS) through user-controlled "
                            "input rendered directly in "
                            "an HTTP response."
                        ),
                        "recommendation": (
                            "Validate and sanitize user input "
                            "before rendering it in HTML. "
                            "Use output encoding or a secure "
                            "templating mechanism."
                        ),
                        "line": line_number
                    })

                    break

    return findings


# ============================================================
# EMPTY RESULT
# ============================================================

def empty_scan_result(
    status="Safe",
    grade="A+",
    confidence=100
):
    """
    Returns a standard empty/safe scan response.
    """

    return {
        "riskScore": 0,
        "grade": grade,
        "status": status,
        "confidence": confidence,
        "totalIssues": 0,

        "summary": {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0
        },

        "scanTime": datetime.utcnow().isoformat(),

        "vulnerabilities": []
    }


# ============================================================
# SCAN CODE
# ============================================================

def scan_code(code, language):
    """
    Main security scanning engine.

    Supported languages:
        - Python
        - JavaScript / JS
        - PHP
        - Java

    Scanner combines:
        1. Language-specific security rules
        2. JavaScript XSS detection
        3. Regex-based security detection
        4. Duplicate removal
        5. Severity sorting
        6. Risk calculation
        7. Grade calculation
        8. Confidence calculation
    """

    # ========================================================
    # VALIDATE INPUT
    # ========================================================

    if code is None or language is None:
        return empty_scan_result()

    if not isinstance(code, str):
        code = str(code)

    if not isinstance(language, str):
        language = str(language)

    code = code.strip()
    language = language.strip().lower()

    if not code or not language:
        return empty_scan_result()

    findings = []

    try:

        # ====================================================
        # LANGUAGE SPECIFIC SECURITY RULES
        # ====================================================

        if language == "python":

            result = scan_python(code)

            if result:
                findings.extend(result)

        elif language in ("javascript", "js"):

            result = scan_javascript(code)

            if result:
                findings.extend(result)

            # ------------------------------------------------
            # JavaScript XSS Detection
            # ------------------------------------------------

            try:

                xss_findings = scan_javascript_xss(code)

                if xss_findings:
                    findings.extend(xss_findings)

            except Exception as xss_error:

                print(
                    "JavaScript XSS scanner warning:",
                    str(xss_error)
                )

        elif language == "php":

            result = scan_php(code)

            if result:
                findings.extend(result)

        elif language == "java":

            result = scan_java(code)

            if result:
                findings.extend(result)

        else:

            findings.append({
                "severity": "Info",
                "cwe": "-",
                "owasp": "-",
                "description": (
                    f"{language} scanning is not supported."
                ),
                "recommendation": (
                    "Language support coming soon."
                ),
                "line": "-"
            })

        # ====================================================
        # REGEX SECURITY ENGINE
        # ====================================================

        try:

            regex_findings = regex_scan(code)

            if regex_findings:
                findings.extend(regex_findings)

        except Exception as regex_error:

            print(
                "Regex scanner warning:",
                str(regex_error)
            )

        # ====================================================
        # NORMALIZE FINDINGS
        # ====================================================

        findings = [
            normalize_finding(finding)
            for finding in findings
        ]

        # ====================================================
        # REMOVE DUPLICATES
        # ====================================================

        try:

            findings = remove_duplicates(findings)

        except Exception as duplicate_error:

            print(
                "Duplicate removal warning:",
                str(duplicate_error)
            )

        # ====================================================
        # NORMALIZE AGAIN
        # ====================================================

        findings = [
            normalize_finding(finding)
            for finding in findings
        ]

        # ====================================================
        # SORT BY SEVERITY
        # ====================================================

        findings = sort_findings(findings)

        # ====================================================
        # RISK SCORE
        # ====================================================

        try:

            risk_score = calculate_risk_score(
                findings
            )

        except Exception as risk_error:

            print(
                "Risk score calculation warning:",
                str(risk_error)
            )

            risk_score = 0

        # ====================================================
        # GRADE
        # ====================================================

        try:

            grade = calculate_grade(
                risk_score
            )

        except Exception as grade_error:

            print(
                "Grade calculation warning:",
                str(grade_error)
            )

            grade = "N/A"

        # ====================================================
        # STATUS
        # ====================================================

        try:

            _, status = calculate_risk(
                findings
            )

        except Exception as status_error:

            print(
                "Risk status calculation warning:",
                str(status_error)
            )

            status = (
                "Safe"
                if not findings
                else "At Risk"
            )

        # ====================================================
        # CONFIDENCE
        # ====================================================

        try:

            confidence = calculate_confidence(
                findings
            )

        except Exception as confidence_error:

            print(
                "Confidence calculation warning:",
                str(confidence_error)
            )

            confidence = (
                100
                if not findings
                else 0
            )

        # ====================================================
        # SUMMARY
        # ====================================================

        summary = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0
        }

        for finding in findings:

            severity = str(
                finding.get(
                    "severity",
                    "Info"
                )
            ).strip().lower()

            if severity == "critical":

                summary["critical"] += 1

            elif severity == "high":

                summary["high"] += 1

            elif severity == "medium":

                summary["medium"] += 1

            elif severity == "low":

                summary["low"] += 1

        # ====================================================
        # FINAL RESULT
        # ====================================================

        return {
            "riskScore": risk_score,
            "grade": grade,
            "status": status,
            "confidence": confidence,
            "totalIssues": len(findings),

            "summary": summary,

            "scanTime": datetime.utcnow().isoformat(),

            "vulnerabilities": findings
        }

    # ========================================================
    # SCANNER ERROR
    # ========================================================

    except Exception as error:

        print(
            "Scanner Engine Error:",
            str(error)
        )

        return {
            "riskScore": 0,
            "grade": "N/A",
            "status": "Error",
            "confidence": 0,
            "totalIssues": 0,

            "summary": {
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0
            },

            "scanTime": datetime.utcnow().isoformat(),

            "vulnerabilities": [],

            "error": str(error)
        }