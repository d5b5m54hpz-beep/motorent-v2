"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
  Wrench,
  Truck,
  Package,
  BarChart3,
  TrendingUp,
  Calculator,
  Wallet,
  Sparkles,
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
  Moon,
  Sun,
  LogOut,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";

type CommandItem = {
  title: string;
  href?: string;
  icon: React.ElementType;
  keywords?: string;
  action?: () => void;
};

type CommandGroup = {
  heading: string;
  items: CommandItem[];
};

const navigationGroups: CommandGroup[] = [
  {
    heading: "General",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard, keywords: "inicio home" },
    ],
  },
  {
    heading: "Flota",
    items: [
      { title: "Motos", href: "/admin/motos", icon: Bike, keywords: "vehiculos flota" },
      { title: "Tarifas de Alquiler", href: "/admin/precios", icon: Tag, keywords: "precios tarifa" },
      { title: "Mantenimientos", href: "/admin/mantenimientos", icon: Wrench, keywords: "service taller" },
      { title: "Talleres", href: "/admin/talleres", icon: Factory, keywords: "mecanico reparacion" },
    ],
  },
  {
    heading: "Supply Chain",
    items: [
      { title: "Inventario (Repuestos)", href: "/admin/repuestos", icon: Package, keywords: "stock partes" },
      { title: "Proveedores", href: "/admin/proveedores", icon: Truck, keywords: "supplier compras" },
      { title: "Importaciones", href: "/admin/importaciones", icon: Ship, keywords: "embarques shipping" },
      { title: "Precios Repuestos", href: "/admin/pricing-repuestos", icon: Tag, keywords: "costeo margenes" },
    ],
  },
  {
    heading: "Comercial",
    items: [
      { title: "Clientes", href: "/admin/clientes", icon: Users, keywords: "cliente customer" },
      { title: "Contratos", href: "/admin/contratos", icon: FileText, keywords: "alquiler rental" },
      { title: "Pagos", href: "/admin/pagos", icon: CreditCard, keywords: "cobros payment" },
      { title: "Facturas", href: "/admin/facturas", icon: Receipt, keywords: "facturacion billing" },
      { title: "Notas de Crédito", href: "/admin/notas-credito", icon: FileCheck, keywords: "devolucion" },
    ],
  },
  {
    heading: "Finanzas",
    items: [
      { title: "Dashboard Financiero", href: "/admin/finanzas", icon: BarChart3, keywords: "resumen financiero" },
      { title: "Flujo de Caja", href: "/admin/finanzas/flujo-caja", icon: Banknote, keywords: "cashflow" },
      { title: "Gastos", href: "/admin/gastos", icon: Wallet, keywords: "egresos expenses" },
      { title: "Rentabilidad", href: "/admin/finanzas/rentabilidad", icon: TrendingUp, keywords: "margen profit" },
      { title: "Presupuestos", href: "/admin/presupuestos", icon: Calculator, keywords: "budget" },
    ],
  },
  {
    heading: "Contabilidad",
    items: [
      { title: "Estado de Resultados", href: "/admin/finanzas/estado-resultados", icon: FileSpreadsheet, keywords: "pyl ganancias perdidas" },
      { title: "Facturas Compra", href: "/admin/facturas-compra", icon: FileSpreadsheet, keywords: "comprobantes proveedor" },
      { title: "Plan de Cuentas", href: "/admin/cuentas-contables", icon: BookOpen, keywords: "cuentas contable" },
      { title: "Asientos Contables", href: "/admin/asientos-contables", icon: Calculator, keywords: "diario asiento" },
      { title: "Reportes Contables", href: "/admin/contabilidad/reportes", icon: BarChart3, keywords: "mayor balance" },
    ],
  },
  {
    heading: "RRHH",
    items: [
      { title: "Empleados", href: "/admin/rrhh/empleados", icon: UserCog, keywords: "personal staff" },
      { title: "Ausencias", href: "/admin/rrhh/ausencias", icon: Calendar, keywords: "licencia vacaciones" },
      { title: "Liquidación", href: "/admin/rrhh/liquidacion", icon: Banknote, keywords: "sueldo recibo" },
    ],
  },
  {
    heading: "Sistema",
    items: [
      { title: "Usuarios", href: "/admin/usuarios", icon: UserCog, keywords: "admin roles" },
      { title: "Alertas", href: "/admin/alertas", icon: Bell, keywords: "notificaciones" },
      { title: "Configuración Empresa", href: "/admin/configuracion/empresa", icon: Building2, keywords: "cuit datos" },
      { title: "Diagnóstico", href: "/admin/sistema/diagnostico", icon: Activity, keywords: "sistema health" },
      { title: "Asistente IA", href: "/admin/asistente", icon: Sparkles, keywords: "chat claude ai" },
      { title: "Documentación", href: "/docs", icon: BookOpen, keywords: "ayuda help docs" },
    ],
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar página, acción..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>

        {navigationGroups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.items.map((item) => (
              <CommandItem
                key={item.title}
                value={`${item.title} ${item.keywords || ""}`}
                onSelect={() => {
                  if (item.href) {
                    runCommand(() => router.push(item.href!));
                  } else if (item.action) {
                    runCommand(item.action);
                  }
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        <CommandSeparator />

        <CommandGroup heading="Acciones">
          <CommandItem
            value="cambiar tema oscuro claro dark light toggle"
            onSelect={() =>
              runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))
            }
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>Cambiar tema ({theme === "dark" ? "claro" : "oscuro"})</span>
          </CommandItem>
          <CommandItem
            value="mi perfil cuenta profile"
            onSelect={() => runCommand(() => router.push("/perfil"))}
          >
            <User className="mr-2 h-4 w-4" />
            <span>Mi Perfil</span>
          </CommandItem>
          <CommandItem
            value="cerrar sesion logout salir"
            onSelect={() =>
              runCommand(() => signOut({ callbackUrl: "/login-admin" }))
            }
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
