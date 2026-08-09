# scripts/init_db.py

import sys
import os

# Ajouter le répertoire parent au path pour pouvoir importer les modules
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv

load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

import models  # noqa: E402,F401 - charge tout le registre SQLAlchemy
from database import Base, SessionLocal, engine  # noqa: E402
from models.model_users import Role, Admin, Permission  # noqa: E402
from utils.security import hash_password  # noqa: E402


def init_database():
    """Initialise la base de données avec les rôles et le superadmin"""
    
    print("🚀 Initialisation de la base de données...")
    
    # Créer les tables
    Base.metadata.create_all(bind=engine, checkfirst=True)
    print("✅ Tables créées")
    
    db = SessionLocal()
    
    try:
        # =============================================
        # 1. CRÉER LES PERMISSIONS
        # =============================================
        permissions_data = [
            {"name": "manage_users", "description": "Gérer les utilisateurs"},
            {"name": "manage_products", "description": "Gérer les produits"},
            {"name": "manage_orders", "description": "Gérer les commandes"},
            {"name": "manage_reviews", "description": "Gérer les avis"},
            {"name": "view_dashboard", "description": "Voir le tableau de bord"},
            {"name": "manage_settings", "description": "Gérer les paramètres"},
        ]
        
        permission_objects = []
        for perm_data in permissions_data:
            perm = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
            if not perm:
                perm = Permission(**perm_data)
                db.add(perm)
                permission_objects.append(perm)
                print(f"  ✅ Permission créée: {perm_data['name']}")
            else:
                permission_objects.append(perm)
                print(f"  ℹ️ Permission existante: {perm_data['name']}")
        
        db.commit()
        
        # =============================================
        # 2. CRÉER LE RÔLE ADMINISTRATEUR
        # =============================================
        admin_role = db.query(Role).filter(Role.name == "Administrateur").first()
        if not admin_role:
            admin_role = Role(
                name="Administrateur",
                description="Accès complet à l'administration"
            )
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
            
            # Ajouter toutes les permissions au rôle admin
            admin_role.permissions = permission_objects
            db.commit()
            print("✅ Rôle 'Administrateur' créé avec toutes les permissions")
        else:
            print("ℹ️ Rôle 'Administrateur' existe déjà")
        
        # =============================================
        # 3. CRÉER LE RÔLE CLIENT
        # =============================================
        client_role = db.query(Role).filter(Role.name == "client").first()
        if not client_role:
            client_role = Role(
                name="client",
                description="Utilisateur client standard"
            )
            db.add(client_role)
            db.commit()
            print("✅ Rôle 'client' créé")
        else:
            print("ℹ️ Rôle 'client' existe déjà")
        
        # =============================================
        # 4. CRÉER LE SUPERADMIN
        # =============================================
        from config import settings

        superadmin_username = settings.SUPERADMIN_USERNAME
        superadmin_email = settings.SUPERADMIN_EMAIL
        superadmin_password = settings.SUPERADMIN_PASSWORD
        
        existing_admin = db.query(Admin).filter(
            (Admin.username == superadmin_username) | 
            (Admin.email == superadmin_email)
        ).first()
        
        if not existing_admin:
            superadmin = Admin(
                username=superadmin_username,
                email=superadmin_email,
                hashed_password=hash_password(superadmin_password),
                role_id=admin_role.id,
                is_superadmin=True
            )
            db.add(superadmin)
            db.commit()
            print(f"✅ Superadmin créé: {superadmin_username} / {superadmin_email}")
        else:
            print(f"ℹ️ Superadmin existe déjà: {existing_admin.username}")
        
        # =============================================
        # 5. VÉRIFICATION FINALE
        # =============================================
        admin_count = db.query(Admin).count()
        role_count = db.query(Role).count()
        permission_count = db.query(Permission).count()
        
        print("\n📊 RÉCAPITULATIF:")
        print(f"   - Administrateurs: {admin_count}")
        print(f"   - Rôles: {role_count}")
        print(f"   - Permissions: {permission_count}")
        print("\n✅ Initialisation terminée avec succès!")
        
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def reset_database():
    """Supprime toutes les tables et les recrée (pour développement)"""
    print("⚠️  Réinitialisation complète de la base...")
    Base.metadata.drop_all(bind=engine)
    print("✅ Tables supprimées")
    init_database()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Initialisation de la base de données")
    parser.add_argument("--reset", action="store_true", help="Supprime et recrée toutes les tables")
    
    args = parser.parse_args()
    
    if args.reset:
        reset_database()
    else:
        init_database()
        
        
# utilisation

# Installation
# pip install python-dotenv

# # Initialisation simple
# python scripts/init_db.py

# # Réinitialisation complète (supprime toutes les tables et recrée)
# python scripts/init_db.py --reset
