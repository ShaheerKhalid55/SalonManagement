from decimal import Decimal
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.booking import Booking
from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction

async def get_or_create_wallet(db: AsyncSession, user_id: int, lock: bool = False) -> Wallet:
    query = select(Wallet).where(Wallet.user_id == user_id)
    if lock:
        query = query.with_for_update()
    result = await db.execute(query)
    wallet = result.scalar_one_or_none()
    if wallet:
        return wallet
    wallet = Wallet(user_id=user_id, balance=Decimal("0.00"), currency="PKR")
    db.add(wallet)
    await db.flush()
    return wallet

async def credit_wallet(db: AsyncSession, user_id: int, amount: Decimal, transaction_type: str, description: str):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")
    wallet = await get_or_create_wallet(db, user_id, lock=True)
    before = wallet.balance
    after = before + amount
    wallet.balance = after
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        transaction_reference=f"WLT-{uuid4().hex.upper()}",
        transaction_type=transaction_type,
        amount=amount,
        balance_before=before,
        balance_after=after,
        status="COMPLETED",
        description=description,
    )
    db.add(transaction)
    await db.flush()
    return transaction

async def debit_wallet_for_booking(db: AsyncSession, user_id: int, booking: Booking):
    wallet = await get_or_create_wallet(db, user_id, lock=True)
    amount = Decimal(booking.total)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Booking total must be greater than zero")
    if wallet.balance < amount:
        raise HTTPException(status_code=400, detail=f"Insufficient wallet balance. Required: {amount}, Available: {wallet.balance}")
    before = wallet.balance
    after = before - amount
    wallet.balance = after
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        transaction_reference=f"PAY-{uuid4().hex.upper()}",
        transaction_type="BOOKING_PAYMENT",
        amount=-amount,
        balance_before=before,
        balance_after=after,
        status="COMPLETED",
        description=f"Payment for booking {booking.booking_number}",
        booking_id=booking.id,
    )
    db.add(transaction)
    booking.payment_status = "PAID"
    booking.payment_method = "WALLET"
    await db.flush()
    return transaction

async def refund_booking(db: AsyncSession, booking: Booking):
    wallet = await get_or_create_wallet(db, booking.customer_id, lock=True)
    existing = await db.execute(select(WalletTransaction).where(
        WalletTransaction.booking_id == booking.id,
        WalletTransaction.transaction_type == "REFUND",
        WalletTransaction.status == "COMPLETED",
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Booking has already been refunded")
    amount = Decimal(booking.total)
    before = wallet.balance
    after = before + amount
    wallet.balance = after
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        transaction_reference=f"REF-{uuid4().hex.upper()}",
        transaction_type="REFUND",
        amount=amount,
        balance_before=before,
        balance_after=after,
        status="COMPLETED",
        description=f"Refund for booking {booking.booking_number}",
        booking_id=booking.id,
    )
    db.add(transaction)
    booking.payment_status = "REFUNDED"
    await db.flush()
    return transaction
