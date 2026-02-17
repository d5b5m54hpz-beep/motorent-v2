import { eventBus, type EventContext } from "../event-bus";

/**
 * Invoicing handlers — react to events that should trigger
 * invoice generation or updates.
 *
 * Future: auto-generate invoices when contracts activate,
 * auto-send when invoices are created, etc.
 */

export async function handleContractActivatedInvoicing(ctx: EventContext): Promise<void> {
  console.log(
    `[Invoicing] Contract activated → should generate first invoice for ${ctx.entityType}:${ctx.entityId}`
  );
  // TODO: Generate first rental invoice
}

export async function handlePaymentApprovedInvoicing(ctx: EventContext): Promise<void> {
  console.log(
    `[Invoicing] Payment approved → should update invoice status for ${ctx.entityType}:${ctx.entityId}`
  );
  // TODO: Mark related invoice as paid
}

export function registerInvoicingHandlers(): void {
  eventBus.registerHandler("rental.contract.activate", handleContractActivatedInvoicing, {
    priority: 30,
  });
  eventBus.registerHandler("payment.approve", handlePaymentApprovedInvoicing, {
    priority: 40,
  });
}
