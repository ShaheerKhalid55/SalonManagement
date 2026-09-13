from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.services.reminders import generate_appointment_tomorrow_reminders

TZ = ZoneInfo(settings.notification_timezone)
scheduler = AsyncIOScheduler(timezone=TZ)

async def appointment_reminder_job() -> None:
    tomorrow = datetime.now(TZ).date() + timedelta(days=1)
    async with AsyncSessionLocal() as db:
        await generate_appointment_tomorrow_reminders(db, tomorrow)

def start_notification_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(
        appointment_reminder_job,
        trigger="cron",
        hour=settings.appointment_reminder_hour,
        minute=settings.appointment_reminder_minute,
        id="appointment-tomorrow-reminders",
        replace_existing=True,
    )
    scheduler.start()

def stop_notification_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
