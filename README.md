# Salon Management Backend - Phase 6

## Goal

Phase 6 implements the Agent Dashboard from the original product requirements and adds a useful Salon Admin dashboard.

### Agent Dashboard

The authenticated agent can see:

- customers served
- completed services
- revenue
- today's performance
- upcoming appointments
- today's appointments
- seven-day appointment view
- date-range statistics

### Salon Admin Dashboard

An admin assigned to a salon can see:

- total agents
- total customers served
- completed services
- total revenue
- today's metrics
- upcoming appointments
- performance of each active agent

## No database migration

Phase 6 does not introduce new tables.

It reads the existing booking data.

## API endpoints

```text
GET /api/v1/dashboard/agent
GET /api/v1/dashboard/agent/stats
GET /api/v1/dashboard/salon
```

## Run

```powershell
uvicorn app.main:app --reload
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

## Test order

1. Login as AGENT.
2. Call `/api/v1/dashboard/agent`.
3. Complete several bookings for that agent.
4. Call the endpoint again.
5. Verify customer count, completed count and revenue.
6. Call `/api/v1/dashboard/agent/stats`.
7. Login as ADMIN assigned to a salon.
8. Call `/api/v1/dashboard/salon`.
9. Verify per-agent performance.

## Metric definitions

- Customers served = distinct customers with completed bookings.
- Completed services = completed bookings.
- Revenue = sum of completed booking totals.
- Upcoming appointments = CONFIRMED or IN_PROGRESS bookings from today onward.

## Next phase

After Phase 6, the backend core is ready for the React Native application.

Recommended next work:

1. React Native project setup
2. Authentication screens
3. Dashboard
4. Services and bundles
5. Slot selection
6. Wallet
7. Referral
8. Notifications/reminders
9. Agent dashboard
10. End-to-end testing
