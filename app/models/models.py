from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Numeric, String, Text, Uuid, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    memberships: Mapped[list["Membership"]] = relationship("Membership", back_populates="user")
    expenses_paid: Mapped[list["Expense"]] = relationship("Expense", back_populates="payer")


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    memberships: Mapped[list["Membership"]] = relationship("Membership", back_populates="group")
    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="group")
    settlements: Mapped[list["Settlement"]] = relationship("Settlement", back_populates="group")


class Membership(Base):
    __tablename__ = "memberships"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), ForeignKey("users.id"), nullable=False)
    group_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), ForeignKey("groups.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="member")  # "admin" | "member"
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="memberships")
    group: Mapped["Group"] = relationship("Group", back_populates="memberships")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), ForeignKey("groups.id"), nullable=False)
    payer_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), ForeignKey("users.id"), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    group: Mapped["Group"] = relationship("Group", back_populates="expenses")
    payer: Mapped["User"] = relationship("User", back_populates="expenses_paid")
    splits: Mapped[list["Split"]] = relationship("Split", back_populates="expense", cascade="all, delete-orphan")


class Split(Base):
    __tablename__ = "splits"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), primary_key=True, default=uuid.uuid4)
    expense_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), ForeignKey("expenses.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), ForeignKey("users.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    is_settled: Mapped[bool] = mapped_column(Boolean, default=False)

    expense: Mapped["Expense"] = relationship("Expense", back_populates="splits")


class Settlement(Base):
    __tablename__ = "settlements"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), ForeignKey("groups.id"), nullable=False)
    payer_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), ForeignKey("users.id"), nullable=False)
    payee_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True, native_uuid=False), ForeignKey("users.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    group: Mapped["Group"] = relationship("Group", back_populates="settlements")
