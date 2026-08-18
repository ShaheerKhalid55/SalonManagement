from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class BundleCreateRequest(BaseModel):
    salon_id: int
    name: str = Field(min_length=2, max_length=150)
    description: str | None = None
    service_ids: list[int] = Field(min_length=1)
    original_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    bundle_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    duration_minutes: int = Field(gt=0, le=480)


class BundleUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str | None = None
    service_ids: list[int] = Field(min_length=1)
    original_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    bundle_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    duration_minutes: int = Field(gt=0, le=480)
    is_active: bool = True


class BundleServiceResponse(BaseModel):
    id: int
    name: str
    category: str
    duration_minutes: int
    price: Decimal


class BundleResponse(BaseModel):
    id: int
    salon_id: int
    name: str
    description: str | None
    original_price: Decimal
    bundle_price: Decimal
    discount: Decimal
    duration_minutes: int
    is_active: bool
    services: list[BundleServiceResponse]

    model_config = ConfigDict(from_attributes=True)
