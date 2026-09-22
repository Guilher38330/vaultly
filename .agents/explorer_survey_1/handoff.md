# Backend Architecture & Technical Survey Report — Subscription Tracker

**Core Findings**:
The application runs on Laravel Framework 13.32.0 (PHP 8.5.10, MySQL 8.4) with Inertia v2 and React 18, orchestrated via Laravel Sail containers (`meu-app-react-laravel.test-1` and `meu-app-react-mysql-1`). All 25 baseline tests currently pass cleanly; implementing the Subscription Tracker requires adding 6 new backend files (`subscriptions` migration, `Subscription` model, `SubscriptionFactory`, `SubscriptionSeeder`, `SubscriptionPolicy`, `SubscriptionRequest`, `SubscriptionResource`, `SubscriptionController`, and `SubscriptionTest`), updating `User.php`, `routes/web.php`, and `DatabaseSeeder.php`, and running commands via WSL Sail or Docker Compose exec.

---

## 1. Observation

### 1.1 Environment, Runtimes & Dependencies
- **Composer & Framework**:
  - `composer.json` lines 12–18: `php: ^8.3`, `laravel/framework: ^13.17`, `inertiajs/inertia-laravel: ^2.0`, `laravel/sanctum: ^4.0`, `tightenco/ziggy: ^2.0`.
  - Installed runtime verified via Tinker:
    - Laravel Framework: `13.32.0`
    - PHP: `8.5.10 (cli)` (with OPcache v8.5.10, Xdebug v3.5.3)
    - `inertiajs/inertia-laravel`: `2.0.27`
    - `laravel/pint`: `1.32.1`
    - `phpunit/phpunit`: `12.5.35`
    - `fakerphp/faker`: `1.24.1`

### 1.2 Sail & Container Setup
- **Compose file**: `compose.yaml` (lines 1–57) defines:
  - Service `laravel.test` built from `./vendor/laravel/sail/runtimes/8.5` (`sail-8.5/app`). Ports `80` and `5173`.
  - Service `mysql` running image `mysql:8.4`. Port `3306`, database `laravel`, test DB script `./vendor/laravel/sail/database/mysql/create-testing-database.sh`.
- **Sail Execution Behavior on Windows Host**:
  - Direct execution in Git Bash (`bash -c "./vendor/bin/sail artisan --version"`):
    *Result*: `Unsupported operating system [MINGW64_NT-10.0-26200]. Laravel Sail supports macOS, Linux, and Windows (WSL2).` (Exit code 1).
  - Native execution via WSL Ubuntu:
    *Command*: `wsl -d Ubuntu -e bash -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail artisan test"`
    *Result*: Runs cleanly, connects to Docker daemon, and returns exit code 0.
  - Native execution via Docker Compose:
    *Command*: `docker compose exec -T laravel.test php artisan test`
    *Result*: Runs directly inside `laravel.test` container with exit code 0.

### 1.3 Database & Migrations
- **Current Migrations** in `database/migrations/`:
  - `0001_01_01_000000_create_users_table.php` (creates `users`, `password_reset_tokens`, `sessions`)
  - `0001_01_01_000001_create_cache_table.php` (creates `cache`, `cache_locks`)
  - `0001_01_01_000002_create_jobs_table.php` (creates `jobs`, `job_batches`, `failed_jobs`)
  - `php artisan migrate:status` shows all 3 ran in Batch 1.
- **Testing Database**:
  - `phpunit.xml` line 26: `<env name="DB_DATABASE" value="testing"/>`
  - MySQL service automatically provides the `testing` database initialized by Sail's init script.

### 1.4 Models & Code Conventions
- **Existing Model**: Only `app/Models/User.php` exists.
  - Lines 13–15: Uses modern PHP attributes `#[Fillable(['name', 'email', 'password'])]` and `#[Hidden(['password', 'remember_token'])]`.
  - Lines 25–31: Uses method `protected function casts(): array` with `'email_verified_at' => 'datetime'`, `'password' => 'hashed'`.
  - Traits: `use HasFactory, Notifiable;`.
- **Existing Controllers**:
  - `app/Http/Controllers/Controller.php`: Empty abstract base class. Does *not* import `AuthorizesRequests`.
  - `app/Http/Controllers/ProfileController.php`: Extends `Controller`, uses `RedirectResponse`, `Response`, explicit type hints, and form requests.
- **Existing Requests**:
  - `app/Http/Requests/ProfileUpdateRequest.php`: Extends `FormRequest`, uses `rules(): array`.
