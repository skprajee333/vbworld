# VB World Client UAT Runbook

## Goal
Use this runbook to validate VB World with the client in a structured way before production go-live.

This runbook is designed for:
- `ADMIN`
- `WAREHOUSE_ADMIN`
- `WAREHOUSE_MANAGER`
- `RESTAURANT_STAFF`

## UAT Success Criteria
A UAT cycle is considered successful when:
- all 4 roles can log in and see the correct navigation
- the critical business flows pass end to end
- no `P0` or `P1` issue remains open
- exports, notifications, and audit visibility are confirmed
- the client signs off on the workflows they will actually use daily

## Test Accounts
Prepare at least:
- `admin@vbworld.in`
- one `WAREHOUSE_ADMIN`
- one `WAREHOUSE_MANAGER`
- one branch `RESTAURANT_STAFF`

## Environment Preconditions
Before UAT starts, confirm:
- database migrations are up to date
- demo/sample data is loaded if needed
- backend health endpoints are green
- frontend points to the correct API
- email/phone-like sample master data exists for users, suppliers, branches, items, and tables

## Severity Rules
- `P0`: production blocker, data loss, wrong financial result, cannot continue UAT
- `P1`: major workflow failure, incorrect access, incorrect status movement
- `P2`: partial workflow issue, confusing UX, weak validation, non-blocking report/export issue
- `P3`: cosmetic, wording, spacing, minor polish

## Role-Wise UAT Scenarios

### ADMIN
Verify:
- login and dashboard access
- reports page loads with executive summary and exports
- audit trail loads
- exception center loads and filters work
- permission matrix loads and saves overrides
- impersonation starts and exits cleanly
- user management actions obey role limits
- customers, aggregators, recipes, suppliers, POs, GRN, transfers, and route planner are accessible

Pass criteria:
- correct menus visible
- protected pages open only for allowed roles
- impersonation is auditable and reversible
- admin exports download successfully

### WAREHOUSE_ADMIN
Verify:
- manage orders page loads
- stock manager, GRN, suppliers, transfers, purchase orders, route planner, reports all load
- can open exception center and review monitor pages
- can view customers, recipes, feedback, notifications
- can create/update supplier and PO data
- can receive stock and resolve discrepancy cases

Pass criteria:
- all warehouse/admin modules are available
- governance pages respect access rules
- warehouse actions write correct status/history

### WAREHOUSE_MANAGER
Verify:
- dashboard and manage orders load
- can approve/dispatch/deliver branch orders as expected
- can perform stock adjustments
- can create and track transfers
- can create purchase orders
- can perform GRN receipt flow
- can use route planner and reports
- notifications are visible

Pass criteria:
- no unauthorized admin-only screen appears
- warehouse operations update stock and order statuses correctly
- route planning and reports are usable

### RESTAURANT_STAFF
Verify:
- dashboard and place-order page load
- smart order suggestions appear
- can submit an indent
- templates save and load
- transfers view is limited to branch-facing workflow
- POS works: table select, add items, save bill, KOT, settle bill
- QR self-order link can be generated from POS
- customers page is usable
- notifications page loads only branch-relevant alerts

Pass criteria:
- no warehouse/admin-only actions appear
- ordering and POS workflows are understandable and complete
- branch-facing data stays scoped correctly

## End-To-End Critical Flows

### Flow 1: Branch Indent To Delivery
1. Login as `RESTAURANT_STAFF`
2. Create and submit an indent
3. Login as `WAREHOUSE_MANAGER` or `WAREHOUSE_ADMIN`
4. Approve the indent
5. Dispatch the indent
6. Deliver the indent
7. Confirm history, notifications, and audit visibility

Expected result:
- status moves correctly through submit, approve, dispatch, deliver
- branch and warehouse views match
- audit entries appear

### Flow 2: Supplier PO To GRN
1. Login as warehouse role
2. Create or open supplier
3. Create purchase order
4. Receive GRN against PO
5. Confirm PO receipt status updates
6. Confirm stock increases

Expected result:
- receipt updates PO line and PO status
- stock and receipt history are consistent

### Flow 3: Discrepancy And Vendor Return
1. Receive GRN with discrepancy
2. Review discrepancy status
3. Resolve or return quantity to vendor
4. Check exception/audit visibility if thresholds apply

Expected result:
- discrepancy fields persist
- vendor return and resolution state are visible

### Flow 4: Transfer To Branch
1. Create branch transfer from warehouse
2. Confirm warehouse stock is reduced
3. Login as branch role
4. Mark transfer received

Expected result:
- transfer status updates correctly
- receipt confirmation is visible on both sides

### Flow 5: POS To Reconciliation
1. Open shift
2. Select table
3. Add items and save bill
4. Send KOT
5. Settle with one or more payment methods
6. Close shift
7. Open reconciliation report

Expected result:
- shift totals update
- settlement appears in reconciliation
- customer/loyalty behavior is correct if used

### Flow 6: QR Self-Order
1. Generate QR session from POS
2. Open public QR link
3. Add items and place order
4. Confirm the table order appears in POS flow

Expected result:
- QR session works
- order lands in the right table flow

### Flow 7: Governance Control
1. Trigger or inspect notification flow
2. Open audit trail
3. Open system monitor
4. Review exception center
5. Test permission override for one user

Expected result:
- governance data is visible and role-limited
- permission changes persist

## Suggested UAT Session Order
Run sessions in this order:
1. Restaurant ordering and smart suggestions
2. Warehouse approval, stock, and transfer flow
3. Supplier, PO, GRN, discrepancy flow
4. POS, QR self-order, loyalty, reconciliation
5. Reports, audit, permissions, exceptions, impersonation

## Defect Capture Template
For every issue, capture:
- `ID`
- `Date`
- `Role`
- `Page / Module`
- `Steps to reproduce`
- `Expected result`
- `Actual result`
- `Severity`
- `Screenshot / stack trace`
- `Owner`
- `Status`

## Exit Checklist
Before UAT sign-off, confirm:
- all critical flows passed
- all `P0` and `P1` issues are fixed and retested
- client-approved roles and permissions are correct
- exports required by the client were demonstrated
- sample data was clearly separated from live data
- deployment/backups/restore plan is understood

## Sign-Off Notes
Capture:
- approved modules
- excluded scope for go-live
- known `P2/P3` issues accepted for later release
- go-live owner and rollback contact
