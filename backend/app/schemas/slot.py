from datetime import date, time
from pydantic import BaseModel, Field

class SlotCreateRequest(BaseModel):
    salon_id: int
    agent_id: int
    slot_date: date
    start_time: time
    end_time: time

class SlotResponse(BaseModel):
    id: int
    salon_id: int
    agent_id: int
    slot_date: date
    start_time: time
    end_time: time
    status: str

    model_config = {"from_attributes": True}
