"""Resolution audit logging service."""

from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.resolution import ResolutionAuditLog, ResolutionAuditEventType


class ResolutionAuditService:
    """Records auditable resolution events."""

    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        dispute_id: int,
        action: str,
        event_type: ResolutionAuditEventType,
        actor_id: Optional[int] = None,
        actor_role: Optional[str] = None,
        case_file_id: Optional[int] = None,
        previous_state: Optional[dict[str, Any]] = None,
        new_state: Optional[dict[str, Any]] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> ResolutionAuditLog:
        entry = ResolutionAuditLog(
            dispute_id=dispute_id,
            case_file_id=case_file_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            event_type=event_type,
            previous_state=previous_state,
            new_state=new_state,
            metadata_json=metadata,
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def list_for_case(self, dispute_id: int, limit: int = 100) -> list[ResolutionAuditLog]:
        return (
            self.db.query(ResolutionAuditLog)
            .filter(ResolutionAuditLog.dispute_id == dispute_id)
            .order_by(ResolutionAuditLog.created_at.desc())
            .limit(limit)
            .all()
        )
