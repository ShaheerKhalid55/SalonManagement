from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.referral import Referral
from app.models.user import User
from app.schemas.referral import ReferralApplyRequest, ReferralCodeResponse, ReferralResponse
from app.services.referral import apply_referral_code, get_or_create_referral_code

router = APIRouter(prefix="/api/v1/referrals", tags=["Referrals"])

@router.get("/my-code", response_model=ReferralCodeResponse)
async def my_referral_code(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("CUSTOMER")),
):
    code = await get_or_create_referral_code(db, current_user.id)
    await db.commit()
    return {"referral_code": code}

@router.post("/apply", response_model=ReferralResponse)
async def apply_code(
    request: ReferralApplyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("CUSTOMER")),
):
    referral = await apply_referral_code(db, current_user, request.referral_code)
    await db.commit()
    await db.refresh(referral)
    return referral

@router.get("/history", response_model=list[ReferralResponse])
async def referral_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("CUSTOMER")),
):
    result = await db.execute(
        select(Referral)
        .where(Referral.referrer_id == current_user.id)
        .order_by(Referral.created_at.desc())
    )
    return list(result.scalars().all())
