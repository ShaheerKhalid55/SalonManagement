import * as SecureStore from "expo-secure-store";
import type { User } from "@/types/auth";

const TOKEN_KEY = "salon_access_token";
const USER_KEY = "salon_current_user";

export async function saveSession(token: string, user?: User | null) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  if (user) await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export async function getStoredUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as User; } catch { return null; }
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
