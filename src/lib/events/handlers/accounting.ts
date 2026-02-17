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

// ─── 7. Expense Created → Asiento COMPRA (gasto operativo) ──────────────────

export async function handleExpenseCreatedAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "expense.create") return;

  try {
    const gasto = await prisma.gasto.findUnique({
      where: { id: ctx.entityId },
      include: { proveedor: { select: { nombre: true } } },
    });

    if (!gasto) return;

    const categoriaCuenta = CATEGORIA_TO_CUENTA[gasto.categoria] ?? CATEGORIA_TO_CUENTA["OTRO"];
    const gastoAccountId = await getOrCreateAccount(
      categoriaCuenta.codigo,
      categoriaCuenta.nombre,
      categoriaCuenta.tipo
    );
    const cajaId = await getOrCreateAccount(
      ACCOUNTS.CAJA.codigo,
      ACCOUNTS.CAJA.nombre,
      ACCOUNTS.CAJA.tipo
    );

    const monto = gasto.monto;
    const descripcion = `Gasto: ${gasto.concepto} - ${gasto.proveedor?.nombre ?? "Sin proveedor"}`;

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: gasto.fecha,
        tipo: "COMPRA",
        descripcion,
        totalDebe: monto,
        totalHaber: monto,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento expense.create - Gasto ${ctx.entityId.slice(0, 8)}`,
        lineas: {
          create: [
            {
              orden: 1,
              cuentaId: gastoAccountId,
              debe: monto,
              haber: 0,
              descripcion: `${gasto.categoria} - ${gasto.concepto}`,
            },
            {
              orden: 2,
              cuentaId: cajaId,
              debe: 0,
              haber: monto,
              descripcion: `Salida por gasto: ${gasto.concepto}`,
            },
          ],
        },
      },
    });

    console.log(`[Accounting] Asiento COMPRA creado para expense.create - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handleExpenseCreatedAccounting error:", err);
  }
}

// ─── 8. Stock Adjustment → Asiento AJUSTE (si hay diferencia de valor) ──────

const INVENTARIO_ACCOUNT = { codigo: "1.1.05", nombre: "Inventario / Repuestos", tipo: "ACTIVO" as const };
const DIFERENCIA_INVENTARIO = { codigo: "5.7.02", nombre: "Diferencia de Inventario", tipo: "EGRESO" as const };
const MERCADERIA_EN_TRANSITO = { codigo: "1.1.06", nombre: "Mercadería en Tránsito", tipo: "ACTIVO" as const };
const PROVEEDORES_EXTERIOR = { codigo: "2.1.03", nombre: "Proveedores del Exterior", tipo: "PASIVO" as const };

export async function handleStockAdjustmentAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "inventory.part.adjust_stock") return;

  try {
    const cantAnterior = Number(ctx.payload?.cantidadAnterior ?? 0);
    const cantNueva = Number(ctx.payload?.cantidadNueva ?? 0);
    const diff = cantNueva - cantAnterior;
    if (diff === 0) return;

    // Get repuesto to calculate value difference
    const repuesto = await prisma.repuesto.findUnique({
      where: { id: ctx.payload?.repuestoId as string ?? ctx.entityId },
      select: { precioCompra: true, nombre: true },
    });

    if (!repuesto || repuesto.precioCompra === 0) return;

    const valorDiff = Math.abs(diff) * repuesto.precioCompra;

    const inventarioId = await getOrCreateAccount(
      INVENTARIO_ACCOUNT.codigo,
      INVENTARIO_ACCOUNT.nombre,
      INVENTARIO_ACCOUNT.tipo
    );
    const diferenciaId = await getOrCreateAccount(
      DIFERENCIA_INVENTARIO.codigo,
      DIFERENCIA_INVENTARIO.nombre,
      DIFERENCIA_INVENTARIO.tipo
    );

    const lineas = diff > 0
      ? [
          { orden: 1, cuentaId: inventarioId, debe: valorDiff, haber: 0, descripcion: `Ajuste positivo: +${diff} ${repuesto.nombre}` },
          { orden: 2, cuentaId: diferenciaId, debe: 0, haber: valorDiff, descripcion: `Diferencia de inventario` },
        ]
      : [
          { orden: 1, cuentaId: diferenciaId, debe: valorDiff, haber: 0, descripcion: `Diferencia de inventario` },
          { orden: 2, cuentaId: inventarioId, debe: 0, haber: valorDiff, descripcion: `Ajuste negativo: ${diff} ${repuesto.nombre}` },
        ];

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        tipo: "AJUSTE",
        descripcion: `Ajuste stock: ${repuesto.nombre} (${cantAnterior} → ${cantNueva})`,
        totalDebe: valorDiff,
        totalHaber: valorDiff,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento inventory.part.adjust_stock`,
        lineas: { create: lineas },
      },
    });

    console.log(`[Accounting] Asiento AJUSTE creado para inventory.part.adjust_stock - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handleStockAdjustmentAccounting error:", err);
  }
}

