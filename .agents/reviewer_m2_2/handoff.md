# Adversarial Review & Handoff Report: Milestone 2 (Security, Policy, Request, Resource, Controller & Routes)

**Reviewer**: `reviewer_m2_2`  
**Roles**: Reviewer & Adversarial Critic  
**Date**: 2026-09-22  
**Target Milestone**: Milestone 2 (Security, Policy, FormRequest, Resource, Controller & Routes)  
**Parent Agent**: `parent` (`34216660-2605-47b7-b565-eb2c6fb1d94d`)  
**Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Direct Source Code Observations
1. **`app/Policies/SubscriptionPolicy.php` (Lines 13-40)**:
   ```php
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
   ```
   All policy methods enforce strict tenant isolation by matching `$user->id === $subscription->user_id`.

2. **`app/Http/Requests/SubscriptionRequest.php` (Lines 22-49, 56-68)**:
   - In `prepareForValidation()`:
     ```php
     if ($this->has('name') && is_string($this->name)) {
         $merge['name'] = trim(strip_tags($this->name));
     }
     if ($this->has('category') && is_string($this->category)) {
         $merge['category'] = trim(strip_tags($this->category));
     }
     if ($this->has('notes') && is_string($this->notes)) {
         $merge['notes'] = trim(strip_tags($this->notes));
     }
     if (! $this->filled('currency')) {
         $merge['currency'] = 'BRL';
     }
     if (! $this->filled('status')) {
         $merge['status'] = 'active';
     }
     ```
   - In `rules()`:
     ```php
     'name' => ['required', 'string', 'max:255'],
     'price' => ['required', 'numeric', 'min:0.01'],
     'currency' => ['required', 'string', Rule::in(['BRL', 'USD', 'EUR'])],
     'billing_cycle' => ['required', 'string', Rule::in(['monthly', 'yearly'])],
     'category' => ['required', 'string', 'max:100'],
     'next_billing_date' => ['required', 'date'],
     'status' => ['sometimes', 'string', Rule::in(['active', 'paused'])],
     'notes' => ['nullable', 'string', 'max:1000'],
     ```

3. **`app/Http/Resources/SubscriptionResource.php` (Lines 36-50)**:
   - Exclusively transforms 13 safe whitelisted keys:
     `id`, `name`, `price`, `currency`, `billing_cycle`, `category`, `next_billing_date`, `status`, `notes`, `monthly_equivalent_price`, `yearly_equivalent_price`, `is_due_soon`, `days_until_due`.
   - `user_id`, timestamps, and user model attributes are completely omitted.

4. **`app/Http/Controllers/SubscriptionController.php` (Lines 27-55, 85-127)**:
   - Currency totals iteration:
     ```php
     foreach ($subscriptions as $subscription) {
         if ($subscription->status === 'active') {
             $currency = $subscription->currency;
             if (! array_key_exists($currency, $totals)) {
                 $totals[$currency] = 0.0;
                 $yearlyTotals[$currency] = 0.0;
             }
             $totals[$currency] = round($totals[$currency] + $subscription->monthly_equivalent_price, 2);
             $yearlyTotals[$currency] = round($yearlyTotals[$currency] + $subscription->yearly_equivalent_price, 2);
         }
     }
     ```
   - Mutations:
     - `store`: `$request->user()->subscriptions()->create($request->validated());`
     - `update`: `Gate::authorize('update', $subscription); $subscription->update($request->validated());`
     - `destroy`: `Gate::authorize('delete', $subscription); $subscription->delete();`
     - `toggleStatus`: `Gate::authorize('update', $subscription); $subscription->status = ...; $subscription->save();`

5. **`routes/web.php` (Lines 22-27)**:
   ```php
   Route::middleware(['auth', 'throttle:60,1'])->group(function () {
       Route::post('/subscriptions', [SubscriptionController::class, 'store'])->name('subscriptions.store');
       Route::put('/subscriptions/{subscription}', [SubscriptionController::class, 'update'])->name('subscriptions.update');
       Route::delete('/subscriptions/{subscription}', [SubscriptionController::class, 'destroy'])->name('subscriptions.destroy');
       Route::patch('/subscriptions/{subscription}/toggle-status', [SubscriptionController::class, 'toggleStatus'])->name('subscriptions.toggle-status');
   });
   ```

---

### 1.2 Verbatim Adversarial Test Results Executed in Sail

