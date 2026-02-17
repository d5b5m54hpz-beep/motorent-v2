import { prisma } from "@/lib/prisma";
import { eventBus, type EventContext } from "../event-bus";

/**
 * Notification handlers — react to events by creating in-app alerts,
 * sending emails via Resend, or pushing notifications.
 */

// ─── Contract Activated ──────────────────────────────────────────────────────
export async function handleContractActivated(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "rental.contract.activate") return;

  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id: ctx.entityId },
      include: {
        cliente: { include: { user: { select: { email: true, name: true } } } },
        moto: { select: { marca: true, modelo: true, patente: true } },
      },
    });

    if (!contrato) return;

    // Create in-app alert
    await prisma.alerta.create({
      data: {
        tipo: "CONTRATO_ACTIVADO",
        mensaje: `Contrato ${contrato.id.slice(0, 8)} activado — ${contrato.moto.marca} ${contrato.moto.modelo} (${contrato.moto.patente}) para ${contrato.cliente.nombre}`,
        contratoId: contrato.id,
        metadata: {
          clienteId: contrato.clienteId,
          motoId: contrato.motoId,
          montoTotal: contrato.montoTotal,
        },
      },
    });

    // Send email notification
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: contrato.cliente.user.email,
        subject: `MotoLibre - Tu contrato fue activado`,
        html: `<p>Hola ${contrato.cliente.user.name},</p>
<p>Tu contrato de alquiler para la moto <strong>${contrato.moto.marca} ${contrato.moto.modelo}</strong> (${contrato.moto.patente}) fue activado exitosamente.</p>
<p>Monto mensual: $${contrato.montoPeriodo.toLocaleString("es-AR")}</p>`,
      });
    } catch (emailErr) {
      console.error("[Notifications] Failed to send activation email:", emailErr);
    }

    console.log(`[Notifications] Contract activated: ${ctx.entityId}`);
  } catch (err) {
    console.error("[Notifications] handleContractActivated error:", err);
  }
}

// ─── Contract Terminated ─────────────────────────────────────────────────────
export async function handleContractTerminated(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "rental.contract.terminate") return;

  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id: ctx.entityId },
      include: {
        cliente: { select: { nombre: true } },
        moto: { select: { marca: true, modelo: true, patente: true } },
      },
    });

    if (!contrato) return;

    await prisma.alerta.create({
      data: {
        tipo: "CONTRATO_CANCELADO",
        mensaje: `Contrato ${contrato.id.slice(0, 8)} cancelado — ${contrato.moto.marca} ${contrato.moto.modelo} (${contrato.moto.patente}). Moto devuelta a disponible.`,
        contratoId: contrato.id,
        metadata: {
          clienteId: contrato.clienteId,
          motoId: contrato.motoId,
          estadoAnterior: String(ctx.payload?.estadoAnterior ?? ""),
        },
      },
    });

    console.log(`[Notifications] Contract terminated: ${ctx.entityId}`);
  } catch (err) {
    console.error("[Notifications] handleContractTerminated error:", err);
  }
}

// ─── Moto Decommissioned ────────────────────────────────────────────────────
export async function handleMotoDecommissioned(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "fleet.moto.decommission") return;

  try {
    const moto = await prisma.moto.findUnique({
      where: { id: ctx.entityId },
      select: { marca: true, modelo: true, patente: true },
    });

    if (!moto) return;

    // Check for active contracts
    const activeContracts = await prisma.contrato.count({
      where: {
        motoId: ctx.entityId,
        estado: { in: ["activo", "pendiente"] },
      },
    });

    const tipo = activeContracts > 0 ? "URGENTE" : "BAJA_MOTO";

    await prisma.alerta.create({
      data: {
        tipo,
        mensaje: activeContracts > 0
          ? `URGENTE: Moto ${moto.marca} ${moto.modelo} (${moto.patente}) dada de baja con ${activeContracts} contrato(s) activo(s)`
          : `Moto ${moto.marca} ${moto.modelo} (${moto.patente}) dada de baja — ${ctx.payload?.tipoBaja || "N/A"}`,
        metadata: {
          motoId: ctx.entityId,
          tipoBaja: String(ctx.payload?.tipoBaja ?? ""),
          activeContracts,
        },
      },
    });

    console.log(`[Notifications] Moto decommissioned: ${ctx.entityId} (${tipo})`);
  } catch (err) {
    console.error("[Notifications] handleMotoDecommissioned error:", err);
  }
}

// ─── Client Approved ────────────────────────────────────────────────────────
export async function handleClientApproved(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "rental.client.approve") return;

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: ctx.entityId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!cliente) return;

    // Send approval email
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: cliente.user.email,
        subject: `MotoLibre - Tu cuenta fue aprobada`,
        html: `<p>Hola ${cliente.user.name},</p>
<p>Tu cuenta en MotoLibre fue aprobada. Ya podés alquilar motos desde nuestra plataforma.</p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/catalogo">Ver catálogo de motos</a></p>`,
      });
    } catch (emailErr) {
      console.error("[Notifications] Failed to send approval email:", emailErr);
    }

    console.log(`[Notifications] Client approved: ${ctx.entityId}`);
  } catch (err) {
    console.error("[Notifications] handleClientApproved error:", err);
  }
}

// ─── Payment Notification (existing placeholder, enhanced) ──────────────────
export async function handlePaymentNotification(ctx: EventContext): Promise<void> {
  console.log(
    `[Notifications] Payment ${ctx.operationId} → entity ${ctx.entityType}:${ctx.entityId}`
  );
}

// ─── Maintenance Notification (existing placeholder) ────────────────────────
export async function handleMaintenanceNotification(ctx: EventContext): Promise<void> {
  console.log(
    `[Notifications] Maintenance ${ctx.operationId} → entity ${ctx.entityType}:${ctx.entityId}`
  );
}

// ─── Registration ───────────────────────────────────────────────────────────
export function registerNotificationHandlers(): void {
  // Payment events
  eventBus.registerHandler("payment.*", handlePaymentNotification, {
    priority: 200,
  });

  // Contract events — specific handlers
  eventBus.registerHandler("rental.contract.activate", handleContractActivated, {
    priority: 200,
  });
  eventBus.registerHandler("rental.contract.terminate", handleContractTerminated, {
    priority: 200,
  });

  // Client events — specific handler for approval
  eventBus.registerHandler("rental.client.approve", handleClientApproved, {
    priority: 200,
  });

  // Fleet events — moto decommission
  eventBus.registerHandler("fleet.moto.decommission", handleMotoDecommissioned, {
    priority: 200,
  });

  // Maintenance events
  eventBus.registerHandler("maintenance.*", handleMaintenanceNotification, {
    priority: 200,
  });
}
