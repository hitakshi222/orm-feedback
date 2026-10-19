from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.auth import require_roles
from app.database import get_db
from app.models import Client, Engineer, Feedback, User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(require_roles("admin"))])


def filtered(query, date_from: date | None, date_to: date | None, client_id: int | None,
             product: str | None, engineer_id: int | None, status: str | None,
             priority: str | None, search: str | None):
    if date_from:
        query = query.filter(Feedback.date_of_service >= date_from)
    if date_to:
        query = query.filter(Feedback.date_of_service <= date_to)
    if client_id:
        query = query.filter(Feedback.client_id == client_id)
    if product:
        query = query.filter(Feedback.product_software_name == product)
    if engineer_id:
        engineer = query.session.query(Engineer).filter(Engineer.id == engineer_id).first()
        query = query.filter(Feedback.support_engineer_name == engineer.engineer_name) if engineer else query.filter(Feedback.id == -1)
    if status:
        query = query.filter(Feedback.feedback_status == status)
    if priority:
        query = query.filter(Feedback.priority == priority)
    if search:
        term = f"%{search.strip()}%"
        query = query.join(Client).filter(
            (Client.institution_name.ilike(term))
            | (Feedback.product_software_name.ilike(term))
            | (Feedback.support_engineer_name.ilike(term))
            | (Feedback.service_ticket_id.ilike(term))
        )
    return query


def base_query(db: Session, date_from, date_to, client_id, product, engineer_id, status, priority, search):
    return filtered(db.query(Feedback), date_from, date_to, client_id, product, engineer_id, status, priority, search)


def filters(date_from, date_to, client_id, product, engineer_id, status, priority, search):
    return dict(date_from=date_from, date_to=date_to, client_id=client_id, product=product,
                engineer_id=engineer_id, status=status, priority=priority, search=search)


@router.get("/kpis")
def kpis(db: Session = Depends(get_db), date_from: date | None = None, date_to: date | None = None,
         client_id: int | None = None, product: str | None = None, engineer_id: int | None = None,
         status: str | None = None, priority: str | None = None, search: str | None = None):
    args = filters(date_from, date_to, client_id, product, engineer_id, status, priority, search)
    query = base_query(db, **args)
    total, quality, satisfaction = query.with_entities(
        func.count(Feedback.id), func.avg(Feedback.quality_of_service),
        func.avg(Feedback.overall_satisfaction),
    ).one()
    followups = query.filter(Feedback.follow_up_required.is_(True)).count()
    return {"total_feedbacks": total, "avg_quality": round(quality or 0, 1),
            "avg_satisfaction": round(satisfaction or 0, 1), "pending_follow_ups": int(followups or 0)}


@router.get("/charts/quality")
def quality_chart(db: Session = Depends(get_db), date_from: date | None = None, date_to: date | None = None,
                  client_id: int | None = None, product: str | None = None, engineer_id: int | None = None,
                  status: str | None = None, priority: str | None = None, search: str | None = None):
    query = base_query(db, **filters(date_from, date_to, client_id, product, engineer_id, status, priority, search))
    rows = query.with_entities(Feedback.quality_of_service, func.count(Feedback.id)).group_by(Feedback.quality_of_service).all()
    return [{"rating": rating, "count": count} for rating, count in rows]


@router.get("/charts/satisfaction")
def satisfaction_chart(db: Session = Depends(get_db), date_from: date | None = None, date_to: date | None = None,
                       client_id: int | None = None, product: str | None = None, engineer_id: int | None = None,
                       status: str | None = None, priority: str | None = None, search: str | None = None):
    query = base_query(db, **filters(date_from, date_to, client_id, product, engineer_id, status, priority, search))
    rows = query.with_entities(Feedback.overall_satisfaction, func.count(Feedback.id)).group_by(Feedback.overall_satisfaction).all()
    return [{"rating": rating, "count": count} for rating, count in rows]


@router.get("/charts/engineer-performance")
def engineer_performance(db: Session = Depends(get_db), date_from: date | None = None, date_to: date | None = None,
                         client_id: int | None = None, product: str | None = None, engineer_id: int | None = None,
                         status: str | None = None, priority: str | None = None, search: str | None = None):
    query = base_query(db, **filters(date_from, date_to, client_id, product, engineer_id, status, priority, search))
    rows = query.with_entities(
        Feedback.support_engineer_name, func.count(Feedback.id),
        func.avg(case((Feedback.was_engineer_punctual == "Yes", 100), else_=0)),
        func.avg(Feedback.engineers_behaviour), func.avg(Feedback.engineers_technical_knowledge),
    ).group_by(Feedback.support_engineer_name).all()
    return [{"engineer_name": name, "total_feedbacks": count, "punctual_percent": round(punctual or 0, 1),
             "avg_behaviour": round(behaviour or 0, 1), "avg_technical_knowledge": round(technical or 0, 1)}
            for name, count, punctual, behaviour, technical in rows]


@router.get("/charts/nps")
def nps_chart(db: Session = Depends(get_db), date_from: date | None = None, date_to: date | None = None,
              client_id: int | None = None, product: str | None = None, engineer_id: int | None = None,
              status: str | None = None, priority: str | None = None, search: str | None = None):
    query = base_query(db, **filters(date_from, date_to, client_id, product, engineer_id, status, priority, search))
    rows = query.with_entities(Feedback.nps_score, func.count(Feedback.id)).group_by(Feedback.nps_score).all()
    return [{"category": name, "count": count} for name, count in rows]


@router.get("/charts/service-type")
def service_type_chart(db: Session = Depends(get_db), date_from: date | None = None, date_to: date | None = None,
                       client_id: int | None = None, product: str | None = None, engineer_id: int | None = None,
                       status: str | None = None, priority: str | None = None, search: str | None = None):
    query = base_query(db, **filters(date_from, date_to, client_id, product, engineer_id, status, priority, search))
    rows = query.with_entities(Feedback.type_of_service, func.avg(Feedback.overall_satisfaction)).group_by(Feedback.type_of_service).all()
    return [{"service_type": name, "avg_satisfaction": round(value, 1)} for name, value in rows]


@router.get("/clients-stats")
def client_stats(db: Session = Depends(get_db)):
    clients = db.query(Client).order_by(Client.institution_name).all()
    output = []
    for client in clients:
        count, last_date, avg = db.query(
            func.count(Feedback.id), func.max(Feedback.date_of_service), func.avg(Feedback.overall_satisfaction)
        ).filter(Feedback.client_id == client.id).one()
        output.append({"client_id": client.id, "institution_name": client.institution_name,
                       "total_feedbacks": count, "last_feedback_date": last_date,
                       "avg_rating": round(avg, 1) if avg is not None else None})
    return output
