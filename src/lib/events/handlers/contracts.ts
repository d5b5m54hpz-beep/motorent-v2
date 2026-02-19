import { prisma } from "@/lib/prisma";
import { eventBus, type EventContext } from "../event-bus";

/**
 * Contract event handlers — reaccionen a eventos del lifecycle de contratos y pagos.
 * Prioridad 35-60 (después de invoicing, antes de notificaciones).
 */

export function registerContractHandlers(): void {
  // Contrato finalizado → liberar moto + alerta depósito
  eventBus.registerHandler("rental.contract.terminate", handleContractFinalize, { priority: 35 });

  // Contrato por vencer → alerta con deuda pendiente
  eventBus.registerHandler("rental.contract.expiring", handleContractExpiring, { priority: 35 });

  // Pago rechazado → detectar morosidad (3+ rechazos)
  eventBus.registerHandler("payment.reject", handlePaymentRejectMorosidad, { priority: 60 });
}

async function handleContractFinalize(ctx: EventContext): Promise<void> {
  try {
    const { estadoNuevo, motoId } = ctx.payload as { estadoNuevo?: string; motoId?: string };

    // Solo actuar en finalizaciones reales (no en activaciones ni updates sin cambio)
    if (estadoNuevo !== "FINALIZADO" && estadoNuevo !== "CANCELADO" && estadoNuevo !== "FINALIZADO_COMPRA") {
      return;
    }

    const contrato = await prisma.contrato.findUnique({
      where: { id: ctx.entityId },
    });

    if (!contrato) return;

    // Liberar moto si se canceló y no está ya disponible (el DELETE handler ya lo hace en tx)
    // Para FINALIZADO, la moto debe liberarse aquí
    if (estadoNuevo === "FINALIZADO" || estadoNuevo === "FINALIZADO_COMPRA") {
      await prisma.moto.update({
        where: { id: contrato.motoId },
        data: { estado: estadoNuevo === "FINALIZADO_COMPRA" ? "BAJA" : "DISPONIBLE" },
      });
    }

    // Alerta de depósito si aplica
    if (contrato.deposito && Number(contrato.deposito) > 0) {
      await prisma.alerta.create({
        data: {
          tipo: "GENERAL",
          mensaje: `[Depósito pendiente] Contrato ${estadoNuevo}. Depósito de $${Number(contrato.deposito).toLocaleString("es-AR")} pendiente de devolución.`,
          contratoId: contrato.id,
        },
      });
    }
  } catch (error) {
    console.error("[ContractHandlers] handleContractFinalize error:", error);
  }
}

async function handleContractExpiring(ctx: EventContext): Promise<void> {
  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id: ctx.entityId },
      include: {
        cliente: true,
        pagos: { where: { estado: "PENDIENTE" } },
      },
    });

    if (!contrato) return;

    const deudaPendiente = contrato.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
    const fechaFin = contrato.fechaFin
      ? new Date(contrato.fechaFin).toLocaleDateString("es-AR")
      : "desconocida";

    await prisma.alerta.create({
      data: {
        tipo: "CONTRATO_POR_VENCER",
        mensaje: `[${contrato.cliente.nombre}] Contrato vence el ${fechaFin}. ${
          deudaPendiente > 0
            ? `Deuda pendiente: $${deudaPendiente.toLocaleString("es-AR")}`
            : "Sin deuda pendiente."
        }`,
        contratoId: contrato.id,
      },
    });
  } catch (error) {
    console.error("[ContractHandlers] handleContractExpiring error:", error);
  }
}

async function handlePaymentRejectMorosidad(ctx: EventContext): Promise<void> {
  try {
    const { contratoId } = ctx.payload as { contratoId?: string };
    if (!contratoId) return;

    const rechazos = await prisma.pago.count({
      where: { contratoId, estado: "RECHAZADO" },
    });

    if (rechazos >= 3) {
      // Evitar alertas duplicadas: verificar si ya existe una de morosidad reciente
      const alertaExistente = await prisma.alerta.findFirst({
        where: {
          contratoId,
          tipo: "MOROSIDAD",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // últimas 24h
        },
      });

      if (!alertaExistente) {
        await prisma.alerta.create({
          data: {
            tipo: "MOROSIDAD",
            mensaje: `[Morosidad] ${rechazos} pagos rechazados en el contrato. Requiere atención.`,
            contratoId,
          },
        });
      }
    }
  } catch (error) {
    console.error("[ContractHandlers] handlePaymentRejectMorosidad error:", error);
  }
}
