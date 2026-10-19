from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.auth import require_roles, get_current_user
from app.database import get_db
from app.models import Client, Feedback, Product, User
from app.schemas import ClientCreate, ClientRead

router = APIRouter(prefix="/api/clients", tags=["clients"])


def _client_summary(client: Client, db: Session) -> dict:
    count, last_date, avg_rating = db.query(
        func.count(Feedback.id),
        func.max(Feedback.date_of_service),
        func.avg(Feedback.overall_satisfaction),
    ).filter(Feedback.client_id == client.id).one()
    return {
        "id": client.id,
        "user_id": client.user_id,
        "institution_name": client.institution_name,
        "contact_person": client.contact_person,
        "mobile": client.mobile,
        "email": client.email,
        "address": client.address,
        "city": client.city,
        "product_ids": [p.id for p in client.products],
        "products": client.products,
        "total_feedbacks": count,
        "last_feedback_date": last_date,
        "avg_rating": round(avg_rating, 1) if avg_rating is not None else None,
    }


@router.get("", response_model=list[ClientRead])
def list_clients(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Client).options(joinedload(Client.products))
    if user.role == "client":
        query = query.filter(Client.user_id == user.id)
    clients = query.order_by(Client.institution_name).all()
    return [_client_summary(client, db) for client in clients]


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Client).options(joinedload(Client.products)).filter(Client.id == client_id)
    if user.role == "client":
        query = query.filter(Client.user_id == user.id)
    client = query.first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return _client_summary(client, db)


@router.post("", response_model=ClientRead, status_code=201)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    client = Client(
        institution_name=payload.institution_name,
        contact_person=payload.contact_person,
        mobile=payload.mobile,
        email=payload.email,
        address=payload.address,
        city=payload.city,
        products=db.query(Product).filter(Product.id.in_(payload.product_ids)).all(),
    )
    if payload.username or payload.password:
        if not payload.username or not payload.password or len(payload.password) < 8:
            raise HTTPException(status_code=422, detail="Provide a username and a password of at least 8 characters")
        if db.query(User).filter((User.email == payload.email) | (User.username == payload.username)).first():
            raise HTTPException(status_code=409, detail="Email or username is already registered")
        from app.auth import hash_password
        user = User(
            username=payload.username,
            email=payload.email,
            password_hash=hash_password(payload.password),
            role="client",
        )
        db.add(user)
        db.flush()
        client.user = user
    db.add(client)
    db.commit()
    db.refresh(client)
    return _client_summary(client, db)


@router.put("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: int,
    payload: ClientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for field in ("institution_name", "contact_person", "mobile", "email", "address", "city"):
        setattr(client, field, getattr(payload, field))
    client.products = db.query(Product).filter(Product.id.in_(payload.product_ids)).all()
    db.commit()
    db.refresh(client)
    return _client_summary(client, db)


@router.delete("/{client_id}", status_code=204)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if db.query(Feedback).filter(Feedback.client_id == client_id).first():
        raise HTTPException(status_code=409, detail="Clients with feedback history cannot be deleted")
    db.delete(client)
    db.commit()
