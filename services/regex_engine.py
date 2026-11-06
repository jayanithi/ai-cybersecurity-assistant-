import re

RULES = [

{
    "name":"AWS Access Key",
    "regex":r"AKIA[0-9A-Z]{16}",
    "severity":"Critical",
    "cwe":"CWE-798",
    "owasp":"A07",
    "description":"Hardcoded AWS Access Key"
},

{
    "name":"JWT Token",
    "regex":r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+",
    "severity":"High",
    "cwe":"CWE-522",
    "owasp":"A07",
    "description":"JWT Token Exposed"
},

{
    "name":"Private Key",
    "regex":r"-----BEGIN PRIVATE KEY-----",
    "severity":"Critical",
    "cwe":"CWE-321",
    "owasp":"A02",
    "description":"Private Key Exposed"
},

{
    "name":"Password Assignment",
    "regex":r'password\s*=\s*["\'].*["\']',
    "severity":"Medium",
    "cwe":"CWE-798",
    "owasp":"A07",
    "description":"Hardcoded Password"
},

{
    "name":"API Key",

    "regex":r'api[_-]?key\s*=\s*["\'].*["\']',

    "severity":"Medium",

    "cwe":"CWE-798",

    "owasp":"A07",

    "description":"API Key Hardcoded"
},

{
    "name":"Bearer Token",

    "regex":r"Bearer\s+[A-Za-z0-9._-]+",

    "severity":"High",

    "cwe":"CWE-522",

    "owasp":"A07",

    "description":"Bearer Token Exposed"
},

{
    "name":"IPv4 Address",

    "regex":r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b",

    "severity":"Low",

    "cwe":"CWE-200",

    "owasp":"A01",

    "description":"IP Address Found"
},

{
    "name":"HTTP URL",

    "regex":r"http://[^\s]+",

    "severity":"Low",

    "cwe":"CWE-319",

    "owasp":"A02",

    "description":"HTTP Connection"
}

]


def regex_scan(code):

    findings=[]

    lines=code.splitlines()

    for line_no,line in enumerate(lines,start=1):

        for rule in RULES:

            if re.search(rule["regex"],line):

                findings.append({

                    "severity":rule["severity"],

                    "cwe":rule["cwe"],

                    "owasp":rule["owasp"],

                    "description":rule["description"],

                    "recommendation":"Review manually",

                    "line":line_no

                })

    return findings