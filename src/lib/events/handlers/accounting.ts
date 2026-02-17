import { eventBus, type EventContext } from "../event-bus";

/**
 * Accounting handlers — react to business events that require
 * accounting entries (asientos contables).
 *
 * Future: auto-create asientos when payments are approved,
 * invoices are created, etc.
 */

export async function handlePaymentApprovedAccounting(ctx: EventContext): Promise<void> {
  console.log(
    `[Accounting] Payment approved → should create asiento contable for ${ctx.entityType}:${ctx.entityId}`
  );
  // TODO: Create asiento contable for the payment
}

export async function handleInvoiceCreatedAccounting(ctx: EventContext): Promise<void> {
  console.log(
    `[Accounting] Invoice created → should create asiento contable for ${ctx.entityType}:${ctx.entityId}`
  );
  // TODO: Create asiento contable for the invoice
}

export function registerAccountingHandlers(): void {
  eventBus.registerHandler("payment.approve", handlePaymentApprovedAccounting, {
    priority: 50,
  });
  eventBus.registerHandler("invoice.sale.create", handleInvoiceCreatedAccounting, {
    priority: 50,
  });
  eventBus.registerHandler("invoice.purchase.create", handleInvoiceCreatedAccounting, {
    priority: 50,
  });
}
