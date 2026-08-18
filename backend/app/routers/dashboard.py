from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.salon import Salon
from app.models.user import User
from app.schemas.dashboard import (
    AgentDashboardResponse,
    AgentStatsResponse,
    SalonDashboardResponse,
)
from app.services.dashboard import (
    get_agent_dashboard,
    get_agent_stats,
    get_salon_dashboard,
)

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get("/agent", response_model=AgentDashboardResponse)
async def agent_dashboard(
    dashboard_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("AGENT")),
):
    target_date = dashboard_date or date.today()
    return await get_agent_dashboard(db, current_user, target_date)


@router.get("/agent/stats", response_model=AgentStatsResponse)
async def agent_stats(
    from_date: date | None = None,
    to_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("AGENT")),
):
    end = to_date or date.today()
    start = from_date or (end - timedelta(days=29))

    if start > end:
        raise HTTPException(
            status_code=400,
            detail="from_date cannot be after to_date",
        )

    if (end - start).days > 366:
        raise HTTPException(
            status_code=400,
            detail="Date range cannot exceed 366 days",
        )

    return await get_agent_stats(db, current_user.id, start, end)


@router.get("/salon", response_model=SalonDashboardResponse)
async def salon_dashboard(
    dashboard_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    if current_user.salon_id is None:
        raise HTTPException(
            status_code=400,
            detail="Admin is not assigned to a salon",
        )

    salon = await db.get(Salon, current_user.salon_id)
    if salon is None or not salon.is_active:
        raise HTTPException(status_code=404, detail="Salon not found")

    return await get_salon_dashboard(
        db,
        salon,
        dashboard_date or date.today(),
    )
