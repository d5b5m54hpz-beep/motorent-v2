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

// ─── Payment Notification ────────────────────────────────────────────────────
export async function handlePaymentNotification(ctx: EventContext): Promise<void> {
  if (!ctx.operationId.startsWith("payment.")) return;

  try {
    const pago = await prisma.pago.findUnique({
      where: { id: ctx.entityId },
      select: { monto: true, metodo: true, contratoId: true },
    });

    if (!pago) return;

    const action = ctx.operationId === "payment.approve"
      ? "aprobado"
      : ctx.operationId === "payment.reject"
        ? "rechazado"
        : ctx.operationId === "payment.refund"
          ? "reembolsado"
          : null;

    if (!action) return;

    await prisma.alerta.create({
      data: {
        tipo: action === "reembolsado" ? "URGENTE" : "PAGO",
        mensaje: `Pago ${action}: $${pago.monto.toLocaleString("es-AR")} (${pago.metodo ?? "N/A"}) - Contrato #${pago.contratoId.slice(0, 8)}`,
        pagoId: ctx.entityId,
        metadata: {
          operationId: ctx.operationId,
          monto: pago.monto,
          metodo: pago.metodo,
        },
      },
    });

    console.log(`[Notifications] Payment ${action}: ${ctx.entityId}`);
  } catch (err) {
    console.error("[Notifications] handlePaymentNotification error:", err);
  }
}

// ─── Maintenance Work Order Created → Alerta mecánico ───────────────────────
export async function handleWorkOrderCreatedNotification(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "maintenance.workorder.create") return;

  try {
    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id: ctx.entityId },
      select: {
        numero: true,
        tipoOT: true,
        prioridad: true,
        moto: { select: { marca: true, modelo: true, patente: true } },
        mecanico: { select: { nombre: true } },
      },
    });

    if (!orden) return;

    const tipo = orden.prioridad === "ALTA" || orden.prioridad === "URGENTE" ? "URGENTE" : "MANTENIMIENTO";

    await prisma.alerta.create({
      data: {
        tipo,
        mensaje: `Nueva OT ${orden.numero} (${orden.tipoOT}) - ${orden.moto.marca} ${orden.moto.modelo} (${orden.moto.patente})${orden.mecanico ? ` → ${orden.mecanico.nombre}` : ""}`,
        metadata: {
          ordenTrabajoId: ctx.entityId,
          tipoOT: orden.tipoOT,
          prioridad: orden.prioridad,
          mecanicoAsignado: orden.mecanico?.nombre ?? null,
        },
      },
    });

    console.log(`[Notifications] Work order created: ${orden.numero}`);
  } catch (err) {
    console.error("[Notifications] handleWorkOrderCreatedNotification error:", err);
  }
}

// ─── Maintenance Work Order Complete → Alerta moto disponible ───────────────
export async function handleWorkOrderCompleteNotification(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "maintenance.workorder.complete") return;

  try {
    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id: ctx.entityId },
      select: {
        numero: true,
        costoTotal: true,
        moto: { select: { marca: true, modelo: true, patente: true } },
      },
    });

    if (!orden) return;

    await prisma.alerta.create({
      data: {
        tipo: "MANTENIMIENTO",
        mensaje: `OT ${orden.numero} completada - ${orden.moto.marca} ${orden.moto.modelo} (${orden.moto.patente}) disponible. Costo: $${orden.costoTotal.toLocaleString("es-AR")}`,
        metadata: {
          ordenTrabajoId: ctx.entityId,
          costoTotal: orden.costoTotal,
          motoPatente: orden.moto.patente,
        },
      },
    });

    console.log(`[Notifications] Work order completed: ${orden.numero}`);
  } catch (err) {
    console.error("[Notifications] handleWorkOrderCompleteNotification error:", err);
  }
}

// ─── Stock Adjustment → Alerta si bajo mínimo ──────────────────────────────
export async function handleStockAlertNotification(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "inventory.part.adjust_stock") return;

  try {
    const repuestoId = (ctx.payload?.repuestoId as string) ?? ctx.entityId;
    const repuesto = await prisma.repuesto.findUnique({
      where: { id: repuestoId },
      select: { nombre: true, stock: true, stockMinimo: true, codigo: true },
    });

    if (!repuesto) return;

    if (repuesto.stock < repuesto.stockMinimo) {
      await prisma.alerta.create({
        data: {
          tipo: "URGENTE",
          mensaje: `STOCK BAJO: ${repuesto.nombre} (${repuesto.codigo ?? "S/C"}) — Stock actual: ${repuesto.stock}, Mínimo: ${repuesto.stockMinimo}. Requiere reposición.`,
          metadata: {
            repuestoId,
            stockActual: repuesto.stock,
            stockMinimo: repuesto.stockMinimo,
          },
        },
      });

      console.log(`[Notifications] Low stock alert: ${repuesto.nombre} (${repuesto.stock}/${repuesto.stockMinimo})`);
    }
  } catch (err) {
    console.error("[Notifications] handleStockAlertNotification error:", err);
  }
}

