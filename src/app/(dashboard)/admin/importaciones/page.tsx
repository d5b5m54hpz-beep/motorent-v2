"use client";

import { useState } from "react";
import { Ship, PackageCheck, Link2, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmbarquesTab } from "@/components/pricing/embarques-tab";
import { RecepcionesTab } from "@/components/pricing/recepciones-tab";
import { PortalProveedorTab } from "@/components/pricing/portal-proveedor-tab";
import { EtiquetasTab } from "@/components/pricing/etiquetas-tab";

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
          <RecepcionesTab />
        </TabsContent>

        <TabsContent value="portal-proveedor" className="space-y-4">
          <PortalProveedorTab />
        </TabsContent>

        <TabsContent value="etiquetas" className="space-y-4">
          <EtiquetasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
