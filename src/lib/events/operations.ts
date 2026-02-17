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
      update: "accounting.entry.update",
      view: "accounting.entry.view",
      close: "accounting.entry.close",
    },
    account: {
      create: "accounting.account.create",
      update: "accounting.account.update",
      view: "accounting.account.view",
    },
    period: {
      close: "accounting.period.close",
      reopen: "accounting.period.reopen",
      view: "accounting.period.view",
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
      view: "accounting.report.view",
    },
    reconciliation: {
      execute: "accounting.reconciliation.execute",
    },
  },
  reconciliation: {
    bank_account: {
      create: "reconciliation.bank_account.create",
      update: "reconciliation.bank_account.update",
      view: "reconciliation.bank_account.view",
    },
    statement: {
      import: "reconciliation.statement.import",
      view: "reconciliation.statement.view",
    },
    process: {
      start: "reconciliation.process.start",
      complete: "reconciliation.process.complete",
      view: "reconciliation.process.view",
    },
    match: {
      create: "reconciliation.match.create",
      approve: "reconciliation.match.approve",
      reject: "reconciliation.match.reject",
      view: "reconciliation.match.view",
    },
  },
  maintenance: {
    workorder: {
      create: "maintenance.workorder.create",
      update: "maintenance.workorder.update",
      complete: "maintenance.workorder.complete",
      assign: "maintenance.workorder.assign",
      view: "maintenance.workorder.view",
    },
    appointment: {
      create: "maintenance.appointment.create",
      update: "maintenance.appointment.update",
      cancel: "maintenance.appointment.cancel",
      complete: "maintenance.appointment.complete",
      view: "maintenance.appointment.view",
    },
    checkin: {
      execute: "maintenance.checkin.execute",
    },
    checkout: {
      execute: "maintenance.checkout.execute",
    },
    plan: {
      view: "maintenance.plan.view",
    },
  },
  inventory: {
    part: {
      create: "inventory.part.create",
      update: "inventory.part.update",
      delete: "inventory.part.delete",
      view: "inventory.part.view",
      adjust_stock: "inventory.part.adjust_stock",
      import_bulk: "inventory.part.import_bulk",
      export: "inventory.part.export",
    },
    movement: {
      create: "inventory.movement.create",
      view: "inventory.movement.view",
    },
    location: {
      create: "inventory.location.create",
      update: "inventory.location.update",
      delete: "inventory.location.delete",
      view: "inventory.location.view",
    },
    purchase_order: {
      create: "inventory.purchase_order.create",
      update: "inventory.purchase_order.update",
      approve: "inventory.purchase_order.approve",
      view: "inventory.purchase_order.view",
    },
    reception: {
      create: "inventory.reception.create",
      process_item: "inventory.reception.process_item",
      finalize: "inventory.reception.finalize",
      view: "inventory.reception.view",
    },
  },
  import_shipment: {
    create: "import_shipment.create",
    update: "import_shipment.update",
    view: "import_shipment.view",
    calculate_costs: "import_shipment.calculate_costs",
    confirm_costs: "import_shipment.confirm_costs",
    dispatch: {
      create: "import_shipment.dispatch.create",
      view: "import_shipment.dispatch.view",
    },
    reception: {
      create: "import_shipment.reception.create",
      process_item: "import_shipment.reception.process_item",
      finalize: "import_shipment.reception.finalize",
    },
    generate_supplier_link: "import_shipment.generate_supplier_link",
  },
  supplier: {
    create: "supplier.create",
    update: "supplier.update",
    view: "supplier.view",
    portal: {
      view: "supplier.portal.view",
      confirm: "supplier.portal.confirm",
      labels: "supplier.portal.labels",
    },
  },
  expense: {
    create: "expense.create",
    update: "expense.update",
    view: "expense.view",
  },
  pricing: {
    rental: {
      view: "pricing.rental.view",
      update: "pricing.rental.update",
    },
    parts: {
      view: "pricing.parts.view",
      bulk_update: "pricing.parts.bulk_update",
      apply_suggestion: "pricing.parts.apply_suggestion",
      list: {
        create: "pricing.parts.list.create",
        update: "pricing.parts.list.update",
        view: "pricing.parts.list.view",
      },
      rule_discount: {
        create: "pricing.parts.rule_discount.create",
        view: "pricing.parts.rule_discount.view",
      },
      rule_markup: {
        create: "pricing.parts.rule_markup.create",
        view: "pricing.parts.rule_markup.view",
      },
      batch: {
        create: "pricing.parts.batch.create",
        view: "pricing.parts.batch.view",
      },
      rollback: "pricing.parts.rollback",
      resolve: "pricing.parts.resolve",
      category: {
        create: "pricing.parts.category.create",
        view: "pricing.parts.category.view",
      },
      customer_group: {
        create: "pricing.parts.customer_group.create",
        view: "pricing.parts.customer_group.view",
      },
    },
  },
  mechanic: {
    create: "mechanic.create",
    update: "mechanic.update",
    view: "mechanic.view",
  },
  workshop: {
    create: "workshop.create",
    update: "workshop.update",
    view: "workshop.view",
  },
  hr: {
    employee: {
      create: "hr.employee.create",
      update: "hr.employee.update",
      view: "hr.employee.view",
      terminate: "hr.employee.terminate",
    },
    payroll: {
      create: "hr.payroll.create",
      liquidate: "hr.payroll.liquidate",
      view: "hr.payroll.view",
      calculate: "hr.payroll.calculate",
      approve: "hr.payroll.approve",
    },
    absence: {
      create: "hr.absence.create",
      update: "hr.absence.update",
      approve: "hr.absence.approve",
      view: "hr.absence.view",
      request: "hr.absence.request",
    },
  },
  finance: {
    cashflow: { view: "finance.cashflow.view" },
    income_statement: { view: "finance.income_statement.view" },
    indicators: { view: "finance.indicators.view" },
    profitability: { view: "finance.profitability.view" },
    summary: { view: "finance.summary.view" },
  },
  credit_note: {
    create: "credit_note.create",
    update: "credit_note.update",
    view: "credit_note.view",
  },
  budget: {
    create: "budget.create",
    update: "budget.update",
    view: "budget.view",
  },
  user: {
    create: "user.create",
    update: "user.update",
    view: "user.view",
    profile: {
      view: "user.profile.view",
      update: "user.profile.update",
    },
  },
  alert: {
    create: "alert.create",
    update: "alert.update",
    delete: "alert.delete",
    view: "alert.view",
    generate: "alert.generate",
  },
  dashboard: {
    main: { view: "dashboard.main.view" },
    commercial: { view: "dashboard.commercial.view" },
    accounting: { view: "dashboard.accounting.view" },
    finance: { view: "dashboard.finance.view" },
    fleet: { view: "dashboard.fleet.view" },
    executive: { view: "dashboard.executive.view" },
    hr: { view: "dashboard.hr.view" },
    system: { view: "dashboard.system.view" },
  },
  system: {
    config: {
      view: "system.config.view",
      update: "system.config.update",
    },
    user: {
      create: "system.user.create",
      update: "system.user.update",
    },
    diagnostic: {
      view: "system.diagnostic.view",
      execute: "system.diagnostic.execute",
      run: "system.diagnostic.run",
    },
    export: {
      execute: "system.export.execute",
    },
    import: {
      execute: "system.import.execute",
    },
    repair: {
      execute: "system.repair.execute",
    },
    ai: {
      chat: "system.ai.chat",
      parse: "system.ai.parse",
    },
    upload: {
      execute: "system.upload.execute",
    },
    scan: {
      view: "system.scan.view",
    },
  },
  anomaly: {
    view: "anomaly.view",
    update: "anomaly.update",
    resolve: "anomaly.resolve",
    discard: "anomaly.discard",
    analysis: {
      run: "anomaly.analysis.run",
      view: "anomaly.analysis.view",
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
