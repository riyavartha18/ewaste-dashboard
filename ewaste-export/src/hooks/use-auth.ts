"use client";

import { useEffect, useState, useCallback } from "react";
import type { Session } from "@/lib/types";

const TOKEN_STORAGE_KEY = "ewaste-auth-token";
const USER_STORAGE_KEY = "ewaste-auth-user";

// Read the JWT from localStorage (browser-only).
function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function readStoredUser(): Session["user"] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.email === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: Session["user"] | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

// Install a fetch monkey-patch that automatically adds the Authorization
// header from localStorage on every request. This ensures the JWT reaches
// the server even in sandboxed iframes where cookies are blocked.
let fetchPatched = false;
function installFetchInterceptor() {
  if (fetchPatched || typeof window === "undefined") return;
  fetchPatched = true;
  const originalFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const token = readStoredToken();
    if (token) {
      try {
        const headers = new Headers(init?.headers || {});
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        return originalFetch(input, { ...init, headers });
      } catch {
        // fall through
      }
    }
    return originalFetch(input, init);
  };
}

export interface AuthState {
  session: Session | null;
  loading: boolean;
  isOwner: boolean;
  hasOwner: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Session helper that talks to our custom /api/auth/session endpoint and
// /api/config for owner-existence state. Stores JWT in localStorage and
// monkey-patches fetch so the JWT is sent as Authorization header on
// every subsequent request — this works even in sandboxed iframes where
// cookies are blocked.
export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasOwner, setHasOwner] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // Optimistic: if we have a stored user, show them while we re-verify.
      const storedUser = readStoredUser();
      if (storedUser) {
        setSession({ user: storedUser });
      }

      const [sessRes, cfgRes] = await Promise.all([
        fetch("/api/auth/session", { cache: "no-store" }),
        fetch("/api/config", { cache: "no-store" }),
      ]);
      if (sessRes.ok) {
        const sess = await sessRes.json();
        if (sess?.user?.email) {
          const user = { id: sess.user.id ?? "", email: sess.user.email as string };
          setSession({ user });
          writeStoredUser(user);
        } else {
          setSession({ user: null });
          writeStoredUser(null);
          writeStoredToken(null);
        }
      } else {
        setSession({ user: null });
      }
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        setHasOwner(Boolean(cfg?.hasOwner));
      }
    } catch {
      // If the network failed but we have a stored user, keep them —
      // the UI will retry on the next interaction.
      if (!readStoredUser()) {
        setSession({ user: null });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    writeStoredToken(null);
    writeStoredUser(null);
    setSession({ user: null });
    await refresh();
  }, [refresh]);

  useEffect(() => {
    installFetchInterceptor();
    refresh();
  }, [refresh]);

  return {
    session,
    loading,
    isOwner: Boolean(session?.user?.email),
    hasOwner,
    refresh,
    signOut,
  };
}

// Called by the LoginView after a successful POST /api/auth/login. Stores
// the JWT in localStorage and updates the fetch interceptor so the very
// next request is authenticated.
export function persistAuthAfterLogin(token: string, user: { id: string; email: string }) {
  writeStoredToken(token);
  writeStoredUser(user);
  installFetchInterceptor();
}