#### A. Anti-IDOR Authorization Stress Test
- **Tool**: PHP script executed in `laravel.test` container via `docker compose exec -T laravel.test php -r ...`
- **Verbatim Output**:
  ```
  === 1. POLICY ISOLATION WITH Gate::forUser ===
  Gate::forUser(Attacker)->authorize('view'): PASSED (Denied 403)
  Gate::forUser(Owner)->authorize('view'): PASSED (Allowed)
  Gate::forUser(Attacker)->authorize('update'): PASSED (Denied 403)
  Gate::forUser(Owner)->authorize('update'): PASSED (Allowed)
  Gate::forUser(Attacker)->authorize('delete'): PASSED (Denied 403)
  Gate::forUser(Owner)->authorize('delete'): PASSED (Allowed)
  Gate::forUser(Attacker)->authorize('toggleStatus'): PASSED (Denied 403)
  Gate::forUser(Owner)->authorize('toggleStatus'): PASSED (Allowed)
  ```
- **Mass-Assignment / user_id Spoofing Verification**:
  Attempt to insert record with explicit `'user_id' => $userA->id` via Eloquent builder threw:
  `PDOException: SQLSTATE[HY000]: General error: 1364 Field 'user_id' doesn't have a default value`
  because `user_id` is guarded and excluded from `#[Fillable]`. Store creation is strictly bound to `$request->user()->subscriptions()->create(...)`.

#### B. Anti-XSS Sanitization Battery
- **Tool**: Tested 14 distinct vector payloads:
  1. `<script>alert("XSS")</script>`
  2. `<script src="https://evil.com/payload.js"></script>`
  3. `<iframe src="https://evil.com" onload="alert(1)"></iframe>`
  4. `<img src=x onerror="alert(1)">`
  5. `<svg/onload=alert(1)>`
  6. `<body onload="alert(1)">`
  7. `"><script>alert(1)</script>`
  8. `<<script>script>alert(1)<</script>/script>`
  9. `<a href="javascript:alert(1)">Click Here</a>`
  10. `<style>body{background:red}</style>`
  11. `<audio src="x" onerror="alert(1)">`
  12. `<video><source onerror="alert(1)"></video>`
  13. `<object data="javascript:alert(1)"></object>`
  14. `<embed src="javascript:alert(1)">`
- **Result**:
  Every payload had HTML tags stripped (`strip_tags`). No remaining HTML tags detected (`CLEAN`).
  When payload was composed purely of tags (e.g. `<img src=x onerror=alert(1)>`), stripping reduced input to `""`, and subsequent validation triggered required-field errors:
  `{"name":["The name field is required."],"category":["The category field is required."]}`.

#### C. Sensitive Column Leak Prevention (Inertia Props)
- **Tool**: Resolved `SubscriptionResource` on model loaded with `user` relation (`Subscription::with('user')->first()`).
- **Verbatim Output**:
  ```
  Keys in SubscriptionResource output:
  Array ( [0] => id, [1] => name, [2] => price, [3] => currency, [4] => billing_cycle,
          [5] => category, [6] => next_billing_date, [7] => status, [8] => notes,
          [9] => monthly_equivalent_price, [10] => yearly_equivalent_price,
          [11] => is_due_soon, [12] => days_until_due )
  Sensitive keys leaked: NONE (PASSED)
  ```
  No `user_id`, `password`, `email`, `remember_token`, `created_at`, or `updated_at` keys leaked.

#### D. Currency Totals & Paused Items Exclusion
- **Scenarios Tested**:
  1. *Zero Subscriptions*: `BRL: 0.0`, `USD: 0.0`, `EUR: 0.0`, `active_count: 0`, `paused_count: 0`, `categories: []`.
  2. *All Subscriptions Paused*: `BRL: 0.0`, `USD: 0.0`, `active_count: 0`, `paused_count: 2`, `due_soon: []`. Paused items excluded from totals and due soon renewals.
  3. *Mixed Subscriptions*: Paused items excluded; yearly subscriptions normalized to monthly equivalents (`round($price / 12, 2)`); items due in > 7 days excluded from `due_soon`.
- **Verbatim Result**: All assertions PASSED.

#### E. Rate Limiting (`throttle:60,1`) Enforcement
- **Route List JSON**:
  Every mutation route (`store`, `update`, `destroy`, `toggle-status`) includes middleware `Illuminate\Routing\Middleware\ThrottleRequests:60,1`.
