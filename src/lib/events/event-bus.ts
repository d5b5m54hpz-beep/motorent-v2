import { prisma } from "@/lib/prisma";
import type { BusinessEvent, Prisma } from "@prisma/client";
import type { OperationId } from "./operations";

// ─── Types ───────────────────────────────────────────────────────────────────

export type EventPayload = Record<string, unknown>;

export type EventContext = {
  event: BusinessEvent;
  operationId: string;
  entityType: string;
  entityId: string;
  payload: EventPayload;
  metadata: Record<string, unknown> | null;
  userId: string | null;
  parentEventId: string | null;
};

export type HandlerFn = (ctx: EventContext) => Promise<void>;

export type HandlerOptions = {
  /** Lower runs first. Default 100. */
  priority?: number;
  /** If true, handler errors are retried once. Default false. */
  retryOnFail?: boolean;
};

type RegisteredHandler = {
  pattern: string;
  handler: HandlerFn;
  options: Required<HandlerOptions>;
};

// ─── EventBus singleton ──────────────────────────────────────────────────────

class EventBus {
  private handlers: RegisteredHandler[] = [];
  private handlersInitialized = false;

  /**
   * Lazy-initialize all event handlers on first emit.
   * Idempotent — safe to call multiple times.
   */
  private ensureHandlersRegistered(): void {
    if (this.handlersInitialized) return;
    this.handlersInitialized = true;

    // Dynamic import to avoid circular dependencies at module load time
    const { initializeEventHandlers } = require("./handlers");
    initializeEventHandlers();
  }

  /**
   * Register a handler for a specific operation ID or wildcard pattern.
   *
   * Supports wildcards:
   *   - "payment.*"        → matches "payment.create", "payment.approve", etc.
   *   - "accounting.*"     → matches "accounting.entry.create", "accounting.period.close", etc.
   *   - "*"                → matches everything
   *
   * @example
   *   eventBus.registerHandler("payment.approve", handlePaymentApproved);
   *   eventBus.registerHandler("invoice.*", handleAnyInvoiceEvent, { priority: 10 });
   */
  registerHandler(
    pattern: string,
    handler: HandlerFn,
    options?: HandlerOptions
  ): void {
    this.handlers.push({
      pattern,
      handler,
      options: {
        priority: options?.priority ?? 100,
        retryOnFail: options?.retryOnFail ?? false,
      },
    });

    // Keep sorted by priority (lower first) for deterministic execution order
    this.handlers.sort((a, b) => a.options.priority - b.options.priority);
  }

  /**
   * Emit a business event.
   *
   * 1. Persists the BusinessEvent in the DB (status: PENDING)
   * 2. Finds all matching handlers
   * 3. Executes each handler (fault-tolerant — one failure doesn't block others)
   * 4. Updates the event status to COMPLETED or FAILED
   * 5. Returns the persisted event
   */
  async emit(
    operationId: OperationId | string,
    entityType: string,
    entityId: string,
    payload: EventPayload,
    userId?: string | null,
    parentEventId?: string | null
  ): Promise<BusinessEvent> {
    this.ensureHandlersRegistered();

    // 1. Persist event
    const event = await prisma.businessEvent.create({
      data: {
        operationId,
        entityType,
        entityId,
        payload: payload as Prisma.InputJsonValue,
        userId: userId ?? null,
        parentEventId: parentEventId ?? null,
        status: "PENDING",
      },
    });

    // 2. Find matching handlers
    const matchingHandlers = this.getMatchingHandlers(operationId);

    if (matchingHandlers.length === 0) {
      // No handlers — mark as completed immediately
      await prisma.businessEvent.update({
        where: { id: event.id },
        data: { status: "COMPLETED", processedAt: new Date() },
      });
      return event;
    }

    // 3. Execute handlers asynchronously (fire-and-forget, doesn't block the request)
    this.executeHandlers(event, matchingHandlers).catch((err) => {
      console.error(`[EventBus] Unexpected error in handler execution for ${operationId}:`, err);
    });

    return event;
  }

