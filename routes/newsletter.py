from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from utils.service_email import email_service
from database import get_db
from models.model_newsletter import NewsletterSubscriber
from models.model_users import Admin
from schemas.newsletter_schema import NewsletterCampaign, NewsletterOut, NewsletterSubscribe
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
        bonus_amount=f"{new_subscriber.bonus_amount:,.0f} XOF".replace(",", " "),
        bonus_code=bonus_code,
    )

    return {
        "message": "Merci pour votre abonnement ! Un mail de bienvenue a été envoyé.",
        "bonus_code": bonus_code,
        "bonus_amount": new_subscriber.bonus_amount
    }


@router.post("/newsletter/campaign")
def send_newsletter_campaign(
    data: NewsletterCampaign,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Planifie une offre pour les abonnés ayant conservé leur abonnement actif."""
    recipients = [
        email
        for (email,) in db.query(NewsletterSubscriber.email)
        .filter(NewsletterSubscriber.is_active.is_(True))
        .all()
    ]
    if not recipients:
        raise HTTPException(status_code=400, detail="Aucun abonné actif à contacter.")

    background_tasks.add_task(
        email_service.send_newsletter_campaign,
        recipients=recipients,
        subject=data.subject,
        title=data.title,
        message=data.message,
        cta_label=data.cta_label,
        cta_url=str(data.cta_url) if data.cta_url else settings.FRONTEND_URL,
    )
    return {"message": "Campagne mise en file d’envoi.", "recipient_count": len(recipients)}

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
def toggle_bonus(
    subscriber_id: int,
    activate: bool,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    subscriber = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.id == subscriber_id).first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Abonné introuvable")

    if activate:
        if subscriber.bonus_used:
            raise HTTPException(status_code=400, detail="Ce code a déjà été utilisé et ne peut pas être réactivé")
        return {
            "message": "✅ Bonus déjà disponible",
            "subscriber": {
                "id": subscriber.id,
                "email": subscriber.email,
                "bonus_code": subscriber.bonus_code,
                "bonus_used": subscriber.bonus_used,
            },
        }

    if subscriber.bonus_used:
        return {
            "message": "✅ Ce code est déjà marqué comme utilisé",
            "subscriber": {
                "id": subscriber.id,
                "email": subscriber.email,
                "bonus_code": subscriber.bonus_code,
                "bonus_used": subscriber.bonus_used,
            },
        }

    # Désactiver le bonus depuis le dashboard signifie que le premier achat a été validé.
    subscriber.bonus_used = True
    db.commit()

    background_tasks.add_task(
        email_service.send_bonus_used_thank_you,
        subscriber.email,
        f"{subscriber.bonus_amount:,.0f} XOF".replace(",", " "),
        subscriber.bonus_code,
    )

    return {
        "message": f"✅ Bonus marqué comme utilisé pour {subscriber.email}. Un e-mail de remerciement est en cours d’envoi.",
        "subscriber": {
            "id": subscriber.id,
            "email": subscriber.email,
            "is_active": subscriber.is_active,
            "bonus_code": subscriber.bonus_code,
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
