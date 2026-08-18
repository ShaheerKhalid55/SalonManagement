from datetime import date, time
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.reminder import Reminder
from app.models.salon import Salon
from app.models.slot import SalonSlot
from app.models.user import User
from app.services.notifications import create_notification

async def generate_evening_empty_slot_reminders(
    db: AsyncSession,
    reminder_date: date,
    evening_start: time = time(18, 0),
    evening_end: time = time(22, 0),
):
    # Customers with completed/confirmed/in-progress bookings on the date are
    # excluded from the general "evening slot is empty" reminder for that salon.
    salons_result = await db.execute(select(Salon).where(Salon.is_active.is_(True)))
    salons = list(salons_result.scalars().all())

    created = []

    for salon in salons:
        slots_result = await db.execute(
            select(SalonSlot).where(
                SalonSlot.salon_id == salon.id,
                SalonSlot.slot_date == reminder_date,
                SalonSlot.start_time >= evening_start,
                SalonSlot.start_time < evening_end,
                SalonSlot.status == "AVAILABLE",
            )
        )
        available_slots = list(slots_result.scalars().all())

        if not available_slots:
            continue

        customers_result = await db.execute(
            select(User).where(
                User.role == "CUSTOMER",
                User.is_active.is_(True),
            )
        )
        customers = list(customers_result.scalars().all())

        for customer in customers:
            existing = await db.execute(
                select(Reminder).where(
                    Reminder.user_id == customer.id,
                    Reminder.salon_id == salon.id,
                    Reminder.reminder_date == reminder_date,
                )
            )
            if existing.scalar_one_or_none():
                continue

            notification = await create_notification(
                db=db,
                user_id=customer.id,
                notification_type="EVENING_SLOT_AVAILABLE",
                title="Your evening slot is available",
                message=f"{salon.name} has an empty evening slot. Treat yourself to a haircut today.",
                data={
                    "salon_id": salon.id,
                    "date": reminder_date.isoformat(),
                    "available_slot_count": len(available_slots),
                },
            )

            reminder = Reminder(
                user_id=customer.id,
                salon_id=salon.id,
                reminder_date=reminder_date,
                reminder_time=evening_start,
                is_sent=False,
                notification_id=notification.id,
            )
            db.add(reminder)
            created.append(reminder)

    await db.flush()
    return created
