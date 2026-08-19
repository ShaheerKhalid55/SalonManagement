import axios from "axios";
import { API_URL } from "@/constants/config";
import { clearSession, getToken } from "@/lib/storage";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {"Content-Type": "application/json"}
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) await clearSession();
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (!error.response) return "Unable to connect to the server.";
  }
  return "Something went wrong. Please try again.";
}
