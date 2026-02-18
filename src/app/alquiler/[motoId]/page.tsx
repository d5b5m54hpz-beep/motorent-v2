"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PublicHeader } from "@/components/layout/public-header";
import { Stepper } from "@/components/rental/stepper";
import { RentalSummary } from "@/components/rental/rental-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calcularPreciosContrato } from "@/lib/contratos";
import { Calendar as CalendarIcon, Bike, ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AlquilerPage({ params }: { params: Promise<{ motoId: string }> }) {
  const { motoId } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();

  const [currentStep, setCurrentStep] = useState(1);
  const [moto, setMoto] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [pricingPreview, setPricingPreview] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [duracion, setDuracion] = useState(1);
  const [frecuencia, setFrecuencia] = useState<"semanal" | "quincenal" | "mensual">("mensual");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Cliente data (if incomplete)
  const [clienteData, setClienteData] = useState({
    dni: "",
    licencia: "",
    direccion: "",
    ciudad: "",
    provincia: "",
    telefono: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push(`/login?redirect=/alquiler/${motoId}`);
      return;
    }

    async function fetchData() {
      try {
        const [motoRes, pricingRes, perfilRes] = await Promise.all([
          fetch(`/api/public/motos/${motoId}`),
          fetch(`/api/public/pricing`),
          fetch(`/api/mi-cuenta/perfil`),
        ]);

        if (!motoRes.ok) {
          toast.error("Moto no encontrada");
          router.push("/catalogo");
          return;
        }

        const [motoData, pricingData, perfilData] = await Promise.all([
          motoRes.json(),
          pricingRes.json(),
          perfilRes.json(),
        ]);

        setMoto(motoData);
        setPricing(pricingData);
        setCliente(perfilData);

        // Pre-fill cliente data if exists
        if (perfilData) {
          setClienteData({
            dni: perfilData.dni || "",
            licencia: perfilData.licencia || "",
            direccion: perfilData.direccion || "",
            ciudad: perfilData.ciudad || "",
            provincia: perfilData.provincia || "",
            telefono: perfilData.telefono || "",
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error al cargar datos");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [motoId, session, status, router]);

  useEffect(() => {
    // Calculate pricing preview when plan changes
    if (fechaInicio && duracion && pricing && moto) {
      const fechaFin = new Date(fechaInicio);
      fechaFin.setMonth(fechaFin.getMonth() + duracion);

      const calculated = calcularPreciosContrato(
        moto.precioMensual,
        fechaInicio,
        fechaFin,
        frecuencia,
        pricing
      );

      setPricingPreview(calculated);
    }
  }, [fechaInicio, duracion, frecuencia, pricing, moto]);

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!fechaInicio) {
        toast.error("Seleccioná una fecha de inicio");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Check if cliente data is complete
      const isComplete = clienteData.dni && clienteData.licencia && clienteData.direccion;
      if (!isComplete) {
        toast.error("Completá todos los campos requeridos");
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    if (!termsAccepted) {
      toast.error("Debés aceptar los términos y condiciones");
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Update cliente profile if needed
      const profileNeedsUpdate = !cliente.dni || !cliente.licencia || !cliente.direccion;
      if (profileNeedsUpdate) {
        const profileRes = await fetch("/api/mi-cuenta/perfil", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clienteData),
        });

        if (!profileRes.ok) {
          throw new Error("Error al actualizar perfil");
        }
      }

      // Step 2: Create contract
      const contratoRes = await fetch("/api/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motoId,
          fechaInicio: fechaInicio?.toISOString(),
          fechaFin: new Date(fechaInicio!.setMonth(fechaInicio!.getMonth() + duracion)).toISOString(),
          frecuenciaPago: frecuencia,
          deposito: 0,
          renovacionAuto: false,
        }),
      });

      if (!contratoRes.ok) {
        const error = await contratoRes.json();
        throw new Error(error.error || "Error al crear contrato");
      }

      const contrato = await contratoRes.json();
      toast.success("¡Contrato creado exitosamente!");
      router.push(`/alquiler/exito?contratoId=${contrato.id}`);
    } catch (error: unknown) {
      console.error("Error creating contract:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear contrato");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader />
        <main className="flex-1">
          <div className="container max-w-3xl py-8">
            <p className="text-center">Cargando...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!moto || !pricing) return null;

  const steps = ["Confirmar Moto", "Configurar Plan", "Tus Datos", "Confirmar"];

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1">
      <div className="container max-w-4xl px-4 py-8">
        <Stepper currentStep={currentStep} steps={steps} />

        {/* Step 1: Confirm Bike */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bike className="h-5 w-5" />
                Moto Seleccionada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                {moto.imagen && (
                  <img
                    src={moto.imagen}
                    alt={`${moto.marca} ${moto.modelo}`}
                    className="h-32 w-32 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">
                    {moto.marca} {moto.modelo}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Año {moto.anio}</p>
                  {moto.tipo && (
                    <Badge variant="outline" className="mt-2">
                      {moto.tipo}
                    </Badge>
                  )}
                  <p className="mt-3 text-lg font-bold text-primary">
                    {formatCurrency(moto.precioMensual)}/mes
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleNext} size="lg">
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configure Plan */}
        {currentStep === 2 && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Configurar Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fecha Inicio */}
                <div className="space-y-2">
                  <Label>Fecha de Inicio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fechaInicio && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaInicio ? formatDate(fechaInicio) : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={fechaInicio} onSelect={setFechaInicio} disabled={(date) => date < new Date()} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Duración */}
                <div className="space-y-2">
                  <Label>Duración (meses)</Label>
                  <Select value={duracion.toString()} onValueChange={(v) => setDuracion(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {m} {m === 1 ? "mes" : "meses"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Frecuencia */}
                <div className="space-y-2">
                  <Label>Frecuencia de Pago</Label>
                  <Select value={frecuencia} onValueChange={(v: any) => setFrecuencia(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            {fechaInicio && pricingPreview && (
              <RentalSummary moto={moto} plan={{ fechaInicio, duracion, frecuencia }} pricing={pricingPreview} />
            )}
          </div>
        )}

        {/* Step 3: Personal Data */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Tus Datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI *</Label>
                  <Input id="dni" value={clienteData.dni} onChange={(e) => setClienteData({ ...clienteData, dni: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licencia">Licencia *</Label>
                  <Input id="licencia" value={clienteData.licencia} onChange={(e) => setClienteData({ ...clienteData, licencia: e.target.value })} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="direccion">Dirección *</Label>
                  <Input id="direccion" value={clienteData.direccion} onChange={(e) => setClienteData({ ...clienteData, direccion: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input id="ciudad" value={clienteData.ciudad} onChange={(e) => setClienteData({ ...clienteData, ciudad: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provincia">Provincia</Label>
                  <Input id="provincia" value={clienteData.provincia} onChange={(e) => setClienteData({ ...clienteData, provincia: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" value={clienteData.telefono} onChange={(e) => setClienteData({ ...clienteData, telefono: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Summary & Confirm */}
        {currentStep === 4 && fechaInicio && pricingPreview && (
          <div className="space-y-6">
            <RentalSummary moto={moto} plan={{ fechaInicio, duracion, frecuencia }} pricing={pricingPreview} showPaymentSchedule />

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} className="mt-1" />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    Acepto los términos y condiciones. Entiendo que mi solicitud será revisada y recibiré confirmación por email.
                  </Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleBack} disabled={submitting}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                  </Button>
                  <Button onClick={handleSubmit} className="flex-1" disabled={submitting || !termsAccepted}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Confirmar Alquiler
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
