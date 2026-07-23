"""
Shared SQLAlchemy mixins for common model fields.
"""

import datetime

from sqlalchemy import Column, Integer, DateTime, func


class TimestampMixin:
    """Adds created_at and updated_at timestamp columns."""

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )


class IDMixin:
    """Adds auto-incrementing primary key 'id' column."""

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)