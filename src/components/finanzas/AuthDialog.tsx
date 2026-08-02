import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, User, Mail, Lock, KeyRound } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  type UserProfile,
  type UserRole,
  getPermsForRole,
  authCallback,
} from "@/lib/api/auth.functions";
import { supabase } from "@/lib/supabase";

export type Permissions = ReturnType<typeof getPermsForRole> & {
  role: UserRole;
  profile: UserProfile | null;
};

const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL);

const emptySession: Permissions = {
  ...getPermsForRole("unknown"),
  role: "unknown",
  profile: null,
};

export function useAuth() {
  const authCallbackFn = useServerFn(authCallback);
  const [session, setSession] = useState<Permissions>(emptySession);
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig || typeof window === "undefined") return;
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryOpen(true);

      if (s) {
        const res = await authCallbackFn({ data: { accessToken: s.access_token } });
        if (!mounted) return;
        if (res.ok && res.profile) {
          setSession({ ...res.perms, role: res.profile.role, profile: res.profile });
        } else {
          setSession(emptySession);
        }
      } else if (mounted) {
        setSession(emptySession);
      }
      if (mounted) setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        authCallbackFn({ data: { accessToken: data.session.access_token } }).then((res) => {
          if (!mounted) return;
          if (res.ok && res.profile) {
            setSession({ ...res.perms, role: res.profile.role, profile: res.profile });
          } else {
            setSession(emptySession);
          }
          setLoading(false);
        });
      } else if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [authCallbackFn]);

  const login = async (email: string, password: string) => {
    if (!hasSupabaseConfig) return true;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    return !error;
  };

  const signUp = async (email: string, password: string) => {
    if (!hasSupabaseConfig) return true;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Revisa tu correo para confirmar la cuenta");
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(emptySession);
  };

  const forgotPassword = async (email: string) => {
    if (!hasSupabaseConfig) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) toast.error(error.message);
    else toast.success("Te enviamos un enlace a tu correo para restablecer la clave");
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Contraseña actualizada correctamente");
    setRecoveryOpen(false);
    return true;
  };

  if (!hasSupabaseConfig) {
    // Acceso local sin Supabase configurado (fallback de desarrollo)
    const mock: Permissions = {
      ...getPermsForRole("super_admin"),
      role: "super_admin",
      profile: {
        id: "mock",
        email: "admin@na.com",
        full_name: "Admin Local",
        role: "super_admin",
      },
    };
    return {
      session: mock,
      loading: false,
      login,
      signUp,
      logout,
      forgotPassword,
      updatePassword,
      recoveryOpen,
      setRecoveryOpen,
    };
  }

  return {
    session,
    loading,
    login,
    signUp,
    logout,
    forgotPassword,
    updatePassword,
    recoveryOpen,
    setRecoveryOpen,
  };
}

export function AuthDialog({
  open,
  onOpenChange,
  onLogin,
  onSignUp,
  loading,
  onForgot,
  onUpdatePassword,
  recoveryOpen,
  onRecoveryOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onSignUp: (email: string, password: string) => Promise<boolean>;
  loading: boolean;
  onForgot: (email: string) => Promise<void>;
  onUpdatePassword: (password: string) => Promise<boolean>;
  recoveryOpen: boolean;
  onRecoveryOpenChange: (v: boolean) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "forgot") {
        if (!email.trim()) {
          toast.error("Escribe tu correo para enviar el enlace");
          return;
        }
        await onForgot(email);
      } else if (mode === "login") {
        const ok = await onLogin(email, password);
        if (ok) onOpenChange(false);
      } else {
        await onSignUp(email, password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setSubmitting(true);
    try {
      const ok = await onUpdatePassword(password);
      if (ok) onRecoveryOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (recoveryOpen) {
    return (
      <Dialog open onOpenChange={onRecoveryOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Nueva contraseña
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecoverySubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-1 mb-1">
                <Lock className="h-3.5 w-3.5" /> Contraseña nueva
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1 mb-1">
                <Lock className="h-3.5 w-3.5" /> Repite la contraseña
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" disabled={submitting || loading} className="w-full">
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Guardar contraseña"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />{" "}
            {mode === "forgot"
              ? "Restablecer contraseña"
              : mode === "login"
                ? "Iniciar sesión"
                : "Registrarse"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <Mail className="h-3.5 w-3.5" /> Correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              className="w-full rounded border bg-background px-3 py-2 text-sm"
            />
          </div>
          {mode !== "forgot" && (
            <div>
              <label className="text-sm font-medium flex items-center gap-1 mb-1">
                <Lock className="h-3.5 w-3.5" /> Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
          <Button type="submit" disabled={submitting || loading} className="w-full">
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : mode === "forgot" ? (
              "Enviar enlace"
            ) : mode === "login" ? (
              "Entrar"
            ) : (
              "Registrarse"
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground space-y-1">
            {mode === "login" ? (
              <>
                <span className="block">
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="underline hover:text-primary"
                  >
                    Registrarse
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="underline hover:text-primary"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </>
            ) : mode === "signup" ? (
              <span className="block">
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="underline hover:text-primary"
                >
                  Iniciar sesión
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="underline hover:text-primary"
              >
                Volver a iniciar sesión
              </button>
            )}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
