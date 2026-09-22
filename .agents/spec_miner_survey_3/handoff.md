# Handoff Report: Subscription Tracker Specification & Requirements Mining

**Agent**: `spec_miner_survey_3`  
**Date**: 2026-09-22  
**Target Milestone**: Survey & Specification  
**Destination**: Parent Orchestrator (`34216660-2605-47b7-b565-eb2c6fb1d94d`)

---

## 1. Observation

### 1.1 Direct Codebase & Environment Observations
1. **Application Stack & Versions**:
   - `composer.json:12-18`: PHP `^8.3` (runtime container is PHP 8.5 via `sail-8.5/app`), Laravel Framework `^13.17` (`12.x/13.x` latest foundation), `inertiajs/inertia-laravel: ^2.0`, `tightenco/ziggy: ^2.0`.
   - `composer.json:20-30`: `laravel/sail: ^1.67`, `laravel/pint: ^1.27`, `phpunit/phpunit: ^12.5.12`.
   - `package.json:9-23`: `@inertiajs/react: ^2.0.0`, `react: ^18.2.0`, `@headlessui/react: ^2.0.0`, `tailwindcss: ^3.2.1`, `vite: ^8.0.0`.
2. **Runtime Verification via Sail**:
   - Containers active (`sail ps`): `meu-app-react-laravel.test-1` (Up 5+ hours), `meu-app-react-mysql-1` (Up 5+ hours, healthy).
   - Test execution: `vendor/bin/sail artisan test` executed 25 tests, 61 assertions, all PASS (2.55s).
   - Code formatting: `vendor/bin/sail bin pint --format agent` returned `{"tool":"pint","result":"passed"}`.
   - Frontend compilation: `vendor/bin/sail npm run build` successfully transformed 998 modules, generating Vite manifest and production bundles in 1.21s.
3. **Existing Routing & Dashboard Baseline**:
   - `routes/web.php:17-19`:
     ```php
     Route::get('/dashboard', function () {
         return Inertia::render('Dashboard');
     })->middleware(['auth', 'verified'])->name('dashboard');
     ```
     Currently a closure route rendering a static placeholder dashboard.
   - `resources/js/Pages/Dashboard.jsx:1-107`: Displays static welcome card, status badges, and user info (`Olá, {user.name}!`).
4. **Existing Model Patterns**:
   - `app/Models/User.php:13-15`: Uses PHP 8 attributes:
     ```php
     #[Fillable(['name', 'email', 'password'])]
     #[Hidden(['password', 'remember_token'])]
     class User extends Authenticatable
     ```
     Lacks relationship to subscriptions.
5. **Existing Component Architecture**:
   - `resources/js/Components/Modal.jsx:1-66`: Uses `@headlessui/react` (`Dialog`, `DialogPanel`, `Transition`, `TransitionChild`).
   - `resources/views/app.blade.php:31`: Features `@routes` (Ziggy routing in client side) and Anti-FOUC theme script supporting dark mode.
6. **Project Rules & Constraints**:
   - `AGENTS.md` mandates that all commands run via Sail (`vendor/bin/sail`).
   - PHP style mandates curly braces, strict types, PHP 8 constructor promotion, and Pint formatting (`vendor/bin/sail bin pint --format agent`).
   - Test framework is PHPUnit (`Tests\TestCase`, `RefreshDatabase`).

---

