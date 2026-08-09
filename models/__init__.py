"""Registre central de tous les modèles SQLAlchemy.

Importer ce module garantit que ``Base.metadata`` contient toutes les tables,
aussi bien au démarrage de l'API que dans Alembic et les scripts autonomes.
"""

from . import model_users
from . import model_product
from . import model_category
from . import model_brands
from . import model_marketing
from . import model_support
from . import model_cart
from . import model_favoris_compare
from . import model_recent
from . import model_popoups_promo
from . import model_vistor
from . import model_lead
from . import model_support_message
from . import model_review
from . import model_newsletter
from . import model_blog

__all__ = [name for name in globals() if name.startswith("model_")]
