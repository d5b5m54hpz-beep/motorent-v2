import { prisma } from "@/lib/prisma";
import { eventBus, type EventContext } from "../event-bus";

/**
 * Invoicing handlers — react to events that should trigger
 * invoice generation or updates.
 *
 * Runs at priority 30-40 (before accounting at 50).
 */

// ─── 1. Payment Approved → Auto-create Factura if missing ───────────────────

export async function handlePaymentApprovedInvoicing(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "payment.approve") return;

  try {
    // Check if this pago already has a factura
    const existingFactura = await prisma.factura.findUnique({
      where: { pagoId: ctx.entityId },
    });

    if (existingFactura) {
      console.log(`[Invoicing] Factura already exists for pago ${ctx.entityId.slice(0, 8)} - skipping`);
      return;
    }

    // Fetch pago details
    const pago = await prisma.pago.findUnique({
      where: { id: ctx.entityId },
      include: {
        contrato: {
          include: {
            cliente: { select: { nombre: true, dni: true } },
            moto: { select: { marca: true, modelo: true, patente: true } },
          },
        },
      },
    });

    if (!pago) return;

    // Get next factura number
    const ultimaFactura = await prisma.factura.findFirst({
      orderBy: { numero: "desc" },
    });

    const proximoNumero = ultimaFactura
      ? String(parseInt(ultimaFactura.numero) + 1).padStart(8, "0")
      : "00000001";

    // Default to Factura B (consumidor final)
    const tipo = "B";
    const montoTotal = pago.monto;
    const montoNeto = montoTotal; // Tipo B: IVA included
    const montoIva = 0;

    const factura = await prisma.factura.create({
      data: {
        numero: proximoNumero,
        tipo,
        puntoVenta: 1,
        montoNeto,
        montoIva,
        montoTotal,
        emitida: false,
        razonSocial: pago.contrato.cliente.nombre,
        cuit: pago.contrato.cliente.dni,
        pagoId: pago.id,
      },
    });

    console.log(`[Invoicing] Factura ${tipo} ${proximoNumero} creada automáticamente para pago ${ctx.entityId.slice(0, 8)}`);

    // Emit invoice.sale.create so accounting handler picks it up
    await eventBus.emit(
      "invoice.sale.create",
      "Factura",
      factura.id,
      {
        numero: factura.numero,
        tipo: factura.tipo,
        montoTotal: factura.montoTotal,
        montoNeto: factura.montoNeto,
        montoIva: factura.montoIva,
        pagoId: pago.id,
        contratoId: pago.contratoId,
      },
      ctx.userId,
      ctx.event.id // parent event
    );
  } catch (err) {
    console.error("[Invoicing] handlePaymentApprovedInvoicing error:", err);
  }
}

// ─── 2. Contract Activated → Generate deposit/initial invoice ───────────────

export async function handleContractActivatedInvoicing(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "rental.contract.activate") return;

  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id: ctx.entityId },
      include: {
        cliente: { select: { nombre: true, dni: true } },
        moto: { select: { marca: true, modelo: true, patente: true } },
        pagos: {
          where: { estado: "aprobado" },
          orderBy: { pagadoAt: "asc" },
          take: 1,
        },
      },
    });

    if (!contrato) return;

    // Check if there's a deposit > 0 and an approved first payment
    if (contrato.deposito <= 0 || contrato.pagos.length === 0) {
      console.log(`[Invoicing] Contract ${ctx.entityId.slice(0, 8)} activated - no deposit invoice needed`);
      return;
    }

    const primerPago = contrato.pagos[0];

    // Check if this payment already has a factura
    const existingFactura = await prisma.factura.findUnique({
      where: { pagoId: primerPago.id },
    });

    if (existingFactura) {
      console.log(`[Invoicing] First payment already has factura for contract ${ctx.entityId.slice(0, 8)}`);
      return;
    }

    // Get next factura number
    const ultimaFactura = await prisma.factura.findFirst({
      orderBy: { numero: "desc" },
    });

    const proximoNumero = ultimaFactura
      ? String(parseInt(ultimaFactura.numero) + 1).padStart(8, "0")
      : "00000001";

    const montoTotal = primerPago.monto;

    const factura = await prisma.factura.create({
      data: {
        numero: proximoNumero,
        tipo: "B",
        puntoVenta: 1,
        montoNeto: montoTotal,
        montoIva: 0,
        montoTotal,
        emitida: false,
        razonSocial: contrato.cliente.nombre,
        cuit: contrato.cliente.dni,
        pagoId: primerPago.id,
      },
    });

    console.log(`[Invoicing] Factura depósito B ${proximoNumero} creada para contrato ${ctx.entityId.slice(0, 8)}`);

    // Emit invoice.sale.create so accounting handler picks it up
    await eventBus.emit(
      "invoice.sale.create",
      "Factura",
      factura.id,
      {
        numero: factura.numero,
        tipo: factura.tipo,
        montoTotal: factura.montoTotal,
        pagoId: primerPago.id,
        contratoId: contrato.id,
        isDeposit: true,
      },
      ctx.userId,
      ctx.event.id
    );
  } catch (err) {
    console.error("[Invoicing] handleContractActivatedInvoicing error:", err);
  }
}

// ─── Registration ───────────────────────────────────────────────────────────

export function registerInvoicingHandlers(): void {
  eventBus.registerHandler("payment.approve", handlePaymentApprovedInvoicing, {
    priority: 30, // Before accounting (50)
  });
  eventBus.registerHandler("rental.contract.activate", handleContractActivatedInvoicing, {
    priority: 40, // Before accounting (50)
  });
}
