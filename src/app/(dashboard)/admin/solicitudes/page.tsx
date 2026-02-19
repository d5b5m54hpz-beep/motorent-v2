import { ClipboardList } from "lucide-react";

export default function SolicitudesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Alquiler</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Evaluación y aprobación de solicitudes de riders
        </p>
      </div>
      <div className="flex items-center justify-center rounded-lg border border-dashed p-24 text-center">
        <div className="space-y-3">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">Módulo en construcción</p>
          <p className="text-xs text-muted-foreground">
            Próximamente: cuestionario IA, scoring de riesgo, aprobación de solicitudes
          </p>
        </div>
      </div>
    </div>
  );
}
