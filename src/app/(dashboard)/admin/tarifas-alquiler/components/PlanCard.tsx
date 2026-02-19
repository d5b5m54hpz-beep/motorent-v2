"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Pencil, Star, Clock, Percent } from "lucide-react";

export type Plan = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  duracionMeses: number;
  esRentToOwn: boolean;
  descuentoPct: number | string;
  depositoMeses: number | string;
  destacado: boolean;
  activo: boolean;
  _count?: { preciosPorModelo: number; contratos: number };
};

type Props = {
  plan: Plan;
  onEdit: (plan: Plan) => void;
};

const PLAN_SUBTITLES: Record<string, string> = {
  FLEX_3M: "Flexible, mes a mes",
  SEMI_6M: "Compromiso semestral",
  ANUAL_12M: "El más popular",
  TUMOTO_24M: "Tu moto al final del contrato",
};

export function PlanCard({ plan, onEdit }: Props) {
  const isTuMoto = plan.esRentToOwn;
  const isDestacado = plan.destacado;
  const descPct = Number(plan.descuentoPct);

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        isTuMoto && "ring-2 ring-cyan-400/50 shadow-cyan-400/10 shadow-md",
      )}
    >
      {isDestacado && (
        <div className="absolute top-0 right-0">
          <Badge className="rounded-none rounded-bl-lg bg-yellow-500 text-yellow-950 text-xs px-2 py-1 flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-950" />
            Recomendado
          </Badge>
        </div>
      )}
      {isTuMoto && (
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-cyan-400 to-teal-500" />
      )}
      <CardHeader className="pb-2 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{plan.codigo}</p>
            <h3 className="font-semibold text-base leading-tight mt-0.5">{plan.nombre}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {PLAN_SUBTITLES[plan.codigo] ?? plan.descripcion ?? ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(plan)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-muted/50 px-3 py-2 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Duración</p>
              <p className="text-sm font-semibold">{plan.duracionMeses} meses</p>
            </div>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2 flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Descuento</p>
              <p className="text-sm font-semibold">{descPct > 0 ? `${descPct}%` : "—"}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{plan._count?.preciosPorModelo ?? 0} modelos configurados</span>
          {isTuMoto && (
            <Badge variant="outline" className="text-xs border-cyan-400/50 text-cyan-500">
              Rent-to-Own
            </Badge>
          )}
          {!plan.activo && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
