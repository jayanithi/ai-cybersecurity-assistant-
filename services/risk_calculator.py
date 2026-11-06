def calculate_risk(findings):

    score = 0

    for item in findings:

        severity = item["severity"]

        if severity == "Critical":
            score += 30

        elif severity == "High":
            score += 20

        elif severity == "Medium":
            score += 10

        else:
            score += 5

    score = min(score, 100)

    if score >= 70:
        status = "Unsafe"

    elif score >= 30:
        status = "Warning"

    else:
        status = "Safe"

    return score, status