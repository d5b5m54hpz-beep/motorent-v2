# MotoRent v2 — Operations Catalog

> **Generated**: 2026-02-18
> **Total Operations**: 198
> **Domains**: 28

This document catalogs every discrete operation in the MotoRent v2 system, organized by business domain. For each operation the following is documented:

| Column | Meaning |
|---|---|
| **Operation ID** | Fully qualified event/operation identifier |
| **Description** | What the operation does |
| **Permission** | `view` = read-only, `create` = create resource, `update` = modify resource, `delete` = remove resource, `execute` = run process, `approve` = requires elevated approval |
| **Accounting** | Whether the operation triggers an `AsientoContable` entry and which type |
| **Notification** | Whether the operation creates an `Alerta` or sends an email |
| **Anomaly** | Whether the operation triggers real-time anomaly detection |
| **Invoicing** | Whether the operation auto-creates a `Factura` |

Legend for side-effect columns: **Y** = yes, **N** = no. Details in parentheses where applicable.

---

## Table of Contents

1. [Fleet](#1-fleet)
2. [Rental - Contract](#2-rental---contract)
3. [Rental - Client](#3-rental---client)
4. [Payment](#4-payment)
5. [Invoice - Sale](#5-invoice---sale)
6. [Invoice - Purchase](#6-invoice---purchase)
7. [Invoice - Credit Note](#7-invoice---credit-note)
8. [Credit Note](#8-credit-note)
9. [Accounting - Entry](#9-accounting---entry)
10. [Accounting - Account](#10-accounting---account)
11. [Accounting - Period](#11-accounting---period)
12. [Accounting - Tax & Reports](#12-accounting---tax--reports)
13. [Reconciliation](#13-reconciliation)
14. [Maintenance - Work Order](#14-maintenance---work-order)
15. [Maintenance - Appointment](#15-maintenance---appointment)
16. [Maintenance - Other](#16-maintenance---other)
17. [Inventory - Part](#17-inventory---part)
18. [Inventory - Movement](#18-inventory---movement)
19. [Inventory - Location](#19-inventory---location)
20. [Inventory - Purchase Order](#20-inventory---purchase-order)
21. [Inventory - Reception](#21-inventory---reception)
22. [Import Shipment](#22-import-shipment)
23. [Supplier](#23-supplier)
24. [Expense](#24-expense)
25. [Pricing - Rental](#25-pricing---rental)
26. [Pricing - Parts](#26-pricing---parts)
27. [Mechanic](#27-mechanic)
28. [Workshop](#28-workshop)
29. [HR - Employee](#29-hr---employee)
30. [HR - Payroll](#30-hr---payroll)
31. [HR - Absence](#31-hr---absence)
32. [Finance](#32-finance)
33. [Budget](#33-budget)
34. [User](#34-user)
35. [Alert](#35-alert)
36. [Dashboard](#36-dashboard)
37. [System](#37-system)
38. [Anomaly](#38-anomaly)
39. [Monitor](#39-monitor)
40. [Side-Effect Summary](#side-effect-summary)

---

## 1. Fleet

9 operations managing the motorcycle fleet lifecycle.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `fleet.moto.view` | View motorcycle details and list | view | N | N | N | N |
| 2 | `fleet.moto.create` | Register a new motorcycle in the fleet | create | N | N | N | N |
| 3 | `fleet.moto.update` | Update motorcycle data (km, status, notes) | update | N | N | N | N |
| 4 | `fleet.moto.bulk_update` | Bulk update multiple motorcycles at once | update | N | N | N | N |
| 5 | `fleet.moto.decommission` | Decommission/retire a motorcycle from active fleet | execute | N | Y (URGENTE/BAJA_MOTO) | N | N |
| 6 | `fleet.moto.upload_document` | Upload document (title, insurance, VTV) to a motorcycle | create | N | N | N | N |
| 7 | `fleet.moto.delete_document` | Remove a document from a motorcycle | delete | N | N | N | N |
| 8 | `fleet.moto.update_insurance` | Update insurance policy details for a motorcycle | update | N | N | N | N |
| 9 | `fleet.moto.update_registration` | Update registration/patent details for a motorcycle | update | N | N | N | N |

---

## 2. Rental - Contract

6 operations managing rental contracts from creation through termination or purchase.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `rental.contract.view` | View contract details and list | view | N | N | N | N |
| 2 | `rental.contract.create` | Create a new rental contract | create | N | N | N | N |
| 3 | `rental.contract.update` | Modify contract terms or details | update | N | N | N | N |
| 4 | `rental.contract.activate` | Activate a pending contract (starts rental period) | approve | N | Y (CONTRATO_ACTIVADO + email) | N | Y (deposit Factura Type B) |
| 5 | `rental.contract.terminate` | Terminate an active contract early | execute | N | Y (CONTRATO_CANCELADO) | N | N |
| 6 | `rental.contract.exercise_purchase` | Client exercises purchase option on rented motorcycle | approve | N | N | N | N |

---

## 3. Rental - Client

6 operations for client onboarding and management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `rental.client.view` | View client details and list | view | N | N | N | N |
| 2 | `rental.client.create` | Register a new client | create | N | N | N | N |
| 3 | `rental.client.approve` | Approve a client after KYC verification | approve | N | Y (email only) | N | N |
| 4 | `rental.client.reject` | Reject a client application | execute | N | N | N | N |
| 5 | `rental.client.update` | Update client information | update | N | N | N | N |
| 6 | `rental.client.delete` | Remove a client record | delete | N | N | N | N |

---

## 4. Payment

7 operations for payment processing, approval, and refunds.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `payment.view` | View payment details and list | view | N | N | N | N |
| 2 | `payment.create` | Register a new payment | create | N | Y (PAGO) | N | N |
| 3 | `payment.update` | Modify payment details before approval | update | N | Y (PAGO) | N | N |
| 4 | `payment.approve` | Approve a pending payment | approve | Y (COBRO: Caja <> Ingresos) | Y (PAGO/URGENTE) | Y (detectarPagosDuplicados) | Y (auto-creates Factura Type B) |
| 5 | `payment.reject` | Reject a pending payment | execute | N | Y (URGENTE) | N | N |
| 6 | `payment.refund` | Process a payment refund | approve | Y (AJUSTE: Ingresos <> Caja) | Y (PAGO/URGENTE) | Y (detectarPatronesSospechosos) | N |
| 7 | `payment.checkout` | Initiate MercadoPago checkout flow | execute | N | Y (PAGO) | N | N |

> **Note**: The notification handler uses a wildcard `payment.*` match, so all payment operations trigger PAGO-type alerts.

---

## 5. Invoice - Sale

5 operations for outgoing (sale) invoices.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `invoice.sale.view` | View sale invoice details and list | view | N | N | N | N |
| 2 | `invoice.sale.create` | Create a new sale invoice | create | Y (VENTA: Ctas x Cobrar <> Ingresos + IVA) | N | N | N |
| 3 | `invoice.sale.update` | Modify a draft sale invoice | update | N | N | N | N |
| 4 | `invoice.sale.send` | Send invoice to client via email | execute | N | N | N | N |
| 5 | `invoice.sale.cancel` | Cancel/void a sale invoice | execute | Y (AJUSTE: reverse of original entry) | N | N | N |

---

## 6. Invoice - Purchase

5 operations for incoming (purchase) invoices from suppliers.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `invoice.purchase.view` | View purchase invoice details and list | view | N | N | N | N |
| 2 | `invoice.purchase.create` | Register a new purchase invoice | create | Y (COMPRA: Gastos + IVA <> Proveedores) | N | N | N |
| 3 | `invoice.purchase.approve` | Approve a purchase invoice for payment | approve | Y (closes the open asiento) | N | N | N |
| 4 | `invoice.purchase.reject` | Reject a purchase invoice | execute | N | N | N | N |
| 5 | `invoice.purchase.cancel` | Cancel a purchase invoice | execute | N | N | N | N |

---

## 7. Invoice - Credit Note

1 operation (see also [Credit Note domain](#8-credit-note) for additional operations).

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `invoice.credit_note.create` | Create a credit note linked to an invoice | create | N | N | N | N |

---

## 8. Credit Note

3 operations for standalone credit note management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `credit_note.create` | Create a credit note | create | Y (AJUSTE: Ventas + IVA <> Ctas x Cobrar) | N | N | N |
| 2 | `credit_note.update` | Modify a draft credit note | update | N | N | N | N |
| 3 | `credit_note.view` | View credit note details and list | view | N | N | N | N |

---

## 9. Accounting - Entry

4 operations for manual journal entries (asientos contables).

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `accounting.entry.view` | View journal entry details and list | view | N | N | N | N |
| 2 | `accounting.entry.create` | Create a manual journal entry | create | N | N | N | N |
| 3 | `accounting.entry.update` | Modify a draft journal entry | update | N | N | N | N |
| 4 | `accounting.entry.close` | Close/post a journal entry (makes it immutable) | execute | N | N | N | N |

---

## 10. Accounting - Account

3 operations for chart of accounts management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `accounting.account.view` | View account details and chart of accounts | view | N | N | N | N |
| 2 | `accounting.account.create` | Create a new account in the chart | create | N | N | N | N |
| 3 | `accounting.account.update` | Modify account details (name, type, parent) | update | N | N | N | N |

---

## 11. Accounting - Period

3 operations for fiscal period management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `accounting.period.view` | View fiscal period details | view | N | N | N | N |
| 2 | `accounting.period.close` | Close a fiscal period (prevents new entries) | approve | N | N | N | N |
| 3 | `accounting.period.reopen` | Reopen a previously closed period | approve | N | N | N | N |

---

## 12. Accounting - Tax & Reports

7 operations for tax calculations, depreciation, and financial reporting.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `accounting.retention.calculate` | Calculate tax retentions (IIBB, Ganancias) | execute | N | N | N | N |
| 2 | `accounting.perception.calculate` | Calculate tax perceptions (IVA, IIBB) | execute | N | N | N | N |
| 3 | `accounting.depreciation.execute` | Run asset depreciation calculation | execute | N | N | N | N |
| 4 | `accounting.tax.iva_position` | Determine IVA fiscal position for a transaction | execute | N | N | N | N |
| 5 | `accounting.report.generate` | Generate a financial report (balance, P&L, etc.) | view | N | N | N | N |
| 6 | `accounting.report.view` | View a previously generated report | view | N | N | N | N |
| 7 | `accounting.reconciliation.execute` | Execute account reconciliation process | execute | N | N | N | N |

---

## 13. Reconciliation

12 operations for bank reconciliation workflow.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `reconciliation.bank_account.view` | View bank account details | view | N | N | N | N |
| 2 | `reconciliation.bank_account.create` | Register a new bank account | create | N | N | N | N |
| 3 | `reconciliation.bank_account.update` | Modify bank account details | update | N | N | N | N |
| 4 | `reconciliation.statement.view` | View imported bank statement | view | N | N | N | N |
| 5 | `reconciliation.statement.import` | Import a bank statement (CSV/OFX) | execute | N | N | N | N |
| 6 | `reconciliation.process.view` | View reconciliation process status | view | N | N | N | N |
| 7 | `reconciliation.process.start` | Start a new reconciliation process | execute | N | Y (CONCILIACION) | N | N |
| 8 | `reconciliation.process.complete` | Complete and finalize a reconciliation | execute | Y (AJUSTE: Banco <> Diferencia Conciliacion) | Y (URGENTE/CONCILIACION) | N | N |
| 9 | `reconciliation.match.view` | View reconciliation match details | view | N | N | N | N |
| 10 | `reconciliation.match.create` | Create a manual match between statement and entry | create | N | N | N | N |
| 11 | `reconciliation.match.approve` | Approve a reconciliation match | approve | N | N | N | N |
| 12 | `reconciliation.match.reject` | Reject a reconciliation match | execute | N | N | N | N |

---

## 14. Maintenance - Work Order

5 operations for maintenance work order lifecycle.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `maintenance.workorder.view` | View work order details and list | view | N | N | N | N |
| 2 | `maintenance.workorder.create` | Create a new maintenance work order | create | N | Y (URGENTE/MANTENIMIENTO) | N | N |
| 3 | `maintenance.workorder.update` | Modify work order details or parts list | update | N | N | N | N |
| 4 | `maintenance.workorder.assign` | Assign a mechanic to the work order | execute | N | N | N | N |
| 5 | `maintenance.workorder.complete` | Mark work order as completed | execute | Y (COMPRA: Mantenimiento <> Caja) | Y (MANTENIMIENTO) | N | N |

---

## 15. Maintenance - Appointment

5 operations for scheduling maintenance appointments.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `maintenance.appointment.view` | View appointment details and calendar | view | N | N | N | N |
| 2 | `maintenance.appointment.create` | Schedule a maintenance appointment | create | N | N | N | N |
| 3 | `maintenance.appointment.update` | Reschedule or modify an appointment | update | N | N | N | N |
| 4 | `maintenance.appointment.cancel` | Cancel a scheduled appointment | execute | N | N | N | N |
| 5 | `maintenance.appointment.complete` | Mark appointment as completed | execute | N | N | N | N |

---

## 16. Maintenance - Other

3 operations for check-in/check-out inspections and plan viewing.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `maintenance.checkin.execute` | Execute motorcycle check-in inspection | execute | N | N | N | N |
| 2 | `maintenance.checkout.execute` | Execute motorcycle check-out inspection | execute | N | N | N | N |
| 3 | `maintenance.plan.view` | View preventive maintenance plan | view | N | N | N | N |

---

## 17. Inventory - Part

7 operations for spare parts management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `inventory.part.view` | View part details, stock levels, and list | view | N | N | N | N |
| 2 | `inventory.part.create` | Register a new spare part in catalog | create | N | N | N | N |
| 3 | `inventory.part.update` | Modify part details (name, category, min stock) | update | N | N | N | N |
| 4 | `inventory.part.delete` | Remove a part from catalog | delete | N | N | N | N |
| 5 | `inventory.part.adjust_stock` | Manual stock adjustment (correction, loss, etc.) | execute | Y (AJUSTE: Inventario <> Diferencia) | Y (URGENTE, if below minimum) | Y (detectarStockCritico) | N |
| 6 | `inventory.part.import_bulk` | Bulk import parts from spreadsheet | execute | N | N | N | N |
| 7 | `inventory.part.export` | Export parts catalog to spreadsheet | view | N | N | N | N |

---

## 18. Inventory - Movement

2 operations for tracking inventory movements.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `inventory.movement.view` | View stock movement history | view | N | N | N | N |
| 2 | `inventory.movement.create` | Record a stock movement between locations | create | N | N | N | N |

---

## 19. Inventory - Location

4 operations for warehouse/location management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `inventory.location.view` | View storage location details | view | N | N | N | N |
| 2 | `inventory.location.create` | Create a new storage location | create | N | N | N | N |
| 3 | `inventory.location.update` | Modify location details | update | N | N | N | N |
| 4 | `inventory.location.delete` | Remove a storage location | delete | N | N | N | N |

---

## 20. Inventory - Purchase Order

4 operations for purchase order management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `inventory.purchase_order.view` | View purchase order details and list | view | N | N | N | N |
| 2 | `inventory.purchase_order.create` | Create a new purchase order for parts | create | N | N | N | N |
| 3 | `inventory.purchase_order.update` | Modify purchase order items or quantities | update | N | N | N | N |
| 4 | `inventory.purchase_order.approve` | Approve a purchase order for sending to supplier | approve | N | N | N | N |

---

## 21. Inventory - Reception

4 operations for receiving goods from suppliers.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `inventory.reception.view` | View reception details and list | view | N | N | N | N |
| 2 | `inventory.reception.create` | Create a new goods reception | create | Y (COMPRA: Inventario <> Proveedores) | N | N | N |
| 3 | `inventory.reception.process_item` | Process/verify an individual item in reception | execute | N | N | N | N |
| 4 | `inventory.reception.finalize` | Finalize reception and update stock | execute | N | N | N | N |

---

## 22. Import Shipment

11 operations for international import management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `import_shipment.view` | View import shipment details and list | view | N | N | N | N |
| 2 | `import_shipment.create` | Create a new import shipment record | create | N | N | N | N |
| 3 | `import_shipment.update` | Modify import shipment details | update | N | N | N | N |
| 4 | `import_shipment.calculate_costs` | Calculate landed costs (freight, customs, taxes) | execute | N | N | N | N |
| 5 | `import_shipment.confirm_costs` | Confirm and lock landed costs | approve | Y (COMPRA: Merc.Transito <> Prov.Exterior) | N | N | N |
| 6 | `import_shipment.dispatch.view` | View customs dispatch details | view | N | N | N | N |
| 7 | `import_shipment.dispatch.create` | Create a customs dispatch record | create | Y (COMPRA: Merc.Transito + IVA <> Caja) | N | N | N |
| 8 | `import_shipment.reception.create` | Create reception for imported goods | create | N | N | N | N |
| 9 | `import_shipment.reception.process_item` | Process individual imported item | execute | N | N | N | N |
| 10 | `import_shipment.reception.finalize` | Finalize import reception and transfer to inventory | execute | Y (AJUSTE: Inventario <> Merc.Transito) | Y (IMPORTACION) | N | N |
| 11 | `import_shipment.generate_supplier_link` | Generate a link for supplier portal access | execute | N | N | N | N |

---

## 23. Supplier

6 operations for supplier management and portal.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `supplier.view` | View supplier details and list | view | N | N | N | N |
| 2 | `supplier.create` | Register a new supplier | create | N | N | N | N |
| 3 | `supplier.update` | Modify supplier information | update | N | N | N | N |
| 4 | `supplier.portal.view` | View supplier portal (supplier-facing) | view | N | N | N | N |
| 5 | `supplier.portal.confirm` | Supplier confirms an order via portal | execute | N | N | N | N |
| 6 | `supplier.portal.labels` | Generate shipping labels for supplier | execute | N | N | N | N |

---

## 24. Expense

3 operations for expense tracking.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `expense.view` | View expense details and list | view | N | N | N | N |
| 2 | `expense.create` | Register a new expense | create | Y (COMPRA: Gasto <> Caja) | Y (URGENTE, if > $500k) | Y (detectarGastosInusuales) | N |
| 3 | `expense.update` | Modify expense details | update | N | N | N | N |

---

## 25. Pricing - Rental

2 operations for rental pricing configuration.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `pricing.rental.view` | View rental pricing tables | view | N | N | N | N |
| 2 | `pricing.rental.update` | Update rental pricing (daily, weekly, monthly rates) | update | N | N | N | N |

---

## 26. Pricing - Parts

18 operations for the comprehensive parts pricing engine.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `pricing.parts.view` | View parts pricing overview | view | N | N | N | N |
| 2 | `pricing.parts.bulk_update` | Bulk update prices for multiple parts | execute | N | N | N | N |
| 3 | `pricing.parts.apply_suggestion` | Apply an AI-suggested price change | execute | N | N | N | N |
| 4 | `pricing.parts.list.view` | View price lists | view | N | N | N | N |
| 5 | `pricing.parts.list.create` | Create a new price list | create | N | N | N | N |
| 6 | `pricing.parts.list.update` | Modify a price list | update | N | N | N | N |
| 7 | `pricing.parts.rule_discount.view` | View discount rules | view | N | N | N | N |
| 8 | `pricing.parts.rule_discount.create` | Create a discount rule | create | N | N | N | N |
| 9 | `pricing.parts.rule_markup.view` | View markup rules | view | N | N | N | N |
| 10 | `pricing.parts.rule_markup.create` | Create a markup rule | create | N | N | N | N |
| 11 | `pricing.parts.batch.view` | View batch price change history | view | N | N | N | N |
| 12 | `pricing.parts.batch.create` | Create a batch price change | create | N | N | N | N |
| 13 | `pricing.parts.rollback` | Rollback a batch price change | execute | N | N | N | N |
| 14 | `pricing.parts.resolve` | Resolve a pricing conflict | execute | N | N | N | N |
| 15 | `pricing.parts.category.view` | View pricing categories | view | N | N | N | N |
| 16 | `pricing.parts.category.create` | Create a pricing category | create | N | N | N | N |
| 17 | `pricing.parts.customer_group.view` | View customer group pricing | view | N | N | N | N |
| 18 | `pricing.parts.customer_group.create` | Create a customer group pricing tier | create | N | N | N | N |

---

## 27. Mechanic

3 operations for mechanic management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `mechanic.view` | View mechanic details and list | view | N | N | N | N |
| 2 | `mechanic.create` | Register a new mechanic | create | N | N | N | N |
| 3 | `mechanic.update` | Modify mechanic information | update | N | N | N | N |

---

## 28. Workshop

3 operations for workshop/location management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `workshop.view` | View workshop details and list | view | N | N | N | N |
| 2 | `workshop.create` | Register a new workshop | create | N | N | N | N |
| 3 | `workshop.update` | Modify workshop information | update | N | N | N | N |

---

## 29. HR - Employee

4 operations for employee lifecycle management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `hr.employee.view` | View employee details and list | view | N | N | N | N |
| 2 | `hr.employee.create` | Register a new employee | create | N | N | N | N |
| 3 | `hr.employee.update` | Modify employee information | update | N | N | N | N |
| 4 | `hr.employee.terminate` | Terminate an employee | execute | N | N | N | N |

---

## 30. HR - Payroll

5 operations for payroll processing.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `hr.payroll.view` | View payroll details and history | view | N | N | N | N |
| 2 | `hr.payroll.create` | Create a new payroll period | create | N | N | N | N |
| 3 | `hr.payroll.calculate` | Calculate payroll amounts (gross, deductions, net) | execute | N | N | N | N |
| 4 | `hr.payroll.liquidate` | Liquidate payroll (process payment) | execute | Y (COMPRA: Sueldos + Cargas <> Remuneraciones + Retenciones) | N | N | N |
| 5 | `hr.payroll.approve` | Approve payroll for liquidation | approve | N | N | N | N |

---

## 31. HR - Absence

5 operations for employee absence management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `hr.absence.view` | View absence records and calendar | view | N | N | N | N |
| 2 | `hr.absence.create` | Record an employee absence | create | N | N | N | N |
| 3 | `hr.absence.update` | Modify absence details | update | N | N | N | N |
| 4 | `hr.absence.request` | Employee requests time off | create | N | N | N | N |
| 5 | `hr.absence.approve` | Approve an absence request | approve | N | N | N | N |

---

## 32. Finance

5 read-only operations for financial reporting dashboards.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `finance.cashflow.view` | View cash flow projections and history | view | N | N | N | N |
| 2 | `finance.income_statement.view` | View income statement (P&L) | view | N | N | N | N |
| 3 | `finance.indicators.view` | View financial KPI indicators | view | N | N | N | N |
| 4 | `finance.profitability.view` | View profitability analysis by moto/contract | view | N | N | N | N |
| 5 | `finance.summary.view` | View financial summary overview | view | N | N | N | N |

---

## 33. Budget

3 operations for budget management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `budget.view` | View budget details and comparisons | view | N | N | N | N |
| 2 | `budget.create` | Create a new budget | create | N | N | N | N |
| 3 | `budget.update` | Modify budget allocations | update | N | N | N | N |

---

## 34. User

5 operations for user and profile management.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `user.view` | View user list and details | view | N | N | N | N |
| 2 | `user.create` | Create a new user account | create | N | N | N | N |
| 3 | `user.update` | Modify user details and role | update | N | N | N | N |
| 4 | `user.profile.view` | View own profile | view | N | N | N | N |
| 5 | `user.profile.update` | Update own profile details | update | N | N | N | N |

---

## 35. Alert

5 operations for the notification/alert system.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `alert.view` | View alerts and notification history | view | N | N | N | N |
| 2 | `alert.create` | Create a manual alert | create | N | N | N | N |
| 3 | `alert.update` | Update alert status (read/unread) | update | N | N | N | N |
| 4 | `alert.delete` | Delete an alert | delete | N | N | N | N |
| 5 | `alert.generate` | Trigger alert generation (e.g., for expirations) | execute | N | N | N | N |

---

## 36. Dashboard

8 read-only operations for dashboard views.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `dashboard.main.view` | View main dashboard with KPIs | view | N | N | N | N |
| 2 | `dashboard.commercial.view` | View commercial metrics dashboard | view | N | N | N | N |
| 3 | `dashboard.accounting.view` | View accounting dashboard | view | N | N | N | N |
| 4 | `dashboard.finance.view` | View financial dashboard | view | N | N | N | N |
| 5 | `dashboard.fleet.view` | View fleet status dashboard | view | N | N | N | N |
| 6 | `dashboard.executive.view` | View executive summary dashboard | view | N | N | N | N |
| 7 | `dashboard.hr.view` | View HR metrics dashboard | view | N | N | N | N |
| 8 | `dashboard.system.view` | View system health dashboard | view | N | N | N | N |

---

## 37. System

14 operations for system administration and utilities.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `system.config.view` | View system configuration | view | N | N | N | N |
| 2 | `system.config.update` | Modify system configuration | update | N | N | N | N |
| 3 | `system.user.create` | Create a system-level user | create | N | N | N | N |
| 4 | `system.user.update` | Modify a system-level user | update | N | N | N | N |
| 5 | `system.diagnostic.view` | View system diagnostic results | view | N | N | N | N |
| 6 | `system.diagnostic.execute` | Run system diagnostics | execute | N | N | N | N |
| 7 | `system.diagnostic.run` | Run a specific diagnostic check | execute | N | N | N | N |
| 8 | `system.export.execute` | Export data to file (CSV, Excel) | execute | N | N | N | N |
| 9 | `system.import.execute` | Import data from file | execute | N | N | N | N |
| 10 | `system.repair.execute` | Run data repair/consistency fixes | execute | N | N | N | N |
| 11 | `system.ai.chat` | AI chat assistant interaction | execute | N | N | N | N |
| 12 | `system.ai.parse` | AI document/image parsing | execute | N | N | N | N |
| 13 | `system.upload.execute` | Upload a file to storage | execute | N | N | N | N |
| 14 | `system.scan.view` | View barcode/QR scan results | view | N | N | N | N |

---

## 38. Anomaly

6 operations for the anomaly detection and investigation module.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `anomaly.view` | View detected anomalies list | view | N | N | N | N |
| 2 | `anomaly.update` | Update anomaly details or notes | update | N | N | N | N |
| 3 | `anomaly.resolve` | Mark an anomaly as resolved | execute | N | N | N | N |
| 4 | `anomaly.discard` | Discard a false-positive anomaly | execute | N | N | N | N |
| 5 | `anomaly.analysis.run` | Run anomaly analysis on a dataset | execute | N | N | N | N |
| 6 | `anomaly.analysis.view` | View anomaly analysis results | view | N | N | N | N |

---

## 39. Monitor

4 operations for system monitoring and observability.

| # | Operation ID | Description | Permission | Accounting | Notification | Anomaly | Invoicing |
|---|---|---|---|---|---|---|---|
| 1 | `monitor.events.view` | View system event log | view | N | N | N | N |
| 2 | `monitor.health.view` | View system health status | view | N | N | N | N |
| 3 | `monitor.health.check` | Trigger a health check | execute | N | N | N | N |
| 4 | `monitor.metrics.view` | View system performance metrics | view | N | N | N | N |

---

## Side-Effect Summary

### Operations That Create Accounting Entries (AsientoContable)

| Operation | Entry Type | Debit Account | Credit Account |
|---|---|---|---|
| `payment.approve` | COBRO | Caja | Ingresos |
| `payment.refund` | AJUSTE | Ingresos | Caja |
| `invoice.sale.create` | VENTA | Cuentas por Cobrar | Ingresos + IVA |
| `invoice.sale.cancel` | AJUSTE | Reverse of original VENTA entry | |
| `invoice.purchase.create` | COMPRA | Gastos + IVA | Proveedores |
| `invoice.purchase.approve` | _(closes)_ | Closes the open purchase asiento | |
| `expense.create` | COMPRA | Gasto | Caja |
| `inventory.part.adjust_stock` | AJUSTE | Inventario | Diferencia de Inventario |
| `inventory.reception.create` | COMPRA | Inventario | Proveedores |
| `import_shipment.confirm_costs` | COMPRA | Mercaderia en Transito | Proveedores Exterior |
| `import_shipment.dispatch.create` | COMPRA | Mercaderia en Transito + IVA | Caja |
| `import_shipment.reception.finalize` | AJUSTE | Inventario | Mercaderia en Transito |
| `maintenance.workorder.complete` | COMPRA | Mantenimiento | Caja |
| `credit_note.create` | AJUSTE | Ventas + IVA | Cuentas por Cobrar |
| `hr.payroll.liquidate` | COMPRA | Sueldos + Cargas Sociales | Remuneraciones + Retenciones |
| `reconciliation.process.complete` | AJUSTE | Banco | Diferencia de Conciliacion |

**Total**: 16 operations trigger accounting entries.

### Operations That Create Notifications (Alerta)

| Operation | Alert Type | Details |
|---|---|---|
| `rental.contract.activate` | CONTRATO_ACTIVADO | Also sends email to client |
| `rental.contract.terminate` | CONTRATO_CANCELADO | |
| `fleet.moto.decommission` | URGENTE / BAJA_MOTO | |
| `rental.client.approve` | _(email only)_ | Sends approval email, no Alerta record |
| `payment.*` (all payment ops) | PAGO / URGENTE | Wildcard handler matches all payment events |
| `maintenance.workorder.create` | URGENTE / MANTENIMIENTO | |
| `maintenance.workorder.complete` | MANTENIMIENTO | |
| `inventory.part.adjust_stock` | URGENTE | Only when stock falls below minimum threshold |
| `import_shipment.reception.finalize` | IMPORTACION | |
| `expense.create` | URGENTE | Only when amount exceeds $500,000 ARS |
| `reconciliation.process.start` | CONCILIACION | |
| `reconciliation.process.complete` | URGENTE / CONCILIACION | |

**Total**: 12 operations trigger notifications.

### Operations That Trigger Anomaly Detection

| Operation | Detector | What It Checks |
|---|---|---|
| `payment.approve` | `detectarPagosDuplicados` | Detects duplicate payments (same amount, client, and date range) |
| `expense.create` | `detectarGastosInusuales` | Detects expenses that deviate significantly from historical patterns |
| `inventory.part.adjust_stock` | `detectarStockCritico` | Detects parts falling below critical stock thresholds |
| `payment.refund` | `detectarPatronesSospechosos` | Detects suspicious refund patterns (frequency, amounts) |

**Total**: 4 operations trigger real-time anomaly detection.

### Operations That Auto-Create Invoices (Factura)

| Operation | Invoice Type | Details |
|---|---|---|
| `payment.approve` | Factura Type B | Automatically generated upon payment approval |
| `rental.contract.activate` | Factura Type B | Deposit invoice generated upon contract activation |

**Total**: 2 operations auto-create invoices.

---

## Permission Model Reference

| Permission Type | Description | Typical Roles |
|---|---|---|
| `view` (ViewOnly) | Read-only access to data | ADMIN, OPERADOR, CLIENTE |
| `create` | Create new resources | ADMIN, OPERADOR |
| `update` | Modify existing resources | ADMIN, OPERADOR |
| `delete` | Remove resources | ADMIN |
| `execute` | Run processes and actions | ADMIN, OPERADOR |
| `approve` (RequiresApproval) | Elevated actions requiring explicit approval | ADMIN only |

---

## Statistics

| Metric | Count |
|---|---|
| Total operations | 198 |
| Domains | 28 |
| ViewOnly operations | 56 |
| RequiresApproval operations | 14 |
| Operations with accounting entries | 16 |
| Operations with notifications | 12 |
| Operations with anomaly detection | 4 |
| Operations with auto-invoicing | 2 |
