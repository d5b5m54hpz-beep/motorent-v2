import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requirePermission(
    OPERATIONS.inventory.location.view,
    "view",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const ubicaciones = await prisma.ubicacionDeposito.findMany({
      where: { activo: true },
      orderBy: [{ estante: "asc" }, { fila: "asc" }, { posicion: "asc" }],
    });

    const repuestos = await prisma.repuesto.findMany({
      where: { activo: true, ubicacion: { not: null } },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        ubicacion: true,
        stock: true,
      },
    });

    const mapa: Record<
      string,
      {
        estante: string;
        filas: Record<
          string,
          {
            fila: string;
            posiciones: Record<
              string,
              {
                posicion: string;
                codigo: string;
                ubicacionId: string;
                nombre: string | null;
                repuestos: Array<{
                  id: string;
                  nombre: string;
                  codigo: string | null;
                  stock: number;
                }>;
              }
            >;
          }
        >;
      }
    > = {};

    ubicaciones.forEach((ub) => {
      if (!mapa[ub.estante]) {
        mapa[ub.estante] = {
          estante: ub.estante,
          filas: {},
        };
      }

      if (!mapa[ub.estante].filas[ub.fila]) {
        mapa[ub.estante].filas[ub.fila] = {
          fila: ub.fila,
          posiciones: {},
        };
      }

      const repuestosUbicacion = repuestos.filter(
        (r) => r.ubicacion === ub.codigo
      );

      mapa[ub.estante].filas[ub.fila].posiciones[ub.posicion] = {
        posicion: ub.posicion,
        codigo: ub.codigo,
        ubicacionId: ub.id,
        nombre: ub.nombre,
        repuestos: repuestosUbicacion,
      };
    });

    return NextResponse.json(mapa);
  } catch (error: unknown) {
    console.error("Error fetching mapa:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
