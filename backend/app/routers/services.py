from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.salon import Salon
from app.models.service import Service
from app.schemas.service import PaginatedServiceResponse, ServiceCreateRequest, ServiceResponse, ServiceUpdateRequest

router = APIRouter(prefix="/api/v1/services", tags=["Services"])


@router.get("", response_model=PaginatedServiceResponse)
async def list_services(
    salon_id: int | None = None,
    category: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    query = select(Service).where(Service.is_active.is_(True))
    count_query = select(func.count(Service.id)).where(Service.is_active.is_(True))
    if salon_id is not None:
        query = query.where(Service.salon_id == salon_id)
        count_query = count_query.where(Service.salon_id == salon_id)
    if category:
        query = query.where(Service.category == category)
        count_query = count_query.where(Service.category == category)

    total = int((await db.execute(count_query)).scalar_one())
    result = await db.execute(
        query.order_by(Service.name).offset((page - 1) * page_size).limit(page_size)
    )
    items = list(result.scalars().all())
    return PaginatedServiceResponse(
        items=items, page=page, page_size=page_size, total=total,
        has_more=page * page_size < total,
    )


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: int, db: AsyncSession = Depends(get_db)):
    service = await db.get(Service, service_id)
    if service is None or not service.is_active:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.post("/admin", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    request: ServiceCreateRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_roles("ADMIN")),
):
    salon = await db.get(Salon, request.salon_id)
    if salon is None or not salon.is_active:
        raise HTTPException(status_code=404, detail="Active salon not found")

    # The database has a unique constraint on (salon_id, name).
    existing = await db.execute(
        select(Service).where(
            Service.salon_id == request.salon_id,
            Service.name == request.name,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="A service with this name already exists for this salon")

    service = Service(**request.model_dump())
    db.add(service)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A service with this name already exists for this salon")
    await db.refresh(service)
    return service


@router.put("/admin/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    request: ServiceUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_roles("ADMIN")),
):
    service = await db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")

    existing = await db.execute(
        select(Service).where(
            Service.salon_id == service.salon_id,
            Service.name == request.name,
            Service.id != service_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="A service with this name already exists for this salon")

    for field, value in request.model_dump().items():
        setattr(service, field, value)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A service with this name already exists for this salon")
    await db.refresh(service)
    return service


@router.delete("/admin/{service_id}", response_model=ServiceResponse)
async def deactivate_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_roles("ADMIN")),
):
    service = await db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")

    service.is_active = False
    await db.commit()
    await db.refresh(service)
    return service