### 1.2 Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Data & Models | Subscriptions Migration | Database table `subscriptions` storing tenant subscriptions with foreign key to `users` | Table columns: `id`, `user_id`, `name`, `price`, `currency`, `billing_cycle`, `category`, `next_billing_date`, `status`, `notes`, timestamps | Schema created with FK cascade on delete | DB error on constraint violation | `ORIGINAL_REQUEST.md:13` |
| 2 | Data & Models | Composite Indexes | High-performance compound indexes for tenant filtering | Indexes on `[user_id, status]` and `[user_id, next_billing_date]` | Fast indexed lookups for active totals and due queries | Query plan degradation if omitted | `ORIGINAL_REQUEST.md:13` |
| 3 | Data & Models | Mass Assignment Protection | Guard subscription attributes against unvalidated assignment | Form fields via request | Protected model instance | `MassAssignmentException` if guarded | `ORIGINAL_REQUEST.md:14` |
| 4 | Data & Models | `scopeActive` | Eloquent scope filtering active subscriptions | Eloquent query builder | Builder query filtered by `status = 'active'` | Returns empty builder if no active records | `ORIGINAL_REQUEST.md:14` |
| 5 | Data & Models | `scopeDueSoon($days=7)` | Eloquent scope identifying upcoming renewals within threshold | Eloquent query builder, integer `$days = 7` | Builder query where `next_billing_date` is between today and `today + $days` | Empty collection if no records in range | `ORIGINAL_REQUEST.md:14` |
| 6 | Data & Models | Monthly Equivalent Accessor | Computed attribute normalizing yearly subscriptions to monthly | `$this->price`, `$this->billing_cycle` | Float rounded to 2 decimals (`price/12` if yearly, `price` if monthly) | Returns `0.00` if price is 0 | `ORIGINAL_REQUEST.md:14` |
| 7 | Data & Models | Yearly Equivalent Accessor | Computed attribute normalizing monthly subscriptions to yearly | `$this->price`, `$this->billing_cycle` | Float rounded to 2 decimals (`price*12` if monthly, `price` if yearly) | Returns `0.00` if price is 0 | `ORIGINAL_REQUEST.md:14` |
| 8 | Data & Models | User Relationship | Eloquent `hasMany` relation on `User` model | User model instance | `HasMany` relation to `Subscription` | Empty collection if no subscriptions | `ORIGINAL_REQUEST.md:15` |
| 9 | Data & Models | Subscription Factory | Realistic mock generator for testing and seeding | Model attributes, custom states (`active`, `paused`, `dueSoon`, `monthly`, `yearly`) | Instantiated/persisted `Subscription` instances | Factory validation failure if misconfigured | `ORIGINAL_REQUEST.md:16` |
| 10 | Data & Models | Subscription Seeder | Realistic demo dataset (Netflix, AWS, Spotify, GitHub, etc.) | Database seed command | Pre-populated tenant subscription dataset | Halts migration/seed if schema mismatch | `ORIGINAL_REQUEST.md:16` |
| 11 | Security & Auth | SubscriptionPolicy (Anti-IDOR) | Strict Tenant Isolation preventing cross-tenant access | `$user`, `$subscription` | Boolean (`true` if `$user->id === $subscription->user_id`) | HTTP 403 Forbidden on mismatch | `ORIGINAL_REQUEST.md:19` |
| 12 | Security & Auth | Anti-XSS Request Sanitization | FormRequest sanitizing user input using `strip_tags` and `trim` | Raw HTTP inputs (`name`, `category`, `notes`) | Cleaned sanitized string attributes | Rejects or strips tags before DB insertion | `ORIGINAL_REQUEST.md:20` |
| 13 | Security & Auth | Strict Request Validation | Enforce validation rules on price, cycle, currency, and date | Input payload | Validated data array or redirect with errors | HTTP 422 Unprocessable Entity / session errors | `ORIGINAL_REQUEST.md:20` |
| 14 | Security & Auth | Safe Serialization Resource | `SubscriptionResource` preventing Inertia Data Leaks | Subscription Eloquent model | Explicit whitelisted JSON/Array shape | Prevents exposure of internal DB columns | `ORIGINAL_REQUEST.md:21` |
| 15 | Security & API | Dashboard Subscription Index | Controller endpoint computing metrics and returning Inertia props | HTTP GET `/dashboard` | Inertia render with `subscriptions`, `metrics`, `due_soon`, `categories` | Redirects to `/login` (302) if guest | `ORIGINAL_REQUEST.md:22-25` |
| 16 | Security & API | Subscription Mutations CRUD | Endpoints to create, update, delete subscriptions | POST, PUT, DELETE requests | 302 Redirect back to dashboard with flash success | 403 on IDOR, 422 on validation error | `ORIGINAL_REQUEST.md:24` |
| 17 | Security & API | Quick Toggle Status Action | Fast status toggle between `active` and `paused` | PATCH `/subscriptions/{id}/toggle-status` | 302 Redirect back with updated status | 403 on IDOR | `ORIGINAL_REQUEST.md:24, 36` |
| 18 | Security & API | Rate Limiting (Throttle) | Route throttling restricting mutation abuse | Client mutation requests | HTTP 200/302 within rate limit | HTTP 429 Too Many Requests (>60/min) | `ORIGINAL_REQUEST.md:25` |
| 19 | Frontend | CategoryBadge Component | Deterministic color hashing for category badges | Category string prop (e.g., "Streaming", "Cloud") | React badge with consistent color classes across dark/light mode | Fallback neutral badge on empty string | `ORIGINAL_REQUEST.md:28` |
| 20 | Frontend | SubscriptionModal Component | Create/Edit modal with `useForm`, multi-currency, `<datalist>` | `isOpen`, `onClose`, `subscription` (null or object), `categories` | Form dialog with validation error rendering and submit handling | Inline validation error indicators | `ORIGINAL_REQUEST.md:29` |
| 21 | Frontend | DeleteSubscriptionModal | Confirmation modal preventing accidental deletions | `isOpen`, `onClose`, `subscription` | Confirmation dialog with action buttons | Cancellation closes modal without mutating | `ORIGINAL_REQUEST.md:30` |
| 22 | Frontend | Due Soon Alert Banner | Highlight banner for subscriptions due within 7 days | Array of `due_soon` subscriptions | Alert banner displaying bill details and count | Hidden if `due_soon` array is empty | `ORIGINAL_REQUEST.md:32` |
| 23 | Frontend | Metric Summary Cards | Financial overview cards per currency and status breakdown | `metrics` object from controller | Total projected spend cards (BRL, USD, EUR) and active/paused count | Clear "0.00" display if no active items | `ORIGINAL_REQUEST.md:33` |
| 24 | Frontend | Search & Multi-Filter Bar | Real-time filtering by search text, category, status, cycle, currency | Filter controls and input | Filtered list displayed without full page reload | Shows friendly empty filter state | `ORIGINAL_REQUEST.md:34` |
| 25 | Frontend | Responsive Table & Touch-Cards | Adaptive UI for desktop tables and mobile touch cards | Filtered subscriptions list | Responsive HTML table on desktop, cards on mobile | Graceful text truncation on long notes | `ORIGINAL_REQUEST.md:35` |
| 26 | Testing | Comprehensive Test Suite | Automated regression suite covering security, logic, and CRUD | Test runner (`artisan test`) | 100% green test assertions across all requirements | Fails CI/build on assertion failure | `ORIGINAL_REQUEST.md:39-43` |

