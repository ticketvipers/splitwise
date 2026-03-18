from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

T = TypeVar("T")


# ── Error Responses ───────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    code: str  # machine-readable error code e.g. "not_found", "forbidden"
    message: str
    field: Optional[str] = None  # for validation errors


class ErrorResponse(BaseModel):
    error: ErrorDetail


# ── Pagination ────────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool


# ── Auth ──────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


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
    name: str = Field(..., min_length=1, max_length=100)
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


class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[Decimal] = Field(default=None, gt=0)
    currency: Optional[str] = None


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
    updated_at: Optional[datetime] = None
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


# ── Balances ──────────────────────────────────────────────────────────────────

class BalanceEntry(BaseModel):
    from_user_id: uuid.UUID
    to_user_id: uuid.UUID
    amount: Decimal


class GroupBalances(BaseModel):
    group_id: uuid.UUID
    balances: list[BalanceEntry]
    net: dict[str, Decimal]  # user_id -> net amount (positive = owed, negative = owes)


# ── Invites ───────────────────────────────────────────────────────────────────

class InviteOut(BaseModel):
    token: str
    group_id: uuid.UUID
    join_url: str
    expires_at: Optional[datetime]
    is_revoked: bool

    model_config = {"from_attributes": True}


class JoinResponse(BaseModel):
    group: GroupOut
    message: str = "Successfully joined group"

