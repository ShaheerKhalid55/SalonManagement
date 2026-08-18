from datetime import time
from decimal import Decimal
from pydantic import BaseModel, Field

class SalonCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str | None = None
    phone: str | None = None
    address_line1: str | None = None
    city: str | None = None
    opening_time: time = time(10, 0)
    closing_time: time = time(22, 0)

class SalonResponse(SalonCreateRequest):
    id: int
    is_active: bool
    model_config = {"from_attributes": True}

class ServiceResponse(BaseModel):
    id: int
    salon_id: int
    name: str
    description: str | None
    category: str
    duration_minutes: int
    price: Decimal
    is_active: bool
    model_config = {"from_attributes": True}

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
    services: list[BundleServiceResponse] = []