  /**
   * Synchronous emit — waits for all handlers to complete before returning.
   * Use this when downstream logic depends on handler side-effects.
   */
  async emitSync(
    operationId: OperationId | string,
    entityType: string,
    entityId: string,
    payload: EventPayload,
    userId?: string | null,
    parentEventId?: string | null
  ): Promise<BusinessEvent> {
    this.ensureHandlersRegistered();

    const event = await prisma.businessEvent.create({
      data: {
        operationId,
        entityType,
        entityId,
        payload: payload as Prisma.InputJsonValue,
        userId: userId ?? null,
        parentEventId: parentEventId ?? null,
        status: "PENDING",
      },
    });

    const matchingHandlers = this.getMatchingHandlers(operationId);

    if (matchingHandlers.length === 0) {
      await prisma.businessEvent.update({
        where: { id: event.id },
        data: { status: "COMPLETED", processedAt: new Date() },
      });
      return event;
    }

    await this.executeHandlers(event, matchingHandlers);

    // Re-read the updated event
    return prisma.businessEvent.findUniqueOrThrow({ where: { id: event.id } });
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  private getMatchingHandlers(operationId: string): RegisteredHandler[] {
    return this.handlers.filter((h) => this.matchPattern(h.pattern, operationId));
  }

  /**
   * Match a wildcard pattern against an operation ID.
   *
   *   "payment.*"         matches "payment.create", "payment.approve"
   *   "accounting.*"      matches "accounting.entry.create"
   *   "accounting.entry.*" matches "accounting.entry.create" but NOT "accounting.period.close"
   *   "*"                 matches everything
   *   "payment.approve"   matches only "payment.approve"
   */
  private matchPattern(pattern: string, operationId: string): boolean {
    if (pattern === "*") return true;
    if (pattern === operationId) return true;

    if (pattern.endsWith(".*")) {
      const prefix = pattern.slice(0, -2); // remove ".*"
      return operationId.startsWith(prefix + ".");
    }

    return false;
  }

  /**
   * Execute all matching handlers for an event. Each handler runs in its own
   * try/catch — a failure in one handler does NOT prevent others from running.
   */
  private async executeHandlers(
    event: BusinessEvent,
    handlers: RegisteredHandler[]
  ): Promise<void> {
    // Mark as processing
    await prisma.businessEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSING" },
    });

    const errors: Array<{ handler: string; error: string }> = [];

    const ctx: EventContext = {
      event,
      operationId: event.operationId,
      entityType: event.entityType,
      entityId: event.entityId,
      payload: (event.payload as EventPayload) ?? {},
      metadata: (event.metadata as Record<string, unknown>) ?? null,
      userId: event.userId,
      parentEventId: event.parentEventId,
    };

    for (const registered of handlers) {
      try {
        await registered.handler(ctx);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const handlerName = registered.handler.name || registered.pattern;

        console.error(
          `[EventBus] Handler "${handlerName}" failed for ${event.operationId}:`,
          errorMsg
        );

        // Retry once if configured
        if (registered.options.retryOnFail) {
          try {
            console.log(`[EventBus] Retrying handler "${handlerName}" for ${event.operationId}`);
            await registered.handler(ctx);
          } catch (retryErr: unknown) {
            const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
            errors.push({
              handler: handlerName,
              error: `Failed after retry: ${retryMsg}`,
            });
          }
        } else {
          errors.push({ handler: handlerName, error: errorMsg });
        }
      }
    }

    // Update event status
    const finalStatus = errors.length > 0 ? "FAILED" : "COMPLETED";
    await prisma.businessEvent.update({
      where: { id: event.id },
      data: {
        status: finalStatus,
        error: errors.length > 0 ? JSON.stringify(errors) : null,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Get count of registered handlers (useful for debugging/diagnostics).
   */
  getHandlerCount(): number {
    return this.handlers.length;
  }

  /**
   * List all registered patterns (useful for diagnostics page).
   */
  getRegisteredPatterns(): string[] {
    return this.handlers.map((h) => h.pattern);
  }
}

// ─── Singleton export ────────────────────────────────────────────────────────

export const eventBus = new EventBus();
