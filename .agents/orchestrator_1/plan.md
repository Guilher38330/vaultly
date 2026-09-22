# Plan: Subscription Tracker Feature Orchestration

## Objective
Implement and verify the "Subscription Tracker" feature directly on the Dashboard (`/dashboard`), enforcing Secure by Design architecture (Anti-IDOR, Inertia Data Leaks prevention, XSS sanitization) and covering 100% of the requirements with automated tests.

## Phase 0: Survey & Scope Specification
- Dispatch 3 Explorers / Spec Miners:
  - Explorer 1 (Backend Architecture & Models): Investigate existing Laravel setup, Sail status, User model, database migrations, routing conventions, policy registrations.
  - Explorer 2 (Frontend Architecture & Inertia/React): Investigate existing Dashboard page (`resources/js/Pages/Dashboard.jsx`), Layouts, UI components, Tailwind CSS styling, Inertia setup.
  - Spec Miner 3 (Requirements & Security Specifications): Extract all functional, security, validation, and test requirements from `ORIGINAL_REQUEST.md` and repository standards.
- Synthesize findings into `PROJECT.md` and `TEST_INFRA.md`.

## Phase 1: Milestone 1 — Data & Eloquent Layer
- Migration: `subscriptions` table with `user_id`, `name`, `price`, `currency`, `billing_cycle`, `category`, `next_billing_date`, `status`, `notes`, indexes on `[user_id, status]` and `[user_id, next_billing_date]`.
- Model: `Subscription.php` with mass assignment protection, `scopeActive`, `scopeDueSoon($days=7)`, accessors for monthly/yearly equivalent prices.
- Relationship: `User.php` hasMany `Subscription`.
- Factory & Seeder: `SubscriptionFactory.php`, `SubscriptionSeeder.php` with realistic data.
- Execution loop: Explorer -> Worker -> Reviewers -> Challengers -> Auditor -> Gate.

## Phase 2: Milestone 2 — Security, API & Controller Layer
- Authorization: `SubscriptionPolicy.php` enforcing strict Tenant Isolation (Anti-IDOR) for `view`, `update`, `delete`, `toggleStatus`.
- Input Sanitization & Validation: `SubscriptionRequest.php` with `strip_tags` and `trim` on text fields (Anti-XSS), strict validation rules for price, cycle, currency, category, date.
- Safe Serialization: `SubscriptionResource.php` strictly exposing safe fields.
- Controller: `SubscriptionController.php` with `index` (currency totals, due_soon highlight, filtered list), `store`, `update`, `destroy`, `toggleStatus`.
- Routing: `routes/web.php` mapping dashboard to `SubscriptionController@index`, throttle `60,1` on mutations.
- Execution loop: Explorer -> Worker -> Reviewers -> Challengers -> Auditor -> Gate.

## Phase 3: Milestone 3 — Frontend (Inertia v2 + React 18)
- Components:
  - `CategoryBadge.jsx` with deterministic color hash.
  - `SubscriptionModal.jsx` using `useForm` for CSRF protection, supporting category suggestions (`<datalist>`) and multi-currency.
  - `DeleteSubscriptionModal.jsx` for safe deletion.
- Integration:
  - `Dashboard.jsx` complete replacement with Subscription Tracker UI:
    - Banner for bills due in 7 days.
    - Metric cards for totals per currency (BRL, USD, EUR) and active/paused count.
    - Search & filter by category, status, cycle.
    - Responsive layout (desktop table, mobile cards).
    - Quick action to toggle status.
- Execution loop: Explorer -> Worker -> Reviewers -> Challengers -> Auditor -> Gate.

## Phase 4: Milestone 4 — Automated Testing, Code Quality & Verification
- Test Suite: `tests/Feature/SubscriptionTest.php` covering:
  - Anti-IDOR: cross-user isolation for view/update/delete/toggle (403), unauthenticated (302).
  - Anti-XSS & Validation: HTML tag stripping from name/notes, rejection of negative prices and invalid currencies.
  - Business Logic: Proportional calculations (yearly -> monthly), paused excluded from totals, `due_soon` scope accuracy (< 7 days).
- Code formatting via `vendor/bin/sail bin pint --format agent`.
- Frontend build via `vendor/bin/sail npm run build`.
- Execution: `vendor/bin/sail artisan test --filter=SubscriptionTest`.
- Adversarial hardening & audit pass.
- Final gate approval and completion report to Sentinel.
