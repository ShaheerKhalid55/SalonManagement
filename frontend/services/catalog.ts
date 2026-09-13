import { api } from "@/lib/api";

export interface Salon {
  id: number;
  name: string;
  description?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  city?: string | null;
  opening_time: string;
  closing_time: string;
  is_active: boolean;
}

export interface Service {
  id: number;
  salon_id: number;
  name: string;
  description?: string | null;
  category: string;
  duration_minutes: number;
  price: number | string;
  is_active: boolean;
}

export interface BundleService {
  id: number;
  name: string;
  category: string;
  duration_minutes: number;
  price: number | string;
}

export interface Bundle {
  id: number;
  salon_id: number;
  name: string;
  description?: string | null;
  original_price: number | string;
  bundle_price: number | string;
  discount: number | string;
  duration_minutes: number;
  is_active: boolean;
  services: BundleService[];
}

export interface Slot {
  id: number;
  salon_id: number;
  agent_id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

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

export interface SalonPage {
  items: Salon[];
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
}

export interface ServicePage {
  items: Service[];
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
}

export async function getSalonsPage(page = 1, pageSize = 10) {
  const { data } = await api.get<SalonPage>("/salons", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function getSalons() {
  const data = await getSalonsPage(1, 10);
  return data.items;
}

export async function getSalon(salonId: number) {
  const { data } = await api.get<Salon>(`/salons/${salonId}`);
  return data;
}

export async function getServicesPage(salonId?: number, page = 1, pageSize = 10, category?: string) {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  if (salonId) params.salon_id = salonId;
  if (category && category !== "All") params.category = category;
  const { data } = await api.get<ServicePage>("/services", { params });
  return data;
}

export async function getServices(salonId?: number) {
  // Preserve the existing full-list API for comparison and booking flows.
  const { data } = await api.get<Service[]>("/services", {
    params: salonId ? { salon_id: salonId, page: 1, page_size: 50 } : { page: 1, page_size: 50 },
  });
  return data.items;
}

export async function getBundles(salonId?: number) {
  const { data } = await api.get<Bundle[]>("/bundles", {
    params: salonId ? { salon_id: salonId } : undefined,
  });
  return data;
}

export async function getAvailableSlots(salonId: number, date: string) {
  const { data } = await api.get<Slot[]>("/slots/available", {
    params: { salon_id: salonId, slot_date: date },
  });
  return data;
}

export async function createBooking(input: {
  salon_id: number;
  slot_id: number;
  service_ids?: number[];
  bundle_id?: number | null;
}) {
  const { data } = await api.post<Booking>("/bookings", {
    salon_id: input.salon_id,
    slot_id: input.slot_id,
    service_ids: input.service_ids ?? [],
    bundle_id: input.bundle_id ?? null,
  });
  return data;
}
