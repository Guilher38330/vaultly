# Project: Subscription Tracker on Dashboard

## Architecture
- **Framework & Foundation**: Laravel 13 (PHP 8.5) running in Laravel Sail (`laravel.test` + `mysql:8.4` containers).
- **Client & Presentation**: Inertia v2 with React 18, Tailwind CSS (Cosmic/Emerald palette, dark mode support via `class`), Headless UI v2.
- **Data Layer**: MySQL 8.4 database with `subscriptions` table linked by FK to `users`. Composite indexes `[user_id, status]` and `[user_id, next_billing_date]`.
- **Security & Authorization (Secure by Design)**:
  - Strict Tenant Isolation (Anti-IDOR): `SubscriptionPolicy` enforcing `$user->id === $subscription->user_id` for view/update/delete/toggle.
  - Data Leak Prevention: `SubscriptionResource` strictly serializes whitelisted fields to prevent internal database columns from reaching Inertia client props.
  - Input Sanitization (Anti-XSS): `SubscriptionRequest::prepareForValidation()` strips HTML tags via `strip_tags()` and trims input before validation rules.
  - Rate Limiting: `throttle:60,1` on mutation routes.
- **Data Flow**:
  1. `GET /dashboard` -> `SubscriptionController@index` -> fetches active/all subscriptions for `$request->user()`, calculates currency totals and due_soon -> transforms via `SubscriptionResource` -> `Inertia::render('Dashboard', [...])`.
  2. Frontend renders metrics cards (BRL, USD, EUR), Due Soon banner (< 7 days), filter/search controls, responsive table (desktop) / cards (mobile).
  3. User mutations (Create, Edit, Delete, Toggle Status) -> `useForm` / Inertia router -> `routes/web.php` (`['auth', 'throttle:60,1']`) -> `SubscriptionController` -> validated by `SubscriptionRequest`, authorized by `SubscriptionPolicy` -> persisted to DB -> redirects back with Inertia flash session.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Subscriptions Migration | Database schema with columns: `id`, `user_id`, `name`, `price`, `currency`, `billing_cycle`, `category`, `next_billing_date`, `status`, `notes`, timestamps, FK cascade | M1 | ORIGINAL_REQUEST §2 |
