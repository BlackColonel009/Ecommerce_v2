from enum import Enum as SQLEnum

class PromoType(str, SQLEnum):
    featured = "en_vedette"
    on_sale = "en_vente"
    top_rated = "les_mieux_notes"
    gift = "gift"
    black_friday = "black_friday"