---

### 1.3 Edge Cases

| # | Feature | Input | Observed / Expected Behavior |
|---|---------|-------|------------------------------|
| 1 | Validation: Price | Negative value (`price = -15.50`) | Rejected with HTTP 422 and validation error for `price` ("min:0.01" or "gte:0.01"). Database remains unmutated. |
| 2 | Validation: Price | Zero value (`price = 0.00`) | Rejected with HTTP 422 because subscriptions require a positive recurring cost. |
| 3 | Validation: Currency | Unsupported currency (`currency = 'GBP'`, `'BTC'`) | Rejected with HTTP 422 ("currency must be one of: BRL, USD, EUR"). |
| 4 | Validation: Cycle | Invalid billing cycle (`billing_cycle = 'weekly'`, `'biweekly'`) | Rejected with HTTP 422 ("billing_cycle must be monthly or yearly"). |
| 5 | Anti-XSS Sanitization | `<script>alert('pwn')</script>Netflix` in `name` | `strip_tags` strips HTML tags, resulting in sanitized string `alert('pwn')Netflix` or `Netflix`, preventing script execution in DOM. |
| 6 | Anti-XSS Sanitization | `<img src=x onerror=stealCookies()>Important` in `notes` | Tags stripped to `Important` without triggering error handler or script execution. |
| 7 | Anti-IDOR Authorization | User A sends `PUT /subscriptions/{userB_sub_id}` | `SubscriptionPolicy::update` returns `false`; framework aborts with HTTP 403 Forbidden. |
| 8 | Anti-IDOR Authorization | User A sends `DELETE /subscriptions/{userB_sub_id}` | `SubscriptionPolicy::delete` returns `false`; framework aborts with HTTP 403 Forbidden. |
| 9 | Anti-IDOR Authorization | User A sends `PATCH /subscriptions/{userB_sub_id}/toggle-status` | `SubscriptionPolicy::update` returns `false`; framework aborts with HTTP 403 Forbidden. |
| 10 | Authentication Gate | Guest sends `GET /dashboard` or `POST /subscriptions` | Redirects to `/login` with HTTP 302. |
| 11 | Proportional Calculation | Yearly price with repeating decimals (`price = 99.99`, `yearly`) | `monthly_equivalent_price` computes `round(99.99 / 12, 2)` = `8.33`, preventing floating-point overflow. |
| 12 | Projected Total Calculation | User has 1 active ($100/mo) and 1 paused ($500/mo) subscription | Projected monthly total for USD is exactly `$100.00`; paused subscriptions are explicitly excluded from financial forecast. |
| 13 | Multi-Currency Calculation | User has subscriptions in BRL, USD, and EUR simultaneously | Controller groups totals by currency key (`{ BRL: 150.00, USD: 20.00, EUR: 15.00 }`) rather than mixing unconverted values. |
| 14 | Due Soon Boundary (7 days) | Subscription due in exactly 7 days (`today + 7 days`) | Included in `scopeDueSoon` and rendered in the alert banner. |
| 15 | Due Soon Boundary (8 days) | Subscription due in 8 days (`today + 8 days`) | Excluded from `scopeDueSoon` and alert banner. |
| 16 | Due Soon Boundary (Overdue) | Subscription due in the past (`next_billing_date < today`) | `scopeDueSoon` filters for upcoming dates (`>= today`). Overdue items do not falsely report as "due in X days". |
| 17 | Rate Limiting | More than 60 mutation requests within 1 minute from same user/IP | Throttled with HTTP 429 Too Many Requests. |
| 18 | Client-side Filter Empty State | User types search term matching no subscriptions | Renders dedicated empty-filter UI with "Limpar Filtros" reset button instead of a broken empty table. |

