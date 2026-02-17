import { eventBus, type EventContext } from "../event-bus";
import {
  detectarPagosDuplicados,
  detectarGastosInusuales,
  detectarStockCritico,
  detectarPatronesSospechosos,
} from "@/lib/services/anomaly-detector";

// ─── Payment Approved → Check for duplicates ─────────────────────────────────
export async function handlePaymentAnomalyDetection(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "payment.approve") return;

  try {
    const count = await detectarPagosDuplicados(ctx.entityId);
    if (count > 0) {
      console.log(`[AnomalyDetection] ${count} potential duplicate payment(s) detected for payment ${ctx.entityId.slice(0, 8)}`);
    }
  } catch (err) {
    console.error("[AnomalyDetection] handlePaymentAnomalyDetection error:", err);
  }
}

// ─── Expense Created → Check for unusual spending ────────────────────────────
export async function handleExpenseAnomalyDetection(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "expense.create") return;

  try {
    const count = await detectarGastosInusuales();
    if (count > 0) {
      console.log(`[AnomalyDetection] ${count} unusual expense(s) detected after expense ${ctx.entityId.slice(0, 8)}`);
    }
  } catch (err) {
    console.error("[AnomalyDetection] handleExpenseAnomalyDetection error:", err);
  }
}

// ─── Stock Adjusted → Check for critical stock ───────────────────────────────
export async function handleStockAnomalyDetection(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "inventory.part.adjust_stock") return;

  try {
    const repuestoId = (ctx.payload?.repuestoId as string) ?? ctx.entityId;
    const count = await detectarStockCritico(repuestoId);
    if (count > 0) {
      console.log(`[AnomalyDetection] ${count} critical stock anomaly(ies) detected for repuesto ${repuestoId.slice(0, 8)}`);
    }
  } catch (err) {
    console.error("[AnomalyDetection] handleStockAnomalyDetection error:", err);
  }
}

// ─── Payment Refunded → Check for suspicious refund patterns ─────────────────
export async function handleRefundAnomalyDetection(ctx: EventContext): Promise<void> {
  if (ctx.operationId !== "payment.refund") return;

  try {
    const count = await detectarPatronesSospechosos();
    if (count > 0) {
      console.log(`[AnomalyDetection] ${count} suspicious pattern(s) detected after refund ${ctx.entityId.slice(0, 8)}`);
    }
  } catch (err) {
    console.error("[AnomalyDetection] handleRefundAnomalyDetection error:", err);
  }
}

// ─── Registration ───────────────────────────────────────────────────────────
export function registerAnomalyDetectionHandlers(): void {
  eventBus.registerHandler("payment.approve", handlePaymentAnomalyDetection, {
    priority: 500,
  });
  eventBus.registerHandler("expense.create", handleExpenseAnomalyDetection, {
    priority: 500,
  });
  eventBus.registerHandler("inventory.part.adjust_stock", handleStockAnomalyDetection, {
    priority: 500,
  });
  eventBus.registerHandler("payment.refund", handleRefundAnomalyDetection, {
    priority: 500,
  });
}
