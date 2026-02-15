"use client";

import { useState } from "react";
import { Ship, PackageCheck, Link2, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmbarquesTab } from "@/components/pricing/embarques-tab";

export default function ImportacionesPage() {
  const [activeTab, setActiveTab] = useState("embarques");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importaciones</h1>
          <p className="text-muted-foreground">
            Gestión completa de embarques, recepción y etiquetado
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="embarques">
            <Ship className="mr-2 h-4 w-4" />
            Embarques
          </TabsTrigger>
          <TabsTrigger value="recepciones">
            <PackageCheck className="mr-2 h-4 w-4" />
            Recepciones
          </TabsTrigger>
          <TabsTrigger value="portal-proveedor">
            <Link2 className="mr-2 h-4 w-4" />
            Portal Proveedor
          </TabsTrigger>
          <TabsTrigger value="etiquetas">
            <Tag className="mr-2 h-4 w-4" />
            Etiquetas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="embarques" className="space-y-4">
          <EmbarquesTab />
        </TabsContent>

        <TabsContent value="recepciones" className="space-y-4">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <PackageCheck className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Recepciones</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Vista de embarques pendientes de recepción e historial
            </p>
          </div>
        </TabsContent>

        <TabsContent value="portal-proveedor" className="space-y-4">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Link2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Portal de Proveedor</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Genera links públicos para que proveedores confirmen embarques y descarguen etiquetas
            </p>
          </div>
        </TabsContent>

        <TabsContent value="etiquetas" className="space-y-4">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Etiquetas</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Generación y reimpresión de etiquetas individuales, de caja y master
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
