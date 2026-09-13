import json
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.device_token import DeviceToken
from app.models.notification import Notification

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

async def create_notification(
    db: AsyncSession,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    data: dict | None = None,
    booking_id: int | None = None,
):
    notification = Notification(
        user_id=user_id,
        booking_id=booking_id,
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

async def send_push_notification(
    db: AsyncSession,
    notification: Notification,
) -> bool:
    """Send an Expo push notification to every active device for the user.

    Invalid/expired Expo tokens are deactivated so future sends stop failing.
    The in-app notification remains stored even if push delivery fails.
    """
    tokens = await get_active_device_tokens(db, notification.user_id)
    if not tokens:
        return False

    try:
        data = json.loads(notification.data_json or "{}")
    except json.JSONDecodeError:
        data = {}

    messages = [
        {
            "to": token.token,
            "sound": "default",
            "title": notification.title,
            "body": notification.message,
            "data": data,
            "priority": "high",
        }
        for token in tokens
    ]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(EXPO_PUSH_URL, json=messages)
            response.raise_for_status()
            result = response.json()
    except Exception:
        return False

    receipts = result.get("data", []) if isinstance(result, dict) else []
    delivered_or_accepted = False
    for token, receipt in zip(tokens, receipts):
        if receipt.get("status") == "ok":
            delivered_or_accepted = True
        elif receipt.get("details", {}).get("error") in {
            "DeviceNotRegistered",
            "InvalidCredentials",
        }:
            token.is_active = False

    if delivered_or_accepted:
        await mark_notification_sent(db, notification)
        await db.commit()
    else:
        await db.commit()

    return delivered_or_accepted
