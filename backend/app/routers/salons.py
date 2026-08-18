from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.salon import Salon
from app.models.user import User
from app.schemas.catalog import SalonCreateRequest, SalonResponse

router = APIRouter(prefix="/api/v1/salons", tags=["Salons"])

@router.get("", response_model=list[SalonResponse])
async def list_salons(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Salon).where(Salon.is_active.is_(True)).order_by(Salon.name))
    return list(result.scalars().all())

@router.get("/{salon_id}", response_model=SalonResponse)
async def get_salon(salon_id: int, db: AsyncSession = Depends(get_db)):
    salon = await db.get(Salon, salon_id)
    if salon is None or not salon.is_active:
        raise HTTPException(status_code=404, detail="Salon not found")
    return salon

@router.post(
    "/admin",
    response_model=SalonResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_salon(
    request: SalonCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    salon = Salon(**request.model_dump())
    db.add(salon)
    await db.commit()
    await db.refresh(salon)
    return salon
