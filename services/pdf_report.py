from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

styles = getSampleStyleSheet()


def generate_pdf(report, filename):

    doc = SimpleDocTemplate(filename)

    elements = []

    elements.append(
        Paragraph(
            "<b>AI Cybersecurity Security Report</b>",
            styles["Title"]
        )
    )

    elements.append(Spacer(1,20))

    elements.append(
        Paragraph(
            f"Language : {report['language']}",
            styles["Normal"]
        )
    )

    elements.append(
        Paragraph(
            f"Risk Score : {report['riskScore']}",
            styles["Normal"]
        )
    )

    elements.append(
        Paragraph(
            f"Grade : {report['grade']}",
            styles["Normal"]
        )
    )

    elements.append(
        Paragraph(
            f"Confidence : {report['confidence']}%",
            styles["Normal"]
        )
    )

    elements.append(
        Paragraph(
            f"Status : {report['status']}",
            styles["Normal"]
        )
    )

    elements.append(Spacer(1,20))

    data = [
        [
            "Severity",
            "CWE",
            "Description",
            "Line"
        ]
    ]

    for vuln in report["vulnerabilities"]:

        data.append([
            vuln["severity"],
            vuln["cwe"],
            vuln["description"],
            str(vuln["line"])
        ])

    table = Table(data)

    table.setStyle(

        TableStyle([

            ("BACKGROUND",(0,0),(-1,0),colors.darkblue),

            ("TEXTCOLOR",(0,0),(-1,0),colors.white),

            ("GRID",(0,0),(-1,-1),1,colors.grey),

            ("BACKGROUND",(0,1),(-1,-1),colors.beige),

            ("BOTTOMPADDING",(0,0),(-1,0),12)

        ])

    )

    elements.append(table)

    doc.build(elements)

    return filename