# VB World - Project Notes (Share this in every new chat)

## What We're Building
Production-grade grocery supply chain management system for Vasanta Bhavan restaurant chain (15+ branches, Chennai). The goal is to replace the manual Petpooja/WhatsApp indent process and eventually exceed Petpooja in workflow depth, role control, analytics, and user experience.

---

## Current Stack

### Backend
- Java 17 + Spring Boot 3.2.5
- PostgreSQL 15 + Flyway (migrations V1-V32)
- JWT auth (15 min access + 7 day refresh)
- Governance module with audit logs + in-app notifications
- Advanced reporting module with CSV exports
- Deployment guide, prod profile, health probes, and rollout checklist now included
- Spring Security with role-based access
- Running on: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

### Frontend
- React 18 + TypeScript + Vite
- @tanstack/react-query v4
- Zustand v4
- Recharts, Axios, Lucide-react
- No `date-fns` (native Date only)
- Running on: `http://localhost:5173`
- Vite proxy: `/api` -> `http://localhost:8080`

---

## Database
- Host: localhost:5432
- DB: vbworld
- User: vbworld_user / vbworld@2026
- Admin login: `admin@vbworld.in / password`

## Project Folders
- Backend: `D:\projects\vbworld-complete\`
- Frontend: `D:\projects\vbworld-ui-v2\`
- Deployment guide: `D:\projects\vbworld-complete\DEPLOYMENT_GUIDE.md`
- Client UAT runbook: `D:\projects\vbworld-complete\CLIENT_UAT_RUNBOOK.md`
- UAT defect log template: `D:\projects\vbworld-complete\UAT_DEFECT_LOG_TEMPLATE.md`
- Smoke check script: `D:\projects\vbworld-complete\scripts\post_deploy_smoke_check.ps1`
- Go-live checklist: `D:\projects\vbworld-complete\GO_LIVE_CHECKLIST.md`
- Frontend prod env example: `D:\projects\vbworld-ui-v2\.env.production.example`

---

## Current Roles

### RESTAURANT_STAFF
- Dashboard
- Place Order (`/orders`)
- Smart Order (`/smart`)
- Order History (`/history`)
- Transfers (`/transfers`)
- POS Billing (`/pos`)
- QR Self-Order (public `/qr/:token` flow generated from POS)
- Customers (`/customers`)
- Aggregator Hub (`/aggregators`)
- Notifications (`/notifications`)
- Branch-scoped operational data only

### WAREHOUSE_MANAGER
- Dashboard
- Manage Orders (`/orders`)
- Stock Manager (`/stock`)
- Reports (`/reports`)
- Procurement Planner (`/procurement-plan`)
- Purchase Orders (`/purchase-orders`)
- GRN (`/grn`)
- Transfers (`/transfers`)
- Suppliers (`/suppliers`)
- Route Planner (`/routes`)
- Notifications (`/notifications`)
- Global order and warehouse visibility

### WAREHOUSE_ADMIN
- Dashboard
- Manage Orders (`/orders`)
- Stock Manager (`/stock`)
- Reports (`/reports`)
- Procurement Planner (`/procurement-plan`)
- Purchase Orders (`/purchase-orders`)
- GRN (`/grn`)
- Transfers (`/transfers`)
- Suppliers (`/suppliers`)
- Route Planner (`/routes`)
- Aggregator Hub (`/aggregators`)
- Customers (`/customers`)
- Recipes (`/recipes`)
- User Management (`/users`)
- Feedback (`/feedback`)
- Notifications (`/notifications`)
- Audit Trail (`/audit`)
- Exception Center (`/exceptions`)
- Same warehouse access plus people/admin operations

### ADMIN
- Dashboard
- Reports (`/reports`)
- Procurement Planner (`/procurement-plan`)
- Purchase Orders (`/purchase-orders`)
- GRN (`/grn`)
- Transfers (`/transfers`)
- Suppliers (`/suppliers`)
- Route Planner (`/routes`)
- Aggregator Hub (`/aggregators`)
- Customers (`/customers`)
- Recipes (`/recipes`)
- User Management (`/users`)
- Feedback (`/feedback`)
- Notifications (`/notifications`)
- Audit Trail (`/audit`)
- Exception Center (`/exceptions`)
- Real scoped impersonation tools (`/impersonate`) with backend-issued tokens and audit visibility

---

## Frontend File Structure
```text
src/
  App.tsx
  main.tsx
  index.css
  api/index.ts                     - unified axios client + refresh-token handling
  api/client.ts                    - older client file, not the main path now
  store/auth.ts
  store/theme.ts
  components/layout/Layout.tsx
  pages/
    SmartOrder.tsx                 - safe re-export to restaurant/SmartOrder for build stability
    shared/Login.tsx
    shared/Register.tsx
    restaurant/Dashboard.tsx
    restaurant/Orders.tsx
    restaurant/SmartOrder.tsx
    restaurant/History.tsx
    restaurant/Transfers.tsx
    warehouse/Dashboard.tsx
    warehouse/Orders.tsx
    warehouse/Stock.tsx
    warehouse/Grn.tsx
    warehouse/Reports.tsx
    warehouse/Suppliers.tsx
    warehouse/Transfers.tsx
    warehouse/PurchaseOrders.tsx
    admin/Dashboard.tsx
    admin/UserManagement.tsx
    admin/Impersonate.tsx          - real scoped impersonation flow backed by backend-issued tokens
    admin/FeedbackPanel.tsx