---

## 2. Logic Chain

1. **Premise 1 (Secure by Design & Tenant Isolation)**:
   - *Observation*: The application authenticates users via Laravel Breeze / Sanctum, and every subscription belongs to a user (`user_id`).
   - *Inference*: Any access to a subscription without verifying `$user->id === $subscription->user_id` exposes an Insecure Direct Object Reference (IDOR) vulnerability.
   - *Deduction*: A dedicated `SubscriptionPolicy` must be bound to `Subscription`, and every mutation (`update`, `destroy`, `toggleStatus`) must invoke `$this->authorize('update', $subscription)` or `$this->authorize('delete', $subscription)` to return 403 Forbidden on unauthorized access.

2. **Premise 2 (Inertia Data Leak Prevention)**:
   - *Observation*: Inertia serializes controller return props directly into the HTML root element (`data-page` attribute) and over JSON XHR responses.
   - *Inference*: Returning raw Eloquent models exposes all table columns, foreign keys, internal timestamps, and unneeded attributes.
   - *Deduction*: `SubscriptionResource` must strictly format the payload, exposing only whitelisted properties (`id`, `name`, `price`, `currency`, `billing_cycle`, `category`, `next_billing_date`, `status`, `notes`, `monthly_equivalent_price`, `yearly_equivalent_price`, `is_due_soon`, `days_until_due`).

3. **Premise 3 (Anti-XSS Sanitization & Strict Validation)**:
   - *Observation*: Users enter free-text strings (`name`, `category`, `notes`).
   - *Inference*: Unsanitized input can persist script tags or malformed HTML in the MySQL database, potentially executing in client browsers.
   - *Deduction*: `SubscriptionRequest::prepareForValidation()` must call `strip_tags()` and `trim()` on all string fields prior to validation rules executing. Furthermore, `price` must strictly require `numeric` and `min:0.01` to reject negative and zero prices, while `currency` and `billing_cycle` must be validated against strict whitelists (`Rule::in(['BRL', 'USD', 'EUR'])` and `Rule::in(['monthly', 'yearly'])`).

