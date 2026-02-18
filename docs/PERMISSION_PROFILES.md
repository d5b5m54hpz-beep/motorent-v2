# Permission Profiles - MotoRent v2

This document describes the 8 system permission profiles defined in MotoRent v2. Each profile is a named collection of grants that control what operations a user can perform. Profiles are seeded automatically via `prisma/seed-permissions.ts` and are marked as `isSystem: true` (not editable from the UI).

## Permission Model Overview

Every operation in the system has four independent permission flags:

| Flag | Meaning |
|------|---------|
| **canView** | Read/list data (queries, reports, dashboards) |
| **canCreate** | Create new records or register data |
| **canExecute** | Run actions (activate, terminate, process, send, import, export, etc.) |
| **canApprove** | Approve or reject items that require authorization (payments, invoices, periods, etc.) |

Grants use **wildcard patterns** to match operations:

- `*` -- matches every operation in the system
- `fleet.*` -- matches all operations whose code starts with `fleet.`
- `maintenance.workorder.*` -- matches only operations under `maintenance.workorder.`

When multiple grant patterns match the same operation, the resulting permission is the **union** (logical OR) of all matching grants.

### Legacy Role Mapping

Profiles are automatically assigned to existing users based on their legacy `role` field:

| Legacy Role | Profile Assigned |
|-------------|------------------|
| `ADMIN` | Administrador |
| `OPERADOR` | Operador Flota |
| `CONTADOR` | Contador |
| `RRHH_MANAGER` | RRHH |
| `COMERCIAL` | Comercial |
| `CLIENTE` | Cliente |
| `VIEWER` | Auditor |

---

## 1. Administrador

> **Description:** Acceso completo a todas las operaciones del sistema

**Persona:** Owner, CTO, or system administrator who needs unrestricted access to every module.

### Wildcard Pattern

| Pattern | canView | canCreate | canExecute | canApprove |
|---------|---------|-----------|------------|------------|
| `*` | Yes | Yes | Yes | Yes |

### Access Summary

Full, unrestricted access to all operations across every domain: fleet, rental, payments, invoicing, accounting, reconciliation, maintenance, inventory, import shipments, suppliers, expenses, pricing, mechanics, workshops, HR, finance, credit notes, budgets, users, alerts, dashboards, system configuration, anomaly detection, and monitoring.

### Notable Characteristics

- This is the only profile with `canApprove` on every operation.
- This is the only profile with access to `system.config.*`, `system.diagnostic.*`, `system.repair.*`, `system.user.*`, and `dashboard.system.*`.
- Only Administradores can create and manage other user accounts (`user.create`, `user.update`).

---

## 2. Operador Flota

> **Description:** Gestion de flota, alquileres, mantenimiento, inventario y pagos

**Persona:** Operations manager or fleet coordinator responsible for day-to-day vehicle management, rental logistics, maintenance scheduling, inventory control, and supplier relationships.

### Wildcard Patterns

| Pattern | canView | canCreate | canExecute | canApprove |
|---------|---------|-----------|------------|------------|
| `fleet.*` | Yes | Yes | Yes | -- |
| `rental.*` | Yes | Yes | Yes | -- |
| `maintenance.*` | Yes | Yes | Yes | -- |
| `inventory.*` | Yes | Yes | Yes | -- |
| `import_shipment.*` | Yes | Yes | Yes | -- |
| `supplier.*` | Yes | Yes | Yes | -- |
| `pricing.*` | Yes | Yes | Yes | -- |
| `mechanic.*` | Yes | Yes | Yes | -- |
| `workshop.*` | Yes | Yes | Yes | -- |
| `budget.*` | Yes | Yes | Yes | -- |
| `expense.*` | Yes | Yes | -- | -- |
| `payment.*` | Yes | Yes | -- | -- |
| `invoice.sale.*` | Yes | -- | -- | -- |
| `alert.*` | Yes | Yes | Yes | -- |
| `anomaly.*` | Yes | -- | Yes | -- |
| `monitor.*` | Yes | -- | -- | -- |
| `dashboard.main.*` | Yes | -- | -- | -- |
| `dashboard.fleet.*` | Yes | -- | -- | -- |
| `dashboard.executive.*` | Yes | -- | -- | -- |
| `user.profile.*` | Yes | -- | Yes | -- |
| `system.export.*` | Yes | -- | Yes | -- |
| `system.import.*` | Yes | -- | Yes | -- |
| `system.upload.*` | -- | -- | Yes | -- |
| `system.ai.*` | -- | -- | Yes | -- |

