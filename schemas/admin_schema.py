from pydantic import BaseModel, Field, field_validator
from typing import Optional, List


# ---------------- Roles ----------------
class Permission(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class Role(BaseModel):
    id: int
    name: str
    permissions: List[Permission]

    class Config:
        from_attributes = True


# ---------------- Admin ----------------
class AdminBase(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=5, max_length=100)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Le nom d'utilisateur est obligatoire")
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("Adresse e-mail invalide")
        return value


class AdminCreate(AdminBase):
    password: str = Field(min_length=6)
    role_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Le mot de passe ne doit pas dépasser 72 octets")
        return value


class AdminProfileUpdate(AdminBase):
    pass

class ChangePasswordSchema(BaseModel):
    old_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Le mot de passe ne doit pas dépasser 72 octets")
        return value
    
class Admin(AdminBase):
    id: int
    role: Optional[Role]
    is_superadmin: bool

    class Config:
        from_attributes = True


# ---------------- Login ----------------
# class LoginSchema(BaseModel):
#     username: str
#     password: str
