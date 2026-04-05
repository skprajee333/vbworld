# VB World Deployment Guide

## Release Goal
Deploy VB World for client UAT with:
- backend API on Spring Boot
- frontend static build from Vite
- PostgreSQL database
- role-based access for all 4 user types
- sample/demo data optional for review sessions

## Backend Environment
Required environment variables:

```powershell
$env:SPRING_PROFILES_ACTIVE='prod'
$env:DB_HOST='localhost'
$env:DB_PORT='5432'
$env:DB_NAME='vbworld'
$env:DB_USER='vbworld_user'
$env:DB_PASSWORD='replace-me'
$env:JWT_SECRET='replace-with-very-long-random-secret'
$env:ALLOWED_ORIGINS='https://your-frontend-domain.com'
```

Optional environment variables:

```powershell
$env:PORT='8080'
$env:MANAGEMENT_PORT='8080'
$env:REDIS_HOST='localhost'
$env:REDIS_PORT='6379'
$env:REDIS_PASSWORD=''
```

## Frontend Environment
Create a production env file in the frontend app:

```env
VITE_API_URL=https://your-api-domain.com/api
```

## Build Commands
Backend:

```powershell
cd D:\projects\vbworld-complete
mvn -q -DskipTests clean package
```

Frontend:

```powershell
cd D:\projects\vbworld-ui-v2
npm run build
```

## Post-Deploy Smoke Check
Run this after backend/frontend deployment:

```powershell
cd D:\projects\vbworld-complete
.\scripts\post_deploy_smoke_check.ps1 -BaseUrl "https://your-api-domain.com" -FrontendUrl "https://your-frontend-domain.com"
```

If you only want backend checks:

```powershell
cd D:\projects\vbworld-complete
.\scripts\post_deploy_smoke_check.ps1 -BaseUrl "https://your-api-domain.com" -SkipFrontend
```

## Pre-Launch Checklist
- Confirm Flyway migrations run cleanly on the target database
- Confirm `/actuator/health`, `/actuator/health/liveness`, and `/actuator/health/readiness`
- Confirm login works for `ADMIN`, `WAREHOUSE_ADMIN`, `WAREHOUSE_MANAGER`, and `RESTAURANT_STAFF`
- Confirm key flows: order submit, approve, dispatch, deliver
- Confirm warehouse flows: GRN, PO, transfers, stock adjustment
- Confirm POS flows: table order, KOT, settlement, shift close
- Confirm governance flows: notifications, audit, exceptions, impersonation
- Confirm reports and exports
- Confirm CORS only allows intended client domains
- Confirm production JWT secret is not the dev secret

## Recommended Client UAT Accounts
- `admin@vbworld.in`
- one `WAREHOUSE_ADMIN`
- one `WAREHOUSE_MANAGER`
- one branch `RESTAURANT_STAFF`

## UAT Pack
- Runbook: `D:\projects\vbworld-complete\CLIENT_UAT_RUNBOOK.md`
- Defect log template: `D:\projects\vbworld-complete\UAT_DEFECT_LOG_TEMPLATE.md`
- Smoke check script: `D:\projects\vbworld-complete\scripts\post_deploy_smoke_check.ps1`
- Go-live checklist: `D:\projects\vbworld-complete\GO_LIVE_CHECKLIST.md`

## First Client Demo Script
1. Login as restaurant staff and place an indent.
2. Switch to warehouse and approve, dispatch, and deliver it.
3. Show GRN, supplier, and PO workflow.
4. Show route planner and optimized route suggestion.
5. Show POS, QR ordering, and loyalty.
6. Show reports, audit trail, system monitor, and exception center.

## Known Final Hardening Work
- CI/CD pipeline
- log aggregation and alerting
- lazy loading and chunk splitting in frontend
- broader integration testing
- backup and restore rehearsal
