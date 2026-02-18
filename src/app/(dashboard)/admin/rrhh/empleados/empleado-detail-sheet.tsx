"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { EmpleadoListItem } from "./types";

type Props = {
  empleado: EmpleadoListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
};

const formatFecha = (fecha: Date | string | null | undefined) => {
  if (!fecha) return "—";
  return format(new Date(fecha), "dd/MM/yyyy", { locale: es });
};

const estadoVariant = (estado: string) => {
  switch (estado) {
    case "ACTIVO": return "default" as const;
    case "LICENCIA": return "secondary" as const;
    case "SUSPENDIDO": return "destructive" as const;
    default: return "outline" as const;
  }
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

export function EmpleadoDetailSheet({ empleado, open, onOpenChange }: Props) {
  if (!empleado) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            {empleado.apellido}, {empleado.nombre}
            <Badge variant={estadoVariant(empleado.estado)}>{empleado.estado}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Datos Personales */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Datos Personales</h3>
            <div className="rounded-lg border p-3 space-y-0.5">
              <DetailRow label="DNI" value={empleado.dni} />
              <DetailRow label="CUIL" value={empleado.cuil} />
              <DetailRow label="Fecha Nacimiento" value={formatFecha(empleado.fechaNacimiento)} />
              <DetailRow label="Sexo" value={empleado.sexo} />
              <DetailRow label="Estado Civil" value={empleado.estadoCivil} />
              <DetailRow label="Nacionalidad" value={empleado.nacionalidad} />
              <DetailRow label="Teléfono" value={empleado.telefono} />
              <DetailRow label="Email" value={empleado.email} />
            </div>
          </section>

          <Separator />

          {/* Dirección */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Dirección</h3>
            <div className="rounded-lg border p-3 space-y-0.5">
              <DetailRow label="Dirección" value={empleado.direccion} />
              <DetailRow label="Ciudad" value={empleado.ciudad} />
              <DetailRow label="Provincia" value={empleado.provincia} />
              <DetailRow label="Código Postal" value={empleado.codigoPostal} />
            </div>
          </section>

          <Separator />

          {/* Datos Laborales */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Datos Laborales</h3>
            <div className="rounded-lg border p-3 space-y-0.5">
              <DetailRow label="Cargo" value={empleado.cargo} />
              <DetailRow label="Departamento" value={empleado.departamento} />
              <DetailRow label="Tipo Contrato" value={empleado.tipoContrato?.replace(/_/g, " ")} />
              <DetailRow label="Jornada" value={empleado.jornadaLaboral} />
              <DetailRow label="Horas Semanales" value={empleado.horasSemanales} />
              <DetailRow label="Fecha Ingreso" value={formatFecha(empleado.fechaIngreso)} />
              <DetailRow label="Fecha Egreso" value={formatFecha(empleado.fechaEgreso)} />
            </div>
          </section>

          <Separator />

          {/* Datos Salariales */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Datos Salariales</h3>
            <div className="rounded-lg border p-3 space-y-0.5">
              <DetailRow label="Salario Básico" value={formatCurrency(Number(empleado.salarioBasico))} />
              <DetailRow label="Categoría CCT" value={empleado.categoriaCCT} />
              <DetailRow label="Obra Social" value={empleado.obraSocial} />
              <DetailRow label="Sindicato" value={empleado.sindicato} />
              <DetailRow label="CBU" value={empleado.cbu} />
              <DetailRow label="Banco" value={empleado.banco} />
            </div>
          </section>

          <Separator />

          {/* Contacto Emergencia */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Contacto de Emergencia</h3>
            <div className="rounded-lg border p-3 space-y-0.5">
              <DetailRow label="Contacto" value={empleado.contactoEmergencia} />
              <DetailRow label="Teléfono" value={empleado.telefonoEmergencia} />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