### Access Breakdown by Domain

| Domain | What they CAN do | What they CANNOT do |
|--------|------------------|---------------------|
| **Fleet** | View, create, update, decommission motos; bulk update; manage documents and insurance | -- (full access) |
| **Rental** | View, create, update contracts; manage clients; activate/terminate contracts | Approve contracts or purchase options (no `canApprove`) |
| **Maintenance** | Full CRUD on work orders, appointments, check-in/out, plans | -- |
| **Inventory** | Full CRUD on parts, stock adjustments, movements, locations, purchase orders, receptions | Approve purchase orders (no `canApprove`) |
| **Import Shipments** | Create, update, view shipments; calculate costs; manage dispatches and receptions | Confirm costs (no `canApprove`) |
| **Suppliers** | Create, update, view suppliers; manage portal | -- |
| **Pricing** | View and manage all rental and parts pricing | -- |
| **Mechanics & Workshops** | Create, update, view mechanics and workshops | -- |
| **Budgets** | Create, update, view budgets | -- |
| **Expenses** | Create and view expenses | Execute expense operations |
| **Payments** | View and create payments | Approve/reject/refund payments |
| **Invoices (Sales)** | View sales invoices only | Create, send, cancel invoices |
| **Invoices (Purchase)** | No access | All purchase invoice operations |
| **Accounting** | No access | All accounting operations |
| **Reconciliation** | No access | All bank reconciliation operations |
| **Finance** | No access | All financial reports |
| **Credit Notes** | No access | All credit note operations |
| **HR** | No access | All HR operations |
| **Alerts** | View, create, generate alerts | Delete alerts |
| **Anomaly Detection** | View anomalies and run analysis | Create or update anomaly records |
| **Dashboards** | Main, Fleet, Executive | Commercial, Accounting, Finance, HR, System dashboards |
| **System** | Export, import data; upload files; AI tools | Config, diagnostics, repair, user management |
| **Users** | View and update own profile only | Manage other users |

### Notable Restrictions

- No `canApprove` on any operation -- cannot authorize payments, invoices, purchase orders, or import cost confirmations.
- No access to accounting, reconciliation, finance, credit notes, or HR modules.
- Cannot delete alerts or anomalies.
- Limited to 3 dashboards (main, fleet, executive).

---

## 3. Contador

> **Description:** Acceso completo a contabilidad, finanzas, vista de facturas, pagos, gastos e inventario

**Persona:** Accountant or financial controller managing bookkeeping, bank reconciliation, tax calculations, financial reporting, and invoice approval.

### Wildcard Patterns

| Pattern | canView | canCreate | canExecute | canApprove |
|---------|---------|-----------|------------|------------|
| `accounting.*` | Yes | Yes | Yes | Yes |
| `reconciliation.*` | Yes | Yes | Yes | Yes |
| `credit_note.*` | Yes | Yes | Yes | -- |
| `expense.*` | Yes | Yes | Yes | -- |
| `anomaly.*` | Yes | Yes | Yes | -- |
| `budget.*` | Yes | Yes | Yes | -- |
| `invoice.*` | Yes | -- | -- | Yes |
| `payment.*` | Yes | -- | -- | Yes |
| `monitor.*` | Yes | -- | Yes | -- |
| `finance.*` | Yes | -- | -- | -- |
| `inventory.*` | Yes | -- | -- | -- |
| `import_shipment.*` | Yes | -- | -- | -- |
| `supplier.*` | Yes | -- | -- | -- |
| `pricing.parts.*` | Yes | -- | -- | -- |
| `hr.payroll.*` | Yes | -- | -- | -- |
| `dashboard.accounting.*` | Yes | -- | -- | -- |
| `dashboard.finance.*` | Yes | -- | -- | -- |
| `user.profile.*` | Yes | -- | Yes | -- |
| `alert.*` | Yes | -- | -- | -- |
| `system.export.*` | Yes | -- | Yes | -- |
| `system.ai.*` | -- | -- | Yes | -- |

