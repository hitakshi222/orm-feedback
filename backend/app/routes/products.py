from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles
from app.database import get_db
from app.models import Client, Product, User
from app.schemas import ProductCreate, ProductRead

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductRead])
def list_products(
    client_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Product)
    if user.role == "client":
        own_client = db.query(Client).filter(Client.user_id == user.id).first()
        if not own_client:
            return []
        if client_id is not None and client_id != own_client.id:
            raise HTTPException(status_code=403, detail="You can only view products linked to your institution")
        client_id = own_client.id
    if client_id is not None:
        query = query.join(Product.clients).filter(Client.id == client_id)
    return query.order_by(Product.product_name).all()


@router.post("", response_model=ProductRead, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    if db.query(Product).filter(Product.product_name == payload.product_name).first():
        raise HTTPException(status_code=409, detail="Product already exists")
    product = Product(product_name=payload.product_name, description=payload.description)
    product.clients = db.query(Client).filter(Client.id.in_(payload.client_ids)).all()
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.product_name = payload.product_name
    product.description = payload.description
    product.clients = db.query(Client).filter(Client.id.in_(payload.client_ids)).all()
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
