import { eventBus, type EventContext } from "../event-bus";

/**
 * Metrics handlers — react to events by updating dashboard KPIs,
 * counters, and cached aggregations.
 *
 * Future: update real-time dashboard counters, invalidate caches, etc.
 */

export async function handleEventMetrics(ctx: EventContext): Promise<void> {
  console.log(
    `[Metrics] Event ${ctx.operationId} on ${ctx.entityType}:${ctx.entityId} → should update KPIs`
  );
  // TODO: Update dashboard metrics/caches
}

export function registerMetricsHandlers(): void {
  // Catch-all: every event updates metrics
  eventBus.registerHandler("*", handleEventMetrics, {
    priority: 999, // Run last — after all business logic
  });
}