### Access Breakdown by Domain

| Domain | What they CAN do | What they CANNOT do |
|--------|------------------|---------------------|
| **Accounting** | Full access: entries, accounts, periods (open/close/reopen), retentions, perceptions, depreciation, IVA, reports, reconciliation | -- (full access including approve) |
| **Reconciliation** | Full access: bank accounts, statements, processes, matches (create, approve, reject) | -- (full access including approve) |
| **Credit Notes** | Create, update, view credit notes | -- |
| **Expenses** | Create, update, view expenses | -- |
| **Anomaly Detection** | View, create, update, resolve, discard anomalies; run and view analysis | -- |
| **Budget** | Create, update, view budgets | -- |
| **Invoices (All)** | View all invoices (sales + purchase); approve/reject purchase invoices | Create, update, send, or cancel invoices |
| **Payments** | View payments; approve/reject payments | Create, update, or refund payments |
| **Finance** | View all financial reports (cashflow, income statement, indicators, profitability, summary) | -- (view-only by design) |
| **Inventory** | View parts, movements, locations, purchase orders, receptions | Create, modify, or manage inventory |
| **Import Shipments** | View shipments, dispatches, receptions | Create or modify shipments |
| **Suppliers** | View suppliers and portal | Create or modify suppliers |
| **Pricing (Parts)** | View parts pricing | Modify pricing, create lists, rules |
| **HR (Payroll)** | View payroll records | Create, liquidate, or approve payroll |
| **Monitoring** | View events, health, metrics; execute health checks | -- |
| **Dashboards** | Accounting, Finance | Main, Commercial, Fleet, Executive, HR, System |
| **Fleet** | No access | All fleet operations |
| **Rental** | No access | All rental/contract operations |
| **Maintenance** | No access | All maintenance operations |
| **System** | Export data; AI tools | Config, diagnostics, import, upload, repair, user management |
| **Alerts** | View alerts only | Create, update, delete, generate alerts |
| **Users** | View and update own profile only | Manage other users |

### Notable Characteristics

- One of only two profiles (alongside Administrador) with `canApprove` permissions.
- Has approval rights specifically on accounting periods, reconciliation matches, invoices, and payments.
- Broad read access across inventory, suppliers, and import shipments for audit/verification purposes.
- No access to fleet, rental, or maintenance modules.

---

## 4. RRHH

> **Description:** Gestion de recursos humanos y vista de asientos contables

**Persona:** Human resources manager handling employee records, payroll processing, absence management, and basic financial visibility for payroll-related accounting entries.

### Wildcard Patterns

| Pattern | canView | canCreate | canExecute | canApprove |
|---------|---------|-----------|------------|------------|
| `hr.*` | Yes | Yes | Yes | Yes |
| `accounting.entry.*` | Yes | -- | -- | -- |
| `dashboard.hr.*` | Yes | -- | -- | -- |
| `dashboard.main.*` | Yes | -- | -- | -- |
| `user.profile.*` | Yes | -- | Yes | -- |
| `alert.*` | Yes | -- | -- | -- |

### Access Breakdown by Domain

