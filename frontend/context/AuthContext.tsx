import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import type {LoginRequest, RegisterRequest, User} from "@/types/auth";
import * as auth from "@/services/auth";
import {clearSession, getStoredUser, getToken, saveSession} from "@/lib/storage";

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

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [state, setState] = useState({
    isLoading: true, isAuthenticated: false, token: null as string | null,
    user: null as User | null
  });

  const bootstrap = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setState({isLoading:false,isAuthenticated:false,token:null,user:null});
      return;
    }
    const stored = await getStoredUser();
    try {
      const user = await auth.getMe();
      await saveSession(token, user);
      setState({isLoading:false,isAuthenticated:true,token,user});
    } catch {
      setState({isLoading:false,isAuthenticated:true,token,user:stored});
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const signIn = useCallback(async (payload: LoginRequest) => {
    const result = await auth.login(payload);
    if (!result.access_token) throw new Error("Login response did not contain access_token.");
    let user = result.user ?? null;
    if (!user) { try { user = await auth.getMe(); } catch {} }
    await saveSession(result.access_token, user);
    setState({isLoading:false,isAuthenticated:true,token:result.access_token,user});
  }, []);

  const signUp = useCallback(async (payload: RegisterRequest) => {
    const result = await auth.register(payload);
    if (!result.access_token) throw new Error("Registration response did not contain access_token.");
    let user = result.user ?? null;
    if (!user) { try { user = await auth.getMe(); } catch {} }
    await saveSession(result.access_token, user);
    setState({isLoading:false,isAuthenticated:true,token:result.access_token,user});
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setState({isLoading:false,isAuthenticated:false,token:null,user:null});
  }, []);

  const value = useMemo(() => ({...state,signIn,signUp,signOut}), [state,signIn,signUp,signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
