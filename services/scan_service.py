from database.mongodb import reports_collection


def analyze_code(code, language):
    vulnerabilities = []

    # SQL Injection Detection
    if "SELECT" in code and "+" in code:
        vulnerabilities.append({
            "severity": "Critical",
            "cwe": "CWE-89",
            "description": "Possible SQL Injection",
            "line": 2
        })

    # Hardcoded Credentials Detection
    if "password" in code.lower():
        vulnerabilities.append({
            "severity": "Medium",
            "cwe": "CWE-798",
            "description": "Hardcoded Credentials",
            "line": 5
        })

    total = len(vulnerabilities)

    if total == 0:
        status = "Safe"
        risk_score = 0
    else:
        status = "Unsafe"
        risk_score = min(total * 40, 100)

    # Report to save in MongoDB
    report = {
        "language": language,
        "code": code,
        "riskScore": risk_score,
        "totalIssues": total,
        "status": status,
        "vulnerabilities": vulnerabilities
    }

    # Save report
    result = reports_collection.insert_one(report)

    # Return JSON-safe response
    return {
        "id": str(result.inserted_id),
        "language": language,
        "riskScore": risk_score,
        "totalIssues": total,
        "status": status,
        "vulnerabilities": vulnerabilities
    }