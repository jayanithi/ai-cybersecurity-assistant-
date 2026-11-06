import re


def scan_java(code):

    findings = []
    lines = code.splitlines()

    def add_finding(
        severity,
        cwe,
        owasp,
        description,
        recommendation,
        line_no
    ):
        findings.append({
            "severity": severity,
            "cwe": cwe,
            "owasp": owasp,
            "description": description,
            "recommendation": recommendation,
            "line": line_no
        })

    for line_no, line in enumerate(lines, start=1):

        lower_line = line.lower()

        # =========================================================
        # SQL INJECTION
        # =========================================================

        # SQL query + Java variable concatenation
        if (
            re.search(
                r"\b(select|insert|update|delete)\b",
                line,
                re.IGNORECASE
            )
            and "+" in line
            and re.search(r"(sql|query|statement)", line, re.IGNORECASE)
        ):
            add_finding(
                "Critical",
                "CWE-89",
                "A03:2021 Injection",
                "Possible SQL Injection through dynamic SQL construction",
                "Use PreparedStatement with parameterized queries",
                line_no
            )

        # String containing SQL + variable
        if re.search(
            r"(SELECT|INSERT|UPDATE|DELETE)\b.*\+\s*[a-zA-Z_][a-zA-Z0-9_]*",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Critical",
                "CWE-89",
                "A03:2021 Injection",
                "SQL query is constructed using string concatenation",
                "Use PreparedStatement and bind parameters",
                line_no
            )

        # =========================================================
        # Statement
        # =========================================================

        if re.search(
            r"\bcreateStatement\s*\(",
            line
        ):
            add_finding(
                "High",
                "CWE-89",
                "A03:2021 Injection",
                "JDBC Statement may allow unsafe dynamic SQL",
                "Use PreparedStatement with bound parameters",
                line_no
            )

        # =========================================================
        # Runtime.exec()
        # =========================================================

        if re.search(
            r"Runtime\s*\.\s*getRuntime\s*\(\s*\)\s*\.\s*exec\s*\(",
            line
        ):
            add_finding(
                "Critical",
                "CWE-78",
                "A03:2021 Injection",
                "Potential OS Command Injection through Runtime.exec()",
                "Avoid Runtime.exec() with untrusted input and validate commands",
                line_no
            )

        # =========================================================
        # ProcessBuilder
        # =========================================================

        if re.search(
            r"\bnew\s+ProcessBuilder\s*\(",
            line
        ):
            add_finding(
                "High",
                "CWE-78",
                "A03:2021 Injection",
                "ProcessBuilder executes operating system commands",
                "Validate command arguments and never pass untrusted input directly",
                line_no
            )

        # =========================================================
        # ProcessBuilder command from variable
        # =========================================================

        if re.search(
            r"ProcessBuilder\s*\([^)]*\+",
            line
        ):
            add_finding(
                "Critical",
                "CWE-78",
                "A03:2021 Injection",
                "ProcessBuilder command may contain dynamically constructed input",
                "Use an allowlist of commands and validate all arguments",
                line_no
            )

        # =========================================================
        # DES
        # =========================================================

        if re.search(
            r"\bDES\b",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "High",
                "CWE-327",
                "A02:2021 Cryptographic Failures",
                "Weak DES encryption algorithm detected",
                "Use AES-256 or another modern authenticated encryption algorithm",
                line_no
            )

        # =========================================================
        # DESede / 3DES
        # =========================================================

        if re.search(
            r"\bDESede\b",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-327",
                "A02:2021 Cryptographic Failures",
                "Legacy 3DES encryption detected",
                "Use AES-GCM or another modern encryption algorithm",
                line_no
            )

        # =========================================================
        # MD5
        # =========================================================

        if re.search(
            r"\bMD5\b",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-328",
                "A02:2021 Cryptographic Failures",
                "Weak MD5 hashing algorithm detected",
                "Use SHA-256 or a password hashing algorithm such as bcrypt/Argon2",
                line_no
            )

        # =========================================================
        # SHA-1
        # =========================================================

        if re.search(
            r"\bSHA[-_]?1\b",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-328",
                "A02:2021 Cryptographic Failures",
                "Weak SHA-1 hashing algorithm detected",
                "Use SHA-256 or a stronger modern cryptographic algorithm",
                line_no
            )

        # =========================================================
        # ObjectInputStream
        # =========================================================

        if re.search(
            r"\bObjectInputStream\b",
            line
        ):
            add_finding(
                "Critical",
                "CWE-502",
                "A08:2021 Software and Data Integrity Failures",
                "Java object deserialization detected",
                "Avoid deserializing untrusted objects and validate serialized data",
                line_no
            )

        # =========================================================
        # readObject()
        # =========================================================

        if re.search(
            r"\.readObject\s*\(",
            line
        ):
            add_finding(
                "Critical",
                "CWE-502",
                "A08:2021 Software and Data Integrity Failures",
                "Potential unsafe Java object deserialization",
                "Do not deserialize untrusted data without strict validation",
                line_no
            )

        # =========================================================
        # implements Serializable
        # =========================================================

        if re.search(
            r"\bimplements\s+Serializable\b",
            line
        ):
            add_finding(
                "Medium",
                "CWE-502",
                "A08:2021 Software and Data Integrity Failures",
                "Serializable class detected",
                "Ensure serialized objects cannot be controlled by untrusted users",
                line_no
            )

        # =========================================================
        # FileInputStream
        # =========================================================

        if re.search(
            r"\bFileInputStream\s*\(",
            line
        ):
            if re.search(
                r"(request|param|input|path|file|filename|name)",
                line,
                re.IGNORECASE
            ):
                add_finding(
                    "High",
                    "CWE-22",
                    "A01:2021 Broken Access Control",
                    "File path may be influenced by user input",
                    "Validate and restrict file paths to an allowed directory",
                    line_no
                )
            else:
                add_finding(
                    "Low",
                    "CWE-73",
                    "A05:2021 Security Misconfiguration",
                    "FileInputStream usage detected",
                    "Validate file paths and restrict filesystem access",
                    line_no
                )

        # =========================================================
        # FileWriter
        # =========================================================

        if re.search(
            r"\bFileWriter\s*\(",
            line
        ):
            add_finding(
                "Low",
                "CWE-73",
                "A05:2021 Security Misconfiguration",
                "File writing operation detected",
                "Validate and restrict output file paths",
                line_no
            )

        # =========================================================
        # File
        # =========================================================

        if re.search(
            r"\bnew\s+File\s*\(",
            line
        ):
            if re.search(
                r"(request|param|input|path|filename|fileName)",
                line,
                re.IGNORECASE
            ):
                add_finding(
                    "High",
                    "CWE-22",
                    "A01:2021 Broken Access Control",
                    "Potential path traversal through user-controlled file path",
                    "Canonicalize and validate the path against an allowed base directory",
                    line_no
                )

        # =========================================================
        # URL
        # =========================================================

        if re.search(
            r"\bnew\s+URL\s*\(",
            line
        ):
            add_finding(
                "Low",
                "CWE-918",
                "A10:2021 Server-Side Request Forgery",
                "External URL access detected",
                "Validate URLs and restrict requests to trusted destinations",
                line_no
            )

        # =========================================================
        # URL from user input
        # =========================================================

        if (
            re.search(r"\bnew\s+URL\s*\(", line)
            and re.search(
                r"(request|param|input|url|uri)",
                line,
                re.IGNORECASE
            )
        ):
            add_finding(
                "High",
                "CWE-918",
                "A10:2021 Server-Side Request Forgery",
                "URL may be constructed from user-controlled input",
                "Allowlist trusted hosts and validate URLs before making requests",
                line_no
            )

        # =========================================================
        # HTTP
        # =========================================================

        if re.search(
            r"http\:\/\/",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-319",
                "A02:2021 Cryptographic Failures",
                "Insecure HTTP connection detected",
                "Use HTTPS instead of HTTP",
                line_no
            )

        # =========================================================
        # new Random()
        # =========================================================

        if re.search(
            r"\bnew\s+Random\s*\(",
            line
        ):
            add_finding(
                "Medium",
                "CWE-338",
                "A02:2021 Cryptographic Failures",
                "Predictable random number generator detected",
                "Use SecureRandom for security-sensitive values",
                line_no
            )

        # =========================================================
        # Math.random()
        # =========================================================

        if re.search(
            r"\bMath\.random\s*\(",
            line
        ):
            add_finding(
                "Medium",
                "CWE-338",
                "A02:2021 Cryptographic Failures",
                "Math.random() is not suitable for security-sensitive values",
                "Use SecureRandom for tokens, IDs or security-sensitive randomness",
                line_no
            )

        # =========================================================
        # SecureRandom
        # =========================================================

        # No finding — this is the secure alternative.
        # =========================================================

        # printStackTrace()
        # =========================================================

        if re.search(
            r"\bprintStackTrace\s*\(\s*\)",
            line
        ):
            add_finding(
                "Low",
                "CWE-209",
                "A09:2021 Security Logging and Monitoring Failures",
                "Exception stack trace may expose internal information",
                "Use a proper logging framework and avoid exposing stack traces to users",
                line_no
            )

        # =========================================================
        # System.out.println sensitive data
        # =========================================================

        if re.search(
            r"\bSystem\.out\.println\s*\(",
            line
        ):
            if re.search(
                r"(password|passwd|pwd|secret|token|api[_-]?key|apikey|credential)",
                line,
                re.IGNORECASE
            ):
                add_finding(
                    "High",
                    "CWE-532",
                    "A09:2021 Security Logging and Monitoring Failures",
                    "Sensitive information may be written to application logs",
                    "Never log passwords, tokens, API keys or credentials",
                    line_no
                )

        # =========================================================
        # Hardcoded Password
        # =========================================================

        if re.search(
            r"\b(password|passwd|pwd)\s*=\s*['\"]",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-798",
                "A07:2021 Identification and Authentication Failures",
                "Possible hardcoded password",
                "Store credentials in environment variables or a secret manager",
                line_no
            )

        # =========================================================
        # API Key
        # =========================================================

        if re.search(
            r"\b(api[_-]?key|apikey)\s*=\s*['\"]",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "High",
                "CWE-798",
                "A07:2021 Identification and Authentication Failures",
                "Possible hardcoded API key",
                "Move API keys to environment variables or a secret manager",
                line_no
            )

        # =========================================================
        # Secret / Token
        # =========================================================

        if re.search(
            r"\b(secret|access[_-]?token|auth[_-]?token)\s*=\s*['\"]",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "High",
                "CWE-798",
                "A07:2021 Identification and Authentication Failures",
                "Possible hardcoded authentication secret",
                "Store secrets securely outside source code",
                line_no
            )

        # =========================================================
        # Reflection - Class.forName
        # =========================================================

        if re.search(
            r"\bClass\.forName\s*\(",
            line
        ):
            if re.search(
                r"(request|input|param|user|className)",
                line,
                re.IGNORECASE
            ):
                add_finding(
                    "High",
                    "CWE-470",
                    "A08:2021 Software and Data Integrity Failures",
                    "Reflection may load a class based on user-controlled input",
                    "Use an allowlist of permitted classes",
                    line_no
                )
            else:
                add_finding(
                    "Low",
                    "CWE-470",
                    "A08:2021 Software and Data Integrity Failures",
                    "Reflection usage detected",
                    "Avoid loading arbitrary classes from untrusted input",
                    line_no
                )

        # =========================================================
        # Runtime reflection
        # =========================================================

        if re.search(
            r"\bgetDeclaredMethod\s*\(",
            line
        ) or re.search(
            r"\bgetMethod\s*\(",
            line
        ):
            add_finding(
                "Low",
                "CWE-470",
                "A08:2021 Software and Data Integrity Failures",
                "Dynamic reflection method lookup detected",
                "Restrict reflective access to trusted classes and methods",
                line_no
            )

        # =========================================================
        # Weak SSL/TLS
        # =========================================================

        if re.search(
            r"(SSLv3|TLSv1\b|TLSv1\.1)",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "High",
                "CWE-326",
                "A02:2021 Cryptographic Failures",
                "Weak or deprecated TLS protocol detected",
                "Use TLS 1.2 or TLS 1.3",
                line_no
            )

        # =========================================================
        # Trust all certificates
        # =========================================================

        if re.search(
            r"(TrustAll|X509TrustManager)",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "High",
                "CWE-295",
                "A07:2021 Identification and Authentication Failures",
                "Custom certificate trust configuration may disable certificate validation",
                "Use the default JVM trust store and validate certificates properly",
                line_no
            )

        # =========================================================
        # Hostname verification disabled
        # =========================================================

        if re.search(
            r"HostnameVerifier",
            line
        ):
            add_finding(
                "High",
                "CWE-295",
                "A07:2021 Identification and Authentication Failures",
                "Custom hostname verification detected",
                "Ensure hostname verification is enabled and correctly validated",
                line_no
            )

        # =========================================================
        # Debug mode
        # =========================================================

        if re.search(
            r"\b(debug|debugMode)\s*=\s*true\b",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-489",
                "A05:2021 Security Misconfiguration",
                "Debug mode appears to be enabled",
                "Disable debug mode in production",
                line_no
            )

    return findings