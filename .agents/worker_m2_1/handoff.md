# Handoff Report: Milestone 2 — Security, Authorization, FormRequest, Resource, Controller & Routes

**Agent**: `worker_m2_1`  
**Milestone**: M2 (Security, Authorization, FormRequest, Resource, Controller & Routes)  
**Date**: 2026-09-22  
**Destination**: Parent Orchestrator (`34216660-2605-47b7-b565-eb2c6fb1d94d`)

---

## 1. Observation

### 1.1 Files Created and Modified
1. `app/Policies/SubscriptionPolicy.php` (created):
   - Implements strict Tenant Isolation (Anti-IDOR):
     - `view(User $user, Subscription $subscription): bool => $user->id === $subscription->user_id;`
     - `update(User $user, Subscription $subscription): bool => $user->id === $subscription->user_id;`
     - `delete(User $user, Subscription $subscription): bool => $user->id === $subscription->user_id;`
     - `toggleStatus(User $user, Subscription $subscription): bool => $user->id === $subscription->user_id;`
2. `app/Providers/AppServiceProvider.php` (modified):
   - In `boot()`:
     - Explicitly registered Gate policy: `Gate::policy(Subscription::class, SubscriptionPolicy::class);`
     - Disabled JsonResource wrapping: `JsonResource::withoutWrapping();` to guarantee Inertia props receive clean arrays for `subscriptions` and `due_soon`.
3. `app/Http/Requests/SubscriptionRequest.php` (created):
   - Implements `prepareForValidation()`:
     - Applies `strip_tags()` and `trim()` to `name`, `category`, and `notes` to prevent XSS.
     - Falls back `currency` to `'BRL'` if missing/unfilled.
     - Falls back `status` to `'active'` if missing/unfilled.
   - Implements `rules()`:
     - `'name' => ['required', 'string', 'max:255']`
     - `'price' => ['required', 'numeric', 'min:0.01']`
     - `'currency' => ['required', 'string', Rule::in(['BRL', 'USD', 'EUR'])]`
     - `'billing_cycle' => ['required', 'string', Rule::in(['monthly', 'yearly'])]`
     - `'category' => ['required', 'string', 'max:100']`
     - `'next_billing_date' => ['required', 'date']`
     - `'status' => ['sometimes', 'string', Rule::in(['active', 'paused'])]`
     - `'notes' => ['nullable', 'string', 'max:1000']`
4. `app/Http/Resources/SubscriptionResource.php` (created):
   - Whitelisted serialization preventing Inertia data leaks:
     - `id` (int), `name` (string), `price` (float), `currency` (string), `billing_cycle` (string), `category` (string)
     - `next_billing_date` (formatted `Y-m-d` string)
     - `status` (string), `notes` (string/null)
     - `monthly_equivalent_price` (float), `yearly_equivalent_price` (float)
     - `is_due_soon` (bool: active and due within 0 to 7 days from today)
     - `days_until_due` (int: `(int) Carbon::today()->diffInDays($nextBillingDate, false)`)
5. `app/Http/Controllers/SubscriptionController.php` (created):
   - `index(Request $request)`:
     - Retrieves user subscriptions ordered by `next_billing_date`.
     - Calculates projected monthly and yearly totals by currency (`BRL`, `USD`, `EUR`) for **active** subscriptions only (excluding paused).
     - Computes `active_count` and `paused_count`.
     - Queries `dueSoon(7)` active subscriptions ordered by `next_billing_date`.
     - Computes unique `categories` list used by the user.
     - Renders `Dashboard` via Inertia with `subscriptions`, `metrics`, `due_soon`, and `categories`.
   - `store(SubscriptionRequest $request)`:
     - Persists via `$request->user()->subscriptions()->create($request->validated())`.
     - Redirects back with flash success.
   - `update(SubscriptionRequest $request, Subscription $subscription)`:
     - Authorizes via `Gate::authorize('update', $subscription)`.
     - Updates with `$request->validated()`.
     - Redirects back with flash success.
   - `destroy(Request $request, Subscription $subscription)`:
     - Authorizes via `Gate::authorize('delete', $subscription)`.
     - Deletes subscription.
     - Redirects back with flash success.
   - `toggleStatus(Request $request, Subscription $subscription)`:
     - Authorizes via `Gate::authorize('update', $subscription)`.
     - Toggles between `active` and `paused`.
     - Redirects back with flash success.
