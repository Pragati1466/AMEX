"""Notification service for Module 3."""

import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.resolution import NotificationLog, NotificationEventType


class NotificationService:
    """Persists in-app notifications."""

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        dispute_id: int,
        event_type: NotificationEventType,
        title: str,
        message: str,
        user_id: Optional[int] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> NotificationLog:
        notif = NotificationLog(
            dispute_id=dispute_id,
            user_id=user_id,
            event_type=event_type,
            title=title,
            message=message,
            metadata_json=metadata,
        )
        self.db.add(notif)
        self.db.commit()
        self.db.refresh(notif)
        return notif

    def list_for_case(self, dispute_id: int, limit: int = 50) -> list[NotificationLog]:
        return (
            self.db.query(NotificationLog)
            .filter(NotificationLog.dispute_id == dispute_id)
            .order_by(NotificationLog.created_at.desc())
            .limit(limit)
            .all()
        )

    def mark_read(self, notification_id: int) -> Optional[NotificationLog]:
        notif = self.db.query(NotificationLog).filter(NotificationLog.id == notification_id).first()
        if notif:
            notif.is_read = True
            notif.read_at = datetime.datetime.utcnow()
            self.db.commit()
            self.db.refresh(notif)
        return notif
