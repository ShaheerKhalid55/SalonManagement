from decimal import Decimal
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.referral import Referral
from app.models.referral_code import ReferralCode
from app.models.user import User
from app.services.wallet import credit_wallet

def generate_referral_code(user_id: int) -> str:
    return f"REF{user_id}{uuid4().hex[:6].upper()}"

async def get_or_create_referral_code(db: AsyncSession, user_id: int) -> str:
    result = await db.execute(
        select(ReferralCode).where(ReferralCode.user_id == user_id)
    )
    record = result.scalar_one_or_none()
    if record:
        return record.code

    for _ in range(5):
        code = generate_referral_code(user_id)
        exists = await db.execute(
            select(ReferralCode.id).where(ReferralCode.code == code)
        )
        if exists.scalar_one_or_none() is None:
            record = ReferralCode(user_id=user_id, code=code)
            db.add(record)
            await db.flush()
            return code

    raise HTTPException(status_code=500, detail="Unable to generate referral code")

async def apply_referral_code(db: AsyncSession, referred_user: User, code: str) -> Referral:
    code = code.strip().upper()

    existing = await db.execute(
        select(Referral).where(Referral.referred_user_id == referred_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You have already used a referral")

    result = await db.execute(
        select(ReferralCode).where(ReferralCode.code == code)
    )
    code_record = result.scalar_one_or_none()
    if code_record is None:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    if code_record.user_id == referred_user.id:
        raise HTTPException(status_code=400, detail="You cannot refer yourself")

    referral = Referral(
        referrer_id=code_record.user_id,
        referred_user_id=referred_user.id,
        referral_code=code,
        status="PENDING",
        reward_amount=Decimal(str(settings.referral_reward_amount)),
    )
    db.add(referral)
    await db.flush()
    return referral

async def complete_referral_for_booking(db: AsyncSession, booking):
    result = await db.execute(
        select(Referral)
        .where(
            Referral.referred_user_id == booking.customer_id,
            Referral.status == "PENDING",
        )
        .with_for_update()
    )
    referral = result.scalar_one_or_none()
    if referral is None:
        return None

    transaction = await credit_wallet(
        db=db,
        user_id=referral.referrer_id,
        amount=referral.reward_amount,
        transaction_type="REFERRAL_REWARD",
        description=f"Referral reward for booking {booking.booking_number}",
    )
    referral.reward_transaction_id = transaction.id
    referral.status = "REWARDED"
    referral.completed_at = booking.completed_at
    await db.flush()
    return referral
