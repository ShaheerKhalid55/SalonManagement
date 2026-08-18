from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.service import Service
from app.models.user import User
from app.schemas.catalog import ServiceResponse

router = APIRouter(prefix="/api/v1/services", tags=["Services"])

@router.get("", response_model=list[ServiceResponse])
async def list_services(
    salon_id: int | None = None,
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Service).where(Service.is_active.is_(True))
    if salon_id is not None:
        query = query.where(Service.salon_id == salon_id)
    if category:
        query = query.where(Service.category == category)
    result = await db.execute(query.order_by(Service.name))
    return list(result.scalars().all())

@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: int, db: AsyncSession = Depends(get_db)):
    service = await db.get(Service, service_id)
    if service is None or not service.is_active:
        raise HTTPException(status_code=404, detail="Service not found")
    return service
