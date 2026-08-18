from datetime import datetime
from pydantic import BaseModel, Field

class DeviceTokenRequest(BaseModel):
    token: str = Field(min_length=1, max_length=500)
    provider: str = Field(default="EXPO", max_length=30)

class NotificationResponse(BaseModel):
    id: int
    notification_type: str
    title: str
    message: str
    data_json: str | None
    is_read: bool
    sent_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}

class NotificationReadRequest(BaseModel):
    is_read: bool = True
