from fastapi import Cookie, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from database import get_db
from models.model_users import Admin
from utils.security import SECRET_KEY, ALGORITHM
from config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_current_admin(
    token: str | None = Depends(oauth2_scheme),
    cookie_token: str | None = Cookie(default=None, alias=settings.ADMIN_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    token = token or cookie_token
    if not token:
        raise HTTPException(status_code=401, detail="Authentification requise")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id: int = payload.get("admin_id")
        if admin_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    return admin



def has_permission(permission_name: str):
    def checker(admin = Depends(get_current_admin)):
        if admin.is_superadmin:
            return True
        if not admin.role:
            raise HTTPException(status_code=403, detail="No role assigned")
        if permission_name not in [p.name for p in admin.role.permissions]:
            raise HTTPException(status_code=403, detail=f"Permission '{permission_name}' required")
        return True
    return checker

