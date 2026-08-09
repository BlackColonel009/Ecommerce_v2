from sqlalchemy import create_engine, select

from script import create_super_admin
from models.model_users import Admin
from utils.security import verify_password


def test_create_super_admin_is_idempotent(monkeypatch):
    temporary_engine = create_engine("sqlite:///:memory:")
    monkeypatch.setattr(create_super_admin, "engine", temporary_engine)

    assert create_super_admin.create_or_update_super_admin(
        "admin@alpha.com", "admin@alpha.com", "admin123"
    ) is True
    assert create_super_admin.create_or_update_super_admin(
        "admin@alpha.com", "admin@alpha.com", "admin123"
    ) is False

    admin_table = Admin.__table__
    with temporary_engine.connect() as connection:
        accounts = connection.execute(select(admin_table)).mappings().all()

    assert len(accounts) == 1
    assert accounts[0]["email"] == "admin@alpha.com"
    assert accounts[0]["username"] == "admin@alpha.com"
    assert accounts[0]["is_superadmin"] is True
    assert verify_password("admin123", accounts[0]["hashed_password"])
