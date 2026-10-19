from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles
from app.database import get_db
from app.models import Engineer, User
from app.schemas import EngineerCreate, EngineerRead

router = APIRouter(prefix="/api/engineers", tags=["engineers"])


@router.get("", response_model=list[EngineerRead])
def list_engineers(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Engineer).order_by(Engineer.engineer_name).all()


@router.post("", response_model=EngineerRead, status_code=201)
def create_engineer(
    payload: EngineerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    engineer = Engineer(**payload.model_dump())
    db.add(engineer)
    db.commit()
    db.refresh(engineer)
    return engineer


@router.put("/{engineer_id}", response_model=EngineerRead)
def update_engineer(
    engineer_id: int,
    payload: EngineerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    engineer = db.query(Engineer).filter(Engineer.id == engineer_id).first()
    if not engineer:
        raise HTTPException(status_code=404, detail="Engineer not found")
    for field, value in payload.model_dump().items():
        setattr(engineer, field, value)
    db.commit()
    db.refresh(engineer)
    return engineer


@router.delete("/{engineer_id}", status_code=204)
def delete_engineer(
    engineer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    engineer = db.query(Engineer).filter(Engineer.id == engineer_id).first()
    if not engineer:
        raise HTTPException(status_code=404, detail="Engineer not found")
    db.delete(engineer)
    db.commit()
