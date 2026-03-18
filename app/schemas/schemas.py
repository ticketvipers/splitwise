import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Groups ────────────────────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class GroupOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Expenses ──────────────────────────────────────────────────────────────────

class SplitIn(BaseModel):
    user_id: uuid.UUID
    amount: Decimal


class ExpenseCreate(BaseModel):
    description: str
    amount: Decimal
    currency: str = "USD"
    splits: list[SplitIn]


class SplitOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    amount: Decimal
    is_settled: bool

    model_config = {"from_attributes": True}


class ExpenseOut(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    payer_id: uuid.UUID
    description: str
    amount: Decimal
    currency: str
    created_at: datetime
    splits: list[SplitOut]

    model_config = {"from_attributes": True}


# ── Settlements ───────────────────────────────────────────────────────────────

class SettlementCreate(BaseModel):
    payer_id: uuid.UUID
    payee_id: uuid.UUID
    amount: Decimal
    currency: str = "USD"
    note: Optional[str] = None


class SettlementOut(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    payer_id: uuid.UUID
    payee_id: uuid.UUID
    amount: Decimal
    currency: str
    note: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
