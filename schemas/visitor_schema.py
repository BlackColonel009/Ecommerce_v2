from pydantic import BaseModel

class VisitorCreate(BaseModel):
    device_id: str
    source: str = "Direct"