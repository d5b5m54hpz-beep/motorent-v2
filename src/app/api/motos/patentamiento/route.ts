import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.view,
    "view",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const soloImportadas = url.searchParams.get("soloImportadas") === "true";
    const soloPendientes = url.searchParams.get("soloPendientes") === "true";

    const where: Prisma.MotoWhereInput = {};

    // Filtro de búsqueda (VIN o patente o dominio)
    if (search) {
      where.OR = [
        { vin: { contains: search, mode: "insensitive" } },
        { patente: { contains: search, mode: "insensitive" } },
        { dominio: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filtro solo importadas
    if (soloImportadas) {
      where.esImportada = true;
    }

    // Filtro solo pendientes (no completado)
    if (soloPendientes) {
      where.estadoPatentamiento = { not: "PATENTADA" };
    }

    // Obtener motos con documentos
    const motos = await prisma.moto.findMany({
      where,
      include: {
        documentos: {
          select: {
            id: true,
            tipo: true,
            nombre: true,
            url: true,
            fechaEmision: true,
            fechaVencimiento: true,
            completado: true,
          },
        },
      },
      orderBy: [
        { estadoPatentamiento: "asc" },
        { createdAt: "desc" },
      ],
    });

    // Agrupar por estado de patentamiento
    const kanban = {
      SIN_PATENTAR: motos.filter((m) => m.estadoPatentamiento === "SIN_PATENTAR"),
      EN_TRAMITE: motos.filter((m) => m.estadoPatentamiento === "EN_TRAMITE"),
      PATENTADA: motos.filter((m) => m.estadoPatentamiento === "PATENTADA"),
    };

    // Calcular progress para cada moto
    const motosConProgress = Object.fromEntries(
      Object.entries(kanban).map(([estado, motos]) => [
        estado,
        motos.map((m) => {
          const totalDocs = m.documentos.length;
          const docsCompletados = m.documentos.filter((d) => d.completado).length;
          const progress = totalDocs > 0 ? (docsCompletados / totalDocs) * 100 : 0;

          return {
            id: m.id,
            marca: m.marca,
            modelo: m.modelo,
            patente: m.patente,
            dominio: m.dominio,
            vin: m.vin,
            esImportada: m.esImportada,
            estadoPatentamiento: m.estadoPatentamiento,
            documentos: m.documentos,
            progress: Math.round(progress),
          };
        }),
      ])
    );

    return NextResponse.json({ data: motosConProgress });
  } catch (err: unknown) {
    console.error("Error fetching patentamiento:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
