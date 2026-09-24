# Deployment Guide (Laravel Sail)

**Project:** Vaultly/AuraSpace (React + Laravel Inertia)
**Date:** 2026‑09‑24

## Prerequisites
- Docker Desktop (or Docker Engine) installed.
- `vendor/bin/sail` executable (already present via Composer).
- Node 20 (via Sail) – no local Node install required.

## Quick Start (Development)
```sh
# From the project root
vendor/bin/sail up -d            # Start Laravel, MySQL, Redis, etc.
vendor/bin/sail npm install       # Install JS dependencies (runs inside the container)
vendor/bin/sail npm run dev       # Watch assets with Vite (hot‑reload)
vendor/bin/sail artisan serve    # Optional: start the PHP server (Sail already runs it)
```
Open the app in the browser:
```sh
vendor/bin/sail open
```
The app will be reachable at the URL shown by the command (usually `http://localhost`).

## Building for Production
```sh
vendor/bin/sail npm run build      # Compile assets, generate Vite manifest
vendor/bin/sail artisan config:cache
vendor/bin/sail artisan route:cache
vendor/bin/sail artisan view:cache
```
Commit the generated `public/build` folder and the updated `storage/framework/cache/data` if needed.

## Running Tests
```sh
# Unit & Feature tests (PHP)
vendor/bin/sail artisan test --compact

# End‑to‑end tests (Cypress/E2E)
vendor/bin/sail npm run test:e2e   # Or the command defined in package.json
```
All tests must pass before deployment.

## Code Quality
```sh
vendor/bin/sail bin pint --format agent   # Fixes any style issues automatically
```
The project already has **0 Pint violations**.

## Database Migration
```sh
vendor/bin/sail artisan migrate --force   # Run in production
```
Make sure the `.env` file (or Sail environment) contains correct DB credentials.

## Environment Variables
The default `.env.example` is sufficient for local development. For production, set:
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://your-domain.com`
- Database credentials (`DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).
- `APP_KEY` (generated via `php artisan key:generate`).

## Deploying to Laravel Cloud (optional)
If you prefer Laravel Cloud, run:
```sh
laravel cloud:deploy
```
See the `inertia-react-development` skill for any Cloud‑specific steps.

---
**All milestones are complete, the victory audit passed, and the app is ready for production.**
