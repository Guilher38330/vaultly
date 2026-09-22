## 2026-09-22T20:01:12Z
You are test_writer_m4_1.
Your working directory: z:\home\guilhherme\projetos\meu-app-react\.agents\test_writer_m4_1
Original user request path: z:\home\guilhherme\projetos\meu-app-react\.agents\ORIGINAL_REQUEST.md
Project plan and contracts path: z:\home\guilhherme\projetos\meu-app-react\PROJECT.md
Test infrastructure design path: z:\home\guilhherme\projetos\meu-app-react\TEST_INFRA.md

MANDATORY: Read ORIGINAL_REQUEST.md before doing any work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope: Milestone 4 — Comprehensive Automated E2E Test Suite (SubscriptionTest.php)
You have exclusive write ownership over:
- tests/Feature/SubscriptionTest.php

Requirements to implement in tests/Feature/SubscriptionTest.php:
The test class must use `RefreshDatabase` and extend `Tests\TestCase`. It must exhaustively cover:
1. **Anti-IDOR (Tenant Isolation)**:
   - User cannot update another user's subscription (403 Forbidden).
   - User cannot delete another user's subscription (403 Forbidden).
   - User cannot toggle status of another user's subscription (403 Forbidden).
   - Unauthenticated guest accessing `/dashboard` gets redirected to `/login` (302).
   - Unauthenticated guest submitting mutations gets redirected to `/login` (302).
2. **Anti-XSS Sanitization & Strict Validation**:
   - `strip_tags` removes `<script>` and HTML tags from `name` and `notes` before storing in database.
   - Validation rejects negative prices (`price = -10.00`) with HTTP 422 / session errors.
   - Validation rejects zero price (`price = 0.00`) with HTTP 422.
   - Validation rejects unsupported currencies (`GBP`, `JPY`, `BTC`) with HTTP 422.
   - Validation rejects invalid billing cycles (`weekly`, `biweekly`) with HTTP 422.
   - Validation requires required fields (`name`, `price`, `currency`, `billing_cycle`, `category`, `next_billing_date`).
3. **Business Logic & Scopes**:
   - Proportional calculations: yearly subscription computes `monthly_equivalent_price = round(price / 12, 2)`.
   - Proportional calculations: monthly subscription computes `yearly_equivalent_price = round(price * 12, 2)`.
   - Paused subscriptions are strictly excluded from projected currency totals on Dashboard.
   - `scopeDueSoon` accurately includes bills due in 0 to 7 days, and excludes bills due in 8+ days or overdue.
   - Multi-currency totals: verifies separate totals for BRL, USD, and EUR.
4. **CRUD Actions & Flow**:
   - Authenticated user can create subscription via `POST /subscriptions` and it is saved under their `user_id`.
   - Authenticated user can update their subscription via `PUT /subscriptions/{id}`.
   - Authenticated user can toggle status between active and paused via `PATCH /subscriptions/{id}/toggle-status`.
   - Authenticated user can delete their subscription via `DELETE /subscriptions/{id}`.
   - `GET /dashboard` renders Inertia component `Dashboard` with valid `subscriptions`, `metrics`, `due_soon`, and `categories` props.

Verification:
- Run test suite: `docker compose exec -T laravel.test php artisan test --filter=SubscriptionTest` (or WSL sail). Ensure 100% pass.
- Run Pint: `docker compose exec -T laravel.test ./vendor/bin/pint --dirty --format agent`.
- Run frontend build: `docker compose exec -T laravel.test npm run build`.
- Write handoff report to `z:\home\guilhherme\projetos\meu-app-react\.agents\test_writer_m4_1\handoff.md`.
- Send message to parent when complete.
