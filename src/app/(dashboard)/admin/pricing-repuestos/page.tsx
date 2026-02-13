"use client";

import { useState } from "react";
import { Ship, Package, FolderOpen, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PricingRepuestosPage() {
  const [activeTab, setActiveTab] = useState("resumen");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Costeo de Importación</h1>
          <p className="text-muted-foreground">
            Gestión de costos de repuestos importados
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="resumen">
            <Package className="mr-2 h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="embarques">
            <Ship className="mr-2 h-4 w-4" />
            Embarques
          </TabsTrigger>
          <TabsTrigger value="categorias">
            <FolderOpen className="mr-2 h-4 w-4" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="historial">
            <TrendingUp className="mr-2 h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Embarques Activos</CardTitle>
                <Ship className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Sin embarques registrados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Tránsito</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Sin embarques en tránsito
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">USD 0</div>
                <p className="text-xs text-muted-foreground">
                  ARS 0
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Márgenes Bajos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  productos bajo mínimo
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Últimos Embarques</CardTitle>
              <CardDescription>
                No hay embarques registrados aún
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Crea tu primer embarque en la pestaña "Embarques"
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embarques" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Embarques de Importación</CardTitle>
              <CardDescription>
                Gestiona los embarques de repuestos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Sistema de embarques implementado. APIs disponibles en:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 mt-4">
                <li>• GET /api/embarques - Lista de embarques</li>
                <li>• POST /api/embarques - Crear embarque</li>
                <li>• GET /api/embarques/[id] - Detalle del embarque</li>
                <li>• POST /api/embarques/[id]/calcular-costos - Calculadora de costo landed</li>
                <li>• POST /api/embarques/[id]/confirmar-costos - Aplicar costos</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Categorías</CardTitle>
              <CardDescription>
                Márgenes y aranceles por categoría de repuesto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                9 categorías configuradas. API disponible en:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 mt-4">
                <li>• GET /api/pricing-repuestos/categorias - Lista categorías</li>
                <li>• PUT /api/pricing-repuestos/categorias/[categoria] - Actualizar</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Costos</CardTitle>
              <CardDescription>
                Evolución de costos de repuestos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Sistema de historial implementado
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
