"""Alembic migration for Module 3 resolution tables."""

from alembic import op
import sqlalchemy as sa


revision = "003_resolution"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "resolution_states",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dispute_id", sa.Integer(), nullable=False),
        sa.Column("case_file_id", sa.Integer(), nullable=True),
        sa.Column("fairness_score", sa.Float(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column(
            "ai_recommendation",
            sa.Enum(
                "approve_customer", "approve_merchant", "partial_resolution",
                "request_more_evidence", "escalate_to_human",
                name="recommendationoutcome",
            ),
            nullable=True,
        ),
        sa.Column("recommendation_rationale", sa.Text(), nullable=True),
        sa.Column(
            "recommendation_status",
            sa.Enum("pending", "active", "superseded", "rejected", "approved", name="recommendationstatus"),
            nullable=False,
        ),
        sa.Column("customer_argument_summary", sa.JSON(), nullable=True),
        sa.Column("merchant_argument_summary", sa.JSON(), nullable=True),
        sa.Column("explainability_summary", sa.Text(), nullable=True),
        sa.Column("explainability_details", sa.JSON(), nullable=True),
        sa.Column("human_review_required", sa.Boolean(), nullable=False),
        sa.Column(
            "resolution_readiness",
            sa.Enum(
                "not_ready", "partial", "ready_for_review",
                "ready_for_decision", "decision_recorded", "completed",
                name="resolutionreadiness",
            ),
            nullable=False,
        ),
        sa.Column("evidence_completeness_pct", sa.Float(), nullable=True),
        sa.Column("evidence_count", sa.Integer(), nullable=False),
        sa.Column("missing_evidence_count", sa.Integer(), nullable=False),
        sa.Column("contradiction_count", sa.Integer(), nullable=False),
        sa.Column("last_rescored_at", sa.DateTime(), nullable=True),
        sa.Column("module2_available", sa.Boolean(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["case_file_id"], ["case_files.id"]),
        sa.ForeignKeyConstraint(["dispute_id"], ["disputes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resolution_states_dispute_id", "resolution_states", ["dispute_id"], unique=True)
    op.create_index("ix_resolution_states_case_file_id", "resolution_states", ["case_file_id"])

    op.create_table(
        "evidence_recommendations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("recommendation_id", sa.String(100), nullable=False),
        sa.Column("dispute_id", sa.Integer(), nullable=False),
        sa.Column("case_file_id", sa.Integer(), nullable=True),
        sa.Column("evidence_type", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column(
            "priority",
            sa.Enum("critical", "high", "medium", "low", name="evidencerecommendationpriority"),
            nullable=False,
        ),
        sa.Column(
            "requested_from",
            sa.Enum("customer", "merchant", "investigator", "either", name="evidencerequestedfrom"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("open", "requested", "submitted", "resolved", "dismissed", name="evidencerecommendationstatus"),
            nullable=False,
        ),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["case_file_id"], ["case_files.id"]),
        sa.ForeignKeyConstraint(["dispute_id"], ["disputes.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("recommendation_id"),
    )
    op.create_index("ix_evidence_recommendations_dispute_id", "evidence_recommendations", ["dispute_id"])
    op.create_index("ix_evidence_recommendations_dispute_status", "evidence_recommendations", ["dispute_id", "status"])

    op.create_table(
        "rescoring_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.String(100), nullable=False),
        sa.Column("dispute_id", sa.Integer(), nullable=False),
        sa.Column("case_file_id", sa.Integer(), nullable=True),
        sa.Column("previous_fairness_score", sa.Float(), nullable=True),
        sa.Column("new_fairness_score", sa.Float(), nullable=True),
        sa.Column("previous_recommendation", sa.Enum(
            "approve_customer", "approve_merchant", "partial_resolution",
            "request_more_evidence", "escalate_to_human", name="recommendationoutcome",
        ), nullable=True),
        sa.Column("new_recommendation", sa.Enum(
            "approve_customer", "approve_merchant", "partial_resolution",
            "request_more_evidence", "escalate_to_human", name="recommendationoutcome",
        ), nullable=True),
        sa.Column("previous_confidence", sa.Float(), nullable=True),
        sa.Column("new_confidence", sa.Float(), nullable=True),
        sa.Column("triggering_evidence_id", sa.Integer(), nullable=True),
        sa.Column("change_reason", sa.String(255), nullable=True),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("used_module2", sa.Boolean(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["case_file_id"], ["case_files.id"]),
        sa.ForeignKeyConstraint(["dispute_id"], ["disputes.id"]),
        sa.ForeignKeyConstraint(["triggering_evidence_id"], ["evidence_repository.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
    )
    op.create_index("ix_rescoring_events_dispute_id", "rescoring_events", ["dispute_id"])
    op.create_index("ix_rescoring_events_dispute_created", "rescoring_events", ["dispute_id", "created_at"])

    op.create_table(
        "final_decisions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("decision_id", sa.String(100), nullable=False),
        sa.Column("dispute_id", sa.Integer(), nullable=False),
        sa.Column("case_file_id", sa.Integer(), nullable=True),
        sa.Column("investigator_id", sa.Integer(), nullable=True),
        sa.Column("outcome", sa.Enum(
            "approve_customer", "approve_merchant", "partial_resolution",
            "request_more_evidence", "escalate_to_human", name="recommendationoutcome",
        ), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column(
            "decision_type",
            sa.Enum("approved", "rejected", "modified", name="finaldecisiontype"),
            nullable=False,
        ),
        sa.Column("ai_recommendation_at_decision", sa.Enum(
            "approve_customer", "approve_merchant", "partial_resolution",
            "request_more_evidence", "escalate_to_human", name="recommendationoutcome",
        ), nullable=True),
        sa.Column("ai_fairness_score_at_decision", sa.Float(), nullable=True),
        sa.Column("ai_confidence_at_decision", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("superseded_at", sa.DateTime(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["case_file_id"], ["case_files.id"]),
        sa.ForeignKeyConstraint(["dispute_id"], ["disputes.id"]),
        sa.ForeignKeyConstraint(["investigator_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("decision_id"),
    )
    op.create_index("ix_final_decisions_dispute_id", "final_decisions", ["dispute_id"])
    op.create_index("ix_final_decisions_dispute_active", "final_decisions", ["dispute_id", "is_active"])

    op.create_table(
        "resolution_reports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("report_id", sa.String(100), nullable=False),
        sa.Column("dispute_id", sa.Integer(), nullable=False),
        sa.Column("case_file_id", sa.Integer(), nullable=True),
        sa.Column("generated_by", sa.Integer(), nullable=True),
        sa.Column("report_content", sa.JSON(), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["case_file_id"], ["case_files.id"]),
        sa.ForeignKeyConstraint(["dispute_id"], ["disputes.id"]),
        sa.ForeignKeyConstraint(["generated_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("report_id"),
    )
    op.create_index("ix_resolution_reports_dispute_id", "resolution_reports", ["dispute_id"])

    op.create_table(
        "notification_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dispute_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column(
            "event_type",
            sa.Enum(
                "evidence_requested", "evidence_submitted", "evidence_accepted",
                "fairness_score_updated", "recommendation_changed", "investigator_decision",
                "resolution_completed", "rescoring_completed", "report_generated",
                name="notificationeventtype",
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["dispute_id"], ["disputes.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_logs_dispute_id", "notification_logs", ["dispute_id"])
    op.create_index("ix_notification_logs_dispute_read", "notification_logs", ["dispute_id", "is_read"])

    op.create_table(
        "resolution_audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dispute_id", sa.Integer(), nullable=False),
        sa.Column("case_file_id", sa.Integer(), nullable=True),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("actor_role", sa.String(50), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column(
            "event_type",
            sa.Enum(
                "evidence_submitted", "recommendation_generated", "recommendation_changed",
                "rescoring_triggered", "fairness_score_changed", "investigator_approved",
                "investigator_rejected", "investigator_modified", "final_decision_recorded",
                "report_generated", "notification_created", "collaboration_event",
                name="resolutionauditeventtype",
            ),
            nullable=False,
        ),
        sa.Column("previous_state", sa.JSON(), nullable=True),
        sa.Column("new_state", sa.JSON(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["case_file_id"], ["case_files.id"]),
        sa.ForeignKeyConstraint(["dispute_id"], ["disputes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resolution_audit_logs_dispute_id", "resolution_audit_logs", ["dispute_id"])
    op.create_index("ix_resolution_audit_dispute_created", "resolution_audit_logs", ["dispute_id", "created_at"])

    op.create_table(
        "collaboration_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("dispute_id", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("actor_role", sa.String(50), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["dispute_id"], ["disputes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_collaboration_events_dispute_id", "collaboration_events", ["dispute_id"])


def downgrade() -> None:
    op.drop_table("collaboration_events")
    op.drop_table("resolution_audit_logs")
    op.drop_table("notification_logs")
    op.drop_table("resolution_reports")
    op.drop_table("final_decisions")
    op.drop_table("rescoring_events")
    op.drop_table("evidence_recommendations")
    op.drop_table("resolution_states")

    for enum_name in [
        "resolutionauditeventtype", "notificationeventtype", "finaldecisiontype",
        "evidencerecommendationstatus", "evidencerequestedfrom",
        "evidencerecommendationpriority", "resolutionreadiness",
        "recommendationstatus", "recommendationoutcome",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
