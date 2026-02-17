"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Shield,
  LogOut,
  Loader2,
  Camera,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  Check,
  Copy,
  ChevronLeft,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  image: string | null;
  provider: string;
  totpEnabled: boolean;
  createdAt: string;
};

function PerfilContent() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [saving, setSaving] = useState(false);

  // Password state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // 2FA state
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);

  // Image upload
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch profile data from API
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login-admin");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/usuarios/perfil");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setNombre(data.name || "");
          setTelefono(data.phone || "");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session, status, router]);

  // Save name/phone
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

      const updated = await res.json();
      setProfile((prev) => prev ? { ...prev, name: updated.name, phone: updated.phone } : prev);
      await update({ name: nombre });
      toast.success("Perfil actualizado");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Mínimo 6 caracteres");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/usuarios/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-password",
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error");
      }

      toast.success("Contraseña actualizada");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Máximo 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Error al subir imagen");

      const { url } = await uploadRes.json();

      const res = await fetch("/api/usuarios/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-image", imageUrl: url }),
      });

      if (!res.ok) throw new Error("Error al actualizar imagen");

      const updated = await res.json();
      setProfile((prev) => prev ? { ...prev, image: updated.image } : prev);
      await update({ image: url });
      toast.success("Imagen actualizada");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Setup 2FA
  const handleSetup2FA = async () => {
    try {
      const res = await fetch("/api/usuarios/perfil/2fa", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error");
      }
      const data = await res.json();
      setQrCode(data.qrCode);
      setTotpSecret(data.secret);
      setShow2FADialog(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    }
  };

  // Verify and enable 2FA
  const handleVerify2FA = async () => {
    if (verifyCode.length !== 6) {
      toast.error("Ingresá el código de 6 dígitos");
      return;
    }
    setVerifying2FA(true);
    try {
      const res = await fetch("/api/usuarios/perfil/2fa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error");
      }

      setProfile((prev) => prev ? { ...prev, totpEnabled: true } : prev);
      setShow2FADialog(false);
      setVerifyCode("");
      toast.success("2FA activado correctamente");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Código inválido";
      toast.error(message);
    } finally {
      setVerifying2FA(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) {
      toast.error("Ingresá el código de 6 dígitos");
      return;
    }
    setDisabling2FA(true);
    try {
      const res = await fetch("/api/usuarios/perfil/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error");
      }

      setProfile((prev) => prev ? { ...prev, totpEnabled: false } : prev);
      setShowDisable2FA(false);
      setDisableCode("");
      toast.success("2FA desactivado");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    } finally {
      setDisabling2FA(false);
    }
  };

  if (status === "loading" || loading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = (profile?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasPassword = profile?.provider === "credentials";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-12">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="mb-8 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </button>

        {/* Avatar + Identity */}
        <div className="mb-10 flex flex-col items-center">
          <div className="group relative mb-4">
            <Avatar className="h-24 w-24 ring-2 ring-border ring-offset-2 ring-offset-background">
              <AvatarImage src={profile?.image || undefined} alt={profile?.name || ""} />
              <AvatarFallback className="text-2xl font-light bg-muted text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
            >
              {uploadingImage ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <h1 className="text-xl font-medium tracking-tight">{profile?.name}</h1>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
          <Badge variant="secondary" className="mt-2 font-normal">
            {roleLabels[profile?.role || ""] || profile?.role}
          </Badge>
        </div>

        {/* Sections */}
        <div className="space-y-1">
          {/* Personal Info */}
          <section className="rounded-xl border bg-card p-6">
            <div className="mb-5 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Información personal</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-xs text-muted-foreground">
                  Nombre
                </Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-muted-foreground">
                  Email
                </Label>
                <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                  <Mail className="mr-2 h-3.5 w-3.5" />
                  {profile?.email}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefono" className="text-xs text-muted-foreground">
                  Teléfono
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="telefono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+54 11 1234-5678"
                    className="h-9 pl-9"
                  />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-2 h-3.5 w-3.5" />
                )}
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </section>

          {/* Security */}
          <section className="rounded-xl border bg-card p-6">
            <div className="mb-5 flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Seguridad</h2>
            </div>

            <div className="space-y-4">
              {/* Password */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Contraseña</p>
                  <p className="text-xs text-muted-foreground">
                    {hasPassword ? "Última actualización desconocida" : "Autenticación vía Google"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                >
                  <Key className="mr-1.5 h-3.5 w-3.5" />
                  {hasPassword ? "Cambiar" : "Crear"}
                </Button>
              </div>

              {showPasswordSection && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  {hasPassword && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Contraseña actual</Label>
                      <div className="relative">
                        <Input
                          type={showCurrentPw ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="h-9 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        type={showNewPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-9 pr-9"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Confirmar contraseña</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={savingPassword || !newPassword || !confirmPassword}
                    size="sm"
                    className="w-full"
                  >
                    {savingPassword ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    {savingPassword ? "Guardando..." : "Actualizar contraseña"}
                  </Button>
                </div>
              )}

              <Separator />

              {/* 2FA */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Verificación en dos pasos</p>
                  <p className="text-xs text-muted-foreground">
                    Google Authenticator
                  </p>
                </div>
                {profile?.totpEnabled ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Activo
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDisable2FA(true)}
                      className="text-destructive hover:text-destructive"
                    >
                      Desactivar
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleSetup2FA}>
                    <Smartphone className="mr-1.5 h-3.5 w-3.5" />
                    Activar
                  </Button>
                )}
              </div>

              {/* Disable 2FA inline */}
              {showDisable2FA && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    Ingresá el código de Google Authenticator para desactivar
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="h-9 font-mono text-center tracking-[0.5em]"
                      maxLength={6}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDisable2FA}
                      disabled={disabling2FA || disableCode.length !== 6}
                    >
                      {disabling2FA ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Session */}
          <section className="rounded-xl border bg-card p-6">
            <Button
              variant="ghost"
              onClick={() => signOut({ callbackUrl: "/login-admin" })}
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </section>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground/50">
          MotoLibre &middot; Miembro desde {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : ""}
        </p>
      </div>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar 2FA</DialogTitle>
            <DialogDescription>
              Escaneá el código QR con Google Authenticator
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* QR Code */}
            {qrCode && (
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <img src={qrCode} alt="QR Code" className="h-48 w-48" />
              </div>
            )}

            {/* Manual secret */}
            {totpSecret && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">O ingresá este código manualmente:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded border bg-muted px-3 py-2 text-xs font-mono tracking-wider">
                    {totpSecret}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(totpSecret);
                      toast.success("Copiado");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Verify */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Código de verificación
              </Label>
              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="h-10 text-center font-mono text-lg tracking-[0.5em]"
                maxLength={6}
              />
            </div>

            <Button
              onClick={handleVerify2FA}
              disabled={verifying2FA || verifyCode.length !== 6}
              className="w-full"
            >
              {verifying2FA ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {verifying2FA ? "Verificando..." : "Activar 2FA"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PerfilContent />
    </Suspense>
  );
}
