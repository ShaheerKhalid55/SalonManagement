from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.services.notification_scheduler import start_notification_scheduler, stop_notification_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_notification_scheduler()
    yield
    stop_notification_scheduler()

from app.routers import (
    auth,
    users,
    salons,
    services,
    bundles,
    slots,
    bookings,
    wallet,
    referrals,
    notifications,
    reminders,
    dashboard,
)

app = FastAPI(
    title="Salon Management API",
    version="1.0.0",
    lifespan=lifespan,
    #description="Salon Management backend - Phase 6: agent and salon dashboards.",
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(salons.router)
app.include_router(services.router)
app.include_router(bundles.router)
app.include_router(slots.router)
app.include_router(bookings.router)
app.include_router(wallet.router)
app.include_router(referrals.router)
app.include_router(notifications.router)
app.include_router(reminders.router)
app.include_router(dashboard.router)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "salon-management-api"}
