from fastapi import APIRouter, Depends
from models.model_lead import Lead
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from database import get_db
from models.model_vistor import Visitor
from models.model_product import Product
from routes.auth import get_current_admin

router = APIRouter(
    prefix="/stats",
    tags=["Statistiques Visiteurs & autres"],
    dependencies=[Depends(get_current_admin)],
)

# Objectif : Retourner le nombre de visiteurs par jour pour les 7 derniers jours.

@router.get("/visitors-week")
def visitors_week(db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=6)  # 7 jours incluant aujourd'hui

    # Grouper par date
    results = (
        db.query(func.date(Visitor.date).label("day"), func.count(Visitor.id).label("count"))
        .filter(Visitor.date >= week_ago)
        .group_by(func.date(Visitor.date))
        .order_by(func.date(Visitor.date))
        .all()
    )

    # Construire un dict avec tous les jours pour éviter les trous
    data = []
    for i in range(7):
        day = week_ago + timedelta(days=i)
        count = next((r.count for r in results if r.day == day), 0)
        data.append({"date": str(day), "count": count})

    return {"data": data}

# Objectif : Retourner la répartition des visiteurs par source (Direct, Social, Referral) pour la semaine.

@router.get("/sources")
def visitor_sources(db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=6)

    results = (
        db.query(Visitor.source, func.count(Visitor.id).label("count"))
        .filter(Visitor.date >= week_ago)
        .group_by(Visitor.source)
        .all()
    )

    # Préparer toutes les sources même si certaines sont à 0
    sources = ["Direct", "Social", "Referral"]
    data = {source: next((r.count for r in results if r.source == source), 0) for source in sources}

    return {"data": data}

# KPIs généraux
@router.get("/admin/kpis")
def get_kpis(db: Session = Depends(get_db)):
    total = db.query(Lead).count()
    product_count = db.query(func.count(Product.id)).scalar() or 0
    confirmed = db.query(Lead).filter(Lead.status == "confirmed").count()
    pending = db.query(Lead).filter(Lead.status == "pending").count()
    cancelled = db.query(Lead).filter(Lead.status == "cancelled").count()
    return {
        "total": total,
        "products": product_count,
        "leads": {   # <-- clé "leads" pour matcher le frontend
            "confirmed": confirmed,
            "pending": pending,
            "cancelled": cancelled
        }
    }


# Area Chart → leads par jour sur les 7 derniers jours
@router.get("/admin/leads-week")
def leads_week(db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    from sqlalchemy import func

    today = datetime.today()
    week_ago = today - timedelta(days=6)

    results = (
        db.query(func.date(Lead.created_at).label("date"), func.count(Lead.id))
        .filter(Lead.created_at >= week_ago)
        .group_by(func.date(Lead.created_at))
        .all()
    )

    # Créer un dict avec 0 par défaut pour les 7 derniers jours
    data_dict = { (week_ago + timedelta(days=i)).strftime("%Y-%m-%d"): 0 for i in range(7) }
    for r in results:
        data_dict[r.date.strftime("%Y-%m-%d")] = r[1]

    # Transformer en labels et data pour le frontend
    labels = list(data_dict.keys())
    data = list(data_dict.values())

    return {"leadsWeek": {"labels": labels, "data": data}}


# Pie Chart → répartition par status
@router.get("/admin/leads-status")
def leads_status(db: Session = Depends(get_db)):
    from sqlalchemy import func
    results = db.query(Lead.status, func.count(Lead.id)).group_by(Lead.status).all()
    return {r[0]: r[1] for r in results}
