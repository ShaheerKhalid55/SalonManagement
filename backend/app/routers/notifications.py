from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.device_token import DeviceToken
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import DeviceTokenRequest, NotificationReadRequest, NotificationResponse

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])

@router.post("/device-token")
async def register_device_token(
    request: DeviceTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(DeviceToken).where(DeviceToken.token == request.token))
    token = result.scalar_one_or_none()

    if token:
        token.user_id = current_user.id
        token.provider = request.provider
        token.is_active = True
    else:
        token = DeviceToken(
            user_id=current_user.id,
            token=request.token,
            provider=request.provider,
            is_active=True,
        )
        db.add(token)

    await db.commit()
    return {"message": "Device token registered"}

@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    result = await db.execute(query.order_by(Notification.created_at.desc()).limit(100))
    return list(result.scalars().all())

@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: int,
    request: NotificationReadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = await db.get(Notification, notification_id)
    if notification is None or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = request.is_read
    await db.commit()
    await db.refresh(notification)
    return notification
