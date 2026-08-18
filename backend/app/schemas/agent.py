from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AgentCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    password: str = Field(min_length=8, max_length=100)
    salon_id: int


class AgentUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=30)
    salon_id: int
    is_active: bool = True


class AgentResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str
    role: str
    salon_id: int | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
