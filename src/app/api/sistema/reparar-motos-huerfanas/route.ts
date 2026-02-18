import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

/**
 * Repara motos en estado ALQUILADA sin contrato activo
 * Las devuelve a estado DISPONIBLE
 */
export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.system.repair.execute, "execute", []);
  if (error) return error;

  try {
    // Buscar motos ALQUILADA sin contrato activo
    const motosHuerfanas = await prisma.moto.findMany({
      where: {
        estado: "ALQUILADA",
        contratos: {
          none: {
            estado: "ACTIVO",
          },
        },
      },
      include: {
        contratos: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (motosHuerfanas.length === 0) {
      return NextResponse.json({
        success: true,
        mensaje: "No se encontraron motos huérfanas",
        reparadas: 0,
      });
    }

    // Reparar cada moto
    const reparaciones = [];
    for (const moto of motosHuerfanas) {
      const ultimoContrato = moto.contratos[0];

      await prisma.moto.update({
        where: { id: moto.id },
        data: { estado: "DISPONIBLE" },
      });

      // Registrar en historial
      await prisma.historialEstadoMoto.create({
        data: {
          motoId: moto.id,
          estadoAnterior: "ALQUILADA",
          estadoNuevo: "DISPONIBLE",
          motivo: `REPARACION_AUTOMATICA - Moto huérfana detectada. Último contrato: ${
            ultimoContrato?.id || "N/A"
          } (estado: ${ultimoContrato?.estado || "N/A"})`,
          usuarioId: userId!,
        },
      });

      reparaciones.push({
        motoId: moto.id,
        patente: moto.patente,
        marca: moto.marca,
        modelo: moto.modelo,
        ultimoContrato: ultimoContrato?.id,
      });
    }

    return NextResponse.json({
      success: true,
      mensaje: `${reparaciones.length} motos reparadas correctamente`,
      reparadas: reparaciones.length,
      detalles: reparaciones,
    });
  } catch (err: unknown) {
    console.error("Error reparando motos huérfanas:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
