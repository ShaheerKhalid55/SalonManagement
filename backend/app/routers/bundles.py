from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.bundle import Bundle
from app.models.bundle_service import BundleService
from app.models.salon import Salon
from app.models.service import Service
from app.schemas.bundle import BundleCreateRequest, BundleResponse, BundleServiceResponse, BundleUpdateRequest

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


async def validate_bundle_services(salon_id: int, service_ids: list[int], db: AsyncSession) -> list[Service]:
    unique_ids = list(dict.fromkeys(service_ids))
    result = await db.execute(
        select(Service).where(
            Service.id.in_(unique_ids),
            Service.salon_id == salon_id,
            Service.is_active.is_(True),
        )
    )
    services = list(result.scalars().all())
    found_ids = {service.id for service in services}
    missing_ids = [service_id for service_id in unique_ids if service_id not in found_ids]
    if missing_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Service IDs are invalid, inactive, or belong to another salon: {missing_ids}",
        )
    return services


def validate_bundle_prices(original_price: Decimal, bundle_price: Decimal) -> None:
    if bundle_price > original_price:
        raise HTTPException(status_code=400, detail="bundle_price cannot be greater than original_price")


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


@router.post("/admin", response_model=BundleResponse, status_code=status.HTTP_201_CREATED)
async def create_bundle(
    request: BundleCreateRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_roles("ADMIN")),
):
    if request.bundle_price > request.original_price:
        raise HTTPException(status_code=400, detail="bundle_price cannot be greater than original_price")

    salon = await db.get(Salon, request.salon_id)
    if salon is None or not salon.is_active:
        raise HTTPException(status_code=404, detail="Active salon not found")

    service_ids = list(dict.fromkeys(request.service_ids))
    if not service_ids:
        raise HTTPException(status_code=400, detail="At least one service is required")
    await validate_bundle_services(request.salon_id, service_ids, db)

    bundle = Bundle(
        salon_id=request.salon_id,
        name=request.name,
        description=request.description,
        original_price=request.original_price,
        bundle_price=request.bundle_price,
        duration_minutes=request.duration_minutes,
        is_active=True,
    )
    db.add(bundle)
    await db.flush()

    db.add_all([
        BundleService(bundle_id=bundle.id, service_id=service_id)
        for service_id in service_ids
    ])
    await db.commit()
    await db.refresh(bundle)
    return await build_bundle_response(bundle, db)


@router.put("/admin/{bundle_id}", response_model=BundleResponse)
async def update_bundle(
    bundle_id: int,
    request: BundleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_roles("ADMIN")),
):
    if request.bundle_price > request.original_price:
        raise HTTPException(status_code=400, detail="bundle_price cannot be greater than original_price")

    bundle = await db.get(Bundle, bundle_id)
    if bundle is None:
        raise HTTPException(status_code=404, detail="Bundle not found")

    service_ids = list(dict.fromkeys(request.service_ids))
    if not service_ids:
        raise HTTPException(status_code=400, detail="At least one service is required")
    await validate_bundle_services(bundle.salon_id, service_ids, db)

    bundle.name = request.name
    bundle.description = request.description
    bundle.original_price = request.original_price
    bundle.bundle_price = request.bundle_price
    bundle.duration_minutes = request.duration_minutes
    bundle.is_active = request.is_active

    await db.execute(delete(BundleService).where(BundleService.bundle_id == bundle.id))
    db.add_all([
        BundleService(bundle_id=bundle.id, service_id=service_id)
        for service_id in service_ids
    ])
    await db.commit()
    await db.refresh(bundle)
    return await build_bundle_response(bundle, db)


@router.delete("/admin/{bundle_id}", response_model=BundleResponse)
async def deactivate_bundle(
    bundle_id: int,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_roles("ADMIN")),
):
    bundle = await db.get(Bundle, bundle_id)
    if bundle is None:
        raise HTTPException(status_code=404, detail="Bundle not found")

    bundle.is_active = False
    await db.commit()
    await db.refresh(bundle)
    return await build_bundle_response(bundle, db)
