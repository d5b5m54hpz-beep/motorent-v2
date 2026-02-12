"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

type AsientoReporte = {
  id: string;
  numero: number;
  fecha: Date;
  tipo: string;
  descripcion: string;
  totalDebe: number;
  totalHaber: number;
  lineas: Array<{
    id: string;
    orden: number;
    cuenta: { codigo: string; nombre: string };
    debe: number;
    haber: number;
    descripcion: string | null;
  }>;
};

export default function ReportesContablesPage() {
  const [desde, setDesde] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(false);
  const [libroDiario, setLibroDiario] = useState<AsientoReporte[]>([]);
  const [libroMayor, setLibroMayor] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [posicionIVA, setPosicionIVA] = useState<any>(null);
  const [estadoResultados, setEstadoResultados] = useState<any>(null);

  const fetchReporte = async (tipo: string, setter: (data: any) => void) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ tipo, desde, hasta });
      const res = await fetch(`/api/contabilidad/reportes?${params}`);
      if (!res.ok) throw new Error("Error");
      const json = await res.json();
      setter(json.data);
      toast.success("Reporte generado");
    } catch (error) {
      toast.error("Error al generar reporte");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes Contables</h1>
        <p className="text-muted-foreground">Análisis y reportes del período contable</p>
      </div>

      {/* Date filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <Button variant="outline" disabled>
              <Calendar className="mr-2 h-4 w-4" />
              Mes actual
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="libro-diario" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="libro-diario">Libro Diario</TabsTrigger>
          <TabsTrigger value="libro-mayor">Libro Mayor</TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="posicion-iva">Posición IVA</TabsTrigger>
          <TabsTrigger value="estado-resultados">Estado Resultados</TabsTrigger>
        </TabsList>

        {/* Libro Diario */}
        <TabsContent value="libro-diario" className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">Libro Diario</h2>
            <Button onClick={() => fetchReporte("libro-diario", (data) => setLibroDiario(data))} disabled={isLoading}>
              Generar
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : libroDiario.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Seleccioná un período y hacé clic en Generar
                </div>
              ) : (
                <div className="divide-y">
                  {libroDiario.map((asiento) => (
                    <div key={asiento.id} className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-semibold">Asiento #{asiento.numero}</span>
                          <span className="mx-2 text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">{formatDate(asiento.fecha)}</span>
                          <p className="text-sm mt-1">{asiento.descripcion}</p>
                        </div>
                        <Badge>{asiento.tipo}</Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cuenta</TableHead>
                            <TableHead className="text-right">Debe</TableHead>
                            <TableHead className="text-right">Haber</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {asiento.lineas.map((linea) => (
                            <TableRow key={linea.id}>
                              <TableCell>
                                <span className="font-mono text-xs text-muted-foreground">{linea.cuenta.codigo}</span>
                                {" "}{linea.cuenta.nombre}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {linea.debe > 0 ? formatCurrency(linea.debe) : "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {linea.haber > 0 ? formatCurrency(linea.haber) : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-muted">
                            <TableCell>TOTALES</TableCell>
                            <TableCell className="text-right">{formatCurrency(asiento.totalDebe)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(asiento.totalHaber)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Libro Mayor */}
        <TabsContent value="libro-mayor" className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">Libro Mayor</h2>
            <Button onClick={() => fetchReporte("libro-mayor", setLibroMayor)} disabled={isLoading}>
              Generar
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : libroMayor.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  Seleccioná un período y hacé clic en Generar
                </div>
              ) : (
                <div className="space-y-6">
                  {libroMayor.map((cuenta, idx) => (
                    <div key={idx} className="space-y-2">
                      <h3 className="font-semibold">
                        {cuenta.cuenta.codigo} - {cuenta.cuenta.nombre}
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Asiento</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Debe</TableHead>
                            <TableHead className="text-right">Haber</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cuenta.movimientos.map((mov: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell>{formatDate(mov.fecha)}</TableCell>
                              <TableCell>#{mov.asientoNumero}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{mov.descripcion}</TableCell>
                              <TableCell className="text-right font-mono">
                                {mov.debe > 0 ? formatCurrency(mov.debe) : "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {mov.haber > 0 ? formatCurrency(mov.haber) : "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                {formatCurrency(mov.saldo)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted font-semibold">
                            <TableCell colSpan={3}>TOTALES</TableCell>
                            <TableCell className="text-right">{formatCurrency(cuenta.totalDebe)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cuenta.totalHaber)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cuenta.saldoFinal)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance de Sumas y Saldos */}
        <TabsContent value="balance" className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">Balance de Sumas y Saldos</h2>
            <Button onClick={() => fetchReporte("balance-sumas-saldos", setBalance)} disabled={isLoading}>
              Generar
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : !balance ? (
                <div className="p-8 text-center text-muted-foreground">
                  Seleccioná un período y hacé clic en Generar
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead className="text-right">Debe</TableHead>
                      <TableHead className="text-right">Haber</TableHead>
                      <TableHead className="text-right">Saldo Deudor</TableHead>
                      <TableHead className="text-right">Saldo Acreedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balance.map((cuenta: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{cuenta.codigo}</TableCell>
                        <TableCell>{cuenta.nombre}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cuenta.totalDebe)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cuenta.totalHaber)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {cuenta.saldoDeudor > 0 ? formatCurrency(cuenta.saldoDeudor) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {cuenta.saldoAcreedor > 0 ? formatCurrency(cuenta.saldoAcreedor) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posición IVA */}
        <TabsContent value="posicion-iva" className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">Posición IVA</h2>
            <Button onClick={() => fetchReporte("posicion-iva", setPosicionIVA)} disabled={isLoading}>
              Generar
            </Button>
          </div>
          {isLoading ? (
            <Card>
              <CardContent className="p-8 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : !posicionIVA ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Seleccioná un período y hacé clic en Generar
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">IVA Débito Fiscal (Ventas)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(posicionIVA.ivaDebito.total)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">IVA Crédito Fiscal (Compras)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                    {formatCurrency(posicionIVA.ivaCredito.total)}
                  </p>
                </CardContent>
              </Card>
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Saldo de IVA</CardTitle>
                  <CardDescription>
                    {posicionIVA.tipo === "A PAGAR" && "Saldo a pagar a ARCA"}
                    {posicionIVA.tipo === "A FAVOR" && "Saldo a favor del contribuyente"}
                    {posicionIVA.tipo === "NEUTRAL" && "Sin saldo"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className={`text-4xl font-bold ${posicionIVA.tipo === "A PAGAR" ? "text-red-600" : "text-teal-600"}`}>
                    {formatCurrency(Math.abs(posicionIVA.saldo))}
                  </p>
                  <Badge className="mt-2" variant={posicionIVA.tipo === "A PAGAR" ? "destructive" : "default"}>
                    {posicionIVA.tipo}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Estado de Resultados */}
        <TabsContent value="estado-resultados" className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">Estado de Resultados</h2>
            <Button onClick={() => fetchReporte("estado-resultados", setEstadoResultados)} disabled={isLoading}>
              Generar
            </Button>
          </div>
          {isLoading ? (
            <Card>
              <CardContent className="p-8 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : !estadoResultados ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Seleccioná un período y hacé clic en Generar
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      {estadoResultados.ingresos.map((ing: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{ing.codigo}</TableCell>
                          <TableCell>{ing.nombre}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-teal-600">
                            {formatCurrency(ing.monto)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted font-bold">
                        <TableCell colSpan={2}>TOTAL INGRESOS</TableCell>
                        <TableCell className="text-right text-teal-600">
                          {formatCurrency(estadoResultados.totalIngresos)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Egresos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      {estadoResultados.egresos.map((egr: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{egr.codigo}</TableCell>
                          <TableCell>{egr.nombre}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-red-600">
                            {formatCurrency(egr.monto)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted font-bold">
                        <TableCell colSpan={2}>TOTAL EGRESOS</TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(estadoResultados.totalEgresos)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resultado del Período</CardTitle>
                  <CardDescription>{estadoResultados.tipo}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className={`text-4xl font-bold ${estadoResultados.resultado >= 0 ? "text-teal-600" : "text-red-600"}`}>
                    {formatCurrency(Math.abs(estadoResultados.resultado))}
                  </p>
                  <Badge className="mt-2" variant={estadoResultados.resultado >= 0 ? "default" : "destructive"}>
                    {estadoResultados.tipo}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
