from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

class ReferralResponse(BaseModel):
    id: int
    referrer_id: int
    referred_user_id: int
    referral_code: str
    status: str
    reward_amount: Decimal
    completed_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}

class ReferralCodeResponse(BaseModel):
    referral_code: str

class ReferralApplyRequest(BaseModel):
    referral_code: str
