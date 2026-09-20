from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.booking import Booking
from app.models.booking_item import BookingItem
from app.models.bundle import Bundle
from app.models.salon import Salon
from app.models.service import Service
from app.models.slot import SalonSlot
from app.models.user import User
from app.schemas.booking import BookingCreateRequest, BookingItemResponse, BookingResponse, PaginatedBookingResponse
from app.schemas.dashboard import AgentAppointmentResponse
from app.services.wallet import debit_wallet_for_booking, refund_booking
from app.services.referral import complete_referral_for_booking
from app.services.notifications import create_notification, send_push_notification

router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings"])

async def load_booking_items(booking_id: int, db: AsyncSession):
    result = await db.execute(
        select(BookingItem).where(BookingItem.booking_id == booking_id).order_by(BookingItem.id)
    )
    return list(result.scalars().all())

async def response_for_booking(booking: Booking, db: AsyncSession):
    items = await load_booking_items(booking.id, db)
    return BookingResponse(
        id=booking.id, booking_number=booking.booking_number,
        customer_id=booking.customer_id, salon_id=booking.salon_id,
        agent_id=booking.agent_id, slot_id=booking.slot_id,
        booking_date=booking.booking_date, start_time=booking.start_time,
        end_time=booking.end_time, subtotal=booking.subtotal,
        discount=booking.discount, total=booking.total,
        payment_method=booking.payment_method, payment_status=booking.payment_status,
        status=booking.status,
        items=[BookingItemResponse.model_validate(i) for i in items],
    )

@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    request: BookingCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("CUSTOMER")),
):
    if not request.service_ids and request.bundle_id is None:
        raise HTTPException(status_code=400, detail="Select at least one service or a bundle")

    salon = await db.get(Salon, request.salon_id)
    if salon is None or not salon.is_active:
        raise HTTPException(status_code=404, detail="Salon not found")

    # Lock the slot inside this transaction to prevent double booking.
    result = await db.execute(
        select(SalonSlot).where(SalonSlot.id == request.slot_id).with_for_update()
    )
    slot = result.scalar_one_or_none()

    if slot is None:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.salon_id != request.salon_id:
        raise HTTPException(status_code=400, detail="Slot does not belong to this salon")
    if slot.status != "AVAILABLE":
        raise HTTPException(status_code=409, detail="Slot is no longer available")

    items = []
    subtotal = Decimal("0.00")
    discount = Decimal("0.00")

    if request.service_ids:
        ids = set(request.service_ids)
        result = await db.execute(select(Service).where(
            Service.id.in_(ids),
            Service.salon_id == request.salon_id,
            Service.is_active.is_(True),
        ))
        services = list(result.scalars().all())
        if len(services) != len(ids):
            raise HTTPException(status_code=400, detail="One or more services are invalid")
        for service in services:
            items.append({
                "service_id": service.id, "bundle_id": None,
                "item_type": "SERVICE", "name": service.name,
                "quantity": 1, "unit_price": service.price, "total_price": service.price,
            })
            subtotal += service.price

    if request.bundle_id is not None:
        bundle = await db.get(Bundle, request.bundle_id)
        if bundle is None or not bundle.is_active:
            raise HTTPException(status_code=404, detail="Bundle not found")
        if bundle.salon_id != request.salon_id:
            raise HTTPException(status_code=400, detail="Bundle does not belong to this salon")
        items.append({
            "service_id": None, "bundle_id": bundle.id,
            "item_type": "BUNDLE", "name": bundle.name,
            "quantity": 1, "unit_price": bundle.bundle_price,
            "total_price": bundle.bundle_price,
        })
        subtotal += bundle.bundle_price
        discount += bundle.original_price - bundle.bundle_price

    booking = Booking(
        booking_number=f"SAL-{datetime.now(timezone.utc):%Y%m%d}-{uuid4().hex[:8].upper()}",
        customer_id=current_user.id, salon_id=request.salon_id,
        agent_id=slot.agent_id, slot_id=slot.id,
        booking_date=slot.slot_date, start_time=slot.start_time, end_time=slot.end_time,
        subtotal=subtotal, discount=discount, total=subtotal,
        payment_method="WALLET", payment_status="PENDING", status="PENDING",
    )
    db.add(booking)
    await db.flush()

    for item in items:
        db.add(BookingItem(booking_id=booking.id, **item))

    slot.status = "BOOKED"

    # Same database transaction: wallet failure rolls back booking and slot reservation.
    await debit_wallet_for_booking(db, current_user.id, booking)
    booking.status = "CONFIRMED"

    notification = await create_notification(
        db=db,
        user_id=current_user.id,
        booking_id=booking.id,
        notification_type="BOOKING_CONFIRMED",
        title="Appointment Confirmed",
        message=(
            f"Your appointment at {salon.name} is confirmed for "
            f"{booking.booking_date.isoformat()} at {booking.start_time.strftime('%I:%M %p').lstrip('0')}."
        ),
        data={
            "screen": "booking",
            "booking_id": booking.id,
            "salon_id": booking.salon_id,
        },
    )

    # The slot already identifies the assigned agent. Keep the assignment as an
    # in-app notification so the agent sees the booking immediately, even when
    # push delivery is unavailable.
    agent_notification = await create_notification(
        db=db,
        user_id=booking.agent_id,
        booking_id=booking.id,
        notification_type="APPOINTMENT_ASSIGNED",
        title="New appointment assigned",
        message=(
            f"A new appointment at {salon.name} is assigned to you for "
            f"{booking.booking_date.isoformat()} at {booking.start_time.strftime('%I:%M %p').lstrip('0')}."
        ),
        data={
            "screen": "agent_booking",
            "booking_id": booking.id,
            "salon_id": booking.salon_id,
        },
    )

    await db.commit()
    await db.refresh(booking)
    # Push is intentionally sent after the booking transaction commits.
    await send_push_notification(db, notification)
    await send_push_notification(db, agent_notification)
    return await response_for_booking(booking, db)