4. **Premise 4 (Business Logic Accuracy & Financial Metrics)**:
   - *Observation*: Subscriptions have different billing cycles (`monthly` vs `yearly`) and different statuses (`active` vs `paused`), across multiple currencies (`BRL`, `USD`, `EUR`).
   - *Inference*: Mixing currencies or summing paused subscriptions distorts the user's projected financial obligations.
   - *Deduction*:
     - Monthly equivalents for yearly subscriptions must divide by 12 and round to 2 decimals.
     - Yearly equivalents for monthly subscriptions must multiply by 12.
     - Financial projections must only sum `active` subscriptions.
     - Totals must be grouped distinctly per currency (`BRL`, `USD`, `EUR`).

5. **Premise 5 (User Experience & Inertia v2 Integration)**:
   - *Observation*: The dashboard is the central hub. Users require instant visibility into bills due soon, high usability on both desktop and mobile, and fast status toggles.
   - *Inference*: Desktop users benefit from tabular density; mobile users need touch-friendly cards; urgent upcoming bills (< 7 days) require immediate visual prominence.
   - *Deduction*:
     - Provide an alert banner for subscriptions due within 7 days.
     - Provide a responsive layout: high-density table on `md:` breakpoints, card grid on mobile.
     - Provide `CategoryBadge` with deterministic color hashing so categories have consistent visual identity without requiring manual color configuration.
     - Implement modal forms via `@inertiajs/react` `useForm` for CSRF protection and smooth asynchronous interactions without full-page reloads.

---

## 3. Caveats

1. **Multi-Currency Aggregation**:
   - The system aggregates totals *per currency* (e.g. Total BRL, Total USD, Total EUR) rather than converting across currencies via live exchange rates. This ensures 100% accounting precision without introducing external currency API dependencies or rate fluctuations.
2. **Date Boundaries & Timezones**:
   - Dates are stored as `YYYY-MM-DD`. `scopeDueSoon(7)` evaluates against `now()->toDateString()` and `now()->addDays(7)->toDateString()`. If the user is in a different timezone from the server, day boundaries could differ by a few hours; using `Carbon::today()` ensures consistent calendar day evaluation.
3. **No Overdue Automatic Deactivation**:
   - Subscriptions past their `next_billing_date` remain active unless manually toggled or updated by the user. `scopeDueSoon` will only capture upcoming dates between today and `today + 7 days`.

---

## 4. Conclusion: Verifiable Specification Checklist & Acceptance Criteria

### Domain 1: Data & Models (`subscriptions` Table & `Subscription` Model)
- [ ] **Migration `create_subscriptions_table`**:
  - Schema contains: `id` (bigIncrements), `user_id` (foreignId to `users` with `cascadeOnDelete`), `name` (string 255), `price` (decimal 10,2), `currency` (string 3, default 'BRL'), `billing_cycle` (string 20, default 'monthly'), `category` (string 100), `next_billing_date` (date), `status` (string 20, default 'active'), `notes` (text nullable), `timestamps`.
  - Composite indexes: `$table->index(['user_id', 'status'])` and `$table->index(['user_id', 'next_billing_date'])`.
- [ ] **Model `Subscription.php`**:
  - Mass assignment: Protected via `$fillable` or `#[Fillable]` covering safe fields (`name`, `price`, `currency`, `billing_cycle`, `category`, `next_billing_date`, `status`, `notes`).
  - Casts: `price` to `decimal:2`, `next_billing_date` to `date:Y-m-d`.
  - Relationships: `user()` returns `BelongsTo` to `User::class`.
  - Scopes:
    - `scopeActive($query)`: `where('status', 'active')`.
    - `scopeDueSoon($query, int $days = 7)`: `whereBetween('next_billing_date', [now()->toDateString(), now()->addDays($days)->toDateString()])`.
  - Accessors:
    - `getMonthlyEquivalentPriceAttribute()`: `round($this->price / 12, 2)` if yearly, `$this->price` if monthly.
    - `getYearlyEquivalentPriceAttribute()`: `round($this->price * 12, 2)` if monthly, `$this->price` if yearly.
