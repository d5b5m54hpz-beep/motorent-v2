"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MargenBadge } from "./MargenBadge";
import { RentToOwnAnalysis } from "./RentToOwnAnalysis";

const ARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const simSchema = z.object({
  modeloMoto: z.string().min(1, "Ingresá el modelo"),
  costoLandedARS: z.coerce.number().min(0).optional(),
  margenObjetivoPct: z.coerce.number().min(0).max(100).optional(),
  planCodigo: z.string().min(1, "Seleccioná un plan"),
  frecuencia: z.enum(["mensual", "quincenal", "semanal"]),
  formaPago: z.enum(["transferencia", "mercadopago", "efectivo"]),
});

type SimForm = z.infer<typeof simSchema>;

type CalcResultPlan = {
  planId: string;
  planCodigo: string;
  planNombre: string;
  esRentToOwn: boolean;
  duracionMeses: number;
  costos: {
    amortizacionMensual: number;
    costoOperativoMensual: number;
    costoTotalMensual: number;
  };
  precios: {
    mensual: { base: number; conDescuento: number; deposito: number };
    quincenal: { base: number; conDescuento: number; deposito: number };
    semanal: { base: number; conDescuento: number; deposito: number };
    formasPago: { transferencia: number; mercadopago: number; efectivo: number };
  };
  margen: { pct: number; monto: number; estado: "OK" | "BAJO" | "CRITICO"; objetivo: number };
  rentToOwn?: { costoTotal24Meses: number; diferenciaVsLanded: number; teaImplicita: number };
};

type SimResult = {
  modeloMoto: string;
  costoLandedARS: number;
  planes: CalcResultPlan[];
};

type Plan = { id: string; codigo: string; nombre: string };

const FREQ_LABELS: Record<string, string> = {
  mensual: "Mensual",
  quincenal: "Quincenal",
  semanal: "Semanal",
};

const PAGO_LABELS: Record<string, string> = {
  transferencia: "Transferencia",
  mercadopago: "MercadoPago",
  efectivo: "Efectivo",
};

const PIE_COLORS = ["#38B2AC", "#5CE1E6", "#1A6B6A", "#23e0ff"];

