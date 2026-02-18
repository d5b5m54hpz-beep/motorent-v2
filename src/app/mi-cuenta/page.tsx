"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Bike, CreditCard, User, Calendar, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

function MiCuentaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "contratos");
  const [contratos, setContratos] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [perfilData, setPerfilData] = useState({
    nombre: "",
    telefono: "",
    dni: "",
    licencia: "",
    direccion: "",
    ciudad: "",
    provincia: "",
    codigoPostal: "",
  });

  const [payingPagoId, setPayingPagoId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login?redirect=/mi-cuenta");
      return;
    }

    fetchData();
  }, [session, status, router]);

  useEffect(() => {
    if (activeTab === "contratos" && contratos.length === 0) {
      fetchContratos();
    } else if (activeTab === "pagos" && pagos.length === 0) {
      fetchPagos();
    } else if (activeTab === "perfil" && !perfil) {
      fetchPerfil();
    }
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    await fetchContratos();
    setLoading(false);
  }

  async function fetchContratos() {
    try {
      const res = await fetch("/api/mi-cuenta/contratos");
      if (!res.ok) throw new Error("Error al cargar contratos");
      const data = await res.json();
      setContratos(data.data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar contratos");
    }
  }

  async function fetchPagos() {
    try {
      const res = await fetch("/api/mi-cuenta/pagos");
      if (!res.ok) throw new Error("Error al cargar pagos");
      const data = await res.json();
      setPagos(data.data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar pagos");
    }
  }

  async function fetchPerfil() {
    try {
      const res = await fetch("/api/mi-cuenta/perfil");
      if (!res.ok) throw new Error("Error al cargar perfil");
      const data = await res.json();
      setPerfil(data);
      setPerfilData({
        nombre: data.nombre || "",
        telefono: data.telefono || "",
        dni: data.dni || "",
        licencia: data.licencia || "",
        direccion: data.direccion || "",
        ciudad: data.ciudad || "",
        provincia: data.provincia || "",
        codigoPostal: data.codigoPostal || "",
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar perfil");
    }
  }

  async function handleSavePerfil() {
    setSaving(true);
    try {
      const res = await fetch("/api/mi-cuenta/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perfilData),
      });

      if (!res.ok) throw new Error("Error al guardar perfil");

      const updated = await res.json();
      setPerfil(updated);
      toast.success("Perfil actualizado correctamente");
    } catch (error: unknown) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar perfil");
    } finally {
      setSaving(false);
    }
  }

  async function handlePayWithMercadoPago(pagoId: string) {
    setPayingPagoId(pagoId);
    try {
      const res = await fetch(`/api/pagos/${pagoId}/checkout`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear checkout");
      }

      const data = await res.json();

      // Redirect to MercadoPago checkout
      window.location.href = data.init_point;
    } catch (error: unknown) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Error al procesar el pago");
      setPayingPagoId(null);
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader />
        <main className="flex-1">
          <div className="container max-w-4xl px-4 py-8">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const estadoBadgeColors: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    activo: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    finalizado: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    cancelado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    aprobado: "bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    rechazado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1">
      <div className="container max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Mi Cuenta</h1>
          <p className="text-muted-foreground mt-2">
            Bienvenido, {session?.user?.name}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="contratos">
              <Bike className="mr-2 h-4 w-4" />
              Mis Contratos
            </TabsTrigger>
            <TabsTrigger value="pagos">
              <CreditCard className="mr-2 h-4 w-4" />
              Mis Pagos
            </TabsTrigger>
            <TabsTrigger value="perfil">
              <User className="mr-2 h-4 w-4" />
              Mi Perfil
            </TabsTrigger>
          </TabsList>

          {/* Tab: Mis Contratos */}
          <TabsContent value="contratos" className="space-y-4">
            {contratos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Bike className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No tenés contratos</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Explorá nuestro catálogo y alquilá tu primera moto
                  </p>
                  <Button asChild className="mt-4">
                    <a href="/catalogo">Ver Catálogo</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              contratos.map((contrato) => (
                <Card key={contrato.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {contrato.moto.imagen && (
                        <img
                          src={contrato.moto.imagen}
                          alt={`${contrato.moto.marca} ${contrato.moto.modelo}`}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {contrato.moto.marca} {contrato.moto.modelo}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Patente: {contrato.moto.patente}
                            </p>
                          </div>
                          <Badge variant="outline" className={estadoBadgeColors[contrato.estado]}>
                            {contrato.estado}
                          </Badge>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {formatDate(new Date(contrato.fechaInicio))} -{" "}
                              {formatDate(new Date(contrato.fechaFin))}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="capitalize">{contrato.frecuenciaPago}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progreso de Pagos</span>
                            <span className="font-medium">
                              {contrato._stats.pagosPagados} / {contrato._stats.totalPagos}
                            </span>
                          </div>
                          <Progress value={contrato._stats.progreso} className="h-2" />
                        </div>

                        <Separator />

                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-lg font-bold">
                              {formatCurrency(contrato.montoTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Tab: Mis Pagos */}
          <TabsContent value="pagos" className="space-y-4">
            {pagos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No tenés pagos registrados</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pagos.map((pago) => {
                  const isOverdue =
                    pago.estado === "pendiente" &&
                    pago.vencimientoAt &&
                    new Date(pago.vencimientoAt) < new Date();

                  return (
                    <Card key={pago.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">
                                {pago.contrato.moto.marca} {pago.contrato.moto.modelo}
                              </h4>
                              {pago.estado === "aprobado" && (
                                <Badge
                                  variant="outline"
                                  className="bg-teal-50 text-teal-800 dark:bg-teal-900 dark:text-teal-300"
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Aprobado
                                </Badge>
                              )}
                              {pago.estado === "rechazado" && (
                                <Badge
                                  variant="outline"
                                  className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Rechazado
                                </Badge>
                              )}
                              {pago.estado === "pendiente" && !isOverdue && (
                                <Badge
                                  variant="outline"
                                  className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                >
                                  <Clock className="mr-1 h-3 w-3" />
                                  Pendiente
                                </Badge>
                              )}
                              {isOverdue && (
                                <Badge
                                  variant="outline"
                                  className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Vencido
                                </Badge>
                              )}
                            </div>

                            <div className="grid gap-2 sm:grid-cols-3 text-sm text-muted-foreground">
                              <div>
                                <span className="text-xs">Vencimiento:</span>
                                <p className="font-medium text-foreground">
                                  {pago.vencimientoAt
                                    ? formatDate(new Date(pago.vencimientoAt))
                                    : "—"}
                                </p>
                              </div>
                              {pago.pagadoAt && (
                                <div>
                                  <span className="text-xs">Pagado:</span>
                                  <p className="font-medium text-foreground">
                                    {formatDate(new Date(pago.pagadoAt))}
                                  </p>
                                </div>
                              )}
                              {pago.metodo && (
                                <div>
                                  <span className="text-xs">Método:</span>
                                  <p className="font-medium text-foreground capitalize">
                                    {pago.metodo}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xl font-bold">{formatCurrency(pago.monto)}</p>
                            {pago.estado === "pendiente" && (
                              <Button
                                size="sm"
                                className="mt-2 bg-[#009ee3] hover:bg-[#0084c4] text-white"
                                onClick={() => handlePayWithMercadoPago(pago.id)}
                                disabled={payingPagoId === pago.id}
                              >
                                {payingPagoId === pago.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Procesando...
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Pagar con MercadoPago
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab: Mi Perfil */}
          <TabsContent value="perfil">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre Completo</Label>
                    <Input
                      id="nombre"
                      value={perfilData.nombre}
                      onChange={(e) => setPerfilData({ ...perfilData, nombre: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={session?.user?.email || ""} disabled />
                    <p className="text-xs text-muted-foreground">
                      El email no se puede modificar
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={perfilData.telefono}
                      onChange={(e) => setPerfilData({ ...perfilData, telefono: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dni">DNI</Label>
                    <Input
                      id="dni"
                      value={perfilData.dni}
                      onChange={(e) => setPerfilData({ ...perfilData, dni: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licencia">Licencia de Conducir</Label>
                    <Input
                      id="licencia"
                      value={perfilData.licencia}
                      onChange={(e) => setPerfilData({ ...perfilData, licencia: e.target.value })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Dirección</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="direccion">Calle y Número</Label>
                      <Input
                        id="direccion"
                        value={perfilData.direccion}
                        onChange={(e) =>
                          setPerfilData({ ...perfilData, direccion: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ciudad">Ciudad</Label>
                      <Input
                        id="ciudad"
                        value={perfilData.ciudad}
                        onChange={(e) => setPerfilData({ ...perfilData, ciudad: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="provincia">Provincia</Label>
                      <Input
                        id="provincia"
                        value={perfilData.provincia}
                        onChange={(e) =>
                          setPerfilData({ ...perfilData, provincia: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="codigoPostal">Código Postal</Label>
                      <Input
                        id="codigoPostal"
                        value={perfilData.codigoPostal}
                        onChange={(e) =>
                          setPerfilData({ ...perfilData, codigoPostal: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSavePerfil} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar Cambios"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      </main>
      <PublicFooter />
    </div>
  );
}

export default function MiCuentaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <MiCuentaContent />
    </Suspense>
  );
}
