import { api } from "@/lib/api";

export interface BookingItem {
  id: number;
  service_id: number | null;
  bundle_id: number | null;
  item_type: string;
  name: string;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
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
  items: BookingItem[];
}

export async function getMyBookings() {
  const { data } = await api.get<Booking[]>("/bookings");
  return data;
}

export async function getBooking(id: number) {
  const { data } = await api.get<Booking>(`/bookings/${id}`);
  return data;
}

export async function cancelBooking(id: number) {
  const { data } = await api.post<Booking>(`/bookings/${id}/cancel`);
  return data;
}