| Domain | What they CAN do | What they CANNOT do |
|--------|------------------|---------------------|
| **HR - Employees** | Create, update, view, terminate employees | -- (full access) |
| **HR - Payroll** | Create, liquidate, view, calculate, approve payroll | -- (full access including approve) |
| **HR - Absences** | Create, update, approve, view, request absences | -- (full access including approve) |
| **Accounting (Entries)** | View accounting entries only | Create, update, or close entries |
| **Dashboards** | HR, Main | Commercial, Accounting, Finance, Fleet, Executive, System |
| **Alerts** | View alerts only | Create, update, delete, generate alerts |
| **Users** | View and update own profile only | Manage other users |
| **All other modules** | No access | Fleet, rental, payments, invoices, inventory, maintenance, suppliers, pricing, etc. |

### Notable Characteristics

- Most narrowly scoped profile among internal roles (excluding Cliente).
- Full `canApprove` on HR operations (payroll approval, absence approval).
- Read-only access to accounting entries is provided so RRHH can verify that payroll entries have been posted.
- Only 2 dashboards: HR and Main.

---

## 5. Comercial

> **Description:** Ventas, contratos, clientes, pagos y facturacion de ventas

**Persona:** Sales representative or commercial manager responsible for client acquisition, contract management, payment collection, sales invoicing, and budget preparation.

### Wildcard Patterns

| Pattern | canView | canCreate | canExecute | canApprove |
|---------|---------|-----------|------------|------------|
| `rental.*` | Yes | Yes | Yes | -- |
| `invoice.sale.*` | Yes | Yes | Yes | -- |
| `budget.*` | Yes | Yes | Yes | -- |
| `payment.*` | Yes | Yes | -- | -- |
| `fleet.*` | Yes | -- | -- | -- |
| `dashboard.commercial.*` | Yes | -- | -- | -- |
| `dashboard.main.*` | Yes | -- | -- | -- |
| `user.profile.*` | Yes | -- | Yes | -- |
| `alert.*` | Yes | -- | -- | -- |

### Access Breakdown by Domain

| Domain | What they CAN do | What they CANNOT do |
|--------|------------------|---------------------|
| **Rental** | Full CRUD on contracts and clients; activate, terminate contracts; exercise purchase options | Approve contracts or clients (no `canApprove`) |
| **Invoices (Sales)** | Create, update, send, cancel sales invoices | -- (full operational access) |
| **Budgets** | Create, update, view budgets | -- |
| **Payments** | View and create payments | Approve, reject, refund payments; execute checkout |
| **Fleet** | View motos only | Create, update, decommission, or manage moto documents |
| **Dashboards** | Commercial, Main | Accounting, Finance, Fleet, Executive, HR, System |
| **Alerts** | View alerts only | Create, update, delete, generate alerts |
| **Invoices (Purchase)** | No access | All purchase invoice operations |
| **Accounting** | No access | All accounting operations |
| **Inventory** | No access | All inventory operations |
| **Maintenance** | No access | All maintenance operations |
| **HR** | No access | All HR operations |
| **System** | No access | Config, diagnostics, export, import, upload, AI, repair |
| **Users** | View and update own profile only | Manage other users |

### Notable Characteristics

- No `canApprove` on any operation.
- Read-only fleet access lets the sales team see moto availability without modifying records.
- Cannot access purchase invoices, accounting, or financial reports.
- No system tools (export, import, AI) access.

---

## 6. Mecanico

> **Description:** Ordenes de trabajo, turnos, check-in/out, vista de motos y repuestos

**Persona:** Workshop mechanic who executes work orders, performs vehicle check-in/check-out procedures, and needs visibility into moto details and spare parts inventory.

### Wildcard Patterns

