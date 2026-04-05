# VB World Go-Live Checklist

## Purpose
Use this checklist on deployment day to move from UAT-approved build to live rollout with clear ownership, verification, and rollback control.

## Release Gate
Before go-live, confirm:
- latest client UAT cycle is signed off
- all `P0` and `P1` defects are closed
- accepted `P2/P3` items are documented
- production URLs, DB credentials, and JWT secret are confirmed
- backup and rollback owner is assigned

## Pre-Go-Live
- Confirm backend build artifact is ready
- Confirm frontend production build is ready
- Confirm Flyway migrations are reviewed for production
- Confirm production `.env` / environment variables are set
- Confirm allowed frontend origins are correct
- Confirm monitoring/log access is available
- Confirm support contacts are available during rollout window

## Database Safety
- Take a fresh production database backup
- Record backup filename, timestamp, and restore owner
- Confirm restore procedure has been rehearsed or documented
- Confirm no manual schema drift exists outside Flyway

## Deployment Order
1. Put the team on release communication channel
2. Snapshot / back up the database
3. Deploy backend
4. Verify backend health endpoints
5. Deploy frontend
6. Run smoke checks
7. Run role-wise login checks
8. Run 3 to 5 critical business flows
9. Confirm audit/notification/report visibility
10. Announce go-live complete

## Post-Deploy Verification
Run:
- [post_deploy_smoke_check.ps1](D:/projects/vbworld-complete/scripts/post_deploy_smoke_check.ps1)

Then manually verify:
- `ADMIN` login
- `WAREHOUSE_ADMIN` login
- `WAREHOUSE_MANAGER` login
- `RESTAURANT_STAFF` login
- role-based menus are correct
- ordering flow works
- warehouse approval/dispatch works
- POS opens and loads menu/tables
- reports page loads
- notifications page loads

## Critical Go-Live Flows

### Flow 1: Order Lifecycle
- create indent
- approve indent
- dispatch indent
- deliver indent

### Flow 2: Warehouse Flow
- stock page opens
- GRN opens
- PO page opens
- transfer page opens

### Flow 3: POS Flow
- open shift
- open table
- add items
- save bill
- settle bill

## Rollback Criteria
Rollback if any of the following happen:
- backend health/readiness stays red
- login fails for multiple roles
- order lifecycle is broken
- POS cannot save or settle bills
- severe data corruption or migration failure is detected

## Rollback Steps
1. Stop new user activity if possible
2. Revert backend to previous stable artifact
3. Revert frontend to previous stable build
4. Restore database only if required and approved
5. Re-run smoke checks
6. Announce rollback status and next steps

## Go-Live Log
Capture:
- deployment date/time
- deployed backend artifact/version
- deployed frontend build/version
- migration version
- backup reference
- smoke-check result
- owner approvals
- issues observed

## Sign-Off
Required sign-off:
- product owner
- technical owner
- deployment owner
- client-side approver
