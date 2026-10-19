from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


Role = Literal["admin", "client", "engineer"]
ServiceType = Literal["Installation", "Training", "Complaint", "Maintenance", "Other"]
Status = Literal["Submitted", "Reviewed", "Action Taken", "Closed"]
Priority = Literal["Low", "Medium", "High"]


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8)
    role: Role


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: Role

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ProductBase(BaseModel):
    product_name: str = Field(min_length=1, max_length=150)
    description: str | None = None


class ProductCreate(ProductBase):
    client_ids: list[int] = []


class ProductRead(ProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ClientBase(BaseModel):
    institution_name: str = Field(min_length=1, max_length=200)
    contact_person: str
    mobile: str
    email: EmailStr
    address: str | None = None
    city: str | None = None
    product_ids: list[int] = []


class ClientCreate(ClientBase):
    username: str | None = None
    password: str | None = None


class ClientRead(ClientBase):
    id: int
    user_id: int | None = None
    products: list[ProductRead] = []
    total_feedbacks: int = 0
    last_feedback_date: date | None = None
    avg_rating: float | None = None

    model_config = ConfigDict(from_attributes=True)


class EngineerCreate(BaseModel):
    engineer_name: str
    mobile: str | None = None
    email: EmailStr | None = None


class EngineerRead(EngineerCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class FeedbackCreate(BaseModel):
    client_id: int
    contact_person_name: str
    mobile_email: str
    product_software_name: str
    type_of_service: ServiceType
    date_of_service: date
    support_engineer_name: str
    was_engineer_punctual: Literal["Yes", "No", "Not Applicable"]
    was_issue_resolved: Literal["Fully", "Partially", "Not Resolved", "Not Applicable"]
    quality_of_service: int = Field(ge=1, le=5)
    overall_satisfaction: int = Field(ge=1, le=5)
    feedback_on_software: str | None = None
    problems_still_pending: str | None = None
    suggestions_for_improvement: str | None = None
    engineers_behaviour: int = Field(ge=1, le=5)
    engineers_technical_knowledge: int = Field(ge=1, le=5)
    additional_requirements: str | None = None
    references_for_clients: str | None = None
    any_other_comments: str | None = None


class FeedbackRead(FeedbackCreate):
    id: int
    client_name: str
    service_ticket_id: str | None = None
    feedback_status: Status
    priority: Priority
    nps_score: Literal["Promoter", "Passive", "Detractor"]
    follow_up_required: bool
    admin_remarks: str | None = None
    action_taken: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeedbackReview(BaseModel):
    feedback_status: Status
    admin_remarks: str | None = None
    action_taken: str | None = None
