from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import and_, distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.booking_item import BookingItem
from app.models.salon import Salon
from app.models.user import User


COMPLETED = "COMPLETED"
ACTIVE_APPOINTMENT_STATUSES = ("CONFIRMED", "IN_PROGRESS")


async def get_agent_dashboard(
    db: AsyncSession,
    agent: User,
    dashboard_date: date,
) -> dict:
    # Lifetime metrics for this agent.
    lifetime_result = await db.execute(
        select(
            func.count(distinct(Booking.customer_id)),
            func.count(Booking.id),
            func.coalesce(func.sum(Booking.total), 0),
        ).where(
            Booking.agent_id == agent.id,
            Booking.status == COMPLETED,
        )
    )
    lifetime_customers, lifetime_completed, lifetime_revenue = lifetime_result.one()

    today_result = await db.execute(
        select(
            func.count(distinct(Booking.customer_id)),
            func.count(Booking.id),
            func.coalesce(func.sum(Booking.total), 0),
        ).where(
            Booking.agent_id == agent.id,
            Booking.booking_date == dashboard_date,
            Booking.status == COMPLETED,
        )
    )
    today_customers, today_completed, today_revenue = today_result.one()

    upcoming_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.agent_id == agent.id,
            Booking.booking_date >= dashboard_date,
            Booking.status.in_(ACTIVE_APPOINTMENT_STATUSES),
        )
    )
    upcoming_count = upcoming_result.scalar_one() or 0

    today_appointments = await _appointments_for_agent(
        db, agent.id, dashboard_date, dashboard_date
    )

    tomorrow = dashboard_date + timedelta(days=1)
    upcoming_appointments = await _appointments_for_agent(
        db, agent.id, dashboard_date, dashboard_date + timedelta(days=7)
    )

    return {
        "summary": {
            "agent_id": agent.id,
            "agent_name": agent.name,
            "salon_id": agent.salon_id,
            "total_customers_served": lifetime_customers or 0,
            "total_completed_services": lifetime_completed or 0,
            "total_revenue": Decimal(lifetime_revenue or 0),
            "today_customers_served": today_customers or 0,
            "today_completed_services": today_completed or 0,
            "today_revenue": Decimal(today_revenue or 0),
            "upcoming_appointments": upcoming_count,
        },
        "today_appointments": today_appointments,
        "upcoming_appointments": upcoming_appointments,
    }


async def get_agent_stats(
    db: AsyncSession,
    agent_id: int,
    from_date: date,
    to_date: date,
) -> dict:
    result = await db.execute(
        select(
            func.count(distinct(Booking.customer_id)),
            func.count(Booking.id),
            func.coalesce(func.sum(Booking.total), 0),
        ).where(
            Booking.agent_id == agent_id,
            Booking.status == COMPLETED,
            Booking.booking_date >= from_date,
            Booking.booking_date <= to_date,
        )
    )
    customers, completed, revenue = result.one()

    return {
        "agent_id": agent_id,
        "from_date": from_date,
        "to_date": to_date,
        "customers_served": customers or 0,
        "completed_services": completed or 0,
        "revenue": Decimal(revenue or 0),
    }


async def get_salon_dashboard(
    db: AsyncSession,
    salon: Salon,
    dashboard_date: date,
) -> dict:
    agent_count_result = await db.execute(
        select(func.count(User.id)).where(
            User.salon_id == salon.id,
            User.role == "AGENT",
            User.is_active.is_(True),
        )
    )
    total_agents = agent_count_result.scalar_one() or 0

    lifetime_result = await db.execute(
        select(
            func.count(distinct(Booking.customer_id)),
            func.count(Booking.id),
            func.coalesce(func.sum(Booking.total), 0),
        ).where(
            Booking.salon_id == salon.id,
            Booking.status == COMPLETED,
        )
    )
    lifetime_customers, lifetime_completed, lifetime_revenue = lifetime_result.one()

    today_result = await db.execute(
        select(
            func.count(distinct(Booking.customer_id)),
            func.count(Booking.id),
            func.coalesce(func.sum(Booking.total), 0),
        ).where(
            Booking.salon_id == salon.id,
            Booking.booking_date == dashboard_date,
            Booking.status == COMPLETED,
        )
    )
    today_customers, today_completed, today_revenue = today_result.one()

    upcoming_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.salon_id == salon.id,
            Booking.booking_date >= dashboard_date,
            Booking.status.in_(ACTIVE_APPOINTMENT_STATUSES),
        )
    )
    upcoming = upcoming_result.scalar_one() or 0

    agent_result = await db.execute(
        select(
            User.id,
            User.name,
            func.count(distinct(Booking.customer_id)),
            func.count(Booking.id),
            func.coalesce(func.sum(Booking.total), 0),
        )
        .outerjoin(
            Booking,
            and_(
                Booking.agent_id == User.id,
                Booking.salon_id == salon.id,
                Booking.status == COMPLETED,
            ),
        )
        .where(
            User.salon_id == salon.id,
            User.role == "AGENT",
            User.is_active.is_(True),
        )
        .group_by(User.id, User.name)
        .order_by(func.count(Booking.id).desc(), User.name)
    )

    performance = [
        {
            "agent_id": row[0],
            "agent_name": row[1],
            "customers_served": row[2] or 0,
            "completed_services": row[3] or 0,
            "revenue": Decimal(row[4] or 0),
        }
        for row in agent_result.all()
    ]

    return {
        "salon_id": salon.id,
        "salon_name": salon.name,
        "total_agents": total_agents,
        "total_customers_served": lifetime_customers or 0,
        "total_completed_services": lifetime_completed or 0,
        "total_revenue": Decimal(lifetime_revenue or 0),
        "today_customers_served": today_customers or 0,
        "today_completed_services": today_completed or 0,
        "today_revenue": Decimal(today_revenue or 0),
        "upcoming_appointments": upcoming,
        "agent_performance": performance,
    }


async def _appointments_for_agent(
    db: AsyncSession,
    agent_id: int,
    from_date: date,
    to_date: date,
) -> list[dict]:
    result = await db.execute(
        select(
            Booking.id,
            Booking.booking_number,
            Booking.customer_id,
            User.name,
            Booking.booking_date,
            Booking.start_time,
            Booking.end_time,
            Booking.total,
            Booking.status,
        )
        .join(User, User.id == Booking.customer_id)
        .where(
            Booking.agent_id == agent_id,
            Booking.booking_date >= from_date,
            Booking.booking_date <= to_date,
            Booking.status.in_(ACTIVE_APPOINTMENT_STATUSES),
        )
        .order_by(Booking.booking_date, Booking.start_time)
    )

    rows = result.all()
    if not rows:
        return []

    booking_ids = [row[0] for row in rows]

    items_result = await db.execute(
        select(
            BookingItem.booking_id,
            BookingItem.name,
            BookingItem.item_type,
        )
        .where(BookingItem.booking_id.in_(booking_ids))
        .order_by(BookingItem.booking_id, BookingItem.id)
    )

    service_names: dict[int, list[str]] = {}
    for booking_id, name, item_type in items_result.all():
        service_names.setdefault(booking_id, []).append(name)

    return [
        {
            "booking_id": row[0],
            "booking_number": row[1],
            "customer_id": row[2],
            "customer_name": row[3],
            "service_summary": ", ".join(service_names.get(row[0], [])),
            "booking_date": row[4],
            "start_time": row[5],
            "end_time": row[6],
            "total": row[7],
            "status": row[8],
        }
        for row in rows
    ]
