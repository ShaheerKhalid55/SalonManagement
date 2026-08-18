from pydantic import BaseModel, ConfigDict, Field


class SalonCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str | None = None
    phone: str | None = Field(default=None, max_length=30)
    address_line1: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=100)
    opening_time: str = Field(default="10:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    closing_time: str = Field(default="22:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


class SalonUpdateRequest(SalonCreateRequest):
    is_active: bool = True


class SalonResponse(BaseModel):
    id: int
    name: str
    description: str | None
    phone: str | None
    address_line1: str | None
    city: str | None
    opening_time: str
    closing_time: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