6. `routes/web.php` (modified):
   - Mapped `Route::get('/dashboard', [SubscriptionController::class, 'index'])->middleware(['auth', 'verified'])->name('dashboard');`
   - Grouped mutation routes under middleware `['auth', 'throttle:60,1']`:
     - `POST /subscriptions` (`subscriptions.store`)
     - `PUT /subscriptions/{subscription}` (`subscriptions.update`)
     - `DELETE /subscriptions/{subscription}` (`subscriptions.destroy`)
     - `PATCH /subscriptions/{subscription}/toggle-status` (`subscriptions.toggle-status`)

---

### 1.2 Verbatim Tool Outputs and Verification Results

1. **Route Registration Verification**:
   - Command: `docker compose exec -T laravel.test php artisan route:list --name=subscriptions --json`
   - Output:
     ```json
     [
       {"domain":null,"method":"POST","uri":"subscriptions","name":"subscriptions.store","action":"App\\Http\\Controllers\\SubscriptionController@store","middleware":["web","Illuminate\\Auth\\Middleware\\Authenticate","Illuminate\\Routing\\Middleware\\ThrottleRequests:60,1"],"path":null},
       {"domain":null,"method":"PUT","uri":"subscriptions/{subscription}","name":"subscriptions.update","action":"App\\Http\\Controllers\\SubscriptionController@update","middleware":["web","Illuminate\\Auth\\Middleware\\Authenticate","Illuminate\\Routing\\Middleware\\ThrottleRequests:60,1"],"path":null},
       {"domain":null,"method":"DELETE","uri":"subscriptions/{subscription}","name":"subscriptions.destroy","action":"App\\Http\\Controllers\\SubscriptionController@destroy","middleware":["web","Illuminate\\Auth\\Middleware\\Authenticate","Illuminate\\Routing\\Middleware\\ThrottleRequests:60,1"],"path":null},
       {"domain":null,"method":"PATCH","uri":"subscriptions/{subscription}/toggle-status","name":"subscriptions.toggle-status","action":"App\\Http\\Controllers\\SubscriptionController@toggleStatus","middleware":["web","Illuminate\\Auth\\Middleware\\Authenticate","Illuminate\\Routing\\Middleware\\ThrottleRequests:60,1"],"path":null}
     ]
     ```
   - Command: `docker compose exec -T laravel.test php artisan route:list --name=dashboard --json`
   - Output:
     ```json
     [
       {"domain":null,"method":"GET|HEAD","uri":"dashboard","name":"dashboard","action":"App\\Http\\Controllers\\SubscriptionController@index","middleware":["web","Illuminate\\Auth\\Middleware\\Authenticate","Illuminate\\Auth\\Middleware\\EnsureEmailIsVerified"],"path":null}
     ]
     ```

2. **Policy Anti-IDOR Verification in Runtime**:
   - Tinker command: Owner User 3 vs Non-owner User 1 on `Subscription::first()`:
     ```
     Owner User 3: can_view => true, can_update => true, can_delete => true, can_toggle => true
     Non-owner User 1: can_view => false, can_update => false, can_delete => false, can_toggle => false
     ```

3. **Input Sanitization (Anti-XSS) & Fallback Verification**:
   - Request payload: `['name' => '  <script>alert(1)</script>Netflix  ', 'category' => ' <b>Streaming</b> ', 'notes' => ' <p>4K plan</p> ']` without `currency` and without `status`.
   - Tinker validated result:
     ```php
     array:8 [
       "name" => "alert(1)Netflix",
       "price" => "45.90",
       "currency" => "BRL",
       "billing_cycle" => "monthly",
       "category" => "Streaming",
       "next_billing_date" => "2026-10-01",
       "status" => "active",
       "notes" => "4K plan"
     ]
     ```

4. **Validation Failures for Invalid Boundary Inputs**:
   - Input: `price => -10.00`, `currency => 'JPY'`, `billing_cycle => 'weekly'`
   - Validation errors returned:
     - `price`: "The price field must be at least 0.01."
     - `currency`: "The selected currency is invalid."
     - `billing_cycle`: "The selected billing cycle is invalid."