// ─── 9. Reception Created → Asiento COMPRA (inventario recibido) ────────────

export async function handleReceptionCreatedAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "inventory.reception.create") return;

  try {
    const recepcion = await prisma.recepcionMercaderia.findUnique({
      where: { id: ctx.entityId },
      include: {
        ordenCompra: {
          select: { total: true, proveedor: { select: { nombre: true } } },
        },
      },
    });

    if (!recepcion || !recepcion.ordenCompra) return;

    const monto = recepcion.ordenCompra.total;
    if (!monto || monto === 0) return;

    const inventarioId = await getOrCreateAccount(
      INVENTARIO_ACCOUNT.codigo,
      INVENTARIO_ACCOUNT.nombre,
      INVENTARIO_ACCOUNT.tipo
    );
    const proveedoresId = await getOrCreateAccount(
      ACCOUNTS.PROVEEDORES.codigo,
      ACCOUNTS.PROVEEDORES.nombre,
      ACCOUNTS.PROVEEDORES.tipo
    );

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        tipo: "COMPRA",
        descripcion: `Recepción mercadería - ${recepcion.ordenCompra.proveedor?.nombre ?? "Proveedor"}`,
        totalDebe: monto,
        totalHaber: monto,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento inventory.reception.create - Recepción ${ctx.entityId.slice(0, 8)}`,
        lineas: {
          create: [
            {
              orden: 1,
              cuentaId: inventarioId,
              debe: monto,
              haber: 0,
              descripcion: `Ingreso inventario por recepción`,
            },
            {
              orden: 2,
              cuentaId: proveedoresId,
              debe: 0,
              haber: monto,
              descripcion: `Cuentas por pagar proveedor`,
            },
          ],
        },
      },
    });

    console.log(`[Accounting] Asiento COMPRA creado para inventory.reception.create - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handleReceptionCreatedAccounting error:", err);
  }
}

// ─── 10. Import Confirm Costs → Asiento COMPRA (mercadería en tránsito) ─────

export async function handleImportConfirmCostsAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "import_shipment.confirm_costs") return;

  try {
    const embarque = await prisma.embarqueImportacion.findUnique({
      where: { id: ctx.entityId },
      select: {
        referencia: true,
        totalFobUsd: true,
        tipoCambioArsUsd: true,
        proveedor: { select: { nombre: true } },
      },
    });

    if (!embarque || !embarque.tipoCambioArsUsd) return;

    const montoArs = embarque.totalFobUsd * embarque.tipoCambioArsUsd;
    if (montoArs === 0) return;

    const transitoId = await getOrCreateAccount(
      MERCADERIA_EN_TRANSITO.codigo,
      MERCADERIA_EN_TRANSITO.nombre,
      MERCADERIA_EN_TRANSITO.tipo
    );
    const provExtId = await getOrCreateAccount(
      PROVEEDORES_EXTERIOR.codigo,
      PROVEEDORES_EXTERIOR.nombre,
      PROVEEDORES_EXTERIOR.tipo
    );

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        tipo: "COMPRA",
        descripcion: `Embarque ${embarque.referencia} - FOB confirmado`,
        totalDebe: montoArs,
        totalHaber: montoArs,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento import_shipment.confirm_costs - FOB USD ${embarque.totalFobUsd} × TC ${embarque.tipoCambioArsUsd}`,
        lineas: {
          create: [
            {
              orden: 1,
              cuentaId: transitoId,
              debe: montoArs,
              haber: 0,
              descripcion: `Mercadería en tránsito - ${embarque.proveedor?.nombre ?? "Exterior"}`,
            },
            {
              orden: 2,
              cuentaId: provExtId,
              debe: 0,
              haber: montoArs,
              descripcion: `Proveedores del exterior`,
            },
          ],
        },
      },
    });

    console.log(`[Accounting] Asiento COMPRA creado para import_shipment.confirm_costs - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handleImportConfirmCostsAccounting error:", err);
  }
}

