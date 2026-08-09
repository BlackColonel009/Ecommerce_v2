"""Crée ou met à jour le super-administrateur principal.

Usage simple depuis la racine du projet :
    ./.venv/Scripts/python.exe script/create_super_admin.py

Les valeurs peuvent aussi être remplacées avec --email, --username et
--password.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import insert, or_, select, update


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Pydantic cherche normalement `.env` dans le dossier courant. Le charger ici
# rend le script fiable même lorsqu'il est lancé depuis le dossier `script`.
load_dotenv(PROJECT_ROOT / ".env")

from database import Base, engine  # noqa: E402
from models.model_users import (  # noqa: E402
    Admin,
    PasswordResetToken,
    Permission,
    Role,
    role_permissions,
)
from utils.security import hash_password  # noqa: E402


DEFAULT_EMAIL = "admin@alpha.com"
DEFAULT_PASSWORD = "admin123"

PERMISSIONS = (
    ("manage_users", "Gérer les utilisateurs"),
    ("manage_products", "Gérer les produits"),
    ("manage_orders", "Gérer les commandes"),
    ("manage_reviews", "Gérer les avis"),
    ("view_dashboard", "Voir le tableau de bord"),
    ("manage_settings", "Gérer les paramètres"),
)


def ensure_admin_role(connection) -> int:
    """Crée le rôle administrateur et lui attribue toutes les permissions."""
    permission_table = Permission.__table__
    role_table = Role.__table__
    permission_ids: list[int] = []

    for name, description in PERMISSIONS:
        permission_id = connection.execute(
            select(permission_table.c.id).where(permission_table.c.name == name)
        ).scalar_one_or_none()

        if permission_id is None:
            permission_id = connection.execute(
                insert(permission_table)
                .values(name=name, description=description)
                .returning(permission_table.c.id)
            ).scalar_one()

        permission_ids.append(permission_id)

    role_id = connection.execute(
        select(role_table.c.id).where(role_table.c.name == "Administrateur")
    ).scalar_one_or_none()

    if role_id is None:
        role_id = connection.execute(
            insert(role_table)
            .values(
                name="Administrateur",
                description="Accès complet à l'administration",
            )
            .returning(role_table.c.id)
        ).scalar_one()

    assigned_permissions = set(
        connection.execute(
            select(role_permissions.c.permission_id).where(
                role_permissions.c.role_id == role_id
            )
        ).scalars()
    )

    missing_links = [
        {"role_id": role_id, "permission_id": permission_id}
        for permission_id in permission_ids
        if permission_id not in assigned_permissions
    ]
    if missing_links:
        connection.execute(insert(role_permissions), missing_links)

    return role_id


def create_or_update_super_admin(email: str, username: str, password: str) -> bool:
    """Retourne True si le compte est créé, False s'il est mis à jour."""
    admin_table = Admin.__table__
    Base.metadata.create_all(
        bind=engine,
        tables=[
            Role.__table__,
            Permission.__table__,
            role_permissions,
            Admin.__table__,
            PasswordResetToken.__table__,
        ],
    )

    with engine.begin() as connection:
        role_id = ensure_admin_role(connection)
        matches = connection.execute(
            select(
                admin_table.c.id,
                admin_table.c.email,
                admin_table.c.username,
            ).where(
                or_(admin_table.c.email == email, admin_table.c.username == username)
            )
        ).mappings().all()

        matched_ids = {row["id"] for row in matches}
        if len(matched_ids) > 1:
            raise RuntimeError(
                "L'adresse e-mail et le nom d'utilisateur appartiennent à "
                "deux comptes différents. Corrigez ce conflit avant de relancer."
            )

        values = {
            "username": username,
            "email": email,
            "hashed_password": hash_password(password),
            "role_id": role_id,
            "is_superadmin": True,
        }

        if matches:
            connection.execute(
                update(admin_table)
                .where(admin_table.c.id == matches[0]["id"])
                .values(**values)
            )
            return False

        connection.execute(insert(admin_table).values(**values))
        return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Créer ou mettre à jour le super-administrateur du dashboard."
    )
    parser.add_argument("--email", default=DEFAULT_EMAIL)
    parser.add_argument(
        "--username",
        help="Identifiant de connexion. Par défaut, la même valeur que l'e-mail.",
    )
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    email = args.email.strip().lower()
    username = (args.username or email).strip()

    if not email or "@" not in email:
        print("❌ Adresse e-mail invalide.")
        return 2
    if not username:
        print("❌ Le nom d'utilisateur ne peut pas être vide.")
        return 2
    if len(args.password) < 8:
        print("❌ Le mot de passe doit contenir au moins 8 caractères.")
        return 2

    try:
        created = create_or_update_super_admin(email, username, args.password)
    except Exception as error:
        print(f"❌ Initialisation impossible : {error}")
        return 1

    action = "créé" if created else "mis à jour"
    print(f"✅ Super-administrateur {action} avec succès.")
    print(f"   Identifiant : {username}")
    print(f"   E-mail      : {email}")
    if args.password == DEFAULT_PASSWORD:
        print("⚠️  Mot de passe temporaire utilisé : changez-le avant la production.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