5. **SubscriptionResource Serialization**:
   - Resolves all 13 required fields: `id`, `name`, `price` (float), `currency`, `billing_cycle`, `category`, `next_billing_date` (formatted Y-m-d), `status`, `notes`, `monthly_equivalent_price` (float), `yearly_equivalent_price` (float), `is_due_soon` (bool), `days_until_due` (int).

6. **Controller Index & Actions Verification**:
   - Simulated GET `/dashboard` for seeded user:
     - Component: `"Dashboard"`
     - Props: `subscriptions` (flat array of 7 items), `metrics` (`totals` BRL: 365.8, USD: 73.33, EUR: 0.0; `active_count`: 6, `paused_count`: 1, `due_soon_count`: 2), `due_soon` (flat array of 2 items), `categories` (array of 6 unique strings).
   - Tested actions: `store`, `update`, `destroy`, `toggleStatus` (all passed, User B attempting IDOR throws `AuthorizationException` 403).

7. **Code Formatter (Laravel Pint)**:
   - Command: `docker compose exec -T laravel.test ./vendor/bin/pint --format agent`
   - Output: `{"tool":"pint","result":"passed"}`

8. **Full Test Suite Execution**:
   - Command: `docker compose exec -T laravel.test php artisan test`
   - Output:
     ```
     Tests:    25 passed (61 assertions)
     Duration: 2.73s
     ```

---

## 2. Logic Chain

1. **Anti-IDOR Enforcement**:
   - Observation 1.1 and 1.2 demonstrate that `SubscriptionPolicy` strictly compares `$user->id === $subscription->user_id`.
   - In `SubscriptionController`, `update`, `destroy`, and `toggleStatus` invoke `Gate::authorize(...)`.
   - When User B attempts mutation on User A's subscription, `Gate::authorize()` throws `AuthorizationException`, triggering an HTTP 403 Forbidden response.
   - For creation (`store`), the record is created via `$request->user()->subscriptions()->create(...)`, preventing client injection of `user_id`.

2. **Inertia Data Leak Prevention**:
   - Observation 1.2 item 5 shows `SubscriptionResource` explicitly whitelists only presentation fields.
   - Disabling wrapping via `JsonResource::withoutWrapping()` ensures Inertia serializes `subscriptions` and `due_soon` as flat arrays matching the frontend contract in `PROJECT.md`.

3. **Anti-XSS & Validation Safety**:
   - Observation 1.2 item 3 shows `prepareForValidation()` strips HTML tags and trims whitespace before validation rules run.
   - Unsupplied currency defaults to `'BRL'` and unsupplied status defaults to `'active'`.
   - Unsupported currencies (`JPY`), negative prices (`-10.00`), or unsupported cycles (`weekly`) are rejected with validation errors.

4. **Calculation Accuracy**:
   - Subscriptions are grouped and projected for active subscriptions only. Paused subscriptions are excluded from `totals`.
   - Scopes `dueSoon(7)` and `active()` filter upcoming bills accurately.

5. **No Regressions**:
   - All 25 existing authentication and profile feature tests continue to pass with 0 failures.

---

## 3. Caveats

- **No Caveats**: All Milestone 2 requirements have been implemented according to specifications and verified against real database models and HTTP request pipelines.

---

## 4. Conclusion

Milestone 2 is complete. Security policies, form requests, resource transformers, controllers, and routes are fully operational and ready for Milestone 3 (Frontend Components & Dashboard).

---

## 5. Verification Method

To independently verify this milestone:

1. **Verify Route Registration**:
   ```bash
   docker compose exec -T laravel.test php artisan route:list --name=subscriptions
   docker compose exec -T laravel.test php artisan route:list --name=dashboard
   ```

2. **Verify Policy & Resource Serialization via Tinker**:
   ```bash
   docker compose exec -T laravel.test php artisan tinker --execute='dump(App\Models\User::find(3)->can("update", App\Models\Subscription::first()));'
   docker compose exec -T laravel.test php artisan tinker --execute='dump((new App\Http\Resources\SubscriptionResource(App\Models\Subscription::first()))->resolve());'
   ```

3. **Verify Pint Code Formatting**:
   ```bash
   docker compose exec -T laravel.test ./vendor/bin/pint --format agent
   ```

4. **Run Full Test Suite**:
   ```bash
   docker compose exec -T laravel.test php artisan test
   ```
