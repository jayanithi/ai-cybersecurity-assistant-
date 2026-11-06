from pydantic import BaseModel

class ScanRequest(BaseModel):
    language: str
    code: str