"use client";

import { useState } from "react";
import { QrCode, ScanLine, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CheckinTab() {
  const [activeMode, setActiveMode] = useState<"checkin" | "checkout">("checkin");

  // Check-in state
  const [codigoQR, setCodigoQR] = useState("");
  const [kmActual, setKmActual] = useState("");
  const [observacionesRecepcion, setObservacionesRecepcion] = useState("");
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);

  // Check-out state
  const [ordenTrabajoId, setOrdenTrabajoId] = useState("");
  const [kmEgreso, setKmEgreso] = useState("");
  const [observacionesMecanico, setObservacionesMecanico] = useState("");
  const [costoRepuestos, setCostoRepuestos] = useState("");
  const [costoManoObra, setCostoManoObra] = useState("");
  const [costoOtros, setCostoOtros] = useState("");
  const [problemaDetectado, setProblemaDetectado] = useState(false);
  const [descripcionProblema, setDescripcionProblema] = useState("");
  const [requiereReparacion, setRequiereReparacion] = useState(false);
  const [costoACargoDel, setCostoACargoDel] = useState<"EMPRESA" | "RIDER">("EMPRESA");
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  const handleCheckin = async () => {
    if (!codigoQR || !kmActual) {
      toast.error("Código QR y kilometraje son obligatorios");
      return;
    }

    setIsSubmittingCheckin(true);
    try {
      const res = await fetch("/api/mantenimientos/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigoQR,
          kmActual: parseInt(kmActual),
          observacionesRecepcion: observacionesRecepcion || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error en check-in");

      toast.success(`Check-in completado - ${json.data.mensaje}`);

      // Reset form
      setCodigoQR("");
      setKmActual("");
      setObservacionesRecepcion("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al realizar check-in";
      toast.error(message);
    } finally {
      setIsSubmittingCheckin(false);
    }
  };

  const handleCheckout = async () => {
    if (!ordenTrabajoId || !kmEgreso) {
      toast.error("ID de Orden y kilometraje son obligatorios");
      return;
    }

    setIsSubmittingCheckout(true);
    try {
      const res = await fetch("/api/mantenimientos/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ordenTrabajoId,
          kmAlEgreso: parseInt(kmEgreso),
          observacionesMecanico: observacionesMecanico || undefined,
          costoRepuestos: costoRepuestos ? parseFloat(costoRepuestos) : 0,
          costoManoObra: costoManoObra ? parseFloat(costoManoObra) : 0,
          costoOtros: costoOtros ? parseFloat(costoOtros) : 0,
          problemaDetectado,
          descripcionProblema: descripcionProblema || undefined,
          requiereReparacion,
          costoACargoDel,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error en check-out");

      toast.success(`Check-out completado - Costo total: $${json.data.costoTotal.toLocaleString()}`);

      // Reset form
      setOrdenTrabajoId("");
      setKmEgreso("");
      setObservacionesMecanico("");
      setCostoRepuestos("");
      setCostoManoObra("");
      setCostoOtros("");
      setProblemaDetectado(false);
      setDescripcionProblema("");
      setRequiereReparacion(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al realizar check-out";
      toast.error(message);
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-in / Check-out</CardTitle>
        <CardDescription>
          Registra el ingreso o egreso de motos del taller
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as "checkin" | "checkout")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="checkin" className="flex items-center gap-2">
              <ScanLine className="h-4 w-4" />
              Check-in
            </TabsTrigger>
            <TabsTrigger value="checkout" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Check-out
            </TabsTrigger>
          </TabsList>

          {/* CHECK-IN */}
          <TabsContent value="checkin" className="space-y-4">
            <div className="rounded-lg border-2 border-dashed p-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <QrCode className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Escanear código QR</h3>
                  <p className="text-sm text-muted-foreground">
                    Escanea el QR de la cita o ingresa el código manualmente
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codigoQR">Código QR *</Label>
                  <Input
                    id="codigoQR"
                    placeholder="Ej: CITA-2026-00001"
                    value={codigoQR}
                    onChange={(e) => setCodigoQR(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kmActual">Kilometraje al ingreso *</Label>
                  <Input
                    id="kmActual"
                    type="number"
                    placeholder="Ej: 5420"
                    value={kmActual}
                    onChange={(e) => setKmActual(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="obsRecepcion">Observaciones de recepción</Label>
                  <Textarea
                    id="obsRecepcion"
                    placeholder="Rayones en tanque, espejo roto, etc."
                    value={observacionesRecepcion}
                    onChange={(e) => setObservacionesRecepcion(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleCheckin}
                  disabled={isSubmittingCheckin}
                  className="w-full"
                  size="lg"
                >
                  {isSubmittingCheckin ? "Procesando..." : "Realizar Check-in"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* CHECK-OUT */}
          <TabsContent value="checkout" className="space-y-4">
            <div className="rounded-lg border-2 border-dashed p-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900">
                  <CheckCircle2 className="h-10 w-10 text-teal-600 dark:text-teal-300" />
                </div>
                <div>
                  <h3 className="font-semibold">Finalizar Orden de Trabajo</h3>
                  <p className="text-sm text-muted-foreground">
                    Completa los datos de egreso y costos del mantenimiento
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ordenId">ID de Orden de Trabajo *</Label>
                  <Input
                    id="ordenId"
                    placeholder="ID de la OT"
                    value={ordenTrabajoId}
                    onChange={(e) => setOrdenTrabajoId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kmEgreso">Kilometraje al egreso *</Label>
                  <Input
                    id="kmEgreso"
                    type="number"
                    placeholder="Ej: 5450"
                    value={kmEgreso}
                    onChange={(e) => setKmEgreso(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="costoRep">Repuestos ($)</Label>
                    <Input
                      id="costoRep"
                      type="number"
                      placeholder="0"
                      value={costoRepuestos}
                      onChange={(e) => setCostoRepuestos(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costoMO">Mano obra ($)</Label>
                    <Input
                      id="costoMO"
                      type="number"
                      placeholder="0"
                      value={costoManoObra}
                      onChange={(e) => setCostoManoObra(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costoOt">Otros ($)</Label>
                    <Input
                      id="costoOt"
                      type="number"
                      placeholder="0"
                      value={costoOtros}
                      onChange={(e) => setCostoOtros(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="obsMec">Observaciones del mecánico</Label>
                  <Textarea
                    id="obsMec"
                    placeholder="Trabajos realizados, recomendaciones..."
                    value={observacionesMecanico}
                    onChange={(e) => setObservacionesMecanico(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="problema"
                    checked={problemaDetectado}
                    onChange={(e) => setProblemaDetectado(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="problema" className="cursor-pointer">
                    Se detectó un problema adicional
                  </Label>
                </div>

                {problemaDetectado && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="descProblema">Descripción del problema</Label>
                      <Textarea
                        id="descProblema"
                        value={descripcionProblema}
                        onChange={(e) => setDescripcionProblema(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="requiereRep"
                        checked={requiereReparacion}
                        onChange={(e) => setRequiereReparacion(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="requiereRep" className="cursor-pointer">
                        Requiere reparación adicional
                      </Label>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="costoCargo">Costo a cargo de</Label>
                  <Select value={costoACargoDel} onValueChange={(v) => setCostoACargoDel(v as "EMPRESA" | "RIDER")}>
                    <SelectTrigger id="costoCargo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPRESA">Empresa</SelectItem>
                      <SelectItem value="RIDER">Rider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={isSubmittingCheckout}
                  className="w-full"
                  size="lg"
                >
                  {isSubmittingCheckout ? "Procesando..." : "Realizar Check-out"}
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