| 2 | Composite Indexes | Indexes on `[user_id, status]` and `[user_id, next_billing_date]` | M1 | ORIGINAL_REQUEST §2 |
| 3 | Subscription Model | Eloquent model `Subscription.php` with mass assignment protection (`#[Fillable]`) and casts | M1 | ORIGINAL_REQUEST §2 |
| 4 | `scopeActive` | Eloquent scope filtering `status = 'active'` | M1 | ORIGINAL_REQUEST §2 |
| 5 | `scopeDueSoon($days=7)` | Eloquent scope filtering `next_billing_date` between today and today + $days | M1 | ORIGINAL_REQUEST §2 |
| 6 | Monthly Equivalent Accessor | Computed attribute normalizing yearly subscriptions to monthly (`round($price / 12, 2)`) | M1 | ORIGINAL_REQUEST §2 |
| 7 | Yearly Equivalent Accessor | Computed attribute normalizing monthly subscriptions to yearly (`round($price * 12, 2)`) | M1 | ORIGINAL_REQUEST §2 |
| 8 | User Relationship | `User::subscriptions(): HasMany` relationship on `User.php` | M1 | ORIGINAL_REQUEST §2 |
| 9 | Subscription Factory | Factory with realistic mock states (`active`, `paused`, `monthly`, `yearly`, `dueSoon`) | M1 | ORIGINAL_REQUEST §2 |
| 10 | Subscription Seeder | Realistic demo dataset (Netflix, AWS, Spotify, GitHub, ChatGPT, YouTube, Adobe) for test user | M1 | ORIGINAL_REQUEST §2 |
| 11 | SubscriptionPolicy (Anti-IDOR) | Strict tenant authorization `$user->id === $subscription->user_id` for view/update/delete/toggle | M2 | ORIGINAL_REQUEST §3 |
| 12 | Anti-XSS Input Sanitization | `prepareForValidation` using `strip_tags` and `trim` on text fields (`name`, `category`, `notes`) | M2 | ORIGINAL_REQUEST §3 |
| 13 | Strict Request Validation | Enforce validation rules: price min:0.01, cycle in monthly/yearly, currency in BRL/USD/EUR, date format | M2 | ORIGINAL_REQUEST §3 |
| 14 | Safe Serialization Resource | `SubscriptionResource.php` strictly exposing whitelisted safe fields to prevent Inertia data leaks | M2 | ORIGINAL_REQUEST §3 |
| 15 | SubscriptionController Index | Calculate currency totals for active subscriptions, identify `due_soon` (< 7 days), return safe props | M2 | ORIGINAL_REQUEST §3 |
| 16 | Subscription Mutations CRUD | `store`, `update`, `destroy` in `SubscriptionController` using validated data and policy checks | M2 | ORIGINAL_REQUEST §3 |
| 17 | Quick Toggle Status Action | `toggleStatus` endpoint switching status between active and paused | M2 | ORIGINAL_REQUEST §3 |
| 18 | Route Throttling | Map `/dashboard` to `SubscriptionController@index` and apply `throttle:60,1` to mutations | M2 | ORIGINAL_REQUEST §3 |
| 19 | CategoryBadge Component | React badge with deterministic color hash algorithm supporting light and dark modes | M3 | ORIGINAL_REQUEST §4 |
| 20 | SubscriptionModal Component | Create/Edit modal using Inertia `useForm`, `<datalist>` category suggestions, multi-currency support | M3 | ORIGINAL_REQUEST §4 |
| 21 | DeleteSubscriptionModal | Safe confirmation modal for deleting subscriptions | M3 | ORIGINAL_REQUEST §4 |
| 22 | Due Soon Alert Banner | Highlight banner on Dashboard for subscriptions due within 7 days | M3 | ORIGINAL_REQUEST §4 |
| 23 | Metric Summary Cards | Overview cards for currency totals (BRL, USD, EUR) and active/paused count | M3 | ORIGINAL_REQUEST §4 |
| 24 | Search & Multi-Filter Bar | Real-time client-side filter by text search, category, status, and billing cycle | M3 | ORIGINAL_REQUEST §4 |
| 25 | Responsive Table & Mobile Cards | Table view for desktop (`md:`), touch-friendly card grid for mobile | M3 | ORIGINAL_REQUEST §4 |
| 26 | Dashboard Quick Status Toggle | One-click button to toggle active/paused status directly from list/cards | M3 | ORIGINAL_REQUEST §4 |
| 27 | Comprehensive Test Suite | `tests/Feature/SubscriptionTest.php` covering Anti-IDOR, Anti-XSS, validation, calculations, scopes | M4 | ORIGINAL_REQUEST §5 |
| 28 | Code Formatting & Build Pass | Laravel Pint formatting (`--format agent`) and Vite build (`npm run build`) | M4 | ORIGINAL_REQUEST §5 |
| 29 | Adversarial Coverage Hardening | White-box stress testing and boundary verification (Tier 5) | M5 | Project Pattern |
| 30 | Forensic Integrity Audit | Independent verification of genuine logic (no hardcoding or facade bypasses) | M5 | Project Pattern |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Data & Models | Migration, Model, Scopes, Accessors, User relation, Factory, Seeder | None | DONE |
| M2 | Security, Policy & API | SubscriptionPolicy, SubscriptionRequest, SubscriptionResource, SubscriptionController, routes/web.php | M1 | DONE |
| M3 | Frontend Components & Dashboard | CategoryBadge, SubscriptionModal, DeleteSubscriptionModal, Dashboard.jsx, SVG Icons | M2 | DONE |
| M4 | Automated E2E Test Suite & Build Verification | tests/Feature/SubscriptionTest.php, Sail test execution, Pint formatting, Vite build | M3 | DONE |
| M5 | Adversarial Hardening & Final Audit | Adversarial edge case challenge, forensic integrity audit, zero-compromise signoff | M4 | DONE |

