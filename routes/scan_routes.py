from fastapi import APIRouter

from models.scan_model import ScanRequest

router = APIRouter()

@router.post("/scan")
def scan_code(payload: ScanRequest):

    return {
        "riskScore": 0,
        "totalIssues": 0,
        "status": "Pending",
        "language": payload.language,
        "message": "Scanner engine coming next phase."
    }