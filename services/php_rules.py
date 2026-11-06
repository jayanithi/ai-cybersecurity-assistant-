import re


def scan_php(code):
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
        stripped = line.strip()

        # =========================================================
        # SQL INJECTION
        # =========================================================

        # SQL query + PHP variable
        if re.search(
            r"\b(select|insert|update|delete)\b.*(\$[a-zA-Z_][a-zA-Z0-9_]*|\.\s*\$)",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Critical",
                "CWE-89",
                "A03:2021 Injection",
                "Possible SQL Injection through dynamic query construction",
                "Use PDO/MySQLi prepared statements with bound parameters",
                line_no
            )

        # SQL + concatenation
        if (
            re.search(
                r"\b(select|insert|update|delete)\b",
                line,
                re.IGNORECASE
            )
            and re.search(r"\.", line)
            and re.search(r"\$", line)
        ):
            add_finding(
                "Critical",
                "CWE-89",
                "A03:2021 Injection",
                "SQL query is dynamically constructed using PHP variables",
                "Use parameterized queries instead of string concatenation",
                line_no
            )

        # mysqli_query()
        if re.search(
            r"\bmysqli_query\s*\(",
            line,
            re.IGNORECASE
        ):
            if re.search(r"\$", line):
                add_finding(
                    "Critical",
                    "CWE-89",
                    "A03:2021 Injection",
                    "mysqli_query() may execute dynamically constructed SQL",
                    "Use prepared statements with bound parameters",
                    line_no
                )

        # =========================================================
        # Deprecated mysql_query()
        # =========================================================

        if re.search(
            r"\bmysql_query\s*\(",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "High",
                "CWE-89",
                "A03:2021 Injection",
                "Deprecated mysql_query() detected",
                "Replace with PDO or MySQLi prepared statements",
                line_no
            )

        # =========================================================
        # eval()
        # =========================================================

        if re.search(
            r"\beval\s*\(",
            line
        ):
            add_finding(
                "Critical",
                "CWE-95",
                "A03:2021 Injection",
                "Dangerous eval() enables dynamic PHP code execution",
                "Avoid eval() and use safer application logic",
                line_no
            )

        # =========================================================
        # assert() with dynamic input
        # =========================================================

        if re.search(
            r"\bassert\s*\(",
            line
        ):
            add_finding(
                "High",
                "CWE-95",
                "A03:2021 Injection",
                "Dynamic assert() may execute attacker-controlled code",
                "Avoid using assert() with untrusted input",
                line_no
            )

        # =========================================================
        # OS COMMAND INJECTION
        # =========================================================

        # exec()
        if re.search(
            r"\bexec\s*\(",
            line
        ):
            add_finding(
                "Critical",
                "CWE-78",
                "A03:2021 Injection",
                "Potential OS Command Injection through exec()",
                "Avoid shell execution and validate all external input",
                line_no
            )

        # system()
        if re.search(
            r"\bsystem\s*\(",
            line
        ):
            add_finding(
                "Critical",
                "CWE-78",
                "A03:2021 Injection",
                "Potential OS Command Injection through system()",
                "Avoid system() with user-controlled input",
                line_no
            )

        # shell_exec()
        if re.search(
            r"\bshell_exec\s*\(",
            line
        ):
            add_finding(
                "Critical",
                "CWE-78",
                "A03:2021 Injection",
                "Shell command execution detected",
                "Avoid shell_exec() or strictly validate command arguments",
                line_no
            )

        # passthru()
        if re.search(
            r"\bpassthru\s*\(",
            line
        ):
            add_finding(
                "Critical",
                "CWE-78",
                "A03:2021 Injection",
                "Potential OS Command Injection through passthru()",
                "Avoid passthru() with untrusted input",
                line_no
            )

        # popen()
        if re.search(
            r"\bpopen\s*\(",
            line
        ):
            add_finding(
                "High",
                "CWE-78",
                "A03:2021 Injection",
                "Command execution through popen()",
                "Avoid popen() with user-controlled data",
                line_no
            )

        # =========================================================
        # FILE INCLUSION
        # =========================================================

        # include($_GET...)
        if re.search(
            r"\binclude\s*\(\s*\$_(GET|POST|REQUEST)",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Critical",
                "CWE-98",
                "A05:2021 Security Misconfiguration",
                "User-controlled file included dynamically",
                "Never include files directly from user input; use a strict whitelist",
                line_no
            )

        # require($_GET...)
        if re.search(
            r"\brequire\s*\(\s*\$_(GET|POST|REQUEST)",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Critical",
                "CWE-98",
                "A05:2021 Security Misconfiguration",
                "User-controlled file required dynamically",
                "Use a strict server-side file whitelist",
                line_no
            )

        # include_once
        if re.search(
            r"\binclude_once\s*\(\s*\$_(GET|POST|REQUEST)",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Critical",
                "CWE-98",
                "A05:2021 Security Misconfiguration",
                "User-controlled file included through include_once()",
                "Use a strict whitelist for allowed files",
                line_no
            )

        # require_once
        if re.search(
            r"\brequire_once\s*\(\s*\$_(GET|POST|REQUEST)",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Critical",
                "CWE-98",
                "A05:2021 Security Misconfiguration",
                "User-controlled file required through require_once()",
                "Use a strict whitelist for allowed files",
                line_no
            )

        # =========================================================
        # PATH TRAVERSAL
        # =========================================================

        if re.search(
            r"\$_(GET|POST|REQUEST)\b",
            line,
            re.IGNORECASE
        ):
            if re.search(
                r"\b(file_get_contents|fopen|readfile|unlink|file|copy|rename)\s*\(",
                line,
                re.IGNORECASE
            ):
                add_finding(
                    "High",
                    "CWE-22",
                    "A01:2021 Broken Access Control",
                    "User-controlled input may be used as a filesystem path",
                    "Validate paths and restrict access to an allowed directory",
                    line_no
                )

        # =========================================================
        # UNSAFE DESERIALIZATION
        # =========================================================

        if re.search(
            r"\bunserialize\s*\(",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Critical",
                "CWE-502",
                "A08:2021 Software and Data Integrity Failures",
                "Unsafe PHP object deserialization detected",
                "Avoid unserialize() on untrusted data; prefer JSON",
                line_no
            )

        # =========================================================
        # MD5
        # =========================================================

        if re.search(
            r"\bmd5\s*\(",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-328",
                "A02:2021 Cryptographic Failures",
                "Weak MD5 hashing algorithm detected",
                "Use password_hash() for passwords or a modern cryptographic hash",
                line_no
            )

        # =========================================================
        # SHA1
        # =========================================================

        if re.search(
            r"\bsha1\s*\(",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-328",
                "A02:2021 Cryptographic Failures",
                "Weak SHA-1 hashing algorithm detected",
                "Use a stronger modern cryptographic algorithm",
                line_no
            )

        # =========================================================
        # HARDCODED PASSWORD
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
        # API KEY
        # =========================================================

        if re.search(
            r"(api[_-]?key|apikey)\s*=\s*['\"]",
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
        # SECRET / TOKEN
        # =========================================================

        if re.search(
            r"(secret|token|access[_-]?token|auth[_-]?token)\s*=\s*['\"]",
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
        # base64_decode()
        # =========================================================

        if re.search(
            r"\bbase64_decode\s*\(",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Low",
                "CWE-20",
                "A04:2021 Insecure Design",
                "Base64-decoded data should be validated before use",
                "Validate and sanitize decoded data before processing",
                line_no
            )

        # =========================================================
        # UNSAFE REQUEST INPUT
        # =========================================================

        if re.search(
            r"\$_(GET|POST|REQUEST|COOKIE)\b",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-20",
                "A03:2021 Injection",
                "Direct use of user-controlled request input",
                "Validate, sanitize and encode user input before use",
                line_no
            )

        # =========================================================
        # FILE UPLOAD
        # =========================================================

        if re.search(
            r"\$_FILES\b",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-434",
                "A05:2021 Security Misconfiguration",
                "File upload detected; uploaded files require validation",
                "Validate extension, MIME type, size and storage location",
                line_no
            )

        # =========================================================
        # move_uploaded_file()
        # =========================================================

        if re.search(
            r"\bmove_uploaded_file\s*\(",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-434",
                "A05:2021 Security Misconfiguration",
                "Uploaded file is being moved to the filesystem",
                "Validate file type, extension, size and destination",
                line_no
            )

        # =========================================================
        # REFLECTED XSS
        # =========================================================

        if re.search(
            r"\becho\s+.*\$_(GET|POST|REQUEST|COOKIE)",
            line,
            re.IGNORECASE
        ):
            if "htmlspecialchars" not in lower_line:
                add_finding(
                    "High",
                    "CWE-79",
                    "A03:2021 Injection",
                    "Possible reflected XSS through direct user input output",
                    "Use htmlspecialchars() with appropriate encoding",
                    line_no
                )

        # =========================================================
        # print user input
        # =========================================================

        if re.search(
            r"\bprint\s+.*\$_(GET|POST|REQUEST)",
            line,
            re.IGNORECASE
        ):
            if "htmlspecialchars" not in lower_line:
                add_finding(
                    "High",
                    "CWE-79",
                    "A03:2021 Injection",
                    "Possible reflected XSS through print output",
                    "Encode user-controlled output with htmlspecialchars()",
                    line_no
                )

        # =========================================================
        # chmod 777
        # =========================================================

        if re.search(
            r"\bchmod\s*\([^)]*777",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-732",
                "A05:2021 Security Misconfiguration",
                "Overly permissive filesystem permissions detected",
                "Avoid chmod 777 and use the minimum required permissions",
                line_no
            )

        # =========================================================
        # INSECURE HTTP
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
        # fopen with HTTP
        # =========================================================

        if re.search(
            r"\bfopen\s*\([^)]*http\:\/\/",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-319",
                "A02:2021 Cryptographic Failures",
                "fopen() is accessing an insecure HTTP resource",
                "Use HTTPS",
                line_no
            )

        # =========================================================
        # PHP ASSERT / DEBUG
        # =========================================================

        if re.search(
            r"\berror_reporting\s*\(\s*0\s*\)",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Low",
                "CWE-209",
                "A05:2021 Security Misconfiguration",
                "Error reporting configuration may hide application errors",
                "Use appropriate production error handling and logging",
                line_no
            )

        # =========================================================
        # PHPINFO
        # =========================================================

        if re.search(
            r"\bphpinfo\s*\(",
            line,
            re.IGNORECASE
        ):
            add_finding(
                "Medium",
                "CWE-200",
                "A01:2021 Broken Access Control",
                "phpinfo() may expose sensitive server configuration",
                "Remove or restrict phpinfo() in production",
                line_no
            )

        # =========================================================
        # OPEN REDIRECT
        # =========================================================

        if re.search(
            r"\bheader\s*\(\s*['\"]Location:",
            line,
            re.IGNORECASE
        ):
            if re.search(
                r"\$_(GET|POST|REQUEST)",
                line,
                re.IGNORECASE
            ):
                add_finding(
                    "Medium",
                    "CWE-601",
                    "A01:2021 Broken Access Control",
                    "Potential open redirect using user-controlled URL",
                    "Validate redirect destinations against an allowlist",
                    line_no
                )

    return findings