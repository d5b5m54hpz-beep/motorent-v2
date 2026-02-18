"use client";

import { useState, useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type EffectivePermission = {
  code: string;
  canView: boolean;
  canCreate: boolean;
  canExecute: boolean;
  canApprove: boolean;
  grantedBy: string[];
};

const DOMAIN_LABELS: Record<string, string> = {
  fleet: "Flota",
  rental: "Alquileres",
  payment: "Pagos",
  invoice: "Facturación",
  accounting: "Contabilidad",
  reconciliation: "Conciliación",
  maintenance: "Mantenimiento",
  inventory: "Inventario",
  import_shipment: "Importaciones",
  supplier: "Proveedores",
  expense: "Gastos",
  pricing: "Precios",
  mechanic: "Mecánicos",
  workshop: "Talleres",
  hr: "RRHH",
  finance: "Finanzas",
  credit_note: "Notas de Crédito",
  budget: "Presupuestos",
  user: "Usuarios",
  alert: "Alertas",
  dashboard: "Dashboard",
  system: "Sistema",
  monitor: "Monitor",
  anomaly: "Anomalías",
};

const PROFILE_COLORS: Record<string, string> = {
  "Administrador": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "Contador": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "Operador Flota": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Operador Comercial": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  "RRHH": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "Auditor": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  "Viewer": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const PERM_LABELS = [
  { key: "canView" as const, label: "Ver" },
  { key: "canCreate" as const, label: "Crear" },
  { key: "canExecute" as const, label: "Ejecutar" },
  { key: "canApprove" as const, label: "Aprobar" },
];

export function EffectivePermissions({ permissions }: { permissions: EffectivePermission[] }) {
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const filtered = search
      ? permissions.filter((p) => p.code.toLowerCase().includes(search.toLowerCase()))
      : permissions;

    const groups: Record<string, EffectivePermission[]> = {};
    for (const perm of filtered) {
      const family = perm.code.split(".")[0];
      if (!groups[family]) groups[family] = [];
      groups[family].push(perm);
    }
    return groups;
  }, [permissions, search]);

  const totalPerms = permissions.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalPerms} operaciones con permisos
        </p>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8"
          />
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <Accordion type="multiple" className="w-full">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([family, perms]) => (
              <AccordionItem key={family} value={family}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {DOMAIN_LABELS[family] || family}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {perms.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <div
                        key={perm.code}
                        className="flex items-start gap-3 py-1.5 px-2 rounded hover:bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono">{perm.code}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {PERM_LABELS.map(({ key, label }) =>
                              perm[key] ? (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-0.5 text-xs text-green-700 dark:text-green-400"
                                >
                                  <Check className="h-3 w-3" />
                                  {label}
                                </span>
                              ) : null
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {perm.grantedBy.map((name) => (
                            <Badge
                              key={name}
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                PROFILE_COLORS[name] || "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300"
                              )}
                            >
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
