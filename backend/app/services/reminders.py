from datetime import date, time
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.reminder import Reminder
from app.models.notification import Notification
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

async def generate_appointment_tomorrow_reminders(
    db: AsyncSession,
    target_date: date,
):
    """Create and push one reminder for every confirmed appointment on target_date."""
    result = await db.execute(
        select(Booking, Salon)
        .join(Salon, Salon.id == Booking.salon_id)
        .where(
            Booking.booking_date == target_date,
            Booking.status == "CONFIRMED",
        )
    )
    rows = result.all()
    created = []

    for booking, salon in rows:
        existing = await db.execute(
            select(Notification).where(
                Notification.booking_id == booking.id,
                Notification.notification_type == "APPOINTMENT_REMINDER",
            )
        )
        if existing.scalar_one_or_none():
            continue

        notification = await create_notification(
            db=db,
            user_id=booking.customer_id,
            booking_id=booking.id,
            notification_type="APPOINTMENT_REMINDER",
            title="Appointment Tomorrow",
            message=(
                f"Reminder: your appointment at {salon.name} is tomorrow at "
                f"{booking.start_time.strftime('%I:%M %p').lstrip('0')}."
            ),
            data={
                "screen": "booking",
                "booking_id": booking.id,
                "salon_id": booking.salon_id,
            },
        )
        created.append(notification)

    await db.commit()

    # Push after the notification rows are committed so the in-app history is reliable.
    for notification in created:
        await send_push_notification(db, notification)

    return created
