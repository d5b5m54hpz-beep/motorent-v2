"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Shield,
  LogOut,
  Save,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  CLIENTE: "Cliente",
  CONTADOR: "Contador",
  RRHH_MANAGER: "RRHH Manager",
  COMERCIAL: "Comercial",
  VIEWER: "Visualizador",
};

function PerfilContent() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login-admin");
      return;
    }
    setNombre(session.user.name || "");
  }, [session, status, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/usuarios/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      // Refrescar sesión para actualizar el nombre en el header
      await update({ name: nombre });
      toast.success("Perfil actualizado correctamente");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const user = session.user;
  const initials = (user.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
            <p className="text-muted-foreground mt-1">Administrá tu información personal</p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Volver
          </Button>
        </div>

        {/* Avatar y datos básicos */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.image || undefined} alt={user.name || "Usuario"} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xl font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Badge className="mt-1" variant="outline">
                  <Shield className="h-3 w-3 mr-1" />
                  {roleLabels[user.role || ""] || user.role || "Sin rol"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulario de edición */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Los cambios se reflejarán en todo el sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                El email no puede modificarse
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Sesión</p>
              <Button
                variant="destructive"
                onClick={() => signOut({ callbackUrl: "/login-admin" })}
                className="w-full sm:w-auto"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PerfilContent />
    </Suspense>
  );
}
