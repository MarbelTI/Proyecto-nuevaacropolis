import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, User, Mail, Lock } from "lucide-react";
import { type UserProfile, type UserRole, getPermsForRole } from "@/lib/api/auth.functions";

export type Permissions = ReturnType<typeof getPermsForRole> & {
  role: UserRole;
  profile: UserProfile | null;
};

export function useAuth() {
  const [session, setSession] = useState<Permissions>({
    canAccessExisting: true,
    canAccessAsistencias: true,
    canAccessDiagnostico: true,
    canEditAnyAula: true,
    readOnly: false,
    role: "super_admin",
    profile: { id: "mock", email: "admin@na.com", full_name: "Admin Local", role: "super_admin" },
  });
  const [loading, setLoading] = useState(false);

  const login = async () => true;
  const signUp = async () => true;
  const logout = async () => {};

  return { session, loading, login, signUp, logout };
}

export function AuthDialog({
  open,
  onOpenChange,
  onLogin,
  onSignUp,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onSignUp: (email: string, password: string) => Promise<boolean>;
  loading: boolean;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = mode === "login"
      ? await onLogin(email, password)
      : await onSignUp(email, password);
    setSubmitting(false);
    if (ok && mode === "login") onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />{" "}
            {mode === "login" ? "Iniciar sesión" : "Registrarse"}
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
          <Button type="submit" disabled={submitting || loading} className="w-full">
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : mode === "login" ? (
              "Entrar"
            ) : (
              "Registrarse"
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {mode === "login" ? (
              <>
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="underline hover:text-primary"
                >
                  Registrarse
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="underline hover:text-primary"
                >
                  Iniciar sesión
                </button>
              </>
            )}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
