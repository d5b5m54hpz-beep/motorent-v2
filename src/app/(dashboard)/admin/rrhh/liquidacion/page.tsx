"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Banknote, Users, Calculator } from "lucide-react";

type Empleado = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  salarioBasico: number;
  estado: string;
};

export default function LiquidacionPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function fetchEmpleados() {
      setLoading(true);
      try {
        const res = await fetch("/api/rrhh/empleados?limit=1000&estado=ACTIVO");
        if (res.ok) {
          const data = await res.json();
          setEmpleados(data.data || []);
          setSelectedIds((data.data || []).map((e: Empleado) => e.id));
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Error al cargar empleados");
      } finally {
        setLoading(false);
      }
    }
    fetchEmpleados();
  }, []);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? empleados.map((e) => e.id) : []);
  };

  const handleToggleEmpleado = (id: string, checked: boolean) => {
    setSelectedIds(checked ? [...selectedIds, id] : selectedIds.filter((eid) => eid !== id));
  };

  const handleGenerate = async () => {
    if (selectedIds.length === 0) {
      toast.error("Debe seleccionar al menos un empleado");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/rrhh/recibos/liquidar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mes,
          anio,
          empleadoIds: selectedIds,
          incluirSAC: mes === 6 || mes === 12,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al generar liquidación");

      toast.success(`Liquidación generada: ${json.count} recibo(s) creado(s)`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al generar liquidación");
    } finally {
      setIsGenerating(false);
    }
  };

  const totalSalarios = empleados
    .filter((e) => selectedIds.includes(e.id))
    .reduce((sum, e) => sum + e.salarioBasico, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liquidación de Sueldos</h1>
          <p className="text-muted-foreground">Generar recibos de sueldo mensuales</p>
        </div>
        <Banknote className="h-10 w-10 text-muted-foreground" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{empleados.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seleccionados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedIds.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Básicos</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalSalarios.toLocaleString("es-AR")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Período de Liquidación</CardTitle>
          <CardDescription>Seleccioná el mes y año a liquidar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {new Date(2024, m - 1).toLocaleDateString("es-AR", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={anio.toString()} onValueChange={(v) => setAnio(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(mes === 6 || mes === 12) && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-3">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                ℹ️ Junio/Diciembre: Se incluirá automáticamente el SAC (Aguinaldo)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Empleados</CardTitle>
              <CardDescription>Seleccioná los empleados a liquidar</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedIds.length === empleados.length && empleados.length > 0}
                onCheckedChange={handleSelectAll}
                disabled={loading}
              />
              <Label htmlFor="select-all" className="font-medium cursor-pointer">
                Todos
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando empleados...</p>
          ) : empleados.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay empleados activos</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {empleados.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={emp.id}
                      checked={selectedIds.includes(emp.id)}
                      onCheckedChange={(checked) => handleToggleEmpleado(emp.id, !!checked)}
                    />
                    <div>
                      <Label htmlFor={emp.id} className="font-medium cursor-pointer">
                        {emp.apellido}, {emp.nombre}
                      </Label>
                      <p className="text-xs text-muted-foreground">DNI: {emp.dni}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      ${emp.salarioBasico.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-muted-foreground">Salario básico</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={isGenerating || selectedIds.length === 0} size="lg">
          {isGenerating ? "Generando..." : "Generar Liquidación"}
        </Button>
      </div>
    </div>
  );
}