@router.get("", response_model=PaginatedBookingResponse)
async def list_my_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = await db.execute(
        select(func.count(Booking.id)).where(Booking.customer_id == current_user.id)
    )
    total = int(count.scalar_one())
    result = await db.execute(
        select(Booking)
        .where(Booking.customer_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    bookings = list(result.scalars().all())
    items = [await response_for_booking(b, db) for b in bookings]
    return PaginatedBookingResponse(
        items=items, page=page, page_size=page_size, total=total,
        has_more=page * page_size < total,
    )

@router.get("/agent", response_model=PaginatedBookingResponse)
async def list_agent_bookings(
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("AGENT")),
):
    """Return only bookings assigned to the authenticated agent."""
    query_filter = [Booking.agent_id == current_user.id]

    status_key = (status_filter or "").upper()
    status_map = {
        "UPCOMING": ("PENDING", "CONFIRMED"),
        "IN_PROGRESS": ("IN_PROGRESS",),
        "COMPLETED": ("COMPLETED",),
        "CANCELLED": ("CANCELLED", "CANCELED"),
    }
    if status_key in status_map:
        query_filter.append(Booking.status.in_(status_map[status_key]))
    elif status_filter:
        query_filter.append(Booking.status == status_key)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query_filter.append(
            or_(
                Booking.booking_number.ilike(term),
                User.name.ilike(term),
            )
        )

    count = await db.execute(select(func.count(Booking.id)).join(User, User.id == Booking.customer_id).where(*query_filter))
    total = int(count.scalar_one())

    result = await db.execute(
        select(Booking)
        .join(User, User.id == Booking.customer_id)
        .where(*query_filter)
        .order_by(Booking.booking_date.desc(), Booking.start_time.desc(), Booking.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    bookings = list(result.scalars().all())
    items = [await response_for_booking(b, db) for b in bookings]
    return PaginatedBookingResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        has_more=page * page_size < total,
    )

@router.get("/agent/current-booking", response_model=AgentAppointmentResponse | None)
async def get_agent_current_booking(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("AGENT")),
):
    """Return the appointment currently being worked on by the authenticated agent.

    The response intentionally uses the compact agent-appointment shape so the
    Home screen can render customer and service information without a second
    request. If there is no IN_PROGRESS booking, the endpoint returns null.
    """
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
            Booking.agent_id == current_user.id,
            Booking.status == "IN_PROGRESS",
        )
        .order_by(Booking.booking_date, Booking.start_time, Booking.id)
        .limit(1)
    )
    row = result.first()
    if row is None:
        return None

    items_result = await db.execute(
        select(BookingItem.name)
        .where(BookingItem.booking_id == row.id)
        .order_by(BookingItem.id)
    )
    service_summary = ", ".join(name for (name,) in items_result.all())

    return {
        "booking_id": row.id,
        "booking_number": row.booking_number,
        "customer_id": row.customer_id,
        "customer_name": row.name,
        "service_summary": service_summary,
        "booking_date": row.booking_date,
        "start_time": row.start_time,
        "end_time": row.end_time,
        "total": row.total,
        "status": row.status,
    }

@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = await db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if current_user.role == "CUSTOMER" and booking.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot access this booking")
    if current_user.role == "AGENT" and booking.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot access this booking")
    return await response_for_booking(booking, db)

