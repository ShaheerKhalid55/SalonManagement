from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.reminder import Reminder
from app.models.user import User
from app.schemas.reminder import ReminderResponse
from app.services.reminders import generate_evening_empty_slot_reminders

router = APIRouter(prefix="/api/v1/reminders", tags=["Reminders"])

@router.post("/generate-evening", response_model=list[ReminderResponse])
async def generate_evening_reminders(
    reminder_date: date,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    reminders = await generate_evening_empty_slot_reminders(db, reminder_date)
    await db.commit()
    for reminder in reminders:
        await db.refresh(reminder)
    return reminders

@router.get("", response_model=list[ReminderResponse])
async def list_my_reminders(
    reminder_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Reminder).where(Reminder.user_id == current_user.id)
    if reminder_date:
        query = query.where(Reminder.reminder_date == reminder_date)
    result = await db.execute(query.order_by(Reminder.reminder_date.desc(), Reminder.reminder_time.desc()))
    return list(result.scalars().all())