// ─── Import Reception Finalize → Alerta embarque completo ───────────────────
export async function handleImportReceptionNotification(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "import_shipment.reception.finalize") return;

  try {
    const embarque = await prisma.embarqueImportacion.findUnique({
      where: { id: ctx.entityId },
      select: {
        referencia: true,
        proveedor: { select: { nombre: true } },
      },
    });

    if (!embarque) return;

    await prisma.alerta.create({
      data: {
        tipo: "IMPORTACION",
        mensaje: `Embarque ${embarque.referencia} recibido completo — ${embarque.proveedor?.nombre ?? "Proveedor exterior"}. Items verificados y disponibles en inventario.`,
        metadata: {
          embarqueId: ctx.entityId,
          referencia: embarque.referencia,
          itemsRecibidos: ctx.payload?.itemsRecibidos ?? null,
          discrepancias: ctx.payload?.discrepancias ?? null,
        },
      },
    });

    console.log(`[Notifications] Import reception finalized: ${embarque.referencia}`);
  } catch (err) {
    console.error("[Notifications] handleImportReceptionNotification error:", err);
  }
}

// ─── Expense Created → Alerta si monto alto ────────────────────────────────
export async function handleExpenseAlertNotification(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "expense.create") return;

  try {
    const UMBRAL_GASTO = 500000; // $500.000 ARS

    const gasto = await prisma.gasto.findUnique({
      where: { id: ctx.entityId },
      select: { concepto: true, monto: true, categoria: true },
    });

    if (!gasto || gasto.monto < UMBRAL_GASTO) return;

    await prisma.alerta.create({
      data: {
        tipo: "URGENTE",
        mensaje: `GASTO ALTO: $${gasto.monto.toLocaleString("es-AR")} — ${gasto.concepto} (${gasto.categoria}). Requiere revisión/aprobación.`,
        metadata: {
          gastoId: ctx.entityId,
          monto: gasto.monto,
          categoria: gasto.categoria,
          umbral: UMBRAL_GASTO,
        },
      },
    });

    console.log(`[Notifications] High expense alert: $${gasto.monto} (threshold: $${UMBRAL_GASTO})`);
  } catch (err) {
    console.error("[Notifications] handleExpenseAlertNotification error:", err);
  }
}

// ─── Reconciliation Started → Alerta informativa ────────────────────────────
export async function handleReconciliationStartedNotification(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "reconciliation.process.start") return;

  try {
    const totalMovimientos = Number(ctx.payload?.totalMovimientos ?? 0);
    const matchAutomaticos = Number(ctx.payload?.matchAutomaticos ?? 0);

    await prisma.alerta.create({
      data: {
        tipo: "CONCILIACION",
        mensaje: `Conciliación iniciada — ${totalMovimientos} movimientos analizados, ${matchAutomaticos} matches automáticos encontrados`,
        metadata: {
          conciliacionId: ctx.entityId,
          totalMovimientos,
          matchAutomaticos,
        },
      },
    });

    console.log(`[Notifications] Reconciliation started: ${ctx.entityId}`);
  } catch (err) {
    console.error("[Notifications] handleReconciliationStartedNotification error:", err);
  }
}

// ─── Reconciliation Complete → Alerta urgente si hay pendientes ─────────────
export async function handleReconciliationCompleteNotification(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "reconciliation.process.complete") return;

  try {
    const totalPendientes = Number(ctx.payload?.totalPendientes ?? 0);
    const totalConciliados = Number(ctx.payload?.totalConciliados ?? 0);

    const tipo = totalPendientes > 0 ? "URGENTE" : "CONCILIACION";
    const mensaje = totalPendientes > 0
      ? `URGENTE: Conciliación completada con ${totalPendientes} movimiento(s) sin conciliar. Requiere revisión manual.`
      : `Conciliación completada exitosamente — ${totalConciliados} movimientos conciliados, 0 pendientes.`;

    await prisma.alerta.create({
      data: {
        tipo,
        mensaje,
        metadata: {
          conciliacionId: ctx.entityId,
          totalConciliados,
          totalPendientes,
        },
      },
    });

    console.log(`[Notifications] Reconciliation complete: ${ctx.entityId} (${totalPendientes} pending)`);
  } catch (err) {
    console.error("[Notifications] handleReconciliationCompleteNotification error:", err);
  }
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
  eventBus.registerHandler("maintenance.workorder.create", handleWorkOrderCreatedNotification, {
    priority: 200,
  });
  eventBus.registerHandler("maintenance.workorder.complete", handleWorkOrderCompleteNotification, {
    priority: 200,
  });

  // Inventory events — stock alerts
  eventBus.registerHandler("inventory.part.adjust_stock", handleStockAlertNotification, {
    priority: 200,
  });

  // Import shipment events
  eventBus.registerHandler("import_shipment.reception.finalize", handleImportReceptionNotification, {
    priority: 200,
  });

  // Expense events — high amount alerts
  eventBus.registerHandler("expense.create", handleExpenseAlertNotification, {
    priority: 200,
  });

  // Reconciliation events
  eventBus.registerHandler("reconciliation.process.start", handleReconciliationStartedNotification, {
    priority: 200,
  });
  eventBus.registerHandler("reconciliation.process.complete", handleReconciliationCompleteNotification, {
    priority: 200,
  });
}