| Pattern | canView | canCreate | canExecute | canApprove |
|---------|---------|-----------|------------|------------|
| `maintenance.workorder.*` | Yes | Yes | Yes | -- |
| `maintenance.checkin.*` | -- | -- | Yes | -- |
| `maintenance.checkout.*` | -- | -- | Yes | -- |
| `maintenance.appointment.*` | Yes | -- | -- | -- |
| `maintenance.plan.*` | Yes | -- | -- | -- |
| `fleet.moto.*` | Yes | -- | -- | -- |
| `inventory.part.*` | Yes | -- | -- | -- |
| `mechanic.*` | Yes | -- | -- | -- |
| `workshop.*` | Yes | -- | -- | -- |
| `user.profile.*` | Yes | -- | Yes | -- |
| `alert.*` | Yes | -- | -- | -- |
| `system.upload.*` | -- | -- | Yes | -- |

### Access Breakdown by Domain

| Domain | What they CAN do | What they CANNOT do |
|--------|------------------|---------------------|
| **Work Orders** | View, create, update, complete, assign work orders | -- (full operational access) |
| **Check-in/Check-out** | Execute check-in and check-out procedures | View check-in/out records (execute only) |
| **Appointments** | View maintenance appointments | Create, update, cancel, complete appointments |
| **Maintenance Plans** | View maintenance plans | Create or modify plans |
| **Fleet (Motos)** | View moto details | Create, update, decommission motos; manage documents |
| **Inventory (Parts)** | View spare parts | Create, update, delete parts; adjust stock; manage orders |
| **Mechanics** | View mechanic records | Create or update mechanic profiles |
| **Workshops** | View workshop information | Create or update workshops |
| **Alerts** | View alerts only | Create, update, delete, generate alerts |
| **System** | Upload files (photos, documents for work orders) | All other system operations |
| **Dashboards** | No access | All dashboards |
| **Payments** | No access | All payment operations |
| **Invoices** | No access | All invoice operations |
| **Accounting** | No access | All accounting operations |
| **Rental** | No access | All rental/contract operations |
| **Users** | View and update own profile only | Manage other users |

### Notable Characteristics

- Highly focused profile with access limited to maintenance-related operations.
- Can execute check-in/check-out but has no `canView` on those patterns (execute-only access).
- Upload capability (`system.upload.*`) enables attaching photos and documents to work orders.
- No dashboard access at all.
- No financial visibility (payments, invoices, accounting, pricing).

---

## 7. Cliente

> **Description:** Vista de contratos propios, pagos y facturas

**Persona:** End customer using the client portal to view their active rental contracts, make payments, and access their sales invoices.

### Wildcard Patterns

| Pattern | canView | canCreate | canExecute | canApprove |
|---------|---------|-----------|------------|------------|
| `rental.contract.*` | Yes | -- | -- | -- |
| `payment.*` | Yes | Yes | -- | -- |
| `invoice.sale.*` | Yes | -- | -- | -- |
| `alert.*` | Yes | -- | -- | -- |
| `user.profile.*` | Yes | -- | Yes | -- |

### Access Breakdown by Domain

| Domain | What they CAN do | What they CANNOT do |
|--------|------------------|---------------------|
| **Rental Contracts** | View their own contracts | Create, update, activate, terminate contracts |
| **Payments** | View payments; create/register payments (checkout) | Approve, reject, refund, or update payments |
| **Invoices (Sales)** | View their sales invoices | Create, update, send, cancel invoices |
| **Alerts** | View alerts | Create, update, delete alerts |
| **Users** | View and update own profile | Manage other users |
| **All other modules** | No access | Fleet, maintenance, inventory, accounting, HR, suppliers, dashboards, system, etc. |

### Notable Characteristics

- Most restricted profile in the system.
- Payment `canCreate` enables clients to initiate payment checkout flows (e.g., MercadoPago).
- No access to any dashboard.
- No system tools access.
- Data scoping (seeing only their own contracts/payments/invoices) is enforced at the API layer, not at the permission profile level.

---

## 8. Auditor

> **Description:** Vista de solo lectura de todas las operaciones del sistema

**Persona:** External or internal auditor who needs complete visibility across all system data without the ability to modify, create, or approve anything.

