from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password
from app.dependencies.auth import require_roles
from app.models.salon import Salon
from app.models.user import User
from app.schemas.agent import AgentCreateRequest, AgentResponse, AgentUpdateRequest

router = APIRouter(prefix="/api/v1/salons", tags=["Agents"])
admin_router = APIRouter(prefix="/api/v1/admin/agents", tags=["Admin - Agents"])


@router.get("/{salon_id}/agents", response_model=list[AgentResponse])
async def list_salon_agents(salon_id: int, db: AsyncSession = Depends(get_db)):
    salon = await db.get(Salon, salon_id)
    if salon is None or not salon.is_active:
        raise HTTPException(status_code=404, detail="Salon not found")

    result = await db.execute(
        select(User)
        .where(
            User.salon_id == salon_id,
            User.role == "AGENT",
            User.is_active.is_(True),
        )
        .order_by(User.name)
    )
    return list(result.scalars().all())


@admin_router.get("", response_model=list[AgentResponse])
async def list_agents(
    salon_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_roles("ADMIN")),
):
    query = select(User).where(User.role == "AGENT")
    if salon_id is not None:
        query = query.where(User.salon_id == salon_id)
    result = await db.execute(query.order_by(User.name))
    return list(result.scalars().all())


@admin_router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    request: AgentCreateRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_roles("ADMIN")),
):
    salon = await db.get(Salon, request.salon_id)
    if salon is None or not salon.is_active:
        raise HTTPException(status_code=404, detail="Active salon not found")

    existing = await db.execute(
        select(User).where(or_(User.email == request.email, User.phone == request.phone))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or phone is already registered")

    agent = User(
        name=request.name,
        email=request.email,
        phone=request.phone,
        password_hash=hash_password(request.password),
        role="AGENT",
        salon_id=request.salon_id,
    )
    db.add(agent)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Email or phone is already registered")
    await db.refresh(agent)
    return agent


@admin_router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    request: AgentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_roles("ADMIN")),
):
    agent = await db.get(User, agent_id)
    if agent is None or agent.role != "AGENT":
        raise HTTPException(status_code=404, detail="Agent not found")

    salon = await db.get(Salon, request.salon_id)
    if salon is None or not salon.is_active:
        raise HTTPException(status_code=404, detail="Active salon not found")

    phone_check = await db.execute(
        select(User).where(User.phone == request.phone, User.id != agent_id)
    )
    if phone_check.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Phone number is already registered")

    agent.name = request.name
    agent.phone = request.phone
    agent.salon_id = request.salon_id
    agent.is_active = request.is_active

    await db.commit()
    await db.refresh(agent)
    return agent


@admin_router.delete("/{agent_id}", response_model=AgentResponse)
async def deactivate_agent(
    agent_id: int,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_roles("ADMIN")),
):
    agent = await db.get(User, agent_id)
    if agent is None or agent.role != "AGENT":
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.is_active = False
    await db.commit()
    await db.refresh(agent)
    return agent
