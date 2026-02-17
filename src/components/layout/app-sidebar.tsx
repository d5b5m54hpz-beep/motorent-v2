"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bike,
  FileText,
  CreditCard,
  Receipt,
  Users,
  UserCog,
  Bell,
  DollarSign,
  ChevronLeft,
  X,
  Wrench,
  Truck,
  Package,
  BarChart3,
  TrendingUp,
  Calculator,
  Wallet,
  Sparkles,
  Briefcase,
  Factory,
  Building2,
  Settings,
  FileSpreadsheet,
  Ship,
  BookOpen,
  Tag,
  Calendar,
  Banknote,
  Activity,
  FileCheck,
  User,
  Camera,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  Check,
  Copy,
  LogOut,
  Loader2,
  Phone,
  Mail,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useEffect, useState, useRef } from "react";
import { CollapsibleNavSection } from "./collapsible-nav-section";
import { signOut, useSession } from "next-auth/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  badgeText?: string;
};

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

type Props = {
  user: { name: string; email: string; image?: string | null };
};

export function AppSidebar({ user }: Props) {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebar();
  const { update: updateSession } = useSession();
  const [alertasCount, setAlertasCount] = useState(0);

  // Profile Sheet state
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Dashboard (direct link, no submenu)
  const dashboardItem: NavItem = {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  };

  // Categories with subitems
  const flota: NavItem[] = [
    { title: "Motos", href: "/admin/motos", icon: Bike },
    { title: "Tarifas de Alquiler", href: "/admin/precios", icon: Tag },
    { title: "Mantenimientos", href: "/admin/mantenimientos", icon: Wrench },
    { title: "Talleres", href: "/admin/talleres", icon: Factory },
  ];

  const supplyChain: NavItem[] = [
    { title: "Inventario", href: "/admin/repuestos", icon: Package },
    { title: "Proveedores", href: "/admin/proveedores", icon: Truck },
    { title: "Importaciones", href: "/admin/importaciones", icon: Ship },
    { title: "Costeo", href: "/admin/pricing-repuestos?tab=costeo", icon: Calculator },
    { title: "Precios Repuestos", href: "/admin/pricing-repuestos?tab=precios", icon: Tag },
  ];

  const comercial: NavItem[] = [
    { title: "Clientes", href: "/admin/clientes", icon: Users },
    { title: "Contratos", href: "/admin/contratos", icon: FileText },
    { title: "Pagos", href: "/admin/pagos", icon: CreditCard },
    { title: "Facturas", href: "/admin/facturas", icon: Receipt },
    { title: "Notas de Crédito", href: "/admin/notas-credito", icon: FileCheck },
  ];

  const finanzas: NavItem[] = [
    { title: "Dashboard Financiero", href: "/admin/finanzas", icon: BarChart3 },
    { title: "Flujo de Caja", href: "/admin/finanzas/flujo-caja", icon: Banknote },
    { title: "Gastos", href: "/admin/gastos", icon: Wallet },
    { title: "Rentabilidad", href: "/admin/finanzas/rentabilidad", icon: TrendingUp },
    { title: "Presupuestos", href: "/admin/presupuestos", icon: Calculator },
  ];

  const contabilidad: NavItem[] = [
    { title: "Estado de Resultados", href: "/admin/finanzas/estado-resultados", icon: FileSpreadsheet },
    { title: "Facturas Compra", href: "/admin/facturas-compra", icon: FileSpreadsheet },
    { title: "Plan de Cuentas", href: "/admin/cuentas-contables", icon: BookOpen },
    { title: "Asientos Contables", href: "/admin/asientos-contables", icon: Calculator },
    { title: "Reportes", href: "/admin/contabilidad/reportes", icon: BarChart3 },
  ];

  const rrhh: NavItem[] = [
    { title: "Empleados", href: "/admin/rrhh/empleados", icon: UserCog },
    { title: "Ausencias", href: "/admin/rrhh/ausencias", icon: Calendar },
    { title: "Liquidación", href: "/admin/rrhh/liquidacion", icon: Banknote },
  ];

  const sistema: NavItem[] = [
    { title: "Usuarios", href: "/admin/usuarios", icon: UserCog },
    { title: "Alertas", href: "/admin/alertas", icon: Bell, badge: alertasCount },
    { title: "Configuración Empresa", href: "/admin/configuracion/empresa", icon: Building2 },
    { title: "Diagnóstico", href: "/admin/sistema/diagnostico", icon: Activity },
    { title: "Asistente IA", href: "/admin/asistente", icon: Sparkles, badgeText: "IA" },
  ];

  // Fetch profile when sheet opens
  const fetchProfile = async () => {
    setProfileLoading(true);
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
      setProfileLoading(false);
    }
  };

  const handleOpenProfile = () => {
    setProfileOpen(true);
    fetchProfile();
  };

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
      await updateSession({ name: nombre });
      toast.success("Perfil actualizado");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("Las contraseñas no coinciden"); return; }
    if (newPassword.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/usuarios/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change-password", currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error");
      }
      toast.success("Contraseña actualizada");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setShowPasswordSection(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setSavingPassword(false);
    }
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB"); return; }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
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
      await updateSession({ image: url });
      toast.success("Imagen actualizada");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setUploadingImage(false);
    }
  };

  // Setup 2FA
  const handleSetup2FA = async () => {
    try {
      const res = await fetch("/api/usuarios/perfil/2fa", { method: "POST" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Error"); }
      const data = await res.json();
      setQrCode(data.qrCode);
      setTotpSecret(data.secret);
      setShow2FADialog(true);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  // Verify and enable 2FA
  const handleVerify2FA = async () => {
    if (verifyCode.length !== 6) { toast.error("Ingresá el código de 6 dígitos"); return; }
    setVerifying2FA(true);
    try {
      const res = await fetch("/api/usuarios/perfil/2fa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Error"); }
      setProfile((prev) => prev ? { ...prev, totpEnabled: true } : prev);
      setShow2FADialog(false);
      setVerifyCode("");
      toast.success("2FA activado correctamente");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Código inválido");
    } finally {
      setVerifying2FA(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) { toast.error("Ingresá el código de 6 dígitos"); return; }
    setDisabling2FA(true);
    try {
      const res = await fetch("/api/usuarios/perfil/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Error"); }
      setProfile((prev) => prev ? { ...prev, totpEnabled: false } : prev);
      setShowDisable2FA(false);
      setDisableCode("");
      toast.success("2FA desactivado");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setDisabling2FA(false);
    }
  };

  const initials = (profile?.name || user.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasPassword = profile?.provider === "credentials";

  // Fetch alertas count
  useEffect(() => {
    const fetchAlertasCount = async () => {
      try {
        const res = await fetch("/api/alertas?leida=false&limit=1");
        if (res.ok) {
          const data = await res.json();
          setAlertasCount(data.total || 0);
        }
      } catch (error) {
        console.error("Error fetching alertas count:", error);
      }
    };

    fetchAlertasCount();

    // Refresh every 60 seconds
    const interval = setInterval(fetchAlertasCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile on route change
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  const isDashboardActive = pathname === dashboardItem.href;

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo header */}
        <div className="flex h-14 shrink-0 items-center border-b px-4">
          {!isCollapsed && (
            <Link href="/admin" className="flex items-center transition-opacity hover:opacity-80">
              <Image
                src="/logo.png"
                alt="motolibre"
                width={130}
                height={38}
                className="h-8 w-auto"
                priority
              />
            </Link>
          )}
          {isCollapsed && (
            <Link href="/admin" className="mx-auto transition-opacity hover:opacity-80">
              <Image
                src="/logo-color.png"
                alt="motolibre"
                width={40}
                height={40}
                className="h-10 w-10"
                priority
              />
            </Link>
          )}

          {/* Close button mobile */}
          <button
            onClick={closeMobile}
            className="ml-auto rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Collapse button desktop */}
          <button
            onClick={toggleCollapse}
            className="ml-auto hidden rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent lg:block"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                isCollapsed && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-2">
          {/* Dashboard - direct link */}
          <Link
            href={dashboardItem.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isDashboardActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? dashboardItem.title : undefined}
          >
            {isDashboardActive && (
              <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
            )}

            <dashboardItem.icon
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                !isDashboardActive && "group-hover:scale-110"
              )}
            />

            {!isCollapsed && (
              <span className="flex-1 tracking-tight">{dashboardItem.title}</span>
            )}
          </Link>

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* Flota */}
          <CollapsibleNavSection
            title="Flota"
            icon={Factory}
            items={flota}
            isCollapsed={isCollapsed}
            storageKey="sidebar-flota-open"
          />

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* Supply Chain */}
          <CollapsibleNavSection
            title="Supply Chain"
            icon={Package}
            items={supplyChain}
            isCollapsed={isCollapsed}
            storageKey="sidebar-supply-chain-open"
          />

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* Comercial */}
          <CollapsibleNavSection
            title="Comercial"
            icon={Briefcase}
            items={comercial}
            isCollapsed={isCollapsed}
            storageKey="sidebar-comercial-open"
          />

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* Finanzas */}
          <CollapsibleNavSection
            title="Finanzas"
            icon={DollarSign}
            items={finanzas}
            isCollapsed={isCollapsed}
            storageKey="sidebar-finanzas-open"
          />

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* Contabilidad */}
          <CollapsibleNavSection
            title="Contabilidad"
            icon={Building2}
            items={contabilidad}
            isCollapsed={isCollapsed}
            storageKey="sidebar-contabilidad-open"
          />

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* RRHH */}
          <CollapsibleNavSection
            title="RRHH"
            icon={Users}
            items={rrhh}
            isCollapsed={isCollapsed}
            storageKey="sidebar-rrhh-open"
          />

          {/* Separator */}
          <div className={cn("my-2 border-t border-sidebar-border", isCollapsed ? "mx-1" : "mx-2")} />

          {/* Sistema */}
          <CollapsibleNavSection
            title="Sistema"
            icon={Settings}
            items={sistema}
            isCollapsed={isCollapsed}
            storageKey="sidebar-sistema-open"
          />
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t p-3">
          <button
            onClick={handleOpenProfile}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/50",
              isCollapsed && "justify-center"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground shadow-sm">
              {user.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden text-left">
                <p className="truncate text-sm font-medium tracking-tight text-sidebar-foreground">
                  {user.name}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {user.email}
                </p>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Profile Sheet */}
      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Mi Perfil</SheetTitle>
          </SheetHeader>

          {profileLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 py-2">
              {/* Avatar + Identity */}
              <div className="flex flex-col items-center">
                <div className="group relative mb-4">
                  <Avatar className="h-20 w-20 ring-2 ring-border ring-offset-2 ring-offset-background">
                    <AvatarImage src={profile?.image || undefined} alt={profile?.name || ""} />
                    <AvatarFallback className="text-xl font-light bg-muted text-muted-foreground">
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
                <h2 className="text-lg font-medium tracking-tight">{profile?.name}</h2>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <Badge variant="secondary" className="mt-2 font-normal">
                  {roleLabels[profile?.role || ""] || profile?.role}
                </Badge>
              </div>

              <Separator />

              {/* Personal Info */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Información personal</h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sidebar-nombre" className="text-xs text-muted-foreground">Nombre</Label>
                    <Input id="sidebar-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                      <Mail className="mr-2 h-3.5 w-3.5" />
                      {profile?.email}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sidebar-telefono" className="text-xs text-muted-foreground">Teléfono</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="sidebar-telefono"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="+54 11 1234-5678"
                        className="h-9 pl-9"
                      />
                    </div>
                  </div>

                  <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
                    {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-2 h-3.5 w-3.5" />}
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              </section>

              <Separator />

              {/* Security */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Seguridad</h3>
                </div>

                {/* Password */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Contraseña</p>
                    <p className="text-xs text-muted-foreground">
                      {hasPassword ? "Última actualización desconocida" : "Autenticación vía Google"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowPasswordSection(!showPasswordSection)}>
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
                          <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
                        <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Confirmar contraseña</Label>
                      <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-9" />
                    </div>
                    <Button onClick={handleChangePassword} disabled={savingPassword || !newPassword || !confirmPassword} size="sm" className="w-full">
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
                    <p className="text-xs text-muted-foreground">Google Authenticator</p>
                  </div>
                  {profile?.totpEnabled ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Activo
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => setShowDisable2FA(true)} className="text-destructive hover:text-destructive">
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

                {showDisable2FA && (
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">Ingresá el código de Google Authenticator para desactivar</p>
                    <div className="flex gap-2">
                      <Input
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        className="h-9 font-mono text-center tracking-[0.5em]"
                        maxLength={6}
                      />
                      <Button size="sm" variant="destructive" onClick={handleDisable2FA} disabled={disabling2FA || disableCode.length !== 6}>
                        {disabling2FA ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar"}
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              <Separator />

              {/* Session */}
              <Button
                variant="ghost"
                onClick={() => signOut({ callbackUrl: "/login-admin" })}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </Button>

              {/* Footer */}
              <p className="text-center text-xs text-muted-foreground/50">
                MotoLibre &middot; Miembro desde {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : ""}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar 2FA</DialogTitle>
            <DialogDescription>Escaneá el código QR con Google Authenticator</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {qrCode && (
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <img src={qrCode} alt="QR Code" className="h-48 w-48" />
              </div>
            )}
            {totpSecret && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">O ingresá este código manualmente:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded border bg-muted px-3 py-2 text-xs font-mono tracking-wider">
                    {totpSecret}
                  </code>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(totpSecret); toast.success("Copiado"); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Código de verificación</Label>
              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="h-10 text-center font-mono text-lg tracking-[0.5em]"
                maxLength={6}
              />
            </div>
            <Button onClick={handleVerify2FA} disabled={verifying2FA || verifyCode.length !== 6} className="w-full">
              {verifying2FA ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {verifying2FA ? "Verificando..." : "Activar 2FA"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
