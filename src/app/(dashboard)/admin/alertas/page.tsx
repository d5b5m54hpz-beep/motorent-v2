"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Clock,
  CreditCard,
  FileText,
  Check,
  Trash2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  DollarSign,
  Ship,
  ArrowRightLeft,
  Tag,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type Alerta = {
  id: string;
  tipo: string;
  mensaje: string;
  metadata: Record<string, any>;
  leida: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PricingAlerta = {
  tipo: string;
  severidad: "ALTA" | "MEDIA" | "BAJA";
  mensaje: string;
  repuestoId?: string;
  precioSugerido?: number;
};

const iconosAlerta: Record<string, React.ElementType> = {
  PAGO_VENCIDO: CreditCard,
  CONTRATO_POR_VENCER: Clock,
  LICENCIA_VENCIDA: FileText,
  GENERAL: AlertTriangle,
};

const coloresAlerta: Record<string, string> = {
  PAGO_VENCIDO: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200",
  CONTRATO_POR_VENCER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200",
  LICENCIA_VENCIDA: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 border-orange-200",
  GENERAL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200",
};

const nombresAlerta: Record<string, string> = {
  PAGO_VENCIDO: "Pago Vencido",
  CONTRATO_POR_VENCER: "Contrato por Vencer",
  LICENCIA_VENCIDA: "Licencia Vencida",
  GENERAL: "General",
};

const iconosPricing: Record<string, React.ElementType> = {
  MARGEN_CRITICO: TrendingDown,
  MARGEN_BAJO_MINIMO: TrendingDown,
  SIN_PRECIO: Tag,
  EMBARQUE_LLEGANDO: Ship,
  TIPO_CAMBIO: ArrowRightLeft,
};

const coloresSeveridad: Record<string, string> = {
  ALTA: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200",
  MEDIA: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200",
  BAJA: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200",
};

const nombresSeveridad: Record<string, string> = {
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
};

function AlertasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [pricingAlertas, setPricingAlertas] = useState<PricingAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  // Filtros
  const tipoActivo = searchParams.get("tipo") || "todos";

  const fetchAlertas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");

      if (tipoActivo !== "todos") {
        params.set("tipo", tipoActivo);
      }

      const res = await fetch(`/api/alertas?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Error al cargar alertas");
      }

      const data = await res.json();
      setAlertas(data.data || []);
    } catch (error) {
      console.error("Error fetching alertas:", error);
      toast.error("Error al cargar alertas");
    } finally {
      setLoading(false);
    }
  };

  const fetchPricingAlertas = async () => {
    setLoadingPricing(true);
    try {
      const res = await fetch("/api/pricing-repuestos/dashboard-margenes?periodo=30d");
      if (res.ok) {
        const data = await res.json();
        setPricingAlertas(data.alertas || []);
      }
    } catch (error) {
      console.error("Error fetching pricing alertas:", error);
    } finally {
      setLoadingPricing(false);
    }
  };

  useEffect(() => {
    if (tipoActivo !== "margenes") {
      fetchAlertas();
    }
  }, [tipoActivo]);

  useEffect(() => {
    fetchPricingAlertas();
  }, []);

  const handleTipoChange = (tipo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tipo === "todos") {
      params.delete("tipo");
    } else {
      params.set("tipo", tipo);
    }
    router.push(`/admin/alertas?${params.toString()}`);
  };

  const handleGenerarAlertas = async () => {
    setGenerando(true);
    try {
      toast.loading("Generando alertas...");

      const res = await fetch("/api/alertas/generar", {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al generar alertas");
      }

      const data = await res.json();
      toast.dismiss();
      toast.success(data.mensaje);

      // Recargar alertas
      fetchAlertas();
    } catch (error) {
      console.error("Error generando alertas:", error);
      toast.dismiss();
      const message = error instanceof Error ? error.message : "Error al generar alertas";
      toast.error(message);
    } finally {
      setGenerando(false);
    }
  };

  const handleMarcarComoLeida = async (id: string) => {
    try {
      const res = await fetch(`/api/alertas/${id}`, {
        method: "PUT",
      });

      if (!res.ok) {
        throw new Error("Error al marcar alerta como leída");
      }

      // Actualizar localmente
      setAlertas((prev) =>
        prev.map((a) => (a.id === id ? { ...a, leida: true } : a))
      );

      toast.success("Alerta marcada como leída");
    } catch (error) {
      console.error("Error marcando alerta:", error);
      toast.error("Error al marcar alerta como leída");
    }
  };

  const handleEliminar = async (id: string) => {
    try {
      const res = await fetch(`/api/alertas/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Error al eliminar alerta");
      }

      // Actualizar localmente
      setAlertas((prev) => prev.filter((a) => a.id !== id));

      toast.success("Alerta eliminada");
    } catch (error) {
      console.error("Error eliminando alerta:", error);
      toast.error("Error al eliminar alerta");
    }
  };

  const handleMarcarTodasComoLeidas = async () => {
    setMarcandoTodas(true);
    try {
      const alertasNoLeidas = alertas.filter((a) => !a.leida);

      if (alertasNoLeidas.length === 0) {
        toast.info("No hay alertas sin leer");
        return;
      }

      toast.loading(`Marcando ${alertasNoLeidas.length} alertas como leídas...`);

      // Marcar todas en paralelo
      await Promise.all(
        alertasNoLeidas.map((alerta) =>
          fetch(`/api/alertas/${alerta.id}`, { method: "PUT" })
        )
      );

      toast.dismiss();
      toast.success("Todas las alertas marcadas como leídas");

      // Recargar alertas
      fetchAlertas();
    } catch (error) {
      console.error("Error marcando todas las alertas:", error);
      toast.dismiss();
      toast.error("Error al marcar todas las alertas");
    } finally {
      setMarcandoTodas(false);
    }
  };

  const alertasNoLeidas = alertas.filter((a) => !a.leida).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertas</h1>
          <p className="text-sm text-muted-foreground">
            Notificaciones y alertas del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={tipoActivo === "margenes" ? fetchPricingAlertas : fetchAlertas}
            disabled={tipoActivo === "margenes" ? loadingPricing : loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${(tipoActivo === "margenes" ? loadingPricing : loading) ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          {tipoActivo !== "margenes" && (
            <>
              <Button
                variant="outline"
                onClick={handleMarcarTodasComoLeidas}
                disabled={marcandoTodas || alertasNoLeidas === 0}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Marcar Todas como Leídas
              </Button>
              <Button
                onClick={handleGenerarAlertas}
                disabled={generando}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {generando ? "Generando..." : "Generar Alertas"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filtros por Tipo */}
      <div className="flex items-center gap-4">
        <Tabs value={tipoActivo} onValueChange={handleTipoChange}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="PAGO_VENCIDO">Pagos Vencidos</TabsTrigger>
            <TabsTrigger value="CONTRATO_POR_VENCER">Contratos por Vencer</TabsTrigger>
            <TabsTrigger value="LICENCIA_VENCIDA">Licencias Vencidas</TabsTrigger>
            <TabsTrigger value="GENERAL">General</TabsTrigger>
            <TabsTrigger value="margenes" className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Márgenes
              {pricingAlertas.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-[16px] px-1 text-[9px]">
                  {pricingAlertas.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="ml-auto text-sm text-muted-foreground">
          {tipoActivo === "margenes" ? (
            <>
              {pricingAlertas.length} alerta{pricingAlertas.length !== 1 ? "s" : ""} de márgenes
            </>
          ) : (
            <>
              {alertas.length} alerta{alertas.length !== 1 ? "s" : ""}
              {alertasNoLeidas > 0 && (
                <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                  ({alertasNoLeidas} sin leer)
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-3">
        {tipoActivo === "margenes" ? (
          /* Alertas de Pricing/Márgenes */
          loadingPricing ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pricingAlertas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No hay alertas de márgenes</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Todos los márgenes de repuestos están dentro de los parámetros
                </p>
              </CardContent>
            </Card>
          ) : (
            pricingAlertas.map((alerta, index) => {
              const Icono = iconosPricing[alerta.tipo] || AlertTriangle;
              const colorClasses = coloresSeveridad[alerta.severidad] || coloresSeveridad.MEDIA;

              return (
                <Card
                  key={`pricing-${index}`}
                  className={alerta.severidad === "ALTA" ? "border-l-4 border-l-red-500" : ""}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className={`rounded-full p-2 ${colorClasses}`}>
                      <Icono className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={colorClasses}>
                          Severidad: {nombresSeveridad[alerta.severidad]}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {alerta.tipo.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{alerta.mensaje}</p>
                      {alerta.precioSugerido && (
                        <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                          Precio sugerido: ${alerta.precioSugerido.toLocaleString("es-AR")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )
        ) : (
          /* Alertas del Sistema (DB) */
          loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : alertas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No hay alertas</p>
              </CardContent>
            </Card>
          ) : (
            alertas.map((alerta) => {
              const Icono = iconosAlerta[alerta.tipo] || AlertTriangle;
              const colorClasses = coloresAlerta[alerta.tipo] || coloresAlerta.GENERAL;
              const isNoLeida = !alerta.leida;

              return (
                <Card
                  key={alerta.id}
                  className={isNoLeida ? "border-l-4 border-l-primary bg-primary/5" : ""}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className={`rounded-full p-2 ${colorClasses}`}>
                      <Icono className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={colorClasses}>
                              {nombresAlerta[alerta.tipo] || alerta.tipo.replace(/_/g, " ")}
                            </Badge>
                            {isNoLeida && (
                              <Badge variant="destructive" className="text-xs">
                                No leída
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">{alerta.mensaje}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(new Date(alerta.createdAt))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isNoLeida && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarcarComoLeida(alerta.id)}
                              title="Marcar como leída"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminar(alerta.id)}
                            title="Eliminar"
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )
        )}
      </div>
    </div>
  );
}

export default function AlertasPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <AlertasContent />
    </Suspense>
  );
}
