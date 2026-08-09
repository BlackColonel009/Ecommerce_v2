from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.model_lead import Lead
from routes.auth import get_current_admin
from schemas.lead_schema import LeadCreate, LeadUpdateStatus, LeadOut

router = APIRouter(prefix="/admin/leads", tags=["Leads"])

# Créer un lead
@router.post("/", response_model=LeadOut)
def create_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    db_lead = Lead(**lead.dict())
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

# Lister tous les leads
@router.get("/", response_model=list[LeadOut])
def get_all_leads(db: Session = Depends(get_db), admin = Depends(get_current_admin) ):
    return db.query(Lead).all()

# Mettre à jour le statut d'un lead
@router.put("/{lead_id}/status", response_model=LeadOut)
def update_lead_status(lead_id: int, lead_update: LeadUpdateStatus, db: Session = Depends(get_db), admin = Depends(get_current_admin)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.status = lead_update.status
    db.commit()
    db.refresh(lead)
    return lead
