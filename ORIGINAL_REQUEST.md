# Original User Request

## 2026-09-22T19:14:40Z

# Teamwork Preview Prompt Draft

**Objective**: Implement the "Subscription Tracker" feature directly on the Dashboard (`/dashboard`), enforcing Secure by Design architecture (Anti-IDOR, Inertia Data Leaks prevention, XSS sanitization) and covering 100% of the requirements with automated tests.

## 1. Context
The user wants to replace the default Dashboard with a complete Subscription Tracker (Rastreador de Assinaturas e Gastos Recorrentes). The stack is Laravel 12 (PHP 8.5), React 18, Inertia v2, and Tailwind CSS. All commands must be run via `vendor/bin/sail`.

## 2. Data & Models
- Create `subscriptions` migration with `user_id`, `name`, `price`, `currency` (default BRL), `billing_cycle` (monthly/yearly), `category`, `next_billing_date`, `status` (active/paused), and `notes`. Add indexes on `[user_id, status]` and `[user_id, next_billing_date]`.
- Create `Subscription.php` model protecting against Mass Assignment, adding `scopeActive`, `scopeDueSoon($days=7)`, and accessors `getMonthlyEquivalentPriceAttribute` and `getYearlyEquivalentPriceAttribute`.
- Update `User.php` with `hasMany(Subscription::class)`.
- Create `SubscriptionFactory.php` and `SubscriptionSeeder.php` (with realistic data like Netflix, AWS, Spotify, etc.).

## 3. Security, Authorization & API
- Create `SubscriptionPolicy.php` enforcing strict Tenant Isolation (Anti-IDOR) for `view`, `update`, `delete`, checking `$user->id === $subscription->user_id`.
- Create `SubscriptionRequest.php` with `prepareForValidation` doing `strip_tags` and `trim` on text fields (Anti-XSS), and strict validation rules.
- Create `SubscriptionResource.php` strictly exposing only safe fields (prevent Inertia Data Leaks).
- Create `SubscriptionController.php`:
  - `index`: Calculate totals per currency for active subscriptions, highlight `due_soon` (< 7 days), and return via `SubscriptionResource`.
  - `store`, `update`, `destroy`, `toggleStatus`: Enforce Policy and use validated data.
- Update `routes/web.php`: Add throttle `60,1` to mutations and map dashboard to `SubscriptionController@index`.

## 4. Frontend (Inertia v2 + React 18)
- Create `CategoryBadge.jsx` with deterministic color hash.
- Create `SubscriptionModal.jsx` using `useForm` for CSRF protection, supporting category suggestions (`<datalist>`) and multi-currency.
- Create `DeleteSubscriptionModal.jsx` for safe deletion.
- Update `Dashboard.jsx`:
  - Banner for bills due in 7 days.
  - Metric cards for totals per currency (BRL, USD, EUR) and active/paused count.
  - Search, filter by category/status/cycle.
  - Responsive layout (table for desktop, touch cards for mobile).
  - Quick action to toggle status.

## 5. Objective Verification (Steps 4-6) & Tests
- Ensure `tests/Feature/SubscriptionTest.php` covers the following and passes:
  - **Anti-IDOR**: Users cannot view, update, delete, or toggle status of other users' subscriptions (403 Forbidden). Unauthenticated users get redirected (302).
  - **Anti-XSS & Validation**: `strip_tags` successfully removes HTML tags from name/notes. Rejects negative prices and unsupported currencies.
  - **Business Logic**: Proportional calculations (yearly -> monthly), paused subscriptions excluded from projected totals, `due_soon` scope accurately identifies bills within 7 days.
  - **Execution**: Run `vendor/bin/sail artisan test --filter=SubscriptionTest` and ensure it passes cleanly.
- Code Formatting: Run `vendor/bin/sail bin pint --format agent`.
- Frontend Build: Run `vendor/bin/sail npm run build`.
