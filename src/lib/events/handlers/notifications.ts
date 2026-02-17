import { eventBus, type EventContext } from "../event-bus";

/**
 * Notification handlers — react to events by sending emails,
 * creating in-app alerts, or pushing notifications.
 *
 * Future: send emails via Resend, create Alerta records, etc.
 */

export async function handlePaymentNotification(ctx: EventContext): Promise<void> {
  console.log(
    `[Notifications] Payment ${ctx.operationId} → should notify client for ${ctx.entityType}:${ctx.entityId}`
  );
  // TODO: Send email notification to client
}

export async function handleContractNotification(ctx: EventContext): Promise<void> {
  console.log(
    `[Notifications] Contract event ${ctx.operationId} → should notify for ${ctx.entityType}:${ctx.entityId}`
  );
  // TODO: Send contract-related notifications
}

export async function handleMaintenanceNotification(ctx: EventContext): Promise<void> {
  console.log(
    `[Notifications] Maintenance event ${ctx.operationId} → should create alert for ${ctx.entityType}:${ctx.entityId}`
  );
  // TODO: Create in-app alert for maintenance team
}

export function registerNotificationHandlers(): void {
  eventBus.registerHandler("payment.*", handlePaymentNotification, {
    priority: 200,
  });
  eventBus.registerHandler("rental.contract.*", handleContractNotification, {
    priority: 200,
  });
  eventBus.registerHandler("maintenance.*", handleMaintenanceNotification, {
    priority: 200,
  });
}
