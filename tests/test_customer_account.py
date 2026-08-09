from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models  # noqa: F401 - enregistre toutes les relations SQLAlchemy
from database import Base, get_db
from main import app
from models.model_users import Role


def test_customer_account_full_flow():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    with TestingSession() as session:
        session.add(Role(name="client", description="Client"))
        session.commit()

    def override_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    try:
        created = client.post(
            "/auth/create",
            json={
                "username": "client-test",
                "email": "CLIENT.TEST@example.com",
                "password": "initial123",
            },
        )
        assert created.status_code == 201
        assert created.json()["email"] == "client.test@example.com"

        duplicate = client.post(
            "/auth/create",
            json={
                "username": "autre-client",
                "email": "client.test@example.com",
                "password": "initial123",
            },
        )
        assert duplicate.status_code == 409

        login = client.post(
            "/auth/login",
            data={"username": "CLIENT.TEST@example.com", "password": "initial123"},
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me = client.get("/auth/me", headers=headers)
        assert me.status_code == 200
        assert me.json()["username"] == "client-test"

        updated = client.put(
            "/auth/user/profile",
            headers=headers,
            json={"username": "client-modifie", "email": "updated@example.com"},
        )
        assert updated.status_code == 200
        assert updated.json()["username"] == "client-modifie"

        password = client.post(
            "/auth/user/change-password",
            headers=headers,
            json={"old_password": "initial123", "new_password": "nouveau123"},
        )
        assert password.status_code == 200

        new_login = client.post(
            "/auth/login",
            data={"username": "updated@example.com", "password": "nouveau123"},
        )
        assert new_login.status_code == 200

        logout = client.post("/auth/logout")
        assert logout.status_code == 204
    finally:
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(engine)
        engine.dispose()
