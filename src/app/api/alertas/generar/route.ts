import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/alertas/generar
 * Genera alertas automáticas basadas en reglas de negocio:
 * - Pagos vencidos
 * - Contratos próximos a vencer (7 días)
 * - Licencias vencidas
 *
 * Accesible para ADMIN y OPERADOR
 */
export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    let generadas = 0;

    // 1. Pagos vencidos
    const pagosVencidos = await prisma.pago.findMany({
      where: {
        estado: "pendiente",
        vencimientoAt: { lt: now },
      },
      include: {
        contrato: {
          include: {
            cliente: { select: { nombre: true, user: { select: { name: true } } } },
            moto: { select: { marca: true, modelo: true, patente: true } },
          },
        },
      },
    });

    for (const pago of pagosVencidos) {
      // Verificar si ya existe una alerta para este pago
      const alertaExistente = await prisma.alerta.findFirst({
        where: {
          tipo: "pago_vencido",
          pagoId: pago.id,
        },
      });

      if (!alertaExistente && pago.vencimientoAt) {
        const clienteNombre = pago.contrato.cliente.nombre || pago.contrato.cliente.user.name;
        const motoInfo = `${pago.contrato.moto.marca} ${pago.contrato.moto.modelo} (${pago.contrato.moto.patente})`;
        const diasVencido = Math.floor((now.getTime() - pago.vencimientoAt.getTime()) / (1000 * 60 * 60 * 24));

        await prisma.alerta.create({
          data: {
            tipo: "pago_vencido",
            mensaje: `Pago vencido hace ${diasVencido} día${diasVencido !== 1 ? "s" : ""} - ${clienteNombre} - ${motoInfo} - Monto: $${pago.monto.toLocaleString()}`,
            pagoId: pago.id,
            contratoId: pago.contratoId,
            metadata: {
              clienteNombre,
              motoInfo,
              monto: pago.monto,
              vencimiento: pago.vencimientoAt.toISOString(),
              diasVencido,
            },
            leida: false,
          },
        });
        generadas++;
      }
    }

    // 2. Contratos próximos a vencer (7 días)
    const contratosPorVencer = await prisma.contrato.findMany({
      where: {
        estado: "activo",
        fechaFin: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        cliente: { select: { nombre: true, user: { select: { name: true } } } },
        moto: { select: { marca: true, modelo: true, patente: true } },
      },
    });

    for (const contrato of contratosPorVencer) {
      // Verificar si ya existe una alerta para este contrato
      const alertaExistente = await prisma.alerta.findFirst({
        where: {
          tipo: "contrato_por_vencer",
          contratoId: contrato.id,
        },
      });

      if (!alertaExistente) {
        const clienteNombre = contrato.cliente.nombre || contrato.cliente.user.name;
        const motoInfo = `${contrato.moto.marca} ${contrato.moto.modelo} (${contrato.moto.patente})`;
        const diasRestantes = Math.ceil((contrato.fechaFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        await prisma.alerta.create({
          data: {
            tipo: "contrato_por_vencer",
            mensaje: `Contrato vence en ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""} - ${clienteNombre} - ${motoInfo}`,
            contratoId: contrato.id,
            metadata: {
              clienteNombre,
              motoInfo,
              fechaFin: contrato.fechaFin.toISOString(),
              diasRestantes,
            },
            leida: false,
          },
        });
        generadas++;
      }
    }

    // 3. Licencias vencidas
    const licenciasVencidas = await prisma.cliente.findMany({
      where: {
        licenciaVencimiento: { lt: now },
        estado: "aprobado", // Solo clientes aprobados
      },
      include: {
        user: { select: { name: true } },
      },
    });

    for (const cliente of licenciasVencidas) {
      // Para licencias vencidas, verificamos si ya existe una alerta reciente (últimos 30 días)
      // ya que no tenemos relación directa cliente-alerta
      const treintaDiasAtras = new Date(now);
      treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

      const alertaExistente = await prisma.alerta.findFirst({
        where: {
          tipo: "licencia_vencida",
          mensaje: { contains: cliente.email }, // Buscar por email único del cliente
          createdAt: { gte: treintaDiasAtras },
        },
      });

      if (!alertaExistente) {
        const clienteNombre = cliente.nombre || cliente.user.name;
        const diasVencido = Math.floor((now.getTime() - (cliente.licenciaVencimiento?.getTime() || 0)) / (1000 * 60 * 60 * 24));

        await prisma.alerta.create({
          data: {
            tipo: "licencia_vencida",
            mensaje: `Licencia vencida hace ${diasVencido} día${diasVencido !== 1 ? "s" : ""} - ${clienteNombre} (${cliente.email})`,
            metadata: {
              clienteId: cliente.id,
              clienteNombre,
              clienteEmail: cliente.email,
              licenciaVencimiento: cliente.licenciaVencimiento?.toISOString(),
              diasVencido,
            },
            leida: false,
          },
        });
        generadas++;
      }
    }

    return NextResponse.json({
      success: true,
      generadas,
      mensaje: `Se generaron ${generadas} alerta${generadas !== 1 ? "s" : ""} nueva${generadas !== 1 ? "s" : ""}`,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/alertas/generar:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
