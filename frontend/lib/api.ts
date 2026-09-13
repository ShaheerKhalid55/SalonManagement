import axios from "axios";
import { API_URL } from "@/constants/config";
import { clearSession, getToken } from "@/lib/storage";

let unauthorizedHandler: (() => Promise<void> | void) | null = null;
let handlingUnauthorized = false;

export function setUnauthorizedHandler(
  handler: (() => Promise<void> | void) | null
) {
  unauthorizedHandler = handler;
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;

    // Keep the exact token used by this request.
    // This allows us to detect stale requests after a new login.
    (config as any).__authToken = token;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    /*
     * IMPORTANT:
     * A request may have started before the user logged in and can
     * return 401 after the new session has already been established.
     *
     * Never clear the NEW session because of an OLD request.
     */
    const requestToken = (error.config as any)?.__authToken;
    const currentToken = await getToken();

    if (!requestToken || !currentToken) {
      return Promise.reject(error);
    }

    if (requestToken !== currentToken) {
      console.warn(
        "Ignoring 401 from a stale authentication request."
      );
      return Promise.reject(error);
    }

    if (!handlingUnauthorized) {
      handlingUnauthorized = true;

      await clearSession();

      const { Alert } = await import("react-native");

      Alert.alert(
        "Authentication required",
        "Your session has expired. Please log in again to continue.",
        [
          {
            text: "OK",
            onPress: async () => {
              try {
                await unauthorizedHandler?.();
              } finally {
                handlingUnauthorized = false;
              }
            },
          },
        ],
        {
          cancelable: false,
        }
      );
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    const message = error.response?.data?.message;

    if (typeof message === "string") {
      return message;
    }

    if (!error.response) {
      return "Unable to connect to the server.";
    }
  }

  return "Something went wrong. Please try again.";
}