- **Existing Middleware & Bootstrap**:
  - `bootstrap/app.php`: Minimal Laravel 11/12 configuration with `HandleInertiaRequests` appended to `web`.
- **Existing Auth Guards**:
  - `config/auth.php`: Default guard `'web'` with session driver and Eloquent `'users'` provider pointing to `App\Models\User`.

### 1.5 Test Suite Baseline
- `tests/TestCase.php` extends `Illuminate\Foundation\Testing\TestCase`.
- Running `docker compose exec -T laravel.test php artisan test`:
  ```
  Tests:    25 passed (61 assertions)
  Duration: 2.29s
  ```
- All 25 existing authentication and profile feature tests pass cleanly with `RefreshDatabase`.
- Code formatter: `docker compose exec -T laravel.test ./vendor/bin/pint --test` passes on all 47 files.

---

## 2. Logic Chain

1. **Architecture Model (Inertia SPA vs API)**:
   - Observation 1.4 confirms `routes/api.php` does not exist and `bootstrap/app.php` only mounts `routes/web.php`.
   - The application is a pure Inertia SPA using session authentication (`web` guard).
   - Therefore, the Subscription Tracker endpoints must be web routes inside `routes/web.php` with session auth (`auth` middleware) and CSRF protection, redirecting back or rendering Inertia views.

2. **Tenant Isolation & Anti-IDOR**:
   - Every subscription must strictly belong to the authenticated user.
   - When creating subscriptions (`store`), assigning `user_id` from client payload creates an IDOR vulnerability. By using `$request->user()->subscriptions()->create($request->validated())`, `user_id` is guaranteed to be set to the authenticated user's ID.
   - For mutations (`update`, `destroy`, `toggleStatus`), authorizing via `SubscriptionPolicy` (`$user->id === $subscription->user_id`) using `Gate::authorize()` ensures any cross-tenant access attempts immediately abort with `403 Forbidden`.
   - Unauthenticated requests are intercepted by `auth` middleware and redirected to `/login` (`302`).

3. **Inertia Data Leak Prevention**:
   - Returning raw Eloquent models in `Inertia::render('Dashboard', ...)` can expose sensitive internal columns (`user_id`, deleted timestamps, internal flags) or trigger unbounded relationship serialization.
   - Implementing `SubscriptionResource` transforms records to a strictly whitelisted dictionary containing only necessary display attributes, preventing Inertia prop data leaks.

4. **Input Sanitization & Anti-XSS**:
   - `SubscriptionRequest` must sanitize input before validation using `prepareForValidation()`.
   - Executing `strip_tags()` and `trim()` on text fields (`name`, `category`, `notes`) removes malicious HTML tags (such as `<script>`, `<iframe>`, `<b>`) before persistence, meeting the Anti-XSS mandate.

5. **Calculation Accuracy & Business Scopes**:
   - Subscriptions have two billing cycles: `monthly` and `yearly`.
   - Accessors on `Subscription`:
     - `getMonthlyEquivalentPriceAttribute`: if `yearly`, `round($price / 12, 2)`, else `$price`.
     - `getYearlyEquivalentPriceAttribute`: if `monthly`, `round($price * 12, 2)`, else `$price`.
   - `scopeActive`: `where('status', 'active')`.
   - `scopeDueSoon($days = 7)`: `whereBetween('next_billing_date', [now()->toDateString(), now()->addDays($days)->toDateString()])`.
   - When calculating projected monthly/yearly dashboard metrics, only `active` subscriptions are summed per currency (`BRL`, `USD`, `EUR`). Paused subscriptions are excluded from projected expenses.

6. **Execution Method Compatibility**:
   - Sail bash script requires Linux/WSL2; in this Windows workspace where Z: maps to WSL, executing via:
     `wsl -d Ubuntu -e bash -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail <command>"`
     OR `docker compose exec -T laravel.test php <command>`
     executes all artisan, test, pint, and npm tasks cleanly in container context.

---

## 3. Caveats

1. **`routes/api.php` Absence**:
   - As observed, Laravel 11/12 defaults to no `routes/api.php` unless `php artisan install:api` (Sanctum tokens) is executed. No API routes are needed because the app uses Inertia SPA web routes. All subscription endpoints will be in `routes/web.php`.
2. **Rate Limiting Middleware Syntax**:
   - The requirement specifies adding throttle `60,1` to mutations. In Laravel 12, route middleware `'throttle:60,1'` applies a limit of 60 requests per 1 minute per user/IP.
3. **Database Nullability**:
   - `notes` should be nullable in migration and request (`'notes' => ['nullable', 'string', 'max:1000']`). `category` should be required with default suggestions.

