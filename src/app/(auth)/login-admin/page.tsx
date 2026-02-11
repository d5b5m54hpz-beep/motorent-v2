"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

export default function LoginAdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("Enviando credenciales...");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setStatus(`signIn: ok=${res?.ok}, error=${res?.error}, status=${res?.status}`);

      if (res?.error) {
        setLoading(false);
        setError("Credenciales inválidas. Verificá email y contraseña.");
        return;
      }

      if (!res?.ok) {
        setLoading(false);
        setError(`Login falló (status ${res?.status})`);
        return;
      }

      // Verify session was actually created before redirecting
      setStatus("Verificando sesión...");
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      if (!session?.user?.role) {
        setLoading(false);
        setError("Sesión no válida. Cookie de sesión no se creó correctamente.");
        setStatus(`Session check: ${JSON.stringify(session)}`);
        return;
      }

      if (session.user.role !== "ADMIN" && session.user.role !== "OPERADOR") {
        setLoading(false);
        setError(`Sin permisos de admin (role: ${session.user.role})`);
        return;
      }

      setStatus("Sesión verificada. Redirigiendo...");
      window.location.href = "/admin";
    } catch (err: unknown) {
      setLoading(false);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Excepción: ${message}`);
    }
  }

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Brand */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#23e0ff] to-[#0891b2] items-center justify-center p-12">
        <div className="max-w-md text-center space-y-6">
          <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-full backdrop-blur-sm mb-4">
            <Shield className="h-16 w-16 text-white" />
          </div>
          <Image
            src="/logo-light.png"
            alt="motolibre"
            width={280}
            height={80}
            className="mx-auto"
            priority
          />
          <h2 className="text-2xl font-bold text-white">
            Panel de Administración
          </h2>
          <p className="text-white/90">
            Acceso exclusivo para administradores y operadores del sistema.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image
              src="/logo-color.png"
              alt="motolibre"
              width={200}
              height={60}
              className="h-14 w-auto"
              priority
            />
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-[#23e0ff]" />
              <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
            </div>
            <p className="text-muted-foreground">Acceso al panel de administración</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@motolibre.com.ar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            {status && (
              <p className="text-sm text-blue-600 dark:text-blue-400">{status}</p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full h-11 bg-[#23e0ff] text-white dark:text-black font-semibold hover:bg-[#1bc4e0]"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar al Panel"}
            </Button>
          </form>

          {/* Back to main login */}
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-[#23e0ff] hover:underline font-medium">
              ← Volver al login de clientes
            </Link>
          </p>

          {/* Dev Mode Credentials */}
          {isDev && (
            <div className="mt-6 p-3 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-xs text-muted-foreground text-center">
                <strong>Admin:</strong> admin@motorent.com / admin123
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
