from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response
from models.model_cart import Settings
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from fastapi.security import OAuth2PasswordRequestForm

from database import get_db
from models.model_users import Admin, Role
from utils.security import hash_password, verify_password, create_access_token
from routes.auth import get_current_admin
from schemas.admin_schema import (
    AdminCreate,
    AdminProfileUpdate,
    Admin as AdminSchema,
    ChangePasswordSchema,
)

from fastapi import BackgroundTasks, HTTPException, Depends
from database import get_db
from models.model_users import Admin, PasswordResetToken
from utils.service_email import email_service
import secrets
from datetime import datetime, timedelta
from config import settings

router = APIRouter(prefix="/auth", tags=["Admin Auth"])


# ---------------------------
# CREATE SUPERADMIN (1st time)
# ---------------------------
@router.post("/create-superadmin", response_model=AdminSchema)
def create_superadmin(data: AdminCreate, db: Session = Depends(get_db)):

    if db.query(Admin).filter(Admin.is_superadmin.is_(True)).first():
        raise HTTPException(
            status_code=403,
            detail="Un super-administrateur existe déjà",
        )

    exists = db.query(Admin).filter(Admin.email == data.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Admin already exists")

    admin = Admin(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        role_id=data.role_id,
        is_superadmin=True
    )

    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


# ---------------------------
# LOGIN ADMIN
# ---------------------------
@router.post("/login")
def login(
    request: Request,
    response: Response,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):

    identifier = form.username.strip()
    admin = db.query(Admin).filter(
        or_(
            func.lower(Admin.username) == identifier.lower(),
            func.lower(Admin.email) == identifier.lower(),
        )
    ).first()

    # UTILISE hashed_password ici
    if not admin or not verify_password(form.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"admin_id": admin.id})
    cookie_host = request.headers.get("origin") or request.url.hostname

    response.set_cookie(
        key=settings.ADMIN_COOKIE_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.admin_cookie_is_secure(cookie_host),
        samesite="lax",
        path="/",
        domain=settings.admin_cookie_domain_for_host(cookie_host),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "admin": {
            "id": admin.id,
            "username": admin.username,
            "email": admin.email,
            "is_superadmin": admin.is_superadmin
        }
    }



# ---------------------------
# GET CURRENT ADMIN
# ---------------------------
@router.get("/me", response_model=AdminSchema)
def get_me(admin = Depends(get_current_admin)):
    return admin

# ---------------------------
# CREATE REGULAR USER (PUBLIC) - Plus besoin d'authentification
# ---------------------------
@router.post("/create", response_model=AdminSchema, status_code=201)
def create_user(data: AdminCreate, db: Session = Depends(get_db)):

    # Vérifier si l'email existe déjà
    exists = db.query(Admin).filter(func.lower(Admin.email) == data.email.lower()).first()
    if exists:
        raise HTTPException(status_code=409, detail="Un compte utilise déjà cette adresse e-mail")
    
    # Vérifier si le username existe déjà
    username_exists = db.query(Admin).filter(func.lower(Admin.username) == data.username.lower()).first()
    if username_exists:
        raise HTTPException(status_code=409, detail="Ce nom d'utilisateur est déjà utilisé")

    # Récupérer l'ID du rôle "client" (généralement 2)
    client_role = db.query(Role).filter(Role.name == "client").first()
    if not client_role:
        # Si le rôle n'existe pas, le créer automatiquement
        client_role = Role(name="client", description="Utilisateur client standard")
        db.add(client_role)
        db.commit()
        db.refresh(client_role)
    
    # Créer l'utilisateur avec le rôle client par défaut
    admin = Admin(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        role_id=client_role.id,  # ✅ Attribution automatique
        is_superadmin=False
    )

    try:
        db.add(admin)
        db.commit()
        db.refresh(admin)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cette adresse e-mail ou ce nom d'utilisateur est déjà utilisé",
        )
    
    # Ne pas renvoyer le mot de passe
    return admin


