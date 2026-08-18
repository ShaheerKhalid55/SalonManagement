from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.salon import Salon
from app.models.slot import SalonSlot
from app.models.user import User
from app.schemas.slot import SlotCreateRequest, SlotResponse

router = APIRouter(prefix="/api/v1/slots", tags=["Slots"])

@router.get("/available", response_model=list[SlotResponse])
async def available_slots(
    salon_id: int,
    slot_date: date,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SalonSlot)
        .where(
            SalonSlot.salon_id == salon_id,
            SalonSlot.slot_date == slot_date,
            SalonSlot.status == "AVAILABLE",
        )
        .order_by(SalonSlot.start_time)
    )
    return list(result.scalars().all())

@router.post(
    "",
    response_model=SlotResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_slot(
    request: SlotCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    if request.end_time <= request.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    salon = await db.get(Salon, request.salon_id)
    if salon is None or not salon.is_active:
        raise HTTPException(status_code=404, detail="Salon not found")

    agent = await db.get(User, request.agent_id)
    if agent is None or agent.role != "AGENT" or not agent.is_active:
        raise HTTPException(status_code=400, detail="Invalid agent")

    if agent.salon_id != request.salon_id:
        raise HTTPException(status_code=400, detail="Agent does not belong to this salon")

    if request.start_time < salon.opening_time or request.end_time > salon.closing_time:
        raise HTTPException(status_code=400, detail="Slot is outside salon working hours")

    existing = await db.execute(
        select(SalonSlot).where(
            SalonSlot.agent_id == request.agent_id,
            SalonSlot.slot_date == request.slot_date,
            SalonSlot.start_time == request.start_time,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Agent already has this slot")

    slot = SalonSlot(**request.model_dump())
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return slot