## Interface Contracts

### M1 ↔ M2: Eloquent Model & Scopes Contract
- `Subscription` attributes:
  - `user_id` (int, foreign key -> users.id)
  - `name` (string)
  - `price` (decimal 10,2)
  - `currency` (enum/string: 'BRL', 'USD', 'EUR')
  - `billing_cycle` (enum/string: 'monthly', 'yearly')
  - `category` (string)
  - `next_billing_date` (date YYYY-MM-DD)
  - `status` (string: 'active', 'paused')
  - `notes` (nullable text)
- Scopes:
  - `Subscription::active()`: filters `where('status', 'active')`
  - `Subscription::dueSoon($days = 7)`: filters `whereBetween('next_billing_date', [today, today + $days])`
- Computed attributes:
  - `$subscription->monthly_equivalent_price`: float (2 decimals)
  - `$subscription->yearly_equivalent_price`: float (2 decimals)
- Relations:
  - `$user->subscriptions()`: `HasMany<Subscription>`
  - `$subscription->user()`: `BelongsTo<User>`

### M2 ↔ M3: Inertia Props Contract
`Inertia::render('Dashboard', props)` contract:
- `subscriptions`: Array of `SubscriptionResource` objects:
  ```json
  [
    {
      "id": 1,
      "name": "Netflix",
      "price": 55.90,
      "currency": "BRL",
      "billing_cycle": "monthly",
      "category": "Streaming",
      "next_billing_date": "2026-09-28",
      "status": "active",
      "notes": "Plano Premium 4K",
      "monthly_equivalent_price": 55.90,
      "yearly_equivalent_price": 670.80,
      "is_due_soon": true,
      "days_until_due": 6
    }
  ]
  ```
- `metrics`:
  ```json
  {
    "totals": {
      "BRL": 155.90,
      "USD": 20.00,
      "EUR": 0.00
    },
    "active_count": 4,
    "paused_count": 1
  }
  ```
- `due_soon`: Array of subscriptions due within 7 days.
- `categories`: Array of distinct category strings used by the user.

### Web Endpoints & Actions Contract
- `GET /dashboard` -> `SubscriptionController@index` (name: `dashboard`)
- `POST /subscriptions` -> `SubscriptionController@store` (name: `subscriptions.store`)
- `PUT /subscriptions/{subscription}` -> `SubscriptionController@update` (name: `subscriptions.update`)
- `DELETE /subscriptions/{subscription}` -> `SubscriptionController@destroy` (name: `subscriptions.destroy`)
- `PATCH /subscriptions/{subscription}/toggle-status` -> `SubscriptionController@toggleStatus` (name: `subscriptions.toggle-status`)

## Code Layout
- `database/migrations/2026_09_22_000001_create_subscriptions_table.php` (owned by M1)
- `app/Models/Subscription.php` (owned by M1)
- `app/Models/User.php` (modified in M1)
- `database/factories/SubscriptionFactory.php` (owned by M1)
- `database/seeders/SubscriptionSeeder.php` (owned by M1)
- `database/seeders/DatabaseSeeder.php` (modified in M1)
- `app/Policies/SubscriptionPolicy.php` (owned by M2)
- `app/Http/Requests/SubscriptionRequest.php` (owned by M2)
- `app/Http/Resources/SubscriptionResource.php` (owned by M2)
- `app/Http/Controllers/SubscriptionController.php` (owned by M2)
- `routes/web.php` (modified in M2)
- `app/Providers/AppServiceProvider.php` (modified in M2)
- `resources/js/Components/CategoryBadge.jsx` (owned by M3)
- `resources/js/Components/SubscriptionModal.jsx` (owned by M3)
- `resources/js/Components/DeleteSubscriptionModal.jsx` (owned by M3)
- `resources/js/Components/Icons.jsx` (modified in M3)
- `resources/js/Pages/Dashboard.jsx` (owned by M3)
- `tests/Feature/SubscriptionTest.php` (owned by M4)
