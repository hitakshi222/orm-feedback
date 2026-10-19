from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import create_access_token, hash_password, verify_password, require_roles
from app.database import get_db
from app.models import Client, User
from app.schemas import LoginInput, TokenResponse, UserCreate, UserRead

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return {"access_token": create_access_token(user), "user": user}


@router.post("/register", response_model=UserRead, status_code=201)
def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    if db.query(User).filter((User.email == payload.email) | (User.username == payload.username)).first():
        raise HTTPException(status_code=409, detail="Email or username is already registered")
    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    if payload.role == "client":
        db.add(Client(
            user_id=user.id,
            institution_name=payload.username,
            contact_person=payload.username,
            mobile="",
            email=payload.email,
        ))
        db.commit()
    return user
