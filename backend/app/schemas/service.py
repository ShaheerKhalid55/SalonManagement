from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class ServiceCreateRequest(BaseModel):
    salon_id: int
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    category: str = Field(default="OTHER", min_length=2, max_length=50)
    duration_minutes: int = Field(gt=0, le=480)
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class ServiceUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    category: str = Field(min_length=2, max_length=50)
    duration_minutes: int = Field(gt=0, le=480)
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    is_active: bool = True


class ServiceResponse(BaseModel):
    id: int
    salon_id: int
    name: str
    description: str | None
    category: str
    duration_minutes: int
    price: Decimal
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
