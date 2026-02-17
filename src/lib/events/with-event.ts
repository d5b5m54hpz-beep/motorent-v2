import { eventBus } from "./event-bus";
import type { EventPayload } from "./event-bus";
import type { OperationId } from "./operations";

type WithEventOptions<T> = {
  /** The operation ID from OPERATIONS constant */
  operationId: OperationId;
  /** Entity type (e.g. "Moto", "Pago", "FacturaCompra") */
  entityType: string;
  /** Extract the entity ID from the operation result */
  getEntityId: (result: T) => string;
  /** Build the event payload from the operation result. Defaults to empty object. */
  getPayload?: (result: T) => EventPayload;
  /** The user who triggered the operation */
  userId?: string | null;
  /** If true, waits for all handlers to complete before returning. Default: false */
  sync?: boolean;
};

/**
 * Wraps a business operation with event emission.
 *
 * Executes the operation first, then emits a BusinessEvent through the EventBus.
 * If the operation throws, no event is emitted (only successful operations produce events).
 *
 * @example
 *   const moto = await withEvent({
 *     operationId: OPERATIONS.fleet.moto.create,
 *     entityType: "Moto",
 *     getEntityId: (m) => m.id,
 *     getPayload: (m) => ({ marca: m.marca, modelo: m.modelo, patente: m.patente }),
 *     userId,
 *   }, () => prisma.moto.create({ data: parsed.data }));
 */
export async function withEvent<T>(
  options: WithEventOptions<T>,
  fn: () => Promise<T>
): Promise<T> {
  // 1. Execute the business operation
  const result = await fn();

  // 2. Build event data from the result
  const entityId = options.getEntityId(result);
  const payload = options.getPayload ? options.getPayload(result) : {};

  // 3. Emit the event (fire-and-forget by default, sync if requested)
  if (options.sync) {
    await eventBus.emitSync(
      options.operationId,
      options.entityType,
      entityId,
      payload,
      options.userId ?? null
    );
  } else {
    await eventBus.emit(
      options.operationId,
      options.entityType,
      entityId,
      payload,
      options.userId ?? null
    );
  }

  return result;
}
