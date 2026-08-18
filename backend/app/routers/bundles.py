from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.bundle import Bundle
from app.models.bundle_service import BundleService
from app.models.service import Service
from app.models.user import User
from app.schemas.catalog import BundleResponse, BundleServiceResponse

router = APIRouter(prefix="/api/v1/bundles", tags=["Bundles"])

async def build_bundle_response(bundle: Bundle, db: AsyncSession) -> BundleResponse:
    result = await db.execute(
        select(Service)
        .join(BundleService, BundleService.service_id == Service.id)
        .where(
            BundleService.bundle_id == bundle.id,
            Service.is_active.is_(True),
        )
        .order_by(Service.name)
    )
    services = list(result.scalars().all())
    discount = bundle.original_price - bundle.bundle_price

    return BundleResponse(
        id=bundle.id,
        salon_id=bundle.salon_id,
        name=bundle.name,
        description=bundle.description,
        original_price=bundle.original_price,
        bundle_price=bundle.bundle_price,
        discount=discount,
        duration_minutes=bundle.duration_minutes,
        is_active=bundle.is_active,
        services=[
            BundleServiceResponse(
                id=s.id,
                name=s.name,
                category=s.category,
                duration_minutes=s.duration_minutes,
                price=s.price,
            )
            for s in services
        ],
    )

@router.get("", response_model=list[BundleResponse])
async def list_bundles(
    salon_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Bundle).where(Bundle.is_active.is_(True))
    if salon_id is not None:
        query = query.where(Bundle.salon_id == salon_id)
    result = await db.execute(query.order_by(Bundle.name))
    bundles = list(result.scalars().all())
    return [await build_bundle_response(b, db) for b in bundles]

@router.get("/{bundle_id}", response_model=BundleResponse)
async def get_bundle(bundle_id: int, db: AsyncSession = Depends(get_db)):
    bundle = await db.get(Bundle, bundle_id)
    if bundle is None or not bundle.is_active:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return await build_bundle_response(bundle, db)
