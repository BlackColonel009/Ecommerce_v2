from fastapi import APIRouter, Request, Depends
from schemas.visitor_schema import VisitorCreate
from sqlalchemy.orm import Session
from database import get_db
from models.model_vistor import Visitor

router = APIRouter(tags=["visiteurs"])

@router.post("/visitor")
async def register_visitor(payload: VisitorCreate, db: Session = Depends(get_db)):
    print("[Visitor API] Reçu device_id:", payload.device_id)

    new_visitor = Visitor(device_id=payload.device_id, source=payload.source)
    db.add(new_visitor)
    db.commit()
    return {"success": True}