@router.put("/user/profile", response_model=AdminSchema)
def update_profile(
    data: AdminProfileUpdate,
    db: Session = Depends(get_db),
    current_user: Admin = Depends(get_current_admin),
):
    email_exists = db.query(Admin).filter(
        func.lower(Admin.email) == data.email.lower(),
        Admin.id != current_user.id,
    ).first()
    if email_exists:
        raise HTTPException(status_code=409, detail="Cette adresse e-mail est déjà utilisée")

    username_exists = db.query(Admin).filter(
        func.lower(Admin.username) == data.username.lower(),
        Admin.id != current_user.id,
    ).first()
    if username_exists:
        raise HTTPException(status_code=409, detail="Ce nom d'utilisateur est déjà utilisé")

    current_user.username = data.username
    current_user.email = data.email
    try:
        db.commit()
        db.refresh(current_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ces informations sont déjà utilisées")
    return current_user


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response):
    cookie_host = request.headers.get("origin") or request.url.hostname
    response.delete_cookie(
        key=settings.ADMIN_COOKIE_NAME,
        path="/",
        secure=settings.admin_cookie_is_secure(cookie_host),
        httponly=True,
        samesite="lax",
        domain=settings.admin_cookie_domain_for_host(cookie_host),
    )

from routes.auth import has_permission

@router.post("/secure-endpoint")
def secure_action(admin = Depends(get_current_admin), permitted = Depends(has_permission("manage_products"))):
    return {"message": "You can do this action"}


# ******whatsapp_message.py******

@router.put("/admin/whatsapp_number")
def set_whatsapp_number(
    number: str,
    db: Session = Depends(get_db),
    _admin = Depends(get_current_admin),
):
    setting = db.query(Settings).filter(Settings.key == "whatsapp_number").first()
    if not setting:
        setting = Settings(key="whatsapp_number", value=number)
        db.add(setting)
    else:
        setting.value = number
    db.commit()
    return {"message": f"WhatsApp number updated to {number}"}


def get_admin_whatsapp_number(db: Session):
    setting = db.query(Settings).filter(Settings.key == "whatsapp_number").first()
    return setting.value if setting else "22893356041"

# ----------------------------------------------------------------------------------
# FORGOT PASSWORD
# ----------------------------------------------------------------------------------

# routes/auth.py


@router.post("/forgot-password")
async def forgot_password(
    background_tasks: BackgroundTasks,  # ⬅️ Sans valeur par défaut en premier
    email: str = Body(..., embed=True),  # ⬅️ Avec valeur par défaut après
    db: Session = Depends(get_db)
):
    # ... reste du code
    """
    Demande de réinitialisation de mot de passe
    """
    user = db.query(Admin).filter(Admin.email == email).first()
    
    if not user:
        # Pour des raisons de sécurité, on renvoie le même message
        return {"message": "Si cet email existe, vous recevrez un lien de réinitialisation"}
    
    # Générer un token unique
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    # Supprimer les anciens tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id
    ).delete()
    
    # Créer le nouveau token
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    db.add(reset_token)
    db.commit()
    
    # Envoyer l'email en arrière-plan
    background_tasks.add_task(
        email_service.send_password_reset,
        email,
        token
    )
    
    return {"message": "Si cet email existe, vous recevrez un lien de réinitialisation"}

@router.post("/reset-password")
async def reset_password(
    token: str = Body(...),
    new_password: str = Body(...),
    db: Session = Depends(get_db)
):
    """
    Réinitialisation du mot de passe avec token
    """
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    if len(new_password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Le mot de passe ne doit pas dépasser 72 octets")

    # Vérifier le token
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")
    
    # Récupérer l'utilisateur
    user = db.query(Admin).filter(Admin.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Mettre à jour le mot de passe
    user.hashed_password = hash_password(new_password)
    
    # Marquer le token comme utilisé
    reset_token.used = True
    
    db.commit()
    
    return {"message": "Mot de passe réinitialisé avec succès"}


# ---------------------------------------------------------------
# FOR PROFIL
# ---------------------------------------------------------------



@router.post("/user/change-password")
def change_password(
    data: ChangePasswordSchema,
    db: Session = Depends(get_db),
    current_user: Admin = Depends(get_current_admin)
):
    """
    Change le mot de passe de l'utilisateur connecté
    """
    # Vérifier l'ancien mot de passe
    if not current_user.verify_password(data.old_password):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")
    
    # Mettre à jour
    current_user.set_password(data.new_password)
    db.commit()
    
    return {
        "message": "Mot de passe modifié avec succès",
        "status": "success"
    }
