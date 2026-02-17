import { prisma } from "@/lib/prisma";
import { eventBus, type EventContext } from "../event-bus";

/**
 * Accounting handlers — react to business events that require
 * accounting entries (asientos contables).
 *
 * Creates asientos automatically when payments are approved/refunded,
 * invoices are created/cancelled, etc.
 */

// ─── Account codes (Plan de Cuentas Argentino) ──────────────────────────────

const ACCOUNTS = {
  CAJA: { codigo: "1.1.01", nombre: "Caja", tipo: "ACTIVO" as const },
  BANCO: { codigo: "1.1.02", nombre: "Banco", tipo: "ACTIVO" as const },
  CUENTAS_POR_COBRAR: { codigo: "1.1.03", nombre: "Cuentas por Cobrar", tipo: "ACTIVO" as const },
  IVA_CREDITO_FISCAL: { codigo: "1.1.04", nombre: "IVA Crédito Fiscal", tipo: "ACTIVO" as const },
  PROVEEDORES: { codigo: "2.1.01", nombre: "Proveedores", tipo: "PASIVO" as const },
  IVA_DEBITO_FISCAL: { codigo: "2.1.02", nombre: "IVA Débito Fiscal", tipo: "PASIVO" as const },
  INGRESOS_ALQUILER: { codigo: "4.1.01", nombre: "Ingresos por Alquiler", tipo: "INGRESO" as const },
};

const CATEGORIA_TO_CUENTA: Record<string, { codigo: string; nombre: string; tipo: "EGRESO" }> = {
  MANTENIMIENTO: { codigo: "5.1.01", nombre: "Gastos de Mantenimiento", tipo: "EGRESO" },
  REPUESTOS: { codigo: "5.1.02", nombre: "Gastos de Repuestos", tipo: "EGRESO" },
  COMBUSTIBLE: { codigo: "5.1.03", nombre: "Gastos de Combustible", tipo: "EGRESO" },
  SEGURO: { codigo: "5.2.01", nombre: "Gastos de Seguro", tipo: "EGRESO" },
  SUELDOS: { codigo: "5.3.01", nombre: "Sueldos y Jornales", tipo: "EGRESO" },
  IMPUESTOS: { codigo: "5.4.01", nombre: "Impuestos y Tasas", tipo: "EGRESO" },
  ALQUILER: { codigo: "5.5.01", nombre: "Alquiler de Local", tipo: "EGRESO" },
  SERVICIOS: { codigo: "5.5.02", nombre: "Servicios Públicos", tipo: "EGRESO" },
  MARKETING: { codigo: "5.6.01", nombre: "Gastos de Marketing", tipo: "EGRESO" },
  OTRO: { codigo: "5.7.01", nombre: "Otros Gastos", tipo: "EGRESO" },
};

// ─── Helper: get or create account ──────────────────────────────────────────

async function getOrCreateAccount(
  codigo: string,
  nombre: string,
  tipo: "ACTIVO" | "PASIVO" | "PATRIMONIO" | "INGRESO" | "EGRESO"
): Promise<string> {
  const existing = await prisma.cuentaContable.findUnique({ where: { codigo } });
  if (existing) return existing.id;

  const created = await prisma.cuentaContable.create({
    data: {
      codigo,
      nombre,
      tipo,
      nivel: codigo.split(".").length,
      imputable: true,
      activa: true,
    },
  });
  console.log(`[Accounting] Auto-created account: ${codigo} - ${nombre}`);
  return created.id;
}

// ─── 1. Payment Approved → Asiento COBRO ─────────────────────────────────────

