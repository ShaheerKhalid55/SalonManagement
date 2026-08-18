from datetime import date, time
from pydantic import BaseModel

class ReminderResponse(BaseModel):
    id: int
    salon_id: int
    reminder_date: date
    reminder_time: time
    is_sent: bool
    notification_id: int | None
    created_at: object
    model_config = {"from_attributes": True}
