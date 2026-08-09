from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
from utils.security import hash_password, verify_password

# ------------------------
# Roles & Permissions
# ------------------------
# Table d'association many-to-many roles <-> permissions
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE")),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"))
)

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    permissions = relationship(
        "Permission",
        secondary=role_permissions,
        back_populates="roles"
    )
    admins = relationship("Admin", backref="role")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    roles = relationship(
        "Role",
        secondary=role_permissions,
        back_populates="permissions"
    )

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("admins.id", ondelete="CASCADE"))
    token = Column(String(100), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("Admin")

# ------------------------
# Admin Users
# ------------------------
class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_superadmin = Column(Boolean, default=False)
    role_id = Column(Integer, ForeignKey("roles.id"))
    
    reviews = relationship("Review", back_populates="admin")

    # 🔗 Newsletter relation
    newsletter_subscriptions = relationship("NewsletterSubscriber", back_populates="user")


    def set_password(self, password: str):
        self.hashed_password = hash_password(password)

    def verify_password(self, password: str) -> bool:
        return verify_password(password, self.hashed_password)