// ─── 11. Import Dispatch Created → Asiento (aranceles + gastos + IVA) ───────

export async function handleImportDispatchAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "import_shipment.dispatch.create") return;

  try {
    const aranceles = Number(ctx.payload?.aranceles ?? 0);
    const ivaImportacion = Number(ctx.payload?.ivaImportacion ?? 0);
    const gastosDespacho = Number(ctx.payload?.despachante ?? 0);

    const totalGastos = aranceles + gastosDespacho;
    const totalDebe = totalGastos + ivaImportacion;
    if (totalDebe === 0) return;

    const transitoId = await getOrCreateAccount(
      MERCADERIA_EN_TRANSITO.codigo,
      MERCADERIA_EN_TRANSITO.nombre,
      MERCADERIA_EN_TRANSITO.tipo
    );
    const ivaCreditoId = await getOrCreateAccount(
      ACCOUNTS.IVA_CREDITO_FISCAL.codigo,
      ACCOUNTS.IVA_CREDITO_FISCAL.nombre,
      ACCOUNTS.IVA_CREDITO_FISCAL.tipo
    );
    const cajaId = await getOrCreateAccount(
      ACCOUNTS.CAJA.codigo,
      ACCOUNTS.CAJA.nombre,
      ACCOUNTS.CAJA.tipo
    );

    const lineas: Array<{ orden: number; cuentaId: string; debe: number; haber: number; descripcion: string }> = [];
    let orden = 1;

    if (totalGastos > 0) {
      lineas.push({
        orden: orden++,
        cuentaId: transitoId,
        debe: totalGastos,
        haber: 0,
        descripcion: `Aranceles ($${aranceles}) + Gastos despacho ($${gastosDespacho})`,
      });
    }

    if (ivaImportacion > 0) {
      lineas.push({
        orden: orden++,
        cuentaId: ivaCreditoId,
        debe: ivaImportacion,
        haber: 0,
        descripcion: `IVA Importación (crédito fiscal)`,
      });
    }

    lineas.push({
      orden: orden,
      cuentaId: cajaId,
      debe: 0,
      haber: totalDebe,
      descripcion: `Pago despacho aduanero`,
    });

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        tipo: "COMPRA",
        descripcion: `Despacho aduanero - Embarque ${ctx.entityId.slice(0, 8)}`,
        totalDebe,
        totalHaber: totalDebe,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento import_shipment.dispatch.create`,
        lineas: { create: lineas },
      },
    });

    console.log(`[Accounting] Asiento COMPRA creado para import_shipment.dispatch.create - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handleImportDispatchAccounting error:", err);
  }
}

// ─── 12. Import Reception Finalize → Reclasificación tránsito → inventario ──

export async function handleImportReceptionFinalizeAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "import_shipment.reception.finalize") return;

  try {
    const embarque = await prisma.embarqueImportacion.findUnique({
      where: { id: ctx.entityId },
      select: {
        referencia: true,
        costoTotalNoRecuperable: true,
        totalFobUsd: true,
        tipoCambioArsUsd: true,
      },
    });

    if (!embarque) return;

    // Total value to reclassify: FOB in ARS + non-recoverable costs
    const fobArs = (embarque.totalFobUsd ?? 0) * (embarque.tipoCambioArsUsd ?? 1);
    const monto = fobArs + (embarque.costoTotalNoRecuperable ?? 0);
    if (monto === 0) return;

    const inventarioId = await getOrCreateAccount(
      INVENTARIO_ACCOUNT.codigo,
      INVENTARIO_ACCOUNT.nombre,
      INVENTARIO_ACCOUNT.tipo
    );
    const transitoId = await getOrCreateAccount(
      MERCADERIA_EN_TRANSITO.codigo,
      MERCADERIA_EN_TRANSITO.nombre,
      MERCADERIA_EN_TRANSITO.tipo
    );

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        tipo: "AJUSTE",
        descripcion: `Reclasificación embarque ${embarque.referencia} → Inventario`,
        totalDebe: monto,
        totalHaber: monto,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento import_shipment.reception.finalize`,
        lineas: {
          create: [
            {
              orden: 1,
              cuentaId: inventarioId,
              debe: monto,
              haber: 0,
              descripcion: `Ingreso inventario desde embarque ${embarque.referencia}`,
            },
            {
              orden: 2,
              cuentaId: transitoId,
              debe: 0,
              haber: monto,
              descripcion: `Reclasificación mercadería en tránsito`,
            },
          ],
        },
      },
    });

    console.log(`[Accounting] Asiento AJUSTE creado para import_shipment.reception.finalize - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handleImportReceptionFinalizeAccounting error:", err);
  }
}

// ─── 13. Maintenance Work Order Complete → Asiento (gasto mantenimiento) ────

export async function handleWorkOrderCompleteAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "maintenance.workorder.complete") return;

  try {
    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id: ctx.entityId },
      select: {
        numero: true,
        costoTotal: true,
        costoRepuestos: true,
        costoManoObra: true,
        moto: { select: { marca: true, modelo: true, patente: true } },
      },
    });

    if (!orden || orden.costoTotal === 0) return;

    const gastoMantenimientoId = await getOrCreateAccount(
      CATEGORIA_TO_CUENTA["MANTENIMIENTO"].codigo,
      CATEGORIA_TO_CUENTA["MANTENIMIENTO"].nombre,
      CATEGORIA_TO_CUENTA["MANTENIMIENTO"].tipo
    );
    const cajaId = await getOrCreateAccount(
      ACCOUNTS.CAJA.codigo,
      ACCOUNTS.CAJA.nombre,
      ACCOUNTS.CAJA.tipo
    );

    const monto = orden.costoTotal;

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        tipo: "COMPRA",
        descripcion: `OT ${orden.numero} completada - ${orden.moto.marca} ${orden.moto.modelo} (${orden.moto.patente})`,
        totalDebe: monto,
        totalHaber: monto,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento maintenance.workorder.complete - Repuestos: $${orden.costoRepuestos}, Mano obra: $${orden.costoManoObra}`,
        lineas: {
          create: [
            {
              orden: 1,
              cuentaId: gastoMantenimientoId,
              debe: monto,
              haber: 0,
              descripcion: `Mantenimiento ${orden.numero}`,
            },
            {
              orden: 2,
              cuentaId: cajaId,
              debe: 0,
              haber: monto,
              descripcion: `Pago mantenimiento`,
            },
          ],
        },
      },
    });

    console.log(`[Accounting] Asiento COMPRA creado para maintenance.workorder.complete - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handleWorkOrderCompleteAccounting error:", err);
  }
}

// ─── 14. Credit Note Created → Asiento reversión parcial (ventas + IVA) ─────

const REMUNERACIONES_A_PAGAR = { codigo: "2.1.04", nombre: "Remuneraciones a Pagar", tipo: "PASIVO" as const };
const RETENCIONES_A_DEPOSITAR = { codigo: "2.1.05", nombre: "Retenciones a Depositar", tipo: "PASIVO" as const };
const CONTRIBUCIONES_A_DEPOSITAR = { codigo: "2.1.06", nombre: "Contribuciones a Depositar", tipo: "PASIVO" as const };
const CARGAS_SOCIALES = { codigo: "5.3.02", nombre: "Cargas Sociales Empleador", tipo: "EGRESO" as const };

export async function handleCreditNoteCreatedAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "credit_note.create") return;

  try {
    const nota = await prisma.notaCredito.findUnique({
      where: { id: ctx.entityId },
      select: { numero: true, monto: true, montoNeto: true, montoIva: true, motivo: true, cliente: { select: { nombre: true } } },
    });

    if (!nota || nota.monto === 0) return;

    const montoNeto = nota.montoNeto ?? nota.monto / 1.21;
    const montoIva = nota.montoIva ?? nota.monto - montoNeto;

    const ventasId = await getOrCreateAccount(
      ACCOUNTS.INGRESOS_ALQUILER.codigo,
      ACCOUNTS.INGRESOS_ALQUILER.nombre,
      ACCOUNTS.INGRESOS_ALQUILER.tipo
    );
    const ivaDebitoId = await getOrCreateAccount(
      ACCOUNTS.IVA_DEBITO_FISCAL.codigo,
      ACCOUNTS.IVA_DEBITO_FISCAL.nombre,
      ACCOUNTS.IVA_DEBITO_FISCAL.tipo
    );
    const cuentasPorCobrarId = await getOrCreateAccount(
      ACCOUNTS.CUENTAS_POR_COBRAR.codigo,
      ACCOUNTS.CUENTAS_POR_COBRAR.nombre,
      ACCOUNTS.CUENTAS_POR_COBRAR.tipo
    );

    const lineas: Array<{ orden: number; cuentaId: string; debe: number; haber: number; descripcion: string }> = [];
    let orden = 1;

    // DEBITO: Reverse ventas (partial)
    lineas.push({
      orden: orden++,
      cuentaId: ventasId,
      debe: montoNeto,
      haber: 0,
      descripcion: `Reversión ventas - NC ${nota.numero}`,
    });

    // DEBITO: Reverse IVA débito fiscal
    if (montoIva > 0) {
      lineas.push({
        orden: orden++,
        cuentaId: ivaDebitoId,
        debe: montoIva,
        haber: 0,
        descripcion: `Reversión IVA DF - NC ${nota.numero}`,
      });
    }

    // CREDITO: Cuentas por cobrar (total)
    lineas.push({
      orden: orden,
      cuentaId: cuentasPorCobrarId,
      debe: 0,
      haber: nota.monto,
      descripcion: `${nota.cliente?.nombre ?? "Cliente"} - NC ${nota.numero}`,
    });

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        tipo: "AJUSTE",
        descripcion: `Nota de Crédito ${nota.numero} - ${nota.motivo}`,
        totalDebe: nota.monto,
        totalHaber: nota.monto,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento credit_note.create`,
        lineas: { create: lineas },
      },
    });

    console.log(`[Accounting] Asiento AJUSTE creado para credit_note.create - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handleCreditNoteCreatedAccounting error:", err);
  }
}

// ─── 15. Payroll Liquidate → Asiento sueldos (bruto, cargas, retenciones) ────

