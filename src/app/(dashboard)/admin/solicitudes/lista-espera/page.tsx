import { Clock } from "lucide-react";

export default function ListaEsperaPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lista de Espera</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Solicitudes aprobadas esperando asignación de moto
        </p>
      </div>
      <div className="flex items-center justify-center rounded-lg border border-dashed p-24 text-center">
        <div className="space-y-3">
          <Clock className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">Módulo en construcción</p>
          <p className="text-xs text-muted-foreground">
            Próximamente: lista pública de riders aprobados esperando moto
          </p>
        </div>
      </div>
    </div>
  );
}
