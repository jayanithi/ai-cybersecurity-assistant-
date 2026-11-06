from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch


def generate_pdf(report, filename):

    styles = getSampleStyleSheet()

    doc = SimpleDocTemplate(filename)

    elements = []

    elements.append(
        Paragraph(
            "<b><font size=20>AI Cybersecurity Assistant</font></b>",
            styles["Title"]
        )
    )

    elements.append(
        Paragraph(
            "<b>Security Assessment Report</b>",
            styles["Heading2"]
        )
    )

    elements.append(Spacer(1, 0.3 * inch))

    info = [

        ["Language", report.get("language")],

        ["Risk Score", str(report.get("riskScore"))],

        ["Security Grade", report.get("grade")],

        ["Status", report.get("status")],

        ["Total Issues", str(report.get("totalIssues"))]

    ]

    table = Table(info)

    table.setStyle(

        TableStyle([

            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),

            ("GRID", (0, 0), (-1, -1), 1, colors.black),

            ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),

            ("BOTTOMPADDING", (0, 0), (-1, -1), 8)

        ])

    )

    elements.append(table)

    elements.append(Spacer(1, 0.3 * inch))

    elements.append(

        Paragraph(

            "<b>Detected Vulnerabilities</b>",

            styles["Heading2"]

        )

    )

    vuln_table = [

        [

            "Severity",

            "CWE",

            "Description",

            "Line"

        ]

    ]

    for vuln in report.get("vulnerabilities", []):

        vuln_table.append([

            vuln.get("severity"),

            vuln.get("cwe"),

            vuln.get("description"),

            str(vuln.get("line"))

        ])

    table2 = Table(vuln_table)

    table2.setStyle(

        TableStyle([

            ("GRID", (0, 0), (-1, -1), 1, colors.black),

            ("BACKGROUND", (0, 0), (-1, 0), colors.darkblue),

            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),

            ("BOTTOMPADDING", (0, 0), (-1, 0), 8)

        ])

    )

    elements.append(table2)

    elements.append(Spacer(1, 0.3 * inch))

    if report.get("aiFix"):

        elements.append(

            Paragraph(

                "<b>AI Secure Fix</b>",

                styles["Heading2"]

            )

        )

        elements.append(

            Paragraph(

                report["aiFix"].replace("\n", "<br/>"),

                styles["BodyText"]

            )

        )

    doc.build(elements)