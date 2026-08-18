from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel


class AgentSummaryResponse(BaseModel):
    agent_id: int
    agent_name: str
    salon_id: int | None
    total_customers_served: int
    total_completed_services: int
    total_revenue: Decimal
    today_customers_served: int
    today_completed_services: int
    today_revenue: Decimal
    upcoming_appointments: int


class AgentAppointmentResponse(BaseModel):
    booking_id: int
    booking_number: str
    customer_id: int
    customer_name: str
    service_summary: str
    booking_date: date
    start_time: time
    end_time: time
    total: Decimal
    status: str


class AgentDashboardResponse(BaseModel):
    summary: AgentSummaryResponse
    today_appointments: list[AgentAppointmentResponse]
    upcoming_appointments: list[AgentAppointmentResponse]


class AgentStatsResponse(BaseModel):
    agent_id: int
    from_date: date
    to_date: date
    customers_served: int
    completed_services: int
    revenue: Decimal


class SalonAgentPerformanceResponse(BaseModel):
    agent_id: int
    agent_name: str
    customers_served: int
    completed_services: int
    revenue: Decimal


class SalonDashboardResponse(BaseModel):
    salon_id: int
    salon_name: str
    total_agents: int
    total_customers_served: int
    total_completed_services: int
    total_revenue: Decimal
    today_customers_served: int
    today_completed_services: int
    today_revenue: Decimal
    upcoming_appointments: int
    agent_performance: list[SalonAgentPerformanceResponse]