export async function handlePayrollLiquidateAccounting(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "hr.payroll.liquidate") return;

  try {
    const periodo = ctx.payload?.periodo as string | undefined;
    const montoTotal = Number(ctx.payload?.montoTotal ?? 0);
    if (montoTotal === 0) return;

    // Sum all recibos from this liquidation event
    // Use the payload data which contains aggregated totals from the liquidar endpoint
    const totalBruto = Number(ctx.payload?.totalBruto ?? montoTotal);
    const totalDeducciones = Number(ctx.payload?.totalDeducciones ?? 0);
    const totalAportesPatronales = Number(ctx.payload?.totalAportesPatronales ?? 0);
    const totalNeto = Number(ctx.payload?.totalNeto ?? totalBruto - totalDeducciones);

    const sueldosId = await getOrCreateAccount(
      CATEGORIA_TO_CUENTA["SUELDOS"].codigo,
      CATEGORIA_TO_CUENTA["SUELDOS"].nombre,
      CATEGORIA_TO_CUENTA["SUELDOS"].tipo
    );
    const cargasSocialesId = await getOrCreateAccount(
      CARGAS_SOCIALES.codigo,
      CARGAS_SOCIALES.nombre,
      CARGAS_SOCIALES.tipo
    );
    const remuneracionesId = await getOrCreateAccount(
      REMUNERACIONES_A_PAGAR.codigo,
      REMUNERACIONES_A_PAGAR.nombre,
      REMUNERACIONES_A_PAGAR.tipo
    );
    const retencionesId = await getOrCreateAccount(
      RETENCIONES_A_DEPOSITAR.codigo,
      RETENCIONES_A_DEPOSITAR.nombre,
      RETENCIONES_A_DEPOSITAR.tipo
    );
    const contribucionesId = await getOrCreateAccount(
      CONTRIBUCIONES_A_DEPOSITAR.codigo,
      CONTRIBUCIONES_A_DEPOSITAR.nombre,
      CONTRIBUCIONES_A_DEPOSITAR.tipo
    );

    const totalDebe = totalBruto + totalAportesPatronales;
    const totalHaber = totalNeto + totalDeducciones + totalAportesPatronales;

    const lineas: Array<{ orden: number; cuentaId: string; debe: number; haber: number; descripcion: string }> = [];
    let orden = 1;

    // DEBITO: Sueldos y Jornales (bruto)
    lineas.push({
      orden: orden++,
      cuentaId: sueldosId,
      debe: totalBruto,
      haber: 0,
      descripcion: `Sueldos brutos - Período ${periodo ?? "N/A"}`,
    });

    // DEBITO: Cargas Sociales Empleador
    if (totalAportesPatronales > 0) {
      lineas.push({
        orden: orden++,
        cuentaId: cargasSocialesId,
        debe: totalAportesPatronales,
        haber: 0,
        descripcion: `Contribuciones patronales - Período ${periodo ?? "N/A"}`,
      });
    }

    // CREDITO: Remuneraciones a Pagar (neto)
    lineas.push({
      orden: orden++,
      cuentaId: remuneracionesId,
      debe: 0,
      haber: totalNeto,
      descripcion: `Neto a pagar empleados`,
    });

    // CREDITO: Retenciones a Depositar (aportes empleado)
    if (totalDeducciones > 0) {
      lineas.push({
        orden: orden++,
        cuentaId: retencionesId,
        debe: 0,
        haber: totalDeducciones,
        descripcion: `Retenciones empleados (jubilación, OS, sindicato, etc.)`,
      });
    }

    // CREDITO: Contribuciones a Depositar (cargas patronales)
    if (totalAportesPatronales > 0) {
      lineas.push({
        orden: orden,
        cuentaId: contribucionesId,
        debe: 0,
        haber: totalAportesPatronales,
        descripcion: `Contribuciones patronales a depositar`,
      });
    }

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(),
        tipo: "COMPRA",
        descripcion: `Liquidación sueldos - Período ${periodo ?? "N/A"}`,
        totalDebe,
        totalHaber,
        creadoPor: ctx.userId,
        notas: `Generado automáticamente por evento hr.payroll.liquidate - ${ctx.payload?.empleados ?? 0} empleados`,
        lineas: { create: lineas },
      },
    });

    console.log(`[Accounting] Asiento COMPRA creado para hr.payroll.liquidate - Asiento #${asiento.numero}`);
  } catch (err) {
    console.error("[Accounting] handlePayrollLiquidateAccounting error:", err);
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

  // Expense events
  eventBus.registerHandler("expense.create", handleExpenseCreatedAccounting, {
    priority: 50,
  });

  // Inventory events
  eventBus.registerHandler("inventory.part.adjust_stock", handleStockAdjustmentAccounting, {
    priority: 50,
  });
  eventBus.registerHandler("inventory.reception.create", handleReceptionCreatedAccounting, {
    priority: 50,
  });

  // Import shipment events
  eventBus.registerHandler("import_shipment.confirm_costs", handleImportConfirmCostsAccounting, {
    priority: 50,
  });
  eventBus.registerHandler("import_shipment.dispatch.create", handleImportDispatchAccounting, {
    priority: 50,
  });
  eventBus.registerHandler("import_shipment.reception.finalize", handleImportReceptionFinalizeAccounting, {
    priority: 50,
  });

  // Maintenance events
  eventBus.registerHandler("maintenance.workorder.complete", handleWorkOrderCompleteAccounting, {
    priority: 50,
  });

  // Credit note events
  eventBus.registerHandler("credit_note.create", handleCreditNoteCreatedAccounting, {
    priority: 50,
  });

  // Payroll events
  eventBus.registerHandler("hr.payroll.liquidate", handlePayrollLiquidateAccounting, {
    priority: 50,
  });
}
