from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
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

    await db.commit()
    await db.refresh(booking)
    # Push is intentionally sent after the booking transaction commits.
    await send_push_notification(db, notification)
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
    current_user: User = Depends(require_roles("CUSTOMER")),
):
    # Lock booking to avoid two cancellation/refund requests racing.
    result = await db.execute(select(Booking).where(Booking.id == booking_id).with_for_update())
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot cancel this booking")
    if booking.status not in {"PENDING", "CONFIRMED"}:
        raise HTTPException(status_code=400, detail="Booking cannot be cancelled")

    slot = await db.get(SalonSlot, booking.slot_id)
    if slot:
        slot.status = "AVAILABLE"

    if booking.payment_status == "PAID":
        await refund_booking(db, booking)

    booking.status = "CANCELLED"
    await db.commit()
    await db.refresh(booking)
    return await response_for_booking(booking, db)

@router.post("/{booking_id}/start", response_model=BookingResponse)
async def start_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("AGENT")),
):
    booking = await db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="This booking is not assigned to you")
    if booking.status != "CONFIRMED":
        raise HTTPException(status_code=400, detail="Booking cannot be started")
    booking.status = "IN_PROGRESS"
    await db.commit()
    await db.refresh(booking)
    return await response_for_booking(booking, db)

@router.post("/{booking_id}/complete", response_model=BookingResponse)
async def complete_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("AGENT")),
):
    booking = await db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="This booking is not assigned to you")
    if booking.status not in {"CONFIRMED", "IN_PROGRESS"}:
        raise HTTPException(status_code=400, detail="Booking cannot be completed")
    booking.status = "COMPLETED"
    booking.completed_at = datetime.now(timezone.utc)
    await complete_referral_for_booking(db, booking)
    await db.commit()
    await db.refresh(booking)
    return await response_for_booking(booking, db)
