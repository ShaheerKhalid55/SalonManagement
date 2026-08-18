import json
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device_token import DeviceToken
from app.models.notification import Notification

async def create_notification(
    db: AsyncSession,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    data: dict | None = None,
):
    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        data_json=json.dumps(data or {}),
    )
    db.add(notification)
    await db.flush()
    return notification

async def mark_notification_sent(db: AsyncSession, notification: Notification):
    notification.sent_at = datetime.now(timezone.utc)
    await db.flush()

async def get_active_device_tokens(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(DeviceToken).where(
            DeviceToken.user_id == user_id,
            DeviceToken.is_active.is_(True),
        )
    )
    return list(result.scalars().all())
