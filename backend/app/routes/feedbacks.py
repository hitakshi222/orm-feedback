from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, require_roles
from app.database import get_db
from app.models import Client, Engineer, Feedback, User
from app.schemas import FeedbackCreate, FeedbackRead, FeedbackReview

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


def _read(feedback: Feedback) -> dict:
    return {
        **{column.name: getattr(feedback, column.name) for column in Feedback.__table__.columns},
        "client_name": feedback.client.institution_name,
    }


def _visible_query(db: Session, user: User):
    query = db.query(Feedback).options(joinedload(Feedback.client))
    if user.role == "client":
        client = db.query(Client).filter(Client.user_id == user.id).first()
        if not client:
            return query.filter(Feedback.id == -1)
        query = query.filter(Feedback.client_id == client.id)
    elif user.role == "engineer":
        engineer = db.query(Engineer).filter(Engineer.user_id == user.id).first()
        if not engineer:
            return query.filter(Feedback.id == -1)
        query = query.filter(Feedback.support_engineer_name == engineer.engineer_name)
    return query


@router.post("", response_model=FeedbackRead, status_code=201)
def submit_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if user.role == "client" and client.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only submit feedback for your own institution")
    if not any(product.product_name == payload.product_software_name for product in client.products):
        raise HTTPException(status_code=422, detail="Selected product is not linked to this client")
    if not db.query(Engineer).filter(Engineer.engineer_name == payload.support_engineer_name).first():
        raise HTTPException(status_code=422, detail="Select a valid support engineer")
    priority = "High" if min(payload.overall_satisfaction, payload.quality_of_service) <= 2 else (
        "Low" if min(payload.overall_satisfaction, payload.quality_of_service) == 5 else "Medium"
    )
    satisfaction = payload.overall_satisfaction
    feedback = Feedback(
        **payload.model_dump(),
        service_ticket_id=f"BT-{uuid4().hex[:8].upper()}",
        feedback_status="Submitted",
        priority=priority,
        nps_score="Promoter" if satisfaction >= 4 else "Passive" if satisfaction == 3 else "Detractor",
        follow_up_required=(
            payload.was_issue_resolved != "Fully"
            or bool((payload.problems_still_pending or "").strip())
        ),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return _read(feedback)


@router.get("", response_model=list[FeedbackRead])
def list_feedback(
    client_id: int | None = None,
    engineer_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    product: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = _visible_query(db, user)
    if client_id is not None:
        query = query.filter(Feedback.client_id == client_id)
    if engineer_id is not None:
        engineer = db.query(Engineer).filter(Engineer.id == engineer_id).first()
        query = query.filter(Feedback.support_engineer_name == engineer.engineer_name) if engineer else query.filter(Feedback.id == -1)
    if date_from:
        query = query.filter(Feedback.date_of_service >= date_from)
    if date_to:
        query = query.filter(Feedback.date_of_service <= date_to)
    if status:
        query = query.filter(Feedback.feedback_status == status)
    if priority:
        query = query.filter(Feedback.priority == priority)
    if product:
        query = query.filter(Feedback.product_software_name == product)
    if search:
        term = f"%{search.strip()}%"
        query = query.join(Client).filter(
            (Client.institution_name.ilike(term))
            | (Feedback.product_software_name.ilike(term))
            | (Feedback.support_engineer_name.ilike(term))
            | (Feedback.service_ticket_id.ilike(term))
        )
    records = query.order_by(Feedback.created_at.desc()).all()
    return [_read(item) for item in records]


@router.get("/{feedback_id}", response_model=FeedbackRead)
def get_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    feedback = _visible_query(db, user).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return _read(feedback)


@router.put("/{feedback_id}/review", response_model=FeedbackRead)
def review_feedback(
    feedback_id: int,
    payload: FeedbackReview,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    feedback = db.query(Feedback).options(joinedload(Feedback.client)).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    feedback.feedback_status = payload.feedback_status
    feedback.admin_remarks = payload.admin_remarks
    feedback.action_taken = payload.action_taken
    if payload.feedback_status in ("Action Taken", "Closed"):
        feedback.follow_up_required = False
    db.commit()
    db.refresh(feedback)
    return _read(feedback)
