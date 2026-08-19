import { api } from "@/lib/api";

export interface AgentAppointment {
  booking_id: number;
  booking_number: string;
  customer_id: number;
  customer_name: string;
  service_summary: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total: number | string;
  status: string;
}

export interface AgentSummary {
  agent_id: number;
  agent_name: string;
  salon_id: number | null;
  total_customers_served: number;
  total_completed_services: number;
  total_revenue: number | string;
  today_customers_served: number;
  today_completed_services: number;
  today_revenue: number | string;
  upcoming_appointments: number;
}

export interface AgentDashboard {
  summary: AgentSummary;
  today_appointments: AgentAppointment[];
  upcoming_appointments: AgentAppointment[];
}

export interface AgentStats {
  agent_id: number;
  from_date: string;
  to_date: string;
  customers_served: number;
  completed_services: number;
  revenue: number | string;
}

export interface Booking {
  id: number;
  booking_number: string;
  customer_id: number;
  salon_id: number;
  agent_id: number;
  slot_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  payment_method: string;
  payment_status: string;
  status: string;
  items: { id:number; name:string; item_type:string; total_price:number|string }[];
}

export async function getAgentDashboard(date?: string) {
  const { data } = await api.get<AgentDashboard>("/dashboard/agent", {
    params: date ? { dashboard_date: date } : undefined,
  });
  return data;
}

export async function getAgentStats(fromDate: string, toDate: string) {
  const { data } = await api.get<AgentStats>("/dashboard/agent/stats", {
    params: { from_date: fromDate, to_date: toDate },
  });
  return data;
}

export async function getAgentBooking(id: number) {
  const { data } = await api.get<Booking>(`/bookings/${id}`);
  return data;
}

export async function startAgentBooking(id: number) {
  const { data } = await api.post<Booking>(`/bookings/${id}/start`);
  return data;
}

export async function completeAgentBooking(id: number) {
  const { data } = await api.post<Booking>(`/bookings/${id}/complete`);
  return data;
}