### Wildcard Pattern

| Pattern | canView | canCreate | canExecute | canApprove |
|---------|---------|-----------|------------|------------|
| `*` | Yes | -- | -- | -- |

### Access Summary

Read-only access to every operation in the system. This includes all domains: fleet, rental, payments, invoicing, accounting, reconciliation, maintenance, inventory, import shipments, suppliers, expenses, pricing, mechanics, workshops, HR, finance, credit notes, budgets, users, alerts, all dashboards, system configuration, anomaly detection, and monitoring.

### What the Auditor CANNOT Do

- Create any record in any module
- Execute any action (activate, terminate, process, export, import, etc.)
- Approve or reject anything
- Modify any data

### Notable Characteristics

- Broadest read access alongside Administrador, but with zero write/execute/approve capabilities.
- Can view all 8 dashboards (main, commercial, accounting, finance, fleet, executive, HR, system).
- Can view system configuration and diagnostics (read-only).
- Ideal for compliance, audit trails, and oversight without risk of accidental data modification.

---

## Quick Comparison Matrix

The table below summarizes which major domains each profile can access and at what level.

| Domain | Administrador | Operador Flota | Contador | RRHH | Comercial | Mecanico | Cliente | Auditor |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Fleet | Full | Full | -- | -- | View | View | -- | View |
| Rental | Full | Full | -- | -- | Full* | -- | View | View |
| Payments | Full | View+Create | View+Approve | -- | View+Create | -- | View+Create | View |
| Invoices (Sales) | Full | View | View+Approve | -- | Full* | -- | View | View |
| Invoices (Purchase) | Full | -- | View+Approve | -- | -- | -- | -- | View |
| Accounting | Full | -- | Full | -- | -- | -- | -- | View |
| Reconciliation | Full | -- | Full | -- | -- | -- | -- | View |
| Finance | Full | -- | View | -- | -- | -- | -- | View |
| Maintenance | Full | Full | -- | -- | -- | Partial | -- | View |
| Inventory | Full | Full | View | -- | -- | View (parts) | -- | View |
| Import Shipments | Full | Full | View | -- | -- | -- | -- | View |
| Suppliers | Full | Full | View | -- | -- | -- | -- | View |
| Expenses | Full | View+Create | Full* | -- | -- | -- | -- | View |
| Pricing | Full | Full | View (parts) | -- | -- | -- | -- | View |
| Mechanics/Workshops | Full | Full | -- | -- | -- | View | -- | View |
| HR | Full | -- | View (payroll) | Full | -- | -- | -- | View |
| Credit Notes | Full | -- | Full* | -- | -- | -- | -- | View |
| Budgets | Full | Full | Full* | -- | Full* | -- | -- | View |
| Alerts | Full | Full* | View | View | View | View | View | View |
| Anomaly Detection | Full | View+Execute | Full* | -- | -- | -- | -- | View |
| Monitoring | Full | View | View+Execute | -- | -- | -- | -- | View |
| Dashboards | All 8 | 3 | 2 | 2 | 2 | 0 | 0 | All 8 |
| System Tools | Full | Export+Import+Upload+AI | Export+AI | -- | -- | Upload | -- | View |
| User Management | Full | Own profile | Own profile | Own profile | Own profile | Own profile | Own profile | View |

**Legend:**
- **Full** = canView + canCreate + canExecute + canApprove (where applicable)
- **Full*** = canView + canCreate + canExecute (no canApprove)
- **View** = canView only
- **Partial** = mixed permissions (see profile detail above)
- **--** = no access

---

## Technical Reference

- **Source file:** `prisma/seed-permissions.ts`
- **Operation catalog:** ~150 operations organized by family/entity/action
- **Pattern matching logic:** `matchPattern()` function in seed file
- **Profile assignment:** `UserProfile` join table (userId + profileId)
- **Runtime permission check:** Permissions are evaluated by matching a user's profile grants against the requested operation code
