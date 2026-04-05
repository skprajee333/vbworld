# VB World Deployment Environment Reference

## Backend Required

Set these before starting the API with `SPRING_PROFILES_ACTIVE=prod`.

```env
SPRING_PROFILES_ACTIVE=prod
PORT=8080

DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=vbworld
DB_USER=vbworld_user
DB_PASSWORD=replace-with-strong-db-password

JWT_SECRET=replace-with-a-random-secret-at-least-32-bytes-long
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

## Backend Optional

Use these only when needed.

```env
MANAGEMENT_PORT=8080
CACHE_TYPE=simple

# Only if CACHE_TYPE=redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=replace-if-needed
```

## Frontend Required

Create a production env file for the Vite app with:

```env
VITE_API_URL=https://your-api-domain.com/api
```

## Domain Matching Rule

These values must agree:

- frontend origin in backend `ALLOWED_ORIGINS`
- backend public API base in frontend `VITE_API_URL`

Example:

```env
ALLOWED_ORIGINS=https://app.vbworld.in
VITE_API_URL=https://api.vbworld.in/api
```

## Deployment Start Commands

Backend:

```powershell
$env:SPRING_PROFILES_ACTIVE='prod'
$env:DB_HOST='your-postgres-host'
$env:DB_PORT='5432'
$env:DB_NAME='vbworld'
$env:DB_USER='vbworld_user'
$env:DB_PASSWORD='replace-with-strong-db-password'
$env:JWT_SECRET='replace-with-a-random-secret-at-least-32-bytes-long'
$env:ALLOWED_ORIGINS='https://your-frontend-domain.com'
mvn spring-boot:run
```

Frontend build:

```powershell
$env:VITE_API_URL='https://your-api-domain.com/api'
npm run build
```

## Final Pre-Go-Live Checks

- backend starts cleanly on `prod`
- Flyway runs without pending failures
- `/actuator/health` returns healthy
- frontend loads without localhost API calls
- admin login works
- warehouse admin login works
- warehouse manager login works
- restaurant staff login works
- analytics for restaurant users only show their branch
- smart suggestions and template endpoints reject cross-branch access