---

## 4. Conclusion & Technical Implementation Plan

### 4.1 Files to Be Created

| Path | Purpose |
|---|---|
| `database/migrations/2026_09_22_000001_create_subscriptions_table.php` | Schema for `subscriptions` with indexes on `[user_id, status]` and `[user_id, next_billing_date]`. |
| `app/Models/Subscription.php` | Eloquent model with mass assignment protection, scopes (`scopeActive`, `scopeDueSoon`), accessors (`getMonthlyEquivalentPriceAttribute`, `getYearlyEquivalentPriceAttribute`), and `user()` BelongsTo relation. |
| `database/factories/SubscriptionFactory.php` | Factory for generating realistic subscription instances with states (`active`, `paused`, `monthly`, `yearly`, `dueSoon`). |
| `database/seeders/SubscriptionSeeder.php` | Seeds realistic subscriptions (Netflix, Spotify, AWS, GitHub Copilot, ChatGPT Plus, YouTube Premium, Adobe CC) for Test User (`test@example.com`). |
| `app/Policies/SubscriptionPolicy.php` | Policy implementing tenant isolation (`$user->id === $subscription->user_id`) for `view`, `update`, `delete`, and `toggleStatus`. |
| `app/Http/Requests/SubscriptionRequest.php` | FormRequest implementing `prepareForValidation` with `strip_tags()` and `trim()`, plus validation rules. |
| `app/Http/Resources/SubscriptionResource.php` | Safe resource dictionary exposing only necessary fields to Inertia props. |
| `app/Http/Controllers/SubscriptionController.php` | Handles `index` (metrics, totals per currency, due soon, collection), `store`, `update`, `destroy`, and `toggleStatus`. |
| `tests/Feature/SubscriptionTest.php` | Comprehensive feature tests covering Anti-IDOR, Anti-XSS, validation failures, business calculations, status toggle, and deletion. |

### 4.2 Files to Be Modified

| Path | Changes |
|---|---|
| `app/Models/User.php` | Add `subscriptions(): HasMany` relationship. |
| `routes/web.php` | Route `/dashboard` to `SubscriptionController@index`; add mutation routes (`subscriptions.store`, `update`, `destroy`, `toggle-status`) with `['auth', 'throttle:60,1']`. |
| `database/seeders/DatabaseSeeder.php` | Call `SubscriptionSeeder::class`. |
| `app/Providers/AppServiceProvider.php` | Explicitly register `Gate::policy(Subscription::class, SubscriptionPolicy::class)` to guarantee policy discovery across all runners. |

---

### 4.3 Proposed Implementation Details

#### A. Database Migration: `database/migrations/2026_09_22_000001_create_subscriptions_table.php`
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->string('currency', 3)->default('BRL');
            $table->string('billing_cycle', 10)->default('monthly'); // 'monthly' or 'yearly'
            $table->string('category', 100);
            $table->date('next_billing_date');
            $table->string('status', 10)->default('active'); // 'active' or 'paused'
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'next_billing_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
```

#### B. Model: `app/Models/Subscription.php`
```php
<?php

namespace App\Models;

use Database\Factories\SubscriptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'name',
    'price',
    'currency',
    'billing_cycle',
    'category',
    'next_billing_date',
    'status',
    'notes',
])]
class Subscription extends Model
{
    /** @use HasFactory<SubscriptionFactory> */
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $appends = [
        'monthly_equivalent_price',
        'yearly_equivalent_price',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'next_billing_date' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function scopeDueSoon(Builder $query, int $days = 7): Builder
    {
        return $query->where('next_billing_date', '>=', now()->toDateString())
            ->where('next_billing_date', '<=', now()->addDays($days)->toDateString());
    }

    public function getMonthlyEquivalentPriceAttribute(): float
    {
        $price = (float) $this->price;

        return match ($this->billing_cycle) {
            'yearly' => round($price / 12, 2),
            default => $price,
        };
    }

    public function getYearlyEquivalentPriceAttribute(): float
    {
        $price = (float) $this->price;

        return match ($this->billing_cycle) {
            'monthly' => round($price * 12, 2),
            default => $price,
        };
    }
}
```

#### C. User Model Update: `app/Models/User.php`
Add relationship method:
```php
use App\Models\Subscription;
use Illuminate\Database\Eloquent\Relations\HasMany;

public function subscriptions(): HasMany
{
    return $this->hasMany(Subscription::class);
}
```

#### D. Policy: `app/Policies/SubscriptionPolicy.php`
```php
<?php

namespace App\Policies;

use App\Models\Subscription;
use App\Models\User;

class SubscriptionPolicy
{
    public function view(User $user, Subscription $subscription): bool
    {
        return $user->id === $subscription->user_id;
    }

