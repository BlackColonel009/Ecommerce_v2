from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from utils.service_email import email_service
from database import get_db
from models.model_newsletter import NewsletterSubscriber
from models.model_users import Admin
from schemas.newsletter_schema import NewsletterOut, NewsletterSubscribe
from typing import List
import uuid

from utils.service_email import EmailService
from routes.auth import get_current_admin
from config import settings

router = APIRouter(prefix="/subscribe", tags=["Newsletter"])

@router.get("/admin/newsletter", response_model=List[NewsletterOut])
def get_all_subscribers(db: Session = Depends(get_db), _admin = Depends(get_current_admin)):
    return db.query(NewsletterSubscriber).order_by(NewsletterSubscriber.subscribed_at.desc()).all()

@router.post("/newsletter")
def subscribe_to_newsletter(
    data: NewsletterSubscribe,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    exists = db.query(NewsletterSubscriber).filter_by(email=data.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Cet email est déjà abonné.")

    # Génération automatique d'un code bonus unique
    bonus_code = str(uuid.uuid4()).split("-")[0].upper()

    new_subscriber = NewsletterSubscriber(
        email=data.email,
        bonus_code=bonus_code
    )
    db.add(new_subscriber)
    db.commit()
    db.refresh(new_subscriber)

    # ✅ CORRECTION : passer l'email, pas FastMail
    background_tasks.add_task(
        email_service.send_newsletter_welcome,
        data.email,  
        bonus_amount="10000 FCFA"
    )

    return {
        "message": "Merci pour votre abonnement ! Un mail de bienvenue a été envoyé.",
        "bonus_code": bonus_code,
        "bonus_amount": new_subscriber.bonus_amount
    }

@router.delete("/newsletter/clear")
def delete_all_subscribers(db: Session = Depends(get_db), _admin = Depends(get_current_admin)):
    deleted = db.query(NewsletterSubscriber).delete()
    db.commit()
    return {"message": f"✅ {deleted} abonnés supprimés de la newsletter."}


@router.delete("/newsletter/{subscriber_id}")
def delete_newsletter_subscriber(subscriber_id: int, db: Session = Depends(get_db), _admin = Depends(get_current_admin)):
    subscriber = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Abonné introuvable.")
    
    db.delete(subscriber)
    db.commit()
    return {"message": f"✅ Abonné avec ID {subscriber_id} supprimé."}

@router.get("/newsletter/test-email")
async def send_test(_admin = Depends(get_current_admin)):
    await email_service.send_newsletter_welcome(settings.MAIL_FROM)
    return {"message": "✅ Test envoyé"}

# Activer & desactiver bonus

@router.put("/newsletter/bonus/{subscriber_id}")
def toggle_bonus(subscriber_id: int, activate: bool, db: Session = Depends(get_db), _admin = Depends(get_current_admin)):
    subscriber = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Abonné introuvable")

    if subscriber.bonus_used and activate:
        raise HTTPException(status_code=400, detail="Le bonus a déjà été utilisé, impossible de l’activer")

    subscriber.is_active = activate
    db.commit()

    return {
        "message": f"✅ Bonus {'activé' if activate else 'désactivé'} pour {subscriber.email}",
        "subscriber": {
            "id": subscriber.id,
            "email": subscriber.email,
            "is_active": subscriber.is_active,
            "bonus_used": subscriber.bonus_used,
            "bonus_amount": subscriber.bonus_amount,
            "bonus_expires_at": subscriber.bonus_expires_at,
        }
    }

# get user avec statut bonus

@router.get("/newsletter/user/{user_id}")
def get_user_newsletter_info(user_id: int, db: Session = Depends(get_db), _admin = Depends(get_current_admin)):
    user = db.query(Admin).filter(Admin.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    subscriptions = [
        {
            "id": sub.id,
            "email": sub.email,
            "is_active": sub.is_active,
            "bonus_used": sub.bonus_used,
            "bonus_amount": sub.bonus_amount,
            "bonus_expires_at": sub.bonus_expires_at
        }
        for sub in user.newsletter_subscriptions
    ]

    return {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "newsletter_subscriptions": subscriptions
    }
