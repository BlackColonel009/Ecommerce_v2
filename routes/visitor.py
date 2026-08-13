from datetime import datetime

from fastapi import APIRouter, Request, Depends, HTTPException
from schemas.visitor_schema import VisitorCreate, VisitorFirstNameUpdate
from sqlalchemy import func
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


@router.put("/visitor/first-name")
async def save_visitor_first_name(
    payload: VisitorFirstNameUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Mémorise le prénom facultatif du visiteur courant pour les demandes WhatsApp."""
    device_id = request.cookies.get("device_id")
    if not device_id:
        raise HTTPException(status_code=400, detail="Device ID manquant")

    visitor = (
        db.query(Visitor)
        .filter(Visitor.device_id == device_id, Visitor.first_name.isnot(None))
        .order_by(Visitor.date.desc())
        .first()
    )
    if not visitor:
        visitor = Visitor(device_id=device_id, source="Direct")
        db.add(visitor)

    visitor.first_name = payload.first_name
    visitor.first_name_updated_at = datetime.utcnow()
    db.commit()
    return {"success": True, "first_name": visitor.first_name}


@router.get("/visitor/first-name")
async def get_visitor_first_name(request: Request, db: Session = Depends(get_db)):
    device_id = request.cookies.get("device_id")
    if not device_id:
        return {"first_name": None}
    visitor = (
        db.query(Visitor)
        .filter(Visitor.device_id == device_id, Visitor.first_name.isnot(None))
        .order_by(Visitor.date.desc())
        .first()
    )
    return {"first_name": visitor.first_name if visitor else None}


@router.get("/visitor/social-proof")
async def social_proof_visitors(db: Session = Depends(get_db)):
    """Prénoms des visiteurs identifiés, un seul résultat par appareil."""
    latest_per_device = (
        db.query(Visitor.device_id, func.max(Visitor.id).label("visitor_id"))
        .filter(Visitor.first_name.isnot(None), func.length(func.trim(Visitor.first_name)) > 0)
        .group_by(Visitor.device_id)
        .subquery()
    )
    visitors = (
        db.query(Visitor.first_name)
        .join(latest_per_device, Visitor.id == latest_per_device.c.visitor_id)
        .order_by(Visitor.date.desc())
        .limit(100)
        .all()
    )
    return {"visitors": [{"first_name": visitor.first_name} for visitor in visitors]}
