# ============================================================
# SEVERITY WEIGHTS
# ============================================================

SEVERITY_WEIGHT = {
    "Critical": 40,
    "High": 25,
    "Medium": 15,
    "Low": 5,
    "Info": 1
}


# ============================================================
# CALCULATE RISK SCORE
# ============================================================

def calculate_risk_score(findings):
    """
    Calculate security risk score from 0 to 100.

    Critical = 40
    High     = 25
    Medium   = 15
    Low      = 5
    Info     = 1
    """

    if not isinstance(findings, list):
        return 0

    score = 0

    for finding in findings:

        if not isinstance(finding, dict):
            continue

        severity = str(
            finding.get(
                "severity",
                "Info"
            )
        ).strip().title()

        score += SEVERITY_WEIGHT.get(
            severity,
            0
        )

    return min(
        max(score, 0),
        100
    )


# ============================================================
# CALCULATE GRADE
# ============================================================

def calculate_grade(score):
    """
    Convert risk score into security grade.
    """

    try:
        score = float(score)
    except Exception:
        score = 0

    if score >= 90:
        return "F"

    elif score >= 75:
        return "D"

    elif score >= 60:
        return "C"

    elif score >= 40:
        return "B"

    elif score >= 20:
        return "A"

    return "A+"


# ============================================================
# CALCULATE CONFIDENCE
# ============================================================

def calculate_confidence(findings):
    """
    Calculate overall scanner confidence.

    Confidence is returned as a NUMBER.

    No vulnerabilities:
        100%

    Critical:
        98%

    High:
        94%

    Medium:
        90%

    Low:
        82%

    Info:
        75%

    If multiple vulnerabilities exist,
    the lowest confidence among detected
    vulnerabilities is used.
    """

    if not isinstance(findings, list):
        return 100

    # --------------------------------------------------------
    # SAFE SCAN
    # --------------------------------------------------------

    if len(findings) == 0:
        return 100

    confidence_values = []

    # --------------------------------------------------------
    # CALCULATE CONFIDENCE FOR EACH FINDING
    # --------------------------------------------------------

    for finding in findings:

        if not isinstance(finding, dict):
            continue

        severity = str(
            finding.get(
                "severity",
                "Info"
            )
        ).strip().title()

        if severity == "Critical":

            confidence = 98

        elif severity == "High":

            confidence = 94

        elif severity == "Medium":

            confidence = 90

        elif severity == "Low":

            confidence = 82

        else:

            confidence = 75

        # Store confidence inside vulnerability
        finding["confidence"] = confidence

        confidence_values.append(
            confidence
        )

    # --------------------------------------------------------
    # FALLBACK
    # --------------------------------------------------------

    if not confidence_values:
        return 100

    # --------------------------------------------------------
    # OVERALL CONFIDENCE
    # --------------------------------------------------------

    return min(
        confidence_values
    )