export function SimuladorTab() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [result, setResult] = useState<SimResult | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CalcResultPlan | null>(null);
  const [calculating, setCalculating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SimForm>({
    resolver: zodResolver(simSchema),
    defaultValues: {
      planCodigo: "",
      frecuencia: "mensual",
      formaPago: "transferencia",
      margenObjetivoPct: 25,
    },
  });

  useEffect(() => {
    fetch("/api/pricing-engine/planes")
      .then((r) => r.json())
      .then((data: Plan[]) => {
        setPlanes(data);
        if (data.length > 0) setValue("planCodigo", data[0].codigo);
      })
      .catch(() => toast.error("Error cargando planes"));
  }, [setValue]);

  const planCodigo = watch("planCodigo");
  const frecuencia = watch("frecuencia");
  const formaPago = watch("formaPago");

  // Update selectedPlan when result or planCodigo changes
  useEffect(() => {
    if (result) {
      const found = result.planes.find((p) => p.planCodigo === planCodigo);
      setSelectedPlan(found ?? result.planes[0] ?? null);
    }
  }, [result, planCodigo]);

  const doCalc = async (data: SimForm) => {
    setCalculating(true);
    try {
      const body: Record<string, unknown> = { modeloMoto: data.modeloMoto };
      if (data.costoLandedARS) body.costoLandedARS = data.costoLandedARS;
      if (data.margenObjetivoPct) body.margenObjetivoPct = data.margenObjetivoPct;

      const res = await fetch("/api/pricing-engine/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error");
      }
      const calcData: SimResult = await res.json();
      setResult(calcData);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al calcular");
    } finally {
      setCalculating(false);
    }
  };

  // Auto-recalc on field changes with debounce
  const watchedFields = watch(["modeloMoto", "costoLandedARS", "margenObjetivoPct"]);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const [modelo] = watchedFields;
    if (!modelo || modelo.length < 2) return;
    debounceRef.current = setTimeout(() => {
      handleSubmit(doCalc)();
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedFields[0], watchedFields[1], watchedFields[2]]);

  const getPrecio = (): number => {
    if (!selectedPlan) return 0;
    const freqData = selectedPlan.precios[frecuencia];
    const base = freqData.conDescuento;
    if (formaPago === "transferencia") return base;
    if (frecuencia === "mensual") return selectedPlan.precios.formasPago[formaPago];
    return base; // Recargos de pago solo aplican sobre mensual base
  };

  const precio = getPrecio();
  const deposito = selectedPlan?.precios[frecuencia].deposito ?? 0;

  const pieData = selectedPlan
    ? [
        { name: "Amortización", value: Math.round(selectedPlan.costos.amortizacionMensual) },
        { name: "Costo Operativo", value: Math.round(selectedPlan.costos.costoOperativoMensual) },
        { name: "Margen", value: Math.max(0, Math.round(selectedPlan.margen.monto)) },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: Form */}
      <div className="space-y-5">
        <form onSubmit={handleSubmit(doCalc)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Modelo de Moto</Label>
            <Input
              {...register("modeloMoto")}
              placeholder="Ej: Honda CB 190 R"
              className="h-9"
            />
            {errors.modeloMoto && <p className="text-xs text-red-500">{errors.modeloMoto.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Costo Landed ARS</Label>
            <Input
              {...register("costoLandedARS")}
              placeholder="0 (opcional)"
              className="h-9"
              type="number"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Margen Objetivo (%)</Label>
            <Input
              {...register("margenObjetivoPct")}
              placeholder="25"
              className="h-9"
              type="number"
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={planCodigo} onValueChange={(v) => setValue("planCodigo", v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Seleccioná un plan" />
              </SelectTrigger>
              <SelectContent>
                {planes.map((p) => (
                  <SelectItem key={p.id} value={p.codigo}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Frecuencia de Pago</Label>
            <RadioGroup
              value={frecuencia}
              onValueChange={(v) => setValue("frecuencia", v as SimForm["frecuencia"])}
              className="flex gap-4"
            >
              {(["mensual", "quincenal", "semanal"] as const).map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <RadioGroupItem value={f} id={`freq-${f}`} />
                  <Label htmlFor={`freq-${f}`} className="cursor-pointer">{FREQ_LABELS[f]}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Forma de Pago</Label>
            <RadioGroup
              value={formaPago}
              onValueChange={(v) => setValue("formaPago", v as SimForm["formaPago"])}
              className="flex gap-4"
            >
              {(["transferencia", "mercadopago", "efectivo"] as const).map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <RadioGroupItem value={f} id={`pago-${f}`} />
                  <Label htmlFor={`pago-${f}`} className="cursor-pointer">{PAGO_LABELS[f]}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full" disabled={calculating}>
            {calculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
            {calculating ? "Calculando..." : "Calcular"}
          </Button>
        </form>
      </div>

      {/* Right: Result */}
      <div className="space-y-4">
        {calculating && !result && (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        )}

        {!result && !calculating && (
          <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground rounded-lg border border-dashed">
            <Calculator className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">Completá el formulario para ver la simulación</p>
          </div>
        )}

        {result && selectedPlan && (
          <>
            {/* Plan selector pills */}
            <div className="flex flex-wrap gap-2">
              {result.planes.map((p) => (
                <button
                  key={p.planCodigo}
                  onClick={() => setValue("planCodigo", p.planCodigo)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    p.planCodigo === planCodigo
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-400"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {p.planNombre}
                </button>
              ))}
            </div>

            {/* Price result card */}
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {FREQ_LABELS[frecuencia]} · {PAGO_LABELS[formaPago]}
                    </p>
                    <p className="text-3xl font-bold font-mono mt-1">{ARS(precio)}</p>
                    {deposito > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">+ Depósito: {ARS(deposito)}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <MargenBadge pct={selectedPlan.margen.pct} objetivo={selectedPlan.margen.objetivo} />
                    <Badge variant="outline" className="text-xs">{selectedPlan.planNombre}</Badge>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Amortiz.</p>
                    <p className="font-mono font-medium">{ARS(selectedPlan.costos.amortizacionMensual)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Operativo</p>
                    <p className="font-mono font-medium">{ARS(selectedPlan.costos.costoOperativoMensual)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Margen $</p>
                    <p className="font-mono font-medium">{ARS(selectedPlan.margen.monto)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pie chart */}
            {result.costoLandedARS > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs">Composición del Precio</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => ARS(v)} />
                      <Legend iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Rent-to-Own analysis */}
            {selectedPlan.esRentToOwn && selectedPlan.rentToOwn && result.costoLandedARS > 0 && (
              <RentToOwnAnalysis
                costoLandedARS={result.costoLandedARS}
                cuotaMensual={selectedPlan.precios.mensual.conDescuento}
                costoTotal24Meses={selectedPlan.rentToOwn.costoTotal24Meses}
                diferenciaVsLanded={selectedPlan.rentToOwn.diferenciaVsLanded}
                teaImplicita={selectedPlan.rentToOwn.teaImplicita}
                modeloMoto={result.modeloMoto}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
