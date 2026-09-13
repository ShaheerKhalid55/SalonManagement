import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { LoginRequest, RegisterRequest, User } from "@/types/auth";
import * as auth from "@/services/auth";
import { setUnauthorizedHandler } from "@/lib/api";
import axios from "axios";
import { router } from "expo-router";
import { registerForPushNotificationsAsync } from "@/services/pushNotifications";
import { clearSession, getStoredUser, getToken, saveSession } from "@/lib/storage";

interface ContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  signIn: (p: LoginRequest) => Promise<void>;
  signUp: (p: RegisterRequest) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<ContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({
    isLoading: true, isAuthenticated: false, token: null as string | null,
    user: null as User | null
  });

  const bootstrap = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setState({ isLoading: false, isAuthenticated: false, token: null, user: null });
      return;
    }
    const stored = await getStoredUser();
    try {
      const user = await auth.getMe();
      await saveSession(token, user);
      setState({ isLoading: false, isAuthenticated: true, token, user });
    } catch (error) {
      // A 401 means the token is invalid/expired. The Axios interceptor
      // displays the authentication-required dialog and calls the handler
      // after the user presses OK. Do not restore the invalid session here.
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setState({ isLoading: false, isAuthenticated: false, token: null, user: null });
        return;
      }

      // For a temporary network/server problem, keep the persisted session so
      // the user can continue while the API becomes reachable again.
      setState({ isLoading: false, isAuthenticated: true, token, user: stored });
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      setState({
        isLoading: false,
        isAuthenticated: false,
        token: null,
        user: null,
      });

      router.replace("/(auth)/login");
    });

    bootstrap();

    return () => setUnauthorizedHandler(null);
  }, [bootstrap]);

  const signIn = useCallback(async (payload: LoginRequest) => {
    const result = await auth.login(payload);
    if (!result.access_token) throw new Error("Login response did not contain access_token.");
    let user = result.user ?? null;
    if (!user) { try { user = await auth.getMe(); } catch { } }
    await saveSession(result.access_token, user);
    setState({ isLoading: false, isAuthenticated: true, token: result.access_token, user });
  }, []);

  const signUp = useCallback(async (payload: RegisterRequest) => {
    const result = await auth.register(payload);
    if (!result.access_token) throw new Error("Registration response did not contain access_token.");
    let user = result.user ?? null;
    if (!user) { try { user = await auth.getMe(); } catch { } }
    await saveSession(result.access_token, user);
    setState({ isLoading: false, isAuthenticated: true, token: result.access_token, user });
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setState({ isLoading: false, isAuthenticated: false, token: null, user: null });
  }, []);

  useEffect(() => {
    // Wait until bootstrap has completed. This guarantees the persisted JWT
    // has been restored before we call the authenticated device-token endpoint.
    if (state.isLoading || !state.isAuthenticated || !state.token) return;

    let cancelled = false;
    let removeResponseListener: (() => void) | undefined;

    void registerForPushNotificationsAsync();

    // expo-notifications is loaded dynamically so Expo Go does not initialize
    // its unsupported Android remote-notification module.
    void (async () => {
      try {
        const Constants = await import("expo-constants");
        if (Constants.default.appOwnership === "expo" || cancelled) return;

        const Notifications = await import("expo-notifications");
        if (cancelled) return;

        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as { booking_id?: number; screen?: string };
          if (data?.screen === "booking" && data.booking_id) {
            router.push(`/booking/${data.booking_id}`);
          }
        });

        removeResponseListener = () => subscription.remove();
      } catch (error) {
        console.warn("Notification listener setup failed:", error);
      }
    })();

    return () => {
      cancelled = true;
      removeResponseListener?.();
    };
  }, [state.isLoading, state.isAuthenticated, state.token]);

  const value = useMemo(() => ({ ...state, signIn, signUp, signOut }), [state, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
