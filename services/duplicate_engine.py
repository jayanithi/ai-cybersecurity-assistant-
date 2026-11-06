SEVERITY_PRIORITY = {
    "Critical": 4,
    "High": 3,
    "Medium": 2,
    "Low": 1,
    "Info": 0
}


def remove_duplicates(findings):

    unique = {}

    for finding in findings:

        key = (
            finding["description"],
            finding["cwe"]
        )

        if key not in unique:

            finding["lines"] = [finding["line"]]

            unique[key] = finding

        else:

            existing = unique[key]

            # Merge line numbers

            if finding["line"] not in existing["lines"]:

                existing["lines"].append(
                    finding["line"]
                )

            # Keep Highest Severity

            if (
                SEVERITY_PRIORITY[
                    finding["severity"]
                ]
                >
                SEVERITY_PRIORITY[
                    existing["severity"]
                ]
            ):

                existing["severity"] = finding["severity"]

    return list(unique.values())