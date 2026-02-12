"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Copy,
  Download,
  Loader2,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DiagnosticoResultado, DiagnosticoRun, DiagnosticoCheck } from "./types";

export default function DiagnosticoPage() {
  const [ejecutando, setEjecutando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mensajeActual, setMensajeActual] = useState("");
  const [resultado, setResultado] = useState<DiagnosticoResultado | null>(null);
  const [historial, setHistorial] = useState<DiagnosticoRun[]>([]);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      const res = await fetch("/api/sistema/diagnostico");
      if (res.ok) {
        const data = await res.json();
        setHistorial(data.data || []);
      }
    } catch (err) {
      console.error("Error cargando historial:", err);
    }
  };

  const ejecutarDiagnostico = async () => {
    setEjecutando(true);
    setProgreso(0);
    setMensajeActual("Iniciando diagnóstico...");
    setResultado(null);

    try {
      const res = await fetch("/api/sistema/diagnostico/run", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Error ejecutando diagnóstico");
      }

      const data = await res.json();

      // Simular progreso (el backend ejecuta todo de una vez)
      for (let i = 0; i <= 100; i += 5) {
        setProgreso(i);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      setResultado(data.data);
      setProgreso(100);
      setMensajeActual("Diagnóstico completo");

      toast.success("Diagnóstico completado");
      cargarHistorial();
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error ejecutando diagnóstico");
    } finally {
      setEjecutando(false);
    }
  };

  const copiarReporte = () => {
    if (!resultado) return;

    const nota = calcularNota(resultado.passed, resultado.warnings, resultado.errors);
    const fecha = new Date().toLocaleString("es-AR");
    const total = resultado.totalChecks;
    const porcentaje = Math.round((resultado.passed / total) * 100);

    let reporte = `═══════════════════════════════════════════════════════════════════
REPORTE DE DIAGNÓSTICO MOTOLIBRE - ${fecha}
Nota: ${nota} (${porcentaje}% OK)
═══════════════════════════════════════════════════════════════════

RESUMEN:
- Total de verificaciones: ${total}
- ✅ Pasaron: ${resultado.passed}
- ⚠️ Warnings: ${resultado.warnings}
- ❌ Errores: ${resultado.errors}

`;

    // ERRORES
    const checksConError = resultado.checks.filter((c) => c.status === "error");
    if (checksConError.length > 0) {
      reporte += `\nERRORES (requieren fix inmediato):\n`;
      checksConError.forEach((check, i) => {
        reporte += `${i + 1}. ❌ [${check.categoria}] ${check.nombre}\n`;
        reporte += `   ${check.mensaje}\n`;
        if (check.detalles && check.detalles.length > 0) {
          check.detalles.forEach((d) => {
            reporte += `   - ${d}\n`;
          });
        }
        if (check.ids && check.ids.length > 0) {
          reporte += `   IDs afectados: ${check.ids.slice(0, 5).join(", ")}${check.ids.length > 5 ? "..." : ""}\n`;
        }
        reporte += "\n";
      });
    }

    // WARNINGS
    const checksConWarning = resultado.checks.filter((c) => c.status === "warning");
    if (checksConWarning.length > 0) {
      reporte += `\nWARNINGS (revisar cuando sea posible):\n`;
      checksConWarning.forEach((check, i) => {
        reporte += `${i + 1}. ⚠️ [${check.categoria}] ${check.nombre}\n`;
        reporte += `   ${check.mensaje}\n`;
        if (check.ids && check.ids.length > 0) {
          reporte += `   IDs afectados: ${check.ids.slice(0, 5).join(", ")}${check.ids.length > 5 ? "..." : ""}\n`;
        }
        reporte += "\n";
      });
    }

    reporte += `\n═══════════════════════════════════════════════════════════════════\n`;

    navigator.clipboard.writeText(reporte);
    toast.success("Reporte copiado al portapapeles");
  };

  const descargarJSON = () => {
    if (!resultado) return;

    const json = JSON.stringify(resultado, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagnostico-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const calcularNota = (passed: number, warnings: number, errors: number): string => {
    const total = passed + warnings + errors;
    if (total === 0) return "N/A";

    const porcentaje = (passed / total) * 100;

    if (porcentaje >= 97) return "A+";
    if (porcentaje >= 93) return "A";
    if (porcentaje >= 90) return "A-";
    if (porcentaje >= 87) return "B+";
    if (porcentaje >= 83) return "B";
    if (porcentaje >= 80) return "B-";
    if (porcentaje >= 77) return "C+";
    if (porcentaje >= 73) return "C";
    if (porcentaje >= 70) return "C-";
    if (porcentaje >= 67) return "D+";
    if (porcentaje >= 60) return "D";
    return "F";
  };

  const getNotaColor = (nota: string): string => {
    if (nota.startsWith("A")) return "text-teal-600 dark:text-teal-400";
    if (nota.startsWith("B")) return "text-blue-600 dark:text-blue-400";
    if (nota.startsWith("C")) return "text-yellow-600 dark:text-yellow-400";
    if (nota.startsWith("D")) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const agruparPorCategoria = (checks: DiagnosticoCheck[]) => {
    const grupos: Record<string, DiagnosticoCheck[]> = {};
    checks.forEach((check) => {
      if (!grupos[check.categoria]) {
        grupos[check.categoria] = [];
      }
      grupos[check.categoria].push(check);
    });
    return grupos;
  };

  const contarEstados = (checks: DiagnosticoCheck[]) => {
    const passed = checks.filter((c) => c.status === "passed").length;
    const warnings = checks.filter((c) => c.status === "warning").length;
    const errors = checks.filter((c) => c.status === "error").length;
    return { passed, warnings, errors, total: checks.length };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8" />
            🔍 Diagnóstico del Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Verificación completa de APIs, páginas, integridad de datos y configuración
          </p>
        </div>
        <Button
          onClick={ejecutarDiagnostico}
          disabled={ejecutando}
          size="lg"
        >
          {ejecutando ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Ejecutando...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Ejecutar Diagnóstico
            </>
          )}
        </Button>
      </div>

      {/* Barra de progreso */}
      {ejecutando && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Progreso</p>
              <p className="text-sm text-muted-foreground">{progreso}%</p>
            </div>
            <Progress value={progreso} className="h-2" />
            <p className="text-sm text-muted-foreground">{mensajeActual}</p>
          </div>
        </Card>
      )}

      {/* Resultados */}
      {resultado && (
        <>
          {/* Cards resumen */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold">{resultado.totalChecks}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  Pasaron
                </p>
                <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                  {resultado.passed}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Warnings
                </p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {resultado.warnings}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Errores
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {resultado.errors}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Nota</p>
                <p className={cn("text-3xl font-bold", getNotaColor(calcularNota(resultado.passed, resultado.warnings, resultado.errors)))}>
                  {calcularNota(resultado.passed, resultado.warnings, resultado.errors)}
                </p>
              </div>
            </Card>
          </div>

          {/* Acciones */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={copiarReporte}>
              <Copy className="mr-2 h-4 w-4" />
              📋 Copiar Reporte
            </Button>
            <Button variant="outline" onClick={descargarJSON}>
              <Download className="mr-2 h-4 w-4" />
              📥 Descargar JSON
            </Button>
          </div>

          {/* Acordeones por categoría */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Detalles por Categoría</h2>
            <Accordion type="multiple" className="w-full">
              {Object.entries(agruparPorCategoria(resultado.checks)).map(([categoria, checks]) => {
                const estados = contarEstados(checks);
                return (
                  <AccordionItem key={categoria} value={categoria}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-medium">{getEmojiCategoria(categoria)} {categoria}</span>
                        <span className="text-sm text-muted-foreground">
                          {estados.passed}/{estados.total} OK
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {checks.map((check, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                            {check.status === "passed" && (
                              <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                            )}
                            {check.status === "warning" && (
                              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            )}
                            {check.status === "error" && (
                              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{check.nombre}</p>
                              {check.mensaje && (
                                <p className="text-xs text-muted-foreground">{check.mensaje}</p>
                              )}
                              {check.detalles && check.detalles.length > 0 && (
                                <ul className="mt-1 space-y-0.5">
                                  {check.detalles.map((d, j) => (
                                    <li key={j} className="text-xs text-muted-foreground ml-4">
                                      • {d}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {check.ids && check.ids.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  IDs: {check.ids.slice(0, 3).join(", ")}
                                  {check.ids.length > 3 && ` +${check.ids.length - 3} más`}
                                </p>
                              )}
                            </div>
                            {check.tiempo && (
                              <Badge variant="outline" className="text-xs">
                                {check.tiempo}ms
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </Card>
        </>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Últimos Diagnósticos</h2>
          <div className="space-y-2">
            {historial.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium">
                    {new Date(run.fecha).toLocaleString("es-AR")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ejecutado por {run.ejecutador.name}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Resultados</p>
                    <p className="text-sm">
                      <span className="text-teal-600">{run.passed}</span> /{" "}
                      <span className="text-yellow-600">{run.warnings}</span> /{" "}
                      <span className="text-red-600">{run.errors}</span>
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-bold",
                      getNotaColor(calcularNota(run.passed, run.warnings, run.errors))
                    )}
                  >
                    {calcularNota(run.passed, run.warnings, run.errors)}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{run.duracion}s</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function getEmojiCategoria(categoria: string): string {
  switch (categoria) {
    case "APIs":
      return "📡";
    case "Páginas":
      return "📄";
    case "Base de Datos":
      return "🗄️";
    case "CRUD":
      return "🔧";
    case "Configuración":
      return "🔐";
    case "AI Assistant":
      return "🤖";
    default:
      return "📋";
  }
}