- **Rate Limiter Stress Test (65 consecutive requests)**:
  ```
  Throttled at request #61 with ThrottleRequestsException (HTTP 429)
  Total allowed hits before throttling: 60 (Expected: 60) => PASSED
  ```

#### F. Automated Feature Tests Execution
- **Command**: `docker compose exec -T laravel.test php artisan test`
- **Output**:
  ```
  PASS Tests\Feature\SubscriptionEmpiricalChallengeTest (14 tests, 214 assertions)
  Total Suite: 39 passed (275 assertions)
  Duration: 2.89s
  ```

#### G. Code Formatting Verification
- **Command**: `docker compose exec -T laravel.test ./vendor/bin/pint --test --format agent`
- **Output**: `{"tool":"pint","result":"passed"}`

---

## 2. Logic Chain

1. **Anti-IDOR Protection (Observation 1.1, 1.2.A)**:
   - `SubscriptionPolicy` explicitly implements ownership verification (`$user->id === $subscription->user_id`).
   - Mutations (`update`, `destroy`, `toggleStatus`) invoke `Gate::authorize()`.
   - When tested with distinct users, non-owner mutations are rejected with `AuthorizationException` (HTTP 403 Forbidden).
   - In `store`, records are constructed through `$request->user()->subscriptions()->create(...)`, preventing client injection of foreign `user_id` values.
   - Therefore, cross-tenant tampering and IDOR vulnerabilities are prevented.

2. **Anti-XSS Sanitization (Observation 1.1, 1.2.B)**:
   - `prepareForValidation()` executes prior to validation checks, applying `strip_tags()` and `trim()`.
   - Adversarial testing across 14 malicious vectors confirmed all HTML tags (`<script>`, `<iframe>`, `<img>`, `<svg>`, `<audio>`, `<video>`, `<embed>`, `<object>`) are stripped before storage.
   - If an input consists solely of stripped tags, the resulting empty string is rejected by the `'required'` validation rule.
   - Therefore, stored XSS injection is prevented.

3. **Inertia Data Leak Prevention (Observation 1.1, 1.2.C)**:
   - `SubscriptionResource` whitelists exactly 13 presentation attributes.
   - Even when relationships (`with('user')`) are loaded on the model instance, serialization through `SubscriptionResource` omits internal keys (`user_id`, `password`, `email`, timestamps).
   - Therefore, sensitive data exposure to Inertia client props is prevented.

4. **Calculation & Edge Case Correctness (Observation 1.1, 1.2.D)**:
   - `SubscriptionController@index` explicitly filters `$subscription->status === 'active'` when summing monthly and yearly currency totals.
   - When all subscriptions are paused or the collection is empty, default structures (`BRL: 0.0`, `USD: 0.0`, `EUR: 0.0`) are returned without errors.
   - Scopes `active()` and `dueSoon(7)` properly exclude paused subscriptions and bills due beyond 7 days.
   - Therefore, financial metrics and renewal alerts are calculated accurately.

5. **Rate Limiting Enforcement (Observation 1.1, 1.2.E)**:
   - `routes/web.php` wraps all mutation endpoints in `throttle:60,1`.
   - Empirical execution confirmed that after 60 requests within a 1-minute window, request 61 is rejected with HTTP 429 (`ThrottleRequestsException`).
   - Therefore, mutation brute-force and resource flooding are mitigated.

6. **Integrity Audit**:
   - Source code review revealed zero hardcoded test outputs, zero facade/dummy stubs, and no bypassed logic.
   - Tests run in real MySQL and Laravel container environments.

---

## 3. Caveats

- **No Caveats**: All Milestone 2 requirements have been verified against real database models and HTTP request pipelines.

---

## 4. Conclusion

Milestone 2 implementation is **APPROVED**. The code adheres strictly to the contracts outlined in `ORIGINAL_REQUEST.md` and `PROJECT.md`, satisfies all Secure by Design criteria (Anti-IDOR, Anti-XSS, Inertia prop leak protection, rate limiting), and passes all automated tests and formatting checks. The project is ready for Milestone 3 (Frontend Components & Dashboard).

---

## 5. Verification Method

To independently verify this milestone:

1. **Run full automated test suite**:
   ```bash
   docker compose exec -T laravel.test php artisan test
   ```

2. **Verify Pint code formatting**:
   ```bash
   docker compose exec -T laravel.test ./vendor/bin/pint --test --format agent
   ```

3. **Verify route registration and throttle middleware**:
   ```bash
   docker compose exec -T laravel.test php artisan route:list --name=subscriptions --json
   ```
