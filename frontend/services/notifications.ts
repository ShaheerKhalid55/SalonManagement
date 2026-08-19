import { api } from "@/lib/api";

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  data_json: string | null;
  is_read: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface Reminder {
  id: number;
  salon_id: number;
  reminder_date: string;
  reminder_time: string;
  is_sent: boolean;
  notification_id: number | null;
  created_at: string;
}

export async function getNotifications(unreadOnly = false) {
  const { data } = await api.get<Notification[]>("/notifications", {
    params: { unread_only: unreadOnly },
  });
  return data;
}

export async function markNotificationRead(id: number, isRead = true) {
  const { data } = await api.patch<Notification>(`/notifications/${id}`, {
    is_read: isRead,
  });
  return data;
}

export async function getReminders(date?: string) {
  const { data } = await api.get<Reminder[]>("/reminders", {
    params: date ? { reminder_date: date } : undefined,
  });
  return data;
}
