from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.model_users import Role, Permission
from schemas.admin_schema import Role as RoleSchema, Permission as PermissionSchema
from routes.auth import get_current_admin

router = APIRouter(
    prefix="/roles",
    tags=["Roles & Permissions"],
    dependencies=[Depends(get_current_admin)],
)


# ---------------------------
# CREATE ROLE
# ---------------------------
@router.post("/", response_model=RoleSchema)
def create_role(name: str, permission_ids: List[int] = [], current_admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    if not current_admin.is_superadmin:
        raise HTTPException(status_code=403, detail="Not authorized")

    role = Role(name=name)
    if permission_ids:
        permissions = db.query(Permission).filter(Permission.id.in_(permission_ids)).all()
        role.permissions = permissions

    db.add(role)
    db.commit()
    db.refresh(role)
    return role


# ---------------------------
# LIST ROLES
# ---------------------------
@router.get("/", response_model=List[RoleSchema])
def list_roles(db: Session = Depends(get_db)):
    return db.query(Role).all()


# ---------------------------
# CREATE PERMISSION
# ---------------------------
@router.post("/permission", response_model=PermissionSchema)
def create_permission(name: str, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    if not current_admin.is_superadmin:
        raise HTTPException(status_code=403, detail="Not authorized")

    perm = Permission(name=name)
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm


# ---------------------------
# LIST PERMISSIONS
# ---------------------------
@router.get("/permission", response_model=List[PermissionSchema])
def list_permissions(db: Session = Depends(get_db)):
    return db.query(Permission).all()