export async function handlePaymentApprovedAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "payment.approve") return;

  try {
    const pago = await prisma.pago.findUnique({
      where: { id: ctx.entityId },
      include: {
        contrato: { select: { id: true } },
      },
    });

    if (!pago) return;

    const cajaId = await getOrCreateAccount(
      ACCOUNTS.CAJA.codigo,
      ACCOUNTS.CAJA.nombre,
      ACCOUNTS.CAJA.tipo
    );
    const ingresosId = await getOrCreateAccount(
      ACCOUNTS.INGRESOS_ALQUILER.codigo,
      ACCOUNTS.INGRESOS_ALQUILER.nombre,
      ACCOUNTS.INGRESOS_ALQUILER.tipo
    );

    const monto = pago.monto;
    const descripcion = `Pago aprobado - Contrato #${pago.contratoId.slice(0, 8)}`;

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        tipo: "COBRO",
        descripcion,
        totalDebe: monto,
        totalHaber: monto,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento payment.approve - Pago ${ctx.entityId.slice(0, 8)}`,
        lineas: {
          create: [
            {
              orden: 1,
              cuentaId: cajaId,
              debe: monto,
              haber: 0,
              descripcion: `Cobro pago - ${pago.metodo}`,
            },
            {
              orden: 2,
              cuentaId: ingresosId,
              debe: 0,
              haber: monto,
              descripcion: `Ingreso alquiler - Contrato #${pago.contratoId.slice(0, 8)}`,
            },
          ],
        },
      },
    });

    console.log(`[Accounting] Asiento COBRO creado para payment.approve - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handlePaymentApprovedAccounting error:", err);
  }
}

// ─── 2. Payment Refunded → Asiento inverso (AJUSTE) ─────────────────────────

export async function handlePaymentRefundAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "payment.refund") return;

  try {
    const pago = await prisma.pago.findUnique({
      where: { id: ctx.entityId },
      include: {
        contrato: { select: { id: true } },
      },
    });

    if (!pago) return;

    const cajaId = await getOrCreateAccount(
      ACCOUNTS.CAJA.codigo,
      ACCOUNTS.CAJA.nombre,
      ACCOUNTS.CAJA.tipo
    );
    const ingresosId = await getOrCreateAccount(
      ACCOUNTS.INGRESOS_ALQUILER.codigo,
      ACCOUNTS.INGRESOS_ALQUILER.nombre,
      ACCOUNTS.INGRESOS_ALQUILER.tipo
    );

    const monto = pago.monto;
    const descripcion = `Reembolso - Pago #${ctx.entityId.slice(0, 8)}`;

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        tipo: "AJUSTE",
        descripcion,
        totalDebe: monto,
        totalHaber: monto,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento payment.refund - Pago ${ctx.entityId.slice(0, 8)}`,
        lineas: {
          create: [
            {
              orden: 1,
              cuentaId: ingresosId,
              debe: monto,
              haber: 0,
              descripcion: `Reversión ingreso alquiler - Reembolso`,
            },
            {
              orden: 2,
              cuentaId: cajaId,
              debe: 0,
              haber: monto,
              descripcion: `Salida de caja por reembolso`,
            },
          ],
        },
      },
    });

    console.log(`[Accounting] Asiento AJUSTE creado para payment.refund - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handlePaymentRefundAccounting error:", err);
  }
}

// ─── 3. Invoice Sale Created → Asiento VENTA ────────────────────────────────

export async function handleInvoiceSaleCreatedAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "invoice.sale.create") return;

  try {
    const factura = await prisma.factura.findUnique({
      where: { id: ctx.entityId },
    });

    if (!factura) return;

    const cuentasCobrarId = await getOrCreateAccount(
      ACCOUNTS.CUENTAS_POR_COBRAR.codigo,
      ACCOUNTS.CUENTAS_POR_COBRAR.nombre,
      ACCOUNTS.CUENTAS_POR_COBRAR.tipo
    );
    const ingresosId = await getOrCreateAccount(
      ACCOUNTS.INGRESOS_ALQUILER.codigo,
      ACCOUNTS.INGRESOS_ALQUILER.nombre,
      ACCOUNTS.INGRESOS_ALQUILER.tipo
    );

    const lineas: Array<{ orden: number; cuentaId: string; debe: number; haber: number; descripcion: string }> = [
      {
        orden: 1,
        cuentaId: cuentasCobrarId,
        debe: factura.montoTotal,
        haber: 0,
        descripcion: `Cuentas por Cobrar - Factura ${factura.tipo} ${factura.numero}`,
      },
    ];

    if (factura.tipo === "A" && factura.montoIva > 0) {
      // Tipo A: discriminate IVA
      const ivaDebitoId = await getOrCreateAccount(
        ACCOUNTS.IVA_DEBITO_FISCAL.codigo,
        ACCOUNTS.IVA_DEBITO_FISCAL.nombre,
        ACCOUNTS.IVA_DEBITO_FISCAL.tipo
      );

      lineas.push(
        {
          orden: 2,
          cuentaId: ingresosId,
          debe: 0,
          haber: factura.montoNeto,
          descripcion: `Ventas netas - Factura ${factura.tipo} ${factura.numero}`,
        },
        {
          orden: 3,
          cuentaId: ivaDebitoId,
          debe: 0,
          haber: factura.montoIva,
          descripcion: `IVA Débito Fiscal 21%`,
        }
      );
    } else {
      // Tipo B/C: IVA included
      lineas.push({
        orden: 2,
        cuentaId: ingresosId,
        debe: 0,
        haber: factura.montoTotal,
        descripcion: `Ventas - Factura ${factura.tipo} ${factura.numero}`,
      });
    }

    const totalDebe = lineas.reduce((sum, l) => sum + l.debe, 0);
    const totalHaber = lineas.reduce((sum, l) => sum + l.haber, 0);

    if (Math.abs(totalDebe - totalHaber) >= 0.01) {
      console.error(`[Accounting] Debe ≠ Haber for invoice.sale.create: ${totalDebe} vs ${totalHaber}`);
      return;
    }

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        tipo: "VENTA",
        descripcion: `Factura de venta ${factura.tipo} ${factura.numero}`,
        totalDebe,
        totalHaber,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento invoice.sale.create - Factura ${ctx.entityId.slice(0, 8)}`,
        lineas: { create: lineas },
      },
    });

    console.log(`[Accounting] Asiento VENTA creado para invoice.sale.create - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handleInvoiceSaleCreatedAccounting error:", err);
  }
}

