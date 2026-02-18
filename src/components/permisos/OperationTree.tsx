"use client";

import { useState, useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type OperationItem = {
  id: string;
  code: string;
  family: string;
  entity: string;
  action: string;
  description: string;
  requiresApproval: boolean;
  isViewOnly: boolean;
};

type GrantState = {
  canView: boolean;
  canCreate: boolean;
  canExecute: boolean;
  canApprove: boolean;
};

type Props = {
  operations: OperationItem[];
  grants?: Map<string, GrantState>;
  onToggle?: (operationId: string, field: keyof GrantState, value: boolean) => void;
  onToggleDomain?: (family: string, field: keyof GrantState, value: boolean) => void;
  readOnly?: boolean;
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

const PERM_FIELDS: { key: keyof GrantState; label: string; short: string }[] = [
  { key: "canView", label: "Ver", short: "V" },
  { key: "canCreate", label: "Crear", short: "C" },
  { key: "canExecute", label: "Ejecutar", short: "E" },
  { key: "canApprove", label: "Aprobar", short: "A" },
];

export function OperationTree({ operations, grants, onToggle, onToggleDomain, readOnly = false }: Props) {
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const filtered = search
      ? operations.filter(
          (op) =>
            op.code.toLowerCase().includes(search.toLowerCase()) ||
            op.description.toLowerCase().includes(search.toLowerCase())
        )
      : operations;

    const groups: Record<string, OperationItem[]> = {};
    for (const op of filtered) {
      if (!groups[op.family]) groups[op.family] = [];
      groups[op.family].push(op);
    }
    return groups;
  }, [operations, search]);

  const isDomainAllChecked = (family: string, field: keyof GrantState): boolean => {
    if (!grants) return false;
    const ops = grouped[family] || [];
    return ops.length > 0 && ops.every((op) => grants.get(op.id)?.[field] === true);
  };

  const isDomainPartialChecked = (family: string, field: keyof GrantState): boolean => {
    if (!grants) return false;
    const ops = grouped[family] || [];
    const checked = ops.filter((op) => grants.get(op.id)?.[field] === true);
    return checked.length > 0 && checked.length < ops.length;
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar operación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[500px]">
        <Accordion type="multiple" className="w-full">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([family, ops]) => (
              <AccordionItem key={family} value={family}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {DOMAIN_LABELS[family] || family}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {ops.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Domain-level select all row */}
                  {!readOnly && (
                    <div className="flex items-center gap-4 py-2 px-2 mb-2 bg-muted/50 rounded-md">
                      <span className="text-sm font-medium text-muted-foreground flex-1">
                        Seleccionar todo
                      </span>
                      {PERM_FIELDS.map(({ key, short }) => (
                        <div key={key} className="flex flex-col items-center gap-1 w-12">
                          <span className="text-xs text-muted-foreground">{short}</span>
                          <Checkbox
                            checked={isDomainAllChecked(family, key)}
                            className={cn(isDomainPartialChecked(family, key) && "opacity-60")}
                            onCheckedChange={(checked) => {
                              onToggleDomain?.(family, key, !!checked);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Operation rows */}
                  <div className="space-y-1">
                    {ops.map((op) => {
                      const grant = grants?.get(op.id);
                      return (
                        <div
                          key={op.id}
                          className="flex items-center gap-4 py-1.5 px-2 rounded hover:bg-muted/30"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono truncate">{op.code}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {op.description}
                            </p>
                          </div>
                          {readOnly ? (
                            <div className="flex gap-2">
                              {PERM_FIELDS.map(({ key, label }) => {
                                const active = grant?.[key];
                                return active ? (
                                  <Badge key={key} variant="secondary" className="text-xs">
                                    {label}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            PERM_FIELDS.map(({ key }) => (
                              <div key={key} className="flex items-center justify-center w-12">
                                <Checkbox
                                  checked={grant?.[key] ?? false}
                                  onCheckedChange={(checked) => {
                                    onToggle?.(op.id, key, !!checked);
                                  }}
                                />
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
