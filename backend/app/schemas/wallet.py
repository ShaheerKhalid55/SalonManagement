from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

class WalletResponse(BaseModel):
    id: int
    user_id: int
    balance: Decimal
    currency: str
    model_config = {"from_attributes": True}

class WalletTopUpRequest(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    description: str | None = Field(default="Wallet top-up", max_length=255)

class WalletTransactionResponse(BaseModel):
    id: int
    transaction_reference: str
    transaction_type: str
    amount: Decimal
    balance_before: Decimal
    balance_after: Decimal
    status: str
    description: str | None
    booking_id: int | None
    created_at: datetime
    model_config = {"from_attributes": True}