// ─── 4. Invoice Sale Cancelled → Asiento reversión VENTA ────────────────────

export async function handleInvoiceSaleCancelledAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "invoice.sale.cancel") return;

  try {
    const factura = await prisma.factura.findUnique({
      where: { id: ctx.entityId },
    });

    if (!factura) return;

    const cuentasCobrarId = await getOrCreateAccount(
      ACCOUNTS.CUENTAS_POR_COBRAR.codigo,
      ACCOUNTS.CUENTAS_POR_COBRAR.nombre,
      ACCOUNTS.CUENTAS_POR_COBRAR.tipo
    );
    const ingresosId = await getOrCreateAccount(
      ACCOUNTS.INGRESOS_ALQUILER.codigo,
      ACCOUNTS.INGRESOS_ALQUILER.nombre,
      ACCOUNTS.INGRESOS_ALQUILER.tipo
    );

    const lineas: Array<{ orden: number; cuentaId: string; debe: number; haber: number; descripcion: string }> = [];

    if (factura.tipo === "A" && factura.montoIva > 0) {
      const ivaDebitoId = await getOrCreateAccount(
        ACCOUNTS.IVA_DEBITO_FISCAL.codigo,
        ACCOUNTS.IVA_DEBITO_FISCAL.nombre,
        ACCOUNTS.IVA_DEBITO_FISCAL.tipo
      );

      lineas.push(
        {
          orden: 1,
          cuentaId: ingresosId,
          debe: factura.montoNeto,
          haber: 0,
          descripcion: `Reversión Ventas - Anulación Factura ${factura.tipo} ${factura.numero}`,
        },
        {
          orden: 2,
          cuentaId: ivaDebitoId,
          debe: factura.montoIva,
          haber: 0,
          descripcion: `Reversión IVA Débito Fiscal`,
        },
        {
          orden: 3,
          cuentaId: cuentasCobrarId,
          debe: 0,
          haber: factura.montoTotal,
          descripcion: `Reversión Cuentas por Cobrar`,
        }
      );
    } else {
      lineas.push(
        {
          orden: 1,
          cuentaId: ingresosId,
          debe: factura.montoTotal,
          haber: 0,
          descripcion: `Reversión Ventas - Anulación Factura ${factura.tipo} ${factura.numero}`,
        },
        {
          orden: 2,
          cuentaId: cuentasCobrarId,
          debe: 0,
          haber: factura.montoTotal,
          descripcion: `Reversión Cuentas por Cobrar`,
        }
      );
    }

    const totalDebe = lineas.reduce((sum, l) => sum + l.debe, 0);
    const totalHaber = lineas.reduce((sum, l) => sum + l.haber, 0);

    if (Math.abs(totalDebe - totalHaber) >= 0.01) {
      console.error(`[Accounting] Debe ≠ Haber for invoice.sale.cancel: ${totalDebe} vs ${totalHaber}`);
      return;
    }

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        tipo: "AJUSTE",
        descripcion: `Anulación factura ${factura.tipo} ${factura.numero}`,
        totalDebe,
        totalHaber,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento invoice.sale.cancel - Factura ${ctx.entityId.slice(0, 8)}`,
        lineas: { create: lineas },
      },
    });

    console.log(`[Accounting] Asiento AJUSTE creado para invoice.sale.cancel - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handleInvoiceSaleCancelledAccounting error:", err);
  }
}

// ─── 5. Invoice Purchase Created → Asiento COMPRA ───────────────────────────

export async function handleInvoicePurchaseCreatedAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "invoice.purchase.create") return;

  try {
    const factura = await prisma.facturaCompra.findUnique({
      where: { id: ctx.entityId },
      include: {
        proveedor: { select: { nombre: true } },
      },
    });

    if (!factura) return;

    // Skip if asiento already exists (manual generar-asiento was used)
    if (factura.asientoId) {
      console.log(`[Accounting] Skipping invoice.purchase.create - asiento already exists for ${ctx.entityId.slice(0, 8)}`);
      return;
    }

    // Get expense account based on category
    const categoriaCuenta = CATEGORIA_TO_CUENTA[factura.categoria] ?? CATEGORIA_TO_CUENTA["OTRO"];
    const gastoId = await getOrCreateAccount(
      categoriaCuenta.codigo,
      categoriaCuenta.nombre,
      categoriaCuenta.tipo
    );

    const ivaCreditoId = await getOrCreateAccount(
      ACCOUNTS.IVA_CREDITO_FISCAL.codigo,
      ACCOUNTS.IVA_CREDITO_FISCAL.nombre,
      ACCOUNTS.IVA_CREDITO_FISCAL.tipo
    );

    const proveedoresId = await getOrCreateAccount(
      ACCOUNTS.PROVEEDORES.codigo,
      ACCOUNTS.PROVEEDORES.nombre,
      ACCOUNTS.PROVEEDORES.tipo
    );

    const subtotal = factura.subtotal;
    const totalIVA = factura.iva21 + factura.iva105 + factura.iva27;
    const total = factura.total;

    // Validate Debe = Haber
    const totalDebe = subtotal + totalIVA;
    const totalHaber = total;

    if (Math.abs(totalDebe - totalHaber) >= 0.01) {
      console.error(`[Accounting] Debe ≠ Haber for invoice.purchase.create: ${totalDebe} vs ${totalHaber}`);
      return;
    }

    const descripcion = `Factura ${factura.tipo} ${factura.numero} - ${factura.razonSocial}`;

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: factura.fecha,
        tipo: "COMPRA",
        descripcion,
        totalDebe,
        totalHaber,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento invoice.purchase.create - Factura ${factura.visibleId}`,
        lineas: {
          create: [
            {
              orden: 1,
              cuentaId: gastoId,
              debe: subtotal,
              haber: 0,
              descripcion: `${factura.categoria} - ${factura.razonSocial}`,
            },
            {
              orden: 2,
              cuentaId: ivaCreditoId,
              debe: totalIVA,
              haber: 0,
              descripcion: `IVA Crédito Fiscal (21%: $${factura.iva21}, 10.5%: $${factura.iva105}, 27%: $${factura.iva27})`,
            },
            {
              orden: 3,
              cuentaId: proveedoresId,
              debe: 0,
              haber: total,
              descripcion: factura.proveedor?.nombre ?? factura.razonSocial,
            },
          ],
        },
      },
    });

    // Link asiento to factura
    await prisma.facturaCompra.update({
      where: { id: factura.id },
      data: { asientoId: asiento.id },
    });

    console.log(`[Accounting] Asiento COMPRA creado para invoice.purchase.create - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handleInvoicePurchaseCreatedAccounting error:", err);
  }
}

// ─── 6. Invoice Purchase Approved → Mark asiento as cerrado ─────────────────

export async function handleInvoicePurchaseApprovedAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "invoice.purchase.approve") return;

  try {
    const factura = await prisma.facturaCompra.findUnique({
      where: { id: ctx.entityId },
      select: { asientoId: true, visibleId: true },
    });

    if (!factura || !factura.asientoId) {
      console.log(`[Accounting] No asiento found for approved purchase invoice ${ctx.entityId.slice(0, 8)}`);
      return;
    }

    await prisma.asientoContable.update({
      where: { id: factura.asientoId },
      data: { cerrado: true },
    });

    console.log(`[Accounting] Asiento cerrado (verificado) para invoice.purchase.approve - Factura ${factura.visibleId}`);
  } catch (err) {
    console.error("[Accounting] handleInvoicePurchaseApprovedAccounting error:", err);
  }
}

// ─── Registration ───────────────────────────────────────────────────────────

export function registerAccountingHandlers(): void {
  // Payment events
  eventBus.registerHandler("payment.approve", handlePaymentApprovedAccounting, {
    priority: 50,
  });
  eventBus.registerHandler("payment.refund", handlePaymentRefundAccounting, {
    priority: 50,
  });

  // Sale invoice events
  eventBus.registerHandler("invoice.sale.create", handleInvoiceSaleCreatedAccounting, {
    priority: 50,
  });
  eventBus.registerHandler("invoice.sale.cancel", handleInvoiceSaleCancelledAccounting, {
    priority: 50,
  });

  // Purchase invoice events
  eventBus.registerHandler("invoice.purchase.create", handleInvoicePurchaseCreatedAccounting, {
    priority: 50,
  });
  eventBus.registerHandler("invoice.purchase.approve", handleInvoicePurchaseApprovedAccounting, {
    priority: 50,
  });
}
