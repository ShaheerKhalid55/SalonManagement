import { api } from "@/lib/api";
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "@/types/auth";

export async function login(payload: LoginRequest) {
  const response = await api.post<AuthResponse>("/auth/login", payload);
  return response.data;
}

export async function register(payload: RegisterRequest) {
  const response = await api.post<AuthResponse>("/auth/register", payload);
  return response.data;
}

export async function getMe() {
  const response = await api.get<User>("/users/me");
  return response.data;
}