@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Lock booking to avoid two cancellation/refund requests racing.
    result = await db.execute(select(Booking).where(Booking.id == booking_id).with_for_update())
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role not in {"CUSTOMER", "AGENT"}:
        raise HTTPException(status_code=403, detail="You cannot cancel this booking")
    if current_user.role == "CUSTOMER" and booking.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot cancel this booking")
    if current_user.role == "AGENT" and booking.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="This booking is not assigned to you")
    if booking.status not in {"PENDING", "CONFIRMED"}:
        raise HTTPException(status_code=400, detail="Booking cannot be cancelled")

    slot = await db.get(SalonSlot, booking.slot_id)
    if slot:
        slot.status = "AVAILABLE"

    if booking.payment_status == "PAID":
        await refund_booking(db, booking)

    booking.status = "CANCELLED"

    if current_user.role == "AGENT":
        notification = await create_notification(
            db=db,
            user_id=booking.customer_id,
            booking_id=booking.id,
            notification_type="BOOKING_CANCELLED_AGENT",
            title="Appointment cancelled",
            message=f"Your appointment {booking.booking_number} was cancelled by the assigned agent.",
            data={"screen": "booking", "booking_id": booking.id},
        )
    else:
        notification = await create_notification(
            db=db,
            user_id=booking.agent_id,
            booking_id=booking.id,
            notification_type="BOOKING_CANCELLED_CUSTOMER",
            title="Appointment cancelled",
            message=f"Booking {booking.booking_number} was cancelled by the customer.",
            data={"screen": "agent_booking", "booking_id": booking.id},
        ) if booking.agent_id else None

    await db.commit()
    await db.refresh(booking)
    if notification is not None:
        await send_push_notification(db, notification)
    return await response_for_booking(booking, db)

@router.post("/{booking_id}/start", response_model=BookingResponse)
async def start_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("AGENT")),
):
    # Lock the booking so two rapid start requests cannot both mutate it.
    result = await db.execute(
        select(Booking)
        .where(Booking.id == booking_id)
        .with_for_update()
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="This booking is not assigned to you")
    if booking.status != "CONFIRMED":
        raise HTTPException(status_code=400, detail="Booking cannot be started")

    # MVP rule: one agent can work on only one appointment at a time.
    active_result = await db.execute(
        select(Booking.id)
        .where(
            Booking.agent_id == current_user.id,
            Booking.status == "IN_PROGRESS",
            Booking.id != booking.id,
        )
        .limit(1)
    )
    if active_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="You already have an appointment in progress. Complete it before starting another.",
        )

    booking.status = "IN_PROGRESS"

    # Keep the state change visible in the notification center for both sides.
    agent_notification = await create_notification(
        db=db,
        user_id=current_user.id,
        booking_id=booking.id,
        notification_type="SERVICE_STARTED",
        title="Service started",
        message=f"Service for {booking.booking_number} is now in progress.",
        data={"screen": "agent_booking", "booking_id": booking.id},
    )
    customer_notification = await create_notification(
        db=db,
        user_id=booking.customer_id,
        booking_id=booking.id,
        notification_type="SERVICE_STARTED_CUSTOMER",
        title="Your service has started",
        message=f"Your appointment at {booking.booking_date.isoformat()} is now in progress.",
        data={"screen": "booking", "booking_id": booking.id},
    )

    await db.commit()
    await db.refresh(booking)
    await send_push_notification(db, agent_notification)
    await send_push_notification(db, customer_notification)
    return await response_for_booking(booking, db)

@router.post("/{booking_id}/complete", response_model=BookingResponse)
async def complete_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("AGENT")),
):
    result = await db.execute(
        select(Booking)
        .where(Booking.id == booking_id)
        .with_for_update()
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="This booking is not assigned to you")
    if booking.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=400,
            detail="Booking must be in progress before it can be completed",
        )
    booking.status = "COMPLETED"
    booking.completed_at = datetime.now(timezone.utc)

    # The agent earns the booking total when the service is completed. The
    # wallet service creates an auditable transaction with before/after balance.
    from app.services.wallet import credit_wallet
    await credit_wallet(
        db,
        current_user.id,
        Decimal(booking.total),
        "SERVICE_EARNING",
        f"Earnings for completed booking {booking.booking_number}",
    )

    await complete_referral_for_booking(db, booking)

    agent_notification = await create_notification(
        db=db,
        user_id=current_user.id,
        booking_id=booking.id,
        notification_type="SERVICE_COMPLETED",
        title="Service completed",
        message=f"Booking {booking.booking_number} has been completed. Your wallet was updated.",
        data={"screen": "agent_booking", "booking_id": booking.id},
    )
    customer_notification = await create_notification(
        db=db,
        user_id=booking.customer_id,
        booking_id=booking.id,
        notification_type="SERVICE_COMPLETED_CUSTOMER",
        title="Appointment completed",
        message=f"Your appointment {booking.booking_number} has been completed.",
        data={"screen": "booking", "booking_id": booking.id},
    )

    await db.commit()
    await db.refresh(booking)
    await send_push_notification(db, agent_notification)
    await send_push_notification(db, customer_notification)
    return await response_for_booking(booking, db)
