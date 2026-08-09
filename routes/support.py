from fastapi import APIRouter, Depends, HTTPException, Form
from fastapi_mail import FastMail, MessageSchema, MessageType
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database import get_db
from models.model_support import ContactMessage as ContactModel
from schemas.support_schema import ContactMessage as ContactSchema
from models.model_support_message import SupportMessage
from schemas.support_message_schema import SupportReplySchema
from routes.auth import get_current_admin
from config import conf

router = APIRouter(prefix="/support", tags=["Support"])


@router.post("/contact", response_model=ContactSchema)
def create_contact(
    name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    subject: str = Form(...),
    message: str = Form(...),
    db: Session = Depends(get_db)
):
    contact = ContactModel(
        name=name,
        email=email,
        phone=phone,
        subject=subject,
        message=message,
        created_at=datetime.utcnow()
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

# @router.get("/messages", response_model=List[ContactSchema])
# def list_contacts(db: Session = Depends(get_db), admin = Depends(get_current_admin)):
#     return db.query(ContactModel).order_by(ContactModel.created_at.desc()).all()

@router.get("/messages")
def get_support_messages(db: Session = Depends(get_db), admin = Depends(get_current_admin)):
    messages = db.query(ContactModel).all()

    results = []
    for msg in messages:
        # Vérifie si une réponse existe pour ce message
        has_reply = db.query(SupportMessage).filter(SupportMessage.contact_id == msg.id).first() is not None
        results.append({
            "id": msg.id,
            "name": msg.name,
            "email": msg.email,
            "message": msg.message,
            "replied": has_reply,
            "created_at": msg.created_at
        })

    return results



@router.get("/message/{contact_id}", response_model=ContactSchema)
def get_contact(contact_id: int, db: Session = Depends(get_db), admin = Depends(get_current_admin)):
    contact = db.query(ContactModel).filter(ContactModel.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact message not found")
    return contact

@router.delete("/message/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db), admin = Depends(get_current_admin)):
    contact = db.query(ContactModel).filter(ContactModel.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact message not found")
    db.delete(contact)
    db.commit()
    return {"message": "Contact message deleted successfully"}

# ************************ Reply support ************************


# routes/support.py

@router.post("/reply")
async def reply_to_support(
    payload: SupportReplySchema,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    # 1️⃣ Message client
    contact = db.query(ContactModel).filter(
        ContactModel.id == payload.message_id
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Message introuvable")

    # 2️⃣ Envoi du mail
    email = MessageSchema(
        subject="Réponse du support",
        recipients=[contact.email],
        body=payload.reply,
        subtype=MessageType.plain
    )

    fm = FastMail(conf)
    await fm.send_message(email)

    # 3️⃣ Création / MAJ du message support
    support_msg = db.query(SupportMessage).filter(
        SupportMessage.contact_id == contact.id
    ).first()

    if not support_msg:
        support_msg = SupportMessage(
            contact_id=contact.id,
            email=contact.email,
            reply_message=payload.reply,
            replied=True,
            replied_at=datetime.utcnow()
        )
        db.add(support_msg)
    else:
        support_msg.reply_message = payload.reply
        support_msg.replied = True
        support_msg.replied_at = datetime.utcnow()

    db.commit()

    return {
        "status": "success",
        "message": "Réponse envoyée et message marqué comme répondu"
    }