- [ ] **Model `User.php`**:
  - Contains `public function subscriptions(): HasMany` returning `Subscription::class`.
- [ ] **Factory & Seeder**:
  - `SubscriptionFactory` supports states: `active()`, `paused()`, `dueSoon()`, `monthly()`, `yearly()`, `currency()`.
  - `SubscriptionSeeder` generates realistic services (Netflix, Spotify, AWS, GitHub Copilot, ChatGPT Plus) with at least two items due in < 7 days.

### Domain 2: Security, Authorization & API
- [ ] **Policy `SubscriptionPolicy.php`**:
  - Enforces `$user->id === $subscription->user_id` on `view`, `update`, `delete`.
  - Returns `false` (403) for any other user attempting mutation.
- [ ] **Request `SubscriptionRequest.php`**:
  - `prepareForValidation()` executes `strip_tags()` and `trim()` on `name`, `category`, `notes`.
  - Validation rules:
    - `name`: `['required', 'string', 'max:255']`
    - `price`: `['required', 'numeric', 'min:0.01']`
    - `currency`: `['required', 'string', Rule::in(['BRL', 'USD', 'EUR'])]`
    - `billing_cycle`: `['required', 'string', Rule::in(['monthly', 'yearly'])]`
    - `category`: `['required', 'string', 'max:100']`
    - `next_billing_date`: `['required', 'date']`
    - `status`: `['sometimes', 'required', 'string', Rule::in(['active', 'paused'])]`
    - `notes`: `['nullable', 'string', 'max:1000']`
- [ ] **Resource `SubscriptionResource.php`**:
  - Exposes only safe properties: `id`, `name`, `price`, `currency`, `billing_cycle`, `category`, `next_billing_date`, `status`, `notes`, `monthly_equivalent_price`, `yearly_equivalent_price`, `is_due_soon`, `days_until_due`, `created_at`.
- [ ] **Controller `SubscriptionController.php`**:
  - `index()`:
    - Queries authenticated user's subscriptions.
    - Calculates projected monthly and yearly totals by currency for active subscriptions.
    - Collects active subscriptions due within 7 days (`due_soon`).
    - Compiles distinct user categories for `<datalist>`.
    - Renders `Dashboard` via Inertia with `subscriptions`, `metrics`, `due_soon`, `categories`, `supported_currencies`.
  - `store()`: Creates subscription for `$request->user()`.
  - `update()`: Authorizes via policy and updates subscription.
  - `destroy()`: Authorizes via policy and deletes subscription.
  - `toggleStatus()`: Authorizes via policy, toggles status, and saves.
- [ ] **Routes & Rate Limiting (`routes/web.php`)**:
  - `/dashboard` mapped to `[SubscriptionController::class, 'index']`.
  - Mutations (`store`, `update`, `destroy`, `toggleStatus`) grouped under `throttle:60,1`.

### Domain 3: Frontend (Inertia v2 + React 18 + Tailwind CSS)
- [ ] **`CategoryBadge.jsx`**:
  - Implements deterministic color hash mapping category name to consistent Tailwind color classes.
  - Supports dark mode seamlessly.
- [ ] **`SubscriptionModal.jsx`**:
  - Handles Create and Edit flows using Inertia `useForm`.
  - Renders `<datalist id="category-suggestions">` for autocompleting existing/suggested categories while allowing arbitrary custom text.
  - Multi-currency dropdown (`BRL`, `USD`, `EUR`) and billing cycle toggle (`Mensal`, `Anual`).
  - Displays validation errors beneath fields with `InputError`.
- [ ] **`DeleteSubscriptionModal.jsx`**:
  - Confirmation modal asking for explicit confirmation with subscription name before invoking `delete`.
