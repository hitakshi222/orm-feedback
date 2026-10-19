from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum("admin", "client", "engineer", name="user_role"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    client = relationship("Client", back_populates="user", uselist=False)
    engineer = relationship("Engineer", back_populates="user", uselist=False)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String(150), nullable=False, unique=True)
    description = Column(Text)
    clients = relationship("Client", secondary="client_products", back_populates="products")


class ClientProduct(Base):
    __tablename__ = "client_products"

    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), unique=True)
    institution_name = Column(String(200), nullable=False, index=True)
    contact_person = Column(String(150), nullable=False)
    mobile = Column(String(40), nullable=False)
    email = Column(String(255), nullable=False)
    address = Column(Text)
    city = Column(String(100))
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    user = relationship("User", back_populates="client")
    products = relationship("Product", secondary="client_products", back_populates="clients")
    feedbacks = relationship("Feedback", back_populates="client")


class Engineer(Base):
    __tablename__ = "engineers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), unique=True)
    engineer_name = Column(String(150), nullable=False)
    mobile = Column(String(40))
    email = Column(String(255))
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    user = relationship("User", back_populates="engineer")


class Feedback(Base):
    __tablename__ = "feedbacks"
    __table_args__ = (
        Index("ix_feedbacks_client_id", "client_id"),
        Index("ix_feedbacks_date_of_service", "date_of_service"),
        Index("ix_feedbacks_created_at", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False)
    contact_person_name = Column(String(150), nullable=False)
    mobile_email = Column(String(255), nullable=False)
    product_software_name = Column(String(150), nullable=False)
    type_of_service = Column(
        Enum("Installation", "Training", "Complaint", "Maintenance", "Other", name="service_type"),
        nullable=False,
    )
    date_of_service = Column(Date, nullable=False)
    support_engineer_name = Column(String(150), nullable=False)
    was_engineer_punctual = Column(
        Enum("Yes", "No", "Not Applicable", name="punctuality_answer"), nullable=False
    )
    was_issue_resolved = Column(
        Enum("Fully", "Partially", "Not Resolved", "Not Applicable", name="resolution_answer"),
        nullable=False,
    )
    quality_of_service = Column(Integer, nullable=False)
    overall_satisfaction = Column(Integer, nullable=False)
    feedback_on_software = Column(Text)
    problems_still_pending = Column(Text)
    suggestions_for_improvement = Column(Text)
    engineers_behaviour = Column(Integer, nullable=False)
    engineers_technical_knowledge = Column(Integer, nullable=False)
    additional_requirements = Column(Text)
    references_for_clients = Column(Text)
    any_other_comments = Column(Text)
    service_ticket_id = Column(String(50))
    feedback_status = Column(
        Enum("Submitted", "Reviewed", "Action Taken", "Closed", name="feedback_status"),
        nullable=False,
        default="Submitted",
    )
    priority = Column(Enum("Low", "Medium", "High", name="feedback_priority"), nullable=False)
    nps_score = Column(Enum("Promoter", "Passive", "Detractor", name="nps_score"), nullable=False)
    follow_up_required = Column(Boolean, nullable=False, default=False)
    admin_remarks = Column(Text)
    action_taken = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    client = relationship("Client", back_populates="feedbacks")
