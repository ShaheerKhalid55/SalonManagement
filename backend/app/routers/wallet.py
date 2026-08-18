from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.user import User
from app.models.wallet_transaction import WalletTransaction
from app.schemas.wallet import WalletResponse, WalletTopUpRequest, WalletTransactionResponse
from app.services.wallet import credit_wallet, get_or_create_wallet

router = APIRouter(prefix="/api/v1/wallet", tags=["Wallet"])

@router.get("", response_model=WalletResponse)
async def get_wallet(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    wallet = await get_or_create_wallet(db, current_user.id)
    await db.commit()
    await db.refresh(wallet)
    return wallet

@router.get("/transactions", response_model=list[WalletTransactionResponse])
async def get_wallet_transactions(
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet = await get_or_create_wallet(db, current_user.id)
    await db.commit()
    result = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.wallet_id == wallet.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())

@router.post("/top-up", response_model=WalletTransactionResponse)
async def top_up_wallet(
    request: WalletTopUpRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("CUSTOMER")),
):
    # Development-only top-up. Production must credit only after verified payment.
    transaction = await credit_wallet(
        db, current_user.id, request.amount, "TOP_UP",
        request.description or "Wallet top-up",
    )
    await db.commit()
    await db.refresh(transaction)
    return transaction
