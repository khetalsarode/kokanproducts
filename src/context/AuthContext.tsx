"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AuthCustomer = {
  id: string;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
};

type AuthContextValue = {
  ready: boolean;
  customer: AuthCustomer | null;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  register: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<string | null>;
  logout: () => Promise<void>;
  updateProfile: (input: { name: string; phone: string }) => Promise<string | null>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [customer, setCustomer] = useState<AuthCustomer | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setCustomer(null);
        return;
      }
      const data = (await res.json()) as { customer: AuthCustomer | null };
      setCustomer(data.customer);
    } catch {
      setCustomer(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return readError(res);
    const data = (await res.json()) as { customer: AuthCustomer };
    setCustomer(data.customer);
    return null;
  }, []);

  const register = useCallback(
    async (input: {
      name: string;
      email: string;
      phone: string;
      password: string;
    }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) return readError(res);
      const data = (await res.json()) as { customer: AuthCustomer };
      setCustomer(data.customer);
      return null;
    },
    [],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCustomer(null);
  }, []);

  const updateProfile = useCallback(
    async (input: { name: string; phone: string }) => {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) return readError(res);
      const data = (await res.json()) as { customer: AuthCustomer };
      setCustomer(data.customer);
      return null;
    },
    [],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) return readError(res);
      return null;
    },
    [],
  );

  const value = useMemo(
    () => ({
      ready,
      customer,
      refresh,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [
      ready,
      customer,
      refresh,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