```

---

## Backend Highlights
- AuthController: login, register, refresh, me
- UserManagementController: user approval and creation
- FeedbackController: feedback submit/list/status update
- IndentController: full indent lifecycle
- SmartSuggestionController: readiness, suggestions, patterns
- BranchController, ItemController, WarehouseController, AnalyticsController
- SupplierController and PurchaseOrderController for procurement workflows
- TransferController for warehouse-to-branch stock movement
- SmartSuggestionController now also handles branch forecast and forecast-driven draft replenishment

---

## Implemented Modules
- Authentication, approval flow, and role-based access
- Restaurant ordering, POS billing, QR self-order flow, waiter/captain table service controls, KOT flow, split/merge bills, cashier shifts, end-of-day reconciliation, recipe-driven consumption, CRM/loyalty, aggregator hub with integration sync controls, history, templates, and smart order suggestions
- Warehouse stock management, receipts, GRN, and stock adjustments
- Batch, expiry, and UOM-aware warehouse lot tracking
- Wastage, spoilage, expired-stock, and dead-stock tracking
- Supplier management, supplier-item mapping, preferred vendors, vendor performance, and purchase orders
- PO-to-GRN reconciliation with partial/full receipt updates
- Inter-branch transfers with branch receipt confirmation
- Feedback management
- Governance layer with audit trail, in-app notifications, scoped impersonation, user-level permission overrides, tighter user-management permissions, live system monitor views, and operational delivery-route visibility
- Exception escalation and fraud-control rules with stored thresholds, live exception queue, escalation actions, and resolution workflow
- Branch cut-off time, delivery-slot scheduling, slot-capacity control, route planning, route optimization, vehicle-capacity suggestions, and driver/vehicle route assignment
- Advanced reporting with executive summary, branch performance, SLA views, inventory risk, stock aging, wastage visibility, printable executive brief output, and CSV exports
- Branch demand forecasting, branch-level replenishment rules, and forecast-driven draft indent generation

## Demo Data
- Sample scenario SQL is available at D:\projects\vbworld-complete\docs\VBW_SAMPLE_DATA.sql
- Run it after migrations to light up dashboards, smart suggestions, procurement, transfers, notifications, and audit logs

## What's Actually Working Now
- Role-based routing and layouts across restaurant, warehouse, warehouse admin, and admin users, including restaurant POS access, customer CRM views, and aggregator hub access
- Registration -> pending approval -> admin approval -> login flow
- Order lifecycle: submit -> approve -> dispatch -> deliver -> cancel, plus dine-in POS -> QR self-order -> waiter/captain service states -> KOT -> recipe consumption -> split/merge -> loyalty redemption -> multi-payment settlement -> cashier shift close
- Warehouse stock management UI with stock updates, receive flow, and adjustment controls
- Full supplier-linked GRN workflow with invoice, discrepancy, receipt history, PO reconciliation, discrepancy resolution, and vendor return tracking
- UOM-aware receiving with batch number, expiry date, units-per-pack conversion, and live warehouse lot visibility
- Wastage and dead-stock workflow with reason types, optional lot linkage, and reporting visibility
- Purchase order workflow for warehouse/admin roles with supplier-linked creation, smart vendor recommendations, procurement planner support, branch demand forecasting, auto-draft PO generation, receipt tracking, and status reconciliation
- Branch cut-off aware restaurant ordering with scheduled delivery dates, live slot availability, warehouse slot visibility, dispatch-side rescheduling support, and route assignment readiness
- Supplier-item mapping, preferred vendor rules, procurement planning intelligence, and auto-draft PO generation
- In-app notifications for all roles with read / unread tracking
- Audit trail for key indent, warehouse, procurement, transfer, delivery-route, and impersonation actions
- Exception center for admin and warehouse admin roles with configurable fraud-control rules, escalation roles, and resolution workflow
- Scoped impersonation with backend-issued tokens and safe frontend session restore
- Advanced reports page for warehouse/admin roles with executive summary, branch performance comparison, SLA reporting, stock aging, inventory risk analysis, wastage visibility, printable executive brief output, and CSV export support
- Supplier management module for warehouse/admin roles
- Stock adjustment / audit workflow with adjustment history for warehouse/admin roles
- Inter-branch transfer workflow with warehouse dispatch and branch receipt confirmation
- Smart order suggestions and day-pattern endpoints
- Template loading and template saving from restaurant ordering flows
- Feedback panel with real backend integration
- Refresh-token handling in the main frontend API client
- Frontend production build now passes successfully
- Production deployment guide, client UAT runbook, defect log template, env template, actuator readiness/liveness probes, and safer prod actuator exposure are now in place
- Post-deploy smoke-check script is now in place for API/frontend verification after rollout
- Go-live checklist is now in place for controlled rollout, verification, and rollback readiness
- Frontend route-level lazy loading and bundle chunk splitting are now in place for faster first-load performance
- Mobile and tablet navigation polish is now in place for the main app shell and restaurant ordering flow
- Global toast and request-error feedback are now in place, along with shared loading, empty, and retry states on key governance, reporting, and POS screens

---

## What We Recently Fixed
- Security config double-build issue in backend Spring Security chain
- PostgreSQL optional-filter issue in indent listing by switching to dynamic filtering
- PostgreSQL cast syntax issue in smart pattern query
- Frontend production build failure caused by broken duplicate `src/pages/SmartOrder.tsx`
- Restaurant order screen now actually saves templates
- Frontend now uses a single main API client with refresh-token retry behavior
- Unsafe fake impersonation flow removed from active use; admin page now blocks it until backend support exists
- Added backend warehouse receipt model + migration + receive-stock endpoint
- Added frontend warehouse receipts tab and receive-stock modal
- Added backend supplier management APIs and database migration
- Added supplier management page to warehouse manager, warehouse admin, and admin views
- Added backend branch transfer workflow, migration, and receipt-confirmation endpoints
- Added warehouse transfer operations page and restaurant branch transfer receipt page
- Enhanced warehouse receipts into supplier-linked GRN records with invoice and discrepancy fields
- Added dedicated GRN page for warehouse/admin roles
- Added backend purchase order workflow, migration, and supplier-facing status lifecycle
- Added purchase order page for warehouse manager, warehouse admin, and admin views
- Added supplier-item mapping, preferred vendor rules, smart PO supplier recommendations, procurement planning queue, vendor performance signals, auto-draft purchase orders, and GRN discrepancy resolution with vendor returns
- Added advanced reporting endpoints, branch performance exports, inventory-risk exports, and a dedicated reports page
- Added batch, expiry, and UOM-aware receiving with warehouse lot tracking
- Added wastage, spoilage, expired-stock, and dead-stock workflow with reporting
- Added branch cut-off times and delivery-slot scheduling across branch ordering and warehouse visibility
- Added backend scoped impersonation and warehouse-admin user-management permission controls
- Added slot-capacity scheduling with branch capacities, live availability checks, and overbooking protection
- Added route planner, route optimization with vehicle-capacity suggestions, manual delivery-slot override workflow, driver/vehicle delivery-route assignment, POS billing with KOT, QR self-order links, waiter/captain table-service controls, split/merge bills, split payments, cashier shifts, end-of-day reconciliation export, recipe-driven stock consumption, customer CRM with loyalty earning/redemption, aggregator order hub with saved integrations, sync runs, payout reconciliation, and branch demand forecasting with forecast-driven draft replenishment
- Added governance exception storage, fraud-control rules, live exception monitoring, escalation/resolve actions, and trigger hooks for impersonation, GRN discrepancy, vendor return, and large stock adjustments
- Added deployment guide, client UAT runbook, defect log template, frontend production env example, prod health probes, actuator info/readiness/liveness exposure, and CORS trimming for production safety
- Added post-deploy smoke-check script for health, readiness, Swagger, and optional frontend reachability verification
- Added go-live checklist covering release gate, deployment order, rollback criteria, and deployment-day sign-off
- Added frontend lazy route loading and Vite manual chunk splitting to reduce the initial production bundle from the full app payload to a small shell plus role/page chunks
- Added responsive mobile drawer navigation, tighter small-screen shell spacing, and a stacked tablet/mobile layout for the restaurant ordering flow
- Added a shared toast system with timeout, request-failure, server-error, and session-expiry feedback across the frontend

---

## What Is Still Missing To Match Petpooja Properly
These are the major functional gaps before VB World can honestly claim full Petpooja parity.

### Product / Operations
- Festival/seasonality forecasting beyond the new multi-day branch forecast horizon
- PO discrepancy escalation and vendor scorecard follow-up for unresolved shortages or damaged receipts
- Multi-level approval rules for large or exceptional orders
- Branch cut-off exception handling and richer dispatch monitoring beyond the current optimization suggestions
- Broader third-party integration layer for payments, accounting systems, and richer external menu/order webhooks

### Inventory / Catalog
- Branch-level reorder rules by item
- Item price history and cost movement tracking
- Menu engineering and margin views linked to recipe cost changes

### Admin / Governance
- Activity visibility for impersonated actions across more operational modules
- Soft-delete / restore behavior for important master data
- Multi-step exception approval chains and assignee workflows beyond the current escalation/resolve model

### Reporting / Analytics
- Deeper branch performance drill-down over time
- Item consumption trends and variance exceptions
- Low-stock forecasting rather than static alerting
- Approval bottleneck reporting
- Deeper executive drill-down by route, procurement cycle, and branch profitability
- True Excel / PDF binary exports beyond CSV + printable brief

### User Experience / Platform
- Better mobile/tablet workflow polish for operational users
- Lazy loading / code splitting to reduce bundle size
- Global toast/error system and stronger empty/error/retry states are now in place on shared frontend UX and key UAT screens
- Search, filters, and bulk actions are now expanded on permission management and notification workflows
- Accessibility pass and keyboard-flow review are now improved across the shared shell, toasts, and state feedback components
- CI/CD pipeline, structured log shipping, backup rehearsal, and production infra monitoring
- Faster peak-hour performance tuning across POS, warehouse, and dashboard screens

### Reliability / Enterprise Readiness
- Test coverage for critical flows
- Linting and CI checks
- Monitoring / logging / alerting
- Backup / recovery runbooks and deployment checklists
- Dockerized deployment with environment-specific config
- Caching strategy and performance tuning
- Role-based backend verification for every sensitive flow

---

## Interactive Features We Want Beyond Petpooja
This is where VB World can become more compelling instead of only matching parity.
- Smart reorder assistant with explainable suggestions
- Branch-specific pattern heatmaps and confidence scoring
- One-click reorder from history and saved templates
- Actionable dashboards by role instead of generic reporting only
- Feedback-to-resolution loop inside the product
- Guided operational alerts: what to approve first, what stock needs action first, what branch demand is abnormal
- Predictive stock risk and demand anomaly flags
- Admin control center with live operational feed

---

## Next Planned Implementation Phases

### Phase 1 - Close Core Product Gaps
- Better warehouse order handling with richer item-level approval controls
- Expand smart procurement with supplier service scoring, PO confidence thresholds, and recommended vendor fallback logic

### Phase 2 - Governance And Trust
- Broader action history and impersonation visibility
- Broader impersonation-aware audit visibility across all sensitive flows
- Exception escalation and fraud-control rules

### Phase 3 - Reporting And Performance
- Deeper drill-down analytics, approval bottleneck reporting, and true Excel/PDF exports
- Bundle splitting and frontend performance cleanup
- Caching and backend optimization

### Phase 4 - Differentiators
- Predictive demand engine improvements
- Anomaly detection
- Operational recommendation engine
- Admin command center / live monitoring view

---

## Current Honest Status
- We have the basic structure of a Petpooja-style branch-to-warehouse ordering platform.
- We do NOT yet have full Petpooja-equivalent functionality.
- We now have a stronger and safer foundation after the latest fixes, including branch forecasting, permission overrides, and a live system monitor.
- The next milestone is to finish the remaining enterprise controls, analytics depth, integration breadth, and deployment hardening workflows.

---

## Important Notes About Impersonation
- Scoped impersonation is now backed by the backend with dedicated JWT claims and audit logging.
- Keep using the backend-issued impersonation flow only; do not reintroduce UI-only user swapping.
- Extend audit coverage for impersonated actions as more sensitive modules are added.

---

## Known Technical Follow-Ups
- Main frontend build passes, but Vite reports a large JS bundle; add lazy loading/manual chunking next
- `src/api/client.ts` is now legacy and can be cleaned up later
- Some top-level duplicate pages still exist and should be reduced over time to avoid drift

---

## Test Users (password = `password` for all)
| Email | Role | Status |
|---|---|---|
| admin@vbworld.in | ADMIN | APPROVED |
| suresh@vbworld.in | WAREHOUSE_MANAGER | APPROVED |
| ravi.annanagar@vbworld.in | RESTAURANT_STAFF | APPROVED |
| priya.saligramam@vbworld.in | RESTAURANT_STAFF | APPROVED |
| karthik.tnagar@vbworld.in | RESTAURANT_STAFF | APPROVED |
| meena.pending@vbworld.in | RESTAURANT_STAFF | PENDING |
| dev.rejected@vbworld.in | RESTAURANT_STAFF | REJECTED |

To make `suresh` a WAREHOUSE_ADMIN:
```sql
UPDATE users SET role='WAREHOUSE_ADMIN' WHERE email='suresh@vbworld.in';
```














## Petpooja Reality Check (Research Notes - April 1, 2026)

### What Petpooja Publicly Offers
Based on Petpooja's current product pages, their platform includes:
- Billing and POS workflows with KOT, split/merge billing, discounts, and coupons
- Inventory management with supplier workflows, purchase orders, raw material tracking, and central-kitchen style stock movement
- Online order management with aggregator integrations, menu sync, payout reconciliation, and order handling from one screen
- CRM and loyalty-style customer tooling
- 80+ to 100+ reports and operational analytics
- Staff rights / fraud-control oriented permissions
- 150+ third-party integrations
- QR ordering and e-bill style workflows
- Recipe and multi-stage consumption mapping

### What VB World Already Covers Against That
- Multi-role branch-to-warehouse operations with restaurant, warehouse, warehouse admin, and admin views
- Approval-based indent workflow instead of simple branch ordering only
- Supplier management, purchase orders, PO-to-GRN reconciliation, discrepancy handling, and vendor returns
- Batch, expiry, UOM, wastage, dead-stock, and warehouse lot visibility
- Inter-branch transfers, slot scheduling, route planning, and delivery-route assignment
- Smart suggestions, procurement planning, preferred vendors, and auto-draft purchase orders
- Audit logs, notifications, scoped impersonation, and stronger governance than a basic POS-style setup
- Reporting foundation with branch performance, inventory risk, wastage visibility, and CSV exports

### What Petpooja-Level Gaps Still Exist In VB World
- Festival and seasonality forecasting beyond the current branch forecast horizon
- Richer downloadable reporting depth and more operational dashboards
- Broader integrations layer beyond the first aggregator sync and hub controls
- More granular staff-rights / permissions matrix
- Stronger enterprise hardening, monitoring, and deployment readiness

### Public User Complaints About Petpooja We Should Explicitly Beat
These are the most repeated themes found in review aggregators and public review pages:
- Slow performance, especially during peak hours
- Inventory management depth and usability gaps
- Reporting not detailed enough for some operators
- Slow or inconsistent support / after-sales resolution
- Delayed updates or syncing issues
- UI clutter / learning curve for some users
- Pricing and add-on confusion (business issue more than product bug, but important positioning signal)

### Product Priorities To Beat Those Complaints
1. Keep billing/order-critical screens fast and lightweight, especially under peak-hour load.
2. Make inventory deeper and more transparent than Petpooja: recipe deduction, stock aging, branch min-max, better discrepancy handling.
3. Expand reports into drill-down, SLA, aging, variance, and export-ready management reporting.
4. Build cleaner operations UX with fewer confusing steps and better empty/error states.
5. Add strong monitoring, logs, and test coverage so our support experience is faster and more reliable.
6. Keep pricing and module boundaries simple in documentation and packaging.

### Recommended Next Big Feature Blocks If We Want True Petpooja-Plus
- Festival-aware forecasting and auto-replenishment intelligence
- Role-permission matrix and system-monitor tooling
- Executive analytics and richer exports
- Integrations framework
- Monitoring, CI/CD, deployment hardening, and performance tuning





