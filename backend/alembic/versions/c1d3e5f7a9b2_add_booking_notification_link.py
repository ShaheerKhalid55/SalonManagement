"""add booking link and uniqueness to notifications

Revision ID: c1d3e5f7a9b2
Revises: 8471482fb82d
"""
from alembic import op
import sqlalchemy as sa

revision = "c1d3e5f7a9b2"
down_revision = "8471482fb82d"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("notifications", sa.Column("booking_id", sa.Integer(), nullable=True))
    op.create_index("ix_notifications_booking_id", "notifications", ["booking_id"], unique=False)
    op.create_foreign_key(
        "fk_notifications_booking_id_bookings",
        "notifications", "bookings", ["booking_id"], ["id"], ondelete="CASCADE"
    )
    # Existing rows have NULL booking_id, so this is safe for current data.
    op.create_unique_constraint(
        "uq_notification_booking_type", "notifications", ["booking_id", "notification_type"]
    )

def downgrade() -> None:
    op.drop_constraint("uq_notification_booking_type", "notifications", type_="unique")
    op.drop_constraint("fk_notifications_booking_id_bookings", "notifications", type_="foreignkey")
    op.drop_index("ix_notifications_booking_id", table_name="notifications")
    op.drop_column("notifications", "booking_id")