    public function update(User $user, Subscription $subscription): bool
    {
        return $user->id === $subscription->user_id;
    }

    public function delete(User $user, Subscription $subscription): bool
    {
        return $user->id === $subscription->user_id;
    }

    public function toggleStatus(User $user, Subscription $subscription): bool
    {
        return $user->id === $subscription->user_id;
    }
}
```

#### E. Form Request: `app/Http/Requests/SubscriptionRequest.php`
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => is_string($this->name) ? trim(strip_tags($this->name)) : $this->name,
            'category' => is_string($this->category) ? trim(strip_tags($this->category)) : $this->category,
            'notes' => is_string($this->notes) ? trim(strip_tags($this->notes)) : $this->notes,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', Rule::in(['BRL', 'USD', 'EUR'])],
            'billing_cycle' => ['required', 'string', Rule::in(['monthly', 'yearly'])],
            'category' => ['required', 'string', 'max:100'],
            'next_billing_date' => ['required', 'date'],
            'status' => ['sometimes', 'string', Rule::in(['active', 'paused'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
```

#### F. Resource: `app/Http/Resources/SubscriptionResource.php`
```php
<?php

namespace App\Http\Resources;

use DateTimeInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Subscription
 */
class SubscriptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'price' => (float) $this->price,
            'currency' => $this->currency,
            'billing_cycle' => $this->billing_cycle,
            'category' => $this->category,
            'next_billing_date' => $this->next_billing_date instanceof DateTimeInterface
                ? $this->next_billing_date->format('Y-m-d')
                : (string) $this->next_billing_date,
            'status' => $this->status,
            'notes' => $this->notes,
            'monthly_equivalent_price' => $this->monthly_equivalent_price,
            'yearly_equivalent_price' => $this->yearly_equivalent_price,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
```

#### G. Controller: `app/Http/Controllers/SubscriptionController.php`
```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubscriptionRequest;
use App\Http\Resources\SubscriptionResource;
use App\Models\Subscription;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $subscriptions = $user->subscriptions()
            ->orderBy('next_billing_date', 'asc')
            ->get();

        $totals = [
            'BRL' => ['monthly' => 0.0, 'yearly' => 0.0],
            'USD' => ['monthly' => 0.0, 'yearly' => 0.0],
            'EUR' => ['monthly' => 0.0, 'yearly' => 0.0],
        ];

        foreach ($subscriptions as $subscription) {
            if ($subscription->status === 'active') {
                $currency = $subscription->currency;
                if (! isset($totals[$currency])) {
                    $totals[$currency] = ['monthly' => 0.0, 'yearly' => 0.0];
                }
                $totals[$currency]['monthly'] = round($totals[$currency]['monthly'] + $subscription->monthly_equivalent_price, 2);
                $totals[$currency]['yearly'] = round($totals[$currency]['yearly'] + $subscription->yearly_equivalent_price, 2);
            }
        }

        $activeCount = $subscriptions->where('status', 'active')->count();
        $pausedCount = $subscriptions->where('status', 'paused')->count();

        $today = Carbon::today();
        $sevenDaysAhead = Carbon::today()->addDays(7);

        $dueSoonSubscriptions = $subscriptions->where('status', 'active')
            ->filter(function (Subscription $subscription) use ($today, $sevenDaysAhead): bool {
                if (! $subscription->next_billing_date) {
                    return false;
                }
                $date = Carbon::parse($subscription->next_billing_date);

                return $date->betweenIncluded($today, $sevenDaysAhead);
            });

        return Inertia::render('Dashboard', [
            'subscriptions' => SubscriptionResource::collection($subscriptions),
            'metrics' => [
                'totals' => $totals,
                'active_count' => $activeCount,
                'paused_count' => $pausedCount,
                'due_soon_count' => $dueSoonSubscriptions->count(),
                'due_soon_ids' => $dueSoonSubscriptions->pluck('id')->values()->all(),
            ],
        ]);
    }

    public function store(SubscriptionRequest $request): RedirectResponse
    {
        $request->user()->subscriptions()->create($request->validated());

        return Redirect::route('dashboard')->with('success', 'Assinatura criada com sucesso.');
    }

    public function update(SubscriptionRequest $request, Subscription $subscription): RedirectResponse
    {
        Gate::authorize('update', $subscription);

        $subscription->update($request->validated());

        return Redirect::route('dashboard')->with('success', 'Assinatura atualizada com sucesso.');
    }

    public function destroy(Subscription $subscription): RedirectResponse
    {
        Gate::authorize('delete', $subscription);

        $subscription->delete();

        return Redirect::route('dashboard')->with('success', 'Assinatura excluída com sucesso.');
    }

    public function toggleStatus(Subscription $subscription): RedirectResponse
    {
        Gate::authorize('update', $subscription);

        $subscription->update([
            'status' => $subscription->status === 'active' ? 'paused' : 'active',
        ]);

        return Redirect::route('dashboard')->with('success', 'Status da assinatura alterado com sucesso.');
    }
}
```

#### H. Routes Update: `routes/web.php`
```php
Route::get('/dashboard', [SubscriptionController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware(['auth', 'throttle:60,1'])->group(function () {
    Route::post('/subscriptions', [SubscriptionController::class, 'store'])->name('subscriptions.store');
    Route::put('/subscriptions/{subscription}', [SubscriptionController::class, 'update'])->name('subscriptions.update');
    Route::delete('/subscriptions/{subscription}', [SubscriptionController::class, 'destroy'])->name('subscriptions.destroy');
    Route::patch('/subscriptions/{subscription}/toggle-status', [SubscriptionController::class, 'toggleStatus'])->name('subscriptions.toggle-status');
});
```

---

## 5. Verification Method

### 5.1 Step-by-Step Test Verification
Run the following test command to verify existing tests and the new test suite:

```bash
# Via WSL Sail (recommended for full Sail integration)
wsl -d Ubuntu -e bash -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail artisan test --filter=SubscriptionTest"

# OR via Docker Compose Exec (direct Windows terminal alternative)
docker compose exec -T laravel.test php artisan test --filter=SubscriptionTest
```

### 5.2 Test Assertions Matrix for `SubscriptionTest.php`
1. `test_unauthenticated_users_are_redirected_to_login`:
   - `GET /dashboard` -> `assertRedirect('/login')`
   - `POST /subscriptions` -> `assertRedirect('/login')`
2. `test_users_cannot_access_or_view_other_users_subscriptions_on_dashboard`:
   - User A has 2 subscriptions, User B has 3 subscriptions.
   - `actingAs($userA)->get('/dashboard')` -> `assertInertia(fn (Assert $page) => $page->has('subscriptions', 2)...)`.
3. `test_users_cannot_update_other_users_subscriptions`:
   - User A attempts `PUT /subscriptions/{userB_subscription}` -> `assertForbidden()` (HTTP 403).
4. `test_users_cannot_delete_other_users_subscriptions`:
   - User A attempts `DELETE /subscriptions/{userB_subscription}` -> `assertForbidden()` (HTTP 403).
5. `test_users_cannot_toggle_status_of_other_users_subscriptions`:
   - User A attempts `PATCH /subscriptions/{userB_subscription}/toggle-status` -> `assertForbidden()` (HTTP 403).
6. `test_subscription_store_enforces_tenant_isolation_ignoring_payload_user_id`:
   - User A posts payload with `'user_id' => $userB->id`. Subscription in DB has `user_id == $userA->id`.
7. `test_subscription_request_sanitizes_html_tags_from_name_category_and_notes`:
   - Post payload with `<b>Netflix</b>` and `<script>alert(1)</script>`.
   - Assert in DB `Netflix` without tags.
8. `test_validation_rejects_negative_price_and_unsupported_currency_or_cycle`:
   - Post with `price => -5`, `currency => 'JPY'`, `billing_cycle => 'quarterly'`.
   - `assertSessionHasErrors(['price', 'currency', 'billing_cycle'])`.
9. `test_proportional_price_calculations_and_paused_exclusion_in_projected_totals`:
   - User has active monthly BRL 100, active yearly BRL 120 (monthly equiv 10), paused monthly BRL 50.
   - Assert `metrics.totals.BRL.monthly === 110.0` and `metrics.totals.BRL.yearly === 1320.0`.
10. `test_scope_due_soon_correctly_identifies_bills_within_seven_days`:
    - Sub due in 3 days -> included in `due_soon`.
    - Sub due in 10 days -> excluded.

### 5.3 Code Style & Static Analysis
```bash
docker compose exec -T laravel.test ./vendor/bin/pint --dirty --format agent
```

### 5.4 Invalidation Conditions
- If running `docker compose exec -T laravel.test php artisan test` returns failure or DB connection errors.
- If any IDOR test receives 200 or 302 instead of 403 Forbidden.
- If raw models are passed directly into Inertia props without `SubscriptionResource`.
