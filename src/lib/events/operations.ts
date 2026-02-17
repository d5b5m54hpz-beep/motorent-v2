/**
 * Central registry of all business operation IDs.
 *
 * Naming convention: domain.entity.action
 * Every event emitted through the EventBus MUST use one of these IDs.
 */
export const OPERATIONS = {
  fleet: {
    moto: {
      create: "fleet.moto.create",
      update: "fleet.moto.update",
      decommission: "fleet.moto.decommission",
      view: "fleet.moto.view",
      bulk_update: "fleet.moto.bulk_update",
      upload_document: "fleet.moto.upload_document",
      delete_document: "fleet.moto.delete_document",
      update_insurance: "fleet.moto.update_insurance",
      update_registration: "fleet.moto.update_registration",
    },
  },
  rental: {
    contract: {
      view: "rental.contract.view",
      create: "rental.contract.create",
      update: "rental.contract.update",
      activate: "rental.contract.activate",
      terminate: "rental.contract.terminate",
      exercise_purchase: "rental.contract.exercise_purchase",
    },
    client: {
      view: "rental.client.view",
      create: "rental.client.create",
      approve: "rental.client.approve",
      reject: "rental.client.reject",
      update: "rental.client.update",
      delete: "rental.client.delete",
    },
  },
  payment: {
    view: "payment.view",
    create: "payment.create",
    update: "payment.update",
    approve: "payment.approve",
    reject: "payment.reject",
    refund: "payment.refund",
    checkout: "payment.checkout",
  },
  invoice: {
    sale: {
      view: "invoice.sale.view",
      create: "invoice.sale.create",
      update: "invoice.sale.update",
      send: "invoice.sale.send",
      cancel: "invoice.sale.cancel",
    },
    purchase: {
      view: "invoice.purchase.view",
      create: "invoice.purchase.create",
      approve: "invoice.purchase.approve",
      reject: "invoice.purchase.reject",
      cancel: "invoice.purchase.cancel",
    },
    credit_note: {
      create: "invoice.credit_note.create",
    },
  },
  accounting: {
    entry: {
      create: "accounting.entry.create",
      close: "accounting.entry.close",
    },
    period: {
      close: "accounting.period.close",
      reopen: "accounting.period.reopen",
    },
    retention: {
      calculate: "accounting.retention.calculate",
    },
    perception: {
      calculate: "accounting.perception.calculate",
    },
    depreciation: {
      execute: "accounting.depreciation.execute",
    },
    tax: {
      iva_position: "accounting.tax.iva_position",
    },
    report: {
      generate: "accounting.report.generate",
    },
    reconciliation: {
      execute: "accounting.reconciliation.execute",
    },
  },
  maintenance: {
    appointment: {
      create: "maintenance.appointment.create",
      complete: "maintenance.appointment.complete",
    },
    workorder: {
      create: "maintenance.workorder.create",
      complete: "maintenance.workorder.complete",
    },
  },
  inventory: {
    part: {
      create: "inventory.part.create",
      update: "inventory.part.update",
    },
    stock: {
      adjust: "inventory.stock.adjust",
    },
    purchase_order: {
      create: "inventory.purchase_order.create",
      approve: "inventory.purchase_order.approve",
    },
  },
  import_: {
    shipment: {
      create: "import.shipment.create",
      finalize_cost: "import.shipment.finalize_cost",
    },
  },
  hr: {
    employee: {
      create: "hr.employee.create",
      update: "hr.employee.update",
      terminate: "hr.employee.terminate",
    },
    payroll: {
      calculate: "hr.payroll.calculate",
      approve: "hr.payroll.approve",
    },
    absence: {
      request: "hr.absence.request",
      approve: "hr.absence.approve",
    },
  },
  system: {
    config: {
      update: "system.config.update",
    },
    user: {
      create: "system.user.create",
      update: "system.user.update",
    },
    diagnostic: {
      run: "system.diagnostic.run",
    },
  },
} as const;

// ─── Type extraction ─────────────────────────────────────────────────────────

/**
 * Recursively extract all leaf string values from a nested const object.
 */
type DeepStringValues<T> = T extends string
  ? T
  : T extends Record<string, unknown>
    ? { [K in keyof T]: DeepStringValues<T[K]> }[keyof T]
    : never;

/**
 * Union type of every valid operation ID in the system.
 * Example: "fleet.moto.create" | "payment.approve" | ...
 */
export type OperationId = DeepStringValues<typeof OPERATIONS>;
