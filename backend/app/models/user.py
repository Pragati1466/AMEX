"""
User model for authentication and authorization.
"""

import datetime

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    INVESTIGATOR = "investigator"
    MANAGER = "manager"
    ADMIN = "admin"


class User(Base):
    """Represents an authenticated system user."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(SAEnum(UserRole), default=UserRole.INVESTIGATOR, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"