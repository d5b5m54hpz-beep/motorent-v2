"use client";

import { cn } from "@/lib/utils";

type Props = {
  cuotasPagadas: number;
  cuotasTotales: number;
  modeloMoto?: string;
  patente?: string;
  className?: string;
};

function getTranchMsg(pct: number): string {
  if (pct === 0) return "¡Empezá tu camino hacia la propiedad!";
  if (pct < 25) return "¡Buen comienzo! Seguí así.";
  if (pct < 50) return "Un cuarto del camino. ¡Vas bien!";
  if (pct < 75) return "Ya estás a mitad del camino. ¡Genial!";
  if (pct < 90) return "¡Casi llegás! La moto es casi tuya.";
  if (pct < 100) return "¡Último tramo! La moto está a punto de ser tuya.";
  return "¡Felicitaciones! La moto ya es tuya.";
}

export function OwnershipProgressBar({ cuotasPagadas, cuotasTotales, modeloMoto, patente, className }: Props) {
  const pct = cuotasTotales > 0 ? Math.min(100, Math.round((cuotasPagadas / cuotasTotales) * 100)) : 0;
  const restantes = Math.max(0, cuotasTotales - cuotasPagadas);
  const completo = pct >= 100;

  return (
    <div className={cn("space-y-2", className)}>
      {(modeloMoto || patente) && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{modeloMoto ?? ""}</span>
          {patente && <span className="text-xs text-muted-foreground font-mono">{patente}</span>}
        </div>
      )}

      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            completo
              ? "bg-gradient-to-r from-cyan-400 to-teal-400"
              : "bg-gradient-to-r from-cyan-500 to-teal-500",
          )}
          style={{ width: `${pct}%` }}
        />
        {!completo && pct > 5 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/40 animate-pulse"
            style={{ left: `${pct}%` }}
          />
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{getTranchMsg(pct)}</span>
        <span className="font-mono font-medium text-foreground">
          {cuotasPagadas}/{cuotasTotales} cuotas{restantes > 0 ? ` · ${restantes} restantes` : ""}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-semibold",
            completo ? "text-teal-500" : pct > 50 ? "text-cyan-500" : "text-muted-foreground",
          )}
        >
          {pct}% completado
        </span>
        {completo && (
          <span className="text-xs font-medium text-teal-500">¡Moto transferida!</span>
        )}
      </div>
    </div>
  );
}