- [ ] **`Dashboard.jsx`**:
  - Due Soon Banner: Renders if `due_soon.length > 0`, displaying upcoming renewals within 7 days.
  - Metric Cards: Displays monthly & yearly totals per currency and active vs paused counts. Clarifies that paused subscriptions are excluded from projections.
  - Search & Filters: Real-time search by name/notes, filter by category, status, cycle, and currency. Provides "Limpar Filtros" button.
  - Responsive View: High-density clean table on desktop, touch-friendly cards on mobile.
  - Quick Toggle: One-click status switch for fast toggling between active and paused.

### Domain 4: Automated Testing & Code Standards
- [ ] **Feature Test Suite (`tests/Feature/SubscriptionTest.php`)**:
  - Anti-IDOR: Unauthenticated requests redirect (302); cross-tenant view/update/delete/toggle requests return 403 Forbidden.
  - Anti-XSS: HTML tags in `name`, `category`, and `notes` are stripped.
  - Validation: Negative/zero prices, invalid currencies, and invalid billing cycles return 422.
  - Business Logic:
    - Yearly -> Monthly equivalent price equals `price / 12` rounded to 2 decimals.
    - Monthly -> Yearly equivalent price equals `price * 12`.
    - Paused subscriptions are excluded from projected totals.
    - Scope `dueSoon(7)` accurately captures bills within 0 to 7 days, excluding past and >7 day dates.
  - CRUD: User can create, update, delete, and toggle their own subscriptions.
- [ ] **Verification Execution**:
  - All tests pass: `vendor/bin/sail artisan test --filter=SubscriptionTest`.
  - Pint passes without errors: `vendor/bin/sail bin pint --format agent`.
  - Frontend builds cleanly: `vendor/bin/sail npm run build`.

---

## 5. Verification Method

To independently verify the implementation against this specification:

1. **Run Subscription Feature Tests**:
   ```powershell
   wsl -e sh -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail artisan test --filter=SubscriptionTest"
   ```
   *Pass Condition*: 0 failures, 0 errors, all assertions green.

2. **Run Full Regression Test Suite**:
   ```powershell
   wsl -e sh -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail artisan test"
   ```
   *Pass Condition*: All existing 25 tests plus new `SubscriptionTest` assertions pass without regressions.

3. **Run Laravel Pint Code Formatter**:
   ```powershell
   wsl -e sh -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail bin pint --format agent"
   ```
   *Pass Condition*: Returns `{"tool":"pint","result":"passed"}` with exit code 0.

4. **Verify Frontend Build**:
   ```powershell
   wsl -e sh -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail npm run build"
   ```
   *Pass Condition*: Vite finishes building client environment without syntax or JSX errors, producing valid bundles in `public/build`.

5. **Files to Inspect for Compliance**:
   - `database/migrations/*_create_subscriptions_table.php` (indexes and schema)
   - `app/Models/Subscription.php` (casts, accessors, scopes, fillable)
   - `app/Models/User.php` (relationship)
   - `app/Policies/SubscriptionPolicy.php` (Anti-IDOR checks)
   - `app/Http/Requests/SubscriptionRequest.php` (strip_tags, rules)
   - `app/Http/Resources/SubscriptionResource.php` (safe serialization)
   - `app/Http/Controllers/SubscriptionController.php` (metrics, queries, CRUD, toggle)
   - `routes/web.php` (rate limiting `throttle:60,1`, named routes)
   - `resources/js/Components/CategoryBadge.jsx` (color hash)
   - `resources/js/Components/SubscriptionModal.jsx` (useForm, datalist, multi-currency)
   - `resources/js/Components/DeleteSubscriptionModal.jsx` (safe deletion)
   - `resources/js/Pages/Dashboard.jsx` (banner, metrics, filters, responsive layout)
   - `tests/Feature/SubscriptionTest.php` (coverage of IDOR, XSS, calculations, CRUD)

6. **Invalidation Conditions**:
   - Any endpoint permitting mutation of a subscription without verifying user ownership invalidates the Anti-IDOR spec.
   - Raw HTML or script tags persisting into the database invalidates the Anti-XSS spec.
   - Paused subscriptions being summed into the projected spend metric invalidates the financial calculation spec.
   - Any unhandled regression in existing authentication or profile tests.
