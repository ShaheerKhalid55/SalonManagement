from datetime import date, time
from decimal import Decimal
from pydantic import BaseModel, Field

class BookingCreateRequest(BaseModel):
    salon_id: int
    slot_id: int
    service_ids: list[int] = Field(default_factory=list)
    bundle_id: int | None = None

class BookingItemResponse(BaseModel):
    id: int
    service_id: int | None
    bundle_id: int | None
    item_type: str
    name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal

    model_config = {"from_attributes": True}

class BookingResponse(BaseModel):
    id: int
    booking_number: str
    customer_id: int
    salon_id: int
    agent_id: int
    slot_id: int
    booking_date: date
    start_time: time
    end_time: time
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    payment_method: str
    payment_status: str
    status: str
    items: list[BookingItemResponse] = []

    model_config = {"from_attributes": True}


class PaginatedBookingResponse(BaseModel):
    items: list[BookingResponse]
    page: int
    page_size: int
    total: int
    has_more: bool
