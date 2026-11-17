import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiFetch,
  authRequest,
  getAuthToken,
  setAuthToken,
  setUnauthorizedHandler,
} from "@/lib/api";
import {
  clearSessionToken,
  loadSessionToken,
  saveSessionToken,
} from "@/lib/storage";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  image?: string | null;
};

type SessionResponse = {
  user?: AppUser;
  session?: { id: string; expiresAt?: string };
  data?: { user?: AppUser; session?: { id: string; expiresAt?: string } };
};

type SignInResponse = {
  token?: string;
  user?: AppUser;
  redirect?: boolean;
};

type SignUpResponse = {
  token?: string;
  user?: AppUser;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AppUser | null;
  roles: string[];
  isManager: boolean;
  locationFree: boolean;
  homePath: string;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    fullName: string;
    email: string;
    password: string;
    nik: string;
    phone: string;
    address: string;
  }) => Promise<{ onboardingError: string | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readUser(body: SessionResponse): AppUser | null {
  return body.user ?? body.data?.user ?? null;
}

function readToken(body: { token?: string }): string | null {
  return body.token ?? null;
}

function rolesFor(user: AppUser | null): string[] {
  return (user?.role ?? "user")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roles = useMemo(() => rolesFor(user), [user]);
  const isManager = roles.some((role) =>
    ["hod", "hrd", "admin"].includes(role),
  );
  const locationFree = roles.some((role) =>
    ["marketing", "hod"].includes(role),
  );
  const homePath = roles.some((role) => ["hrd", "admin"].includes(role))
    ? "/admin"
    : "/app";

  const clearAuth = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    setError(null);
    setStatus("unauthenticated");
    await clearSessionToken();
  }, []);

  const refreshSession = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      await clearAuth();
      return;
    }
    try {
      const body = await apiFetch<SessionResponse>("/api/auth/get-session");
      const nextUser = readUser(body);
      if (!nextUser) throw new Error("Sesi tidak ditemukan.");
      setUser(nextUser);
      setStatus("authenticated");
    } catch {
      await clearAuth();
    }
  }, [clearAuth]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await loadSessionToken();
      if (!token) {
        if (!cancelled) setStatus("unauthenticated");
        return;
      }

      setAuthToken(token);
      try {
        const body = await apiFetch<SessionResponse>("/api/auth/get-session", {
          token,
        });
        const nextUser = readUser(body);
        if (!nextUser) throw new Error("Sesi tidak ditemukan.");
        if (!cancelled) {
          setUser(nextUser);
          setStatus("authenticated");
        }
      } catch {
        setAuthToken(null);
        await clearSessionToken();
        if (!cancelled) setStatus("unauthenticated");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearAuth();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearAuth]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const { data, token } = await authRequest<SignInResponse>(
          "/api/auth/sign-in/email",
          { email: email.trim(), password },
        );
        const nextToken = token ?? readToken(data);
        if (!nextToken) throw new Error("Token sesi tidak diterima.");
        setAuthToken(nextToken);
        await saveSessionToken(nextToken);

        const session = await apiFetch<SessionResponse>(
          "/api/auth/get-session",
          { token: nextToken },
        );
        const nextUser = readUser(session) ?? data.user ?? null;
        if (!nextUser) throw new Error("Data pengguna tidak ditemukan.");
        setUser(nextUser);
        setStatus("authenticated");
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Email atau kata sandi salah.";
        setError(message);
        throw caught;
      }
    },
    [],
  );

  const signUp = useCallback(
    async (input: {
      fullName: string;
      email: string;
      password: string;
      nik: string;
      phone: string;
      address: string;
    }) => {
      setError(null);
      const { data, token } = await authRequest<SignUpResponse>(
        "/api/auth/sign-up/email",
        {
          email: input.email.trim(),
          password: input.password,
          name: input.fullName.trim(),
        },
      );
      const nextToken = token ?? readToken(data);
      if (!nextToken) throw new Error("Token sesi tidak diterima.");
      setAuthToken(nextToken);
      await saveSessionToken(nextToken);
      if (data.user) setUser(data.user);
      setStatus("authenticated");

      let onboardingError: string | null = null;
      try {
        await apiFetch("/api/onboarding", {
          method: "POST",
          body: {
            fullName: input.fullName.trim(),
            nik: input.nik.trim(),
            phone: input.phone.trim(),
            address: input.address.trim(),
          },
        });
      } catch (caught) {
        onboardingError =
          caught instanceof Error
            ? caught.message
            : "Data pribadi belum tersimpan.";
      }
      return { onboardingError };
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await authRequest("/api/auth/sign-out", {});
    } catch {
      /* local sign-out still wins */
    }
    await clearAuth();
  }, [clearAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      roles,
      isManager,
      locationFree,
      homePath,
      error,
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [
      status,
      user,
      roles,
      isManager,
      locationFree,
      homePath,
      error,
      signIn,
      signUp,
      signOut,
      refreshSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
