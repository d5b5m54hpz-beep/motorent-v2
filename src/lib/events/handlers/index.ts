import { registerAccountingHandlers } from "./accounting";
import { registerAnomalyDetectionHandlers } from "./anomaly-detection";
import { registerInvoicingHandlers } from "./invoicing";
import { registerNotificationHandlers } from "./notifications";
import { registerMetricsHandlers } from "./metrics";

let initialized = false;

/**
 * Register ALL event handlers in the system.
 * Call this once at application startup (e.g. in middleware or layout).
 *
 * Idempotent — safe to call multiple times.
 */
export function initializeEventHandlers(): void {
  if (initialized) return;

  registerInvoicingHandlers();       // Priority 30-40 (business logic first)
  registerAccountingHandlers();      // Priority 50 (accounting entries)
  registerNotificationHandlers();        // Priority 200 (notifications after business logic)
  registerAnomalyDetectionHandlers();    // Priority 500 (anomaly detection)
  registerMetricsHandlers();             // Priority 999 (metrics last)

  initialized = true;
  console.log("[EventBus] All handlers registered");
}
