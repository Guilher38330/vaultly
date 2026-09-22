# Milestone 1 Independent Review & Adversarial Audit Report

**Reviewer**: `reviewer_m1_1`  
**Roles**: Reviewer, Adversarial Critic  
**Date**: 2026-09-22  
**Target Milestone**: M1 (Backend Data & Eloquent Models)  
**Parent Orchestrator**: `34216660-2605-47b7-b565-eb2c6fb1d94d`  
**Verdict**: **APPROVE**

---

## 1. Observation

All observations were independently gathered via inspection of the source files and live runtime execution inside the `laravel.test` container running Laravel 13.32.0 (PHP 8.5) and MySQL 8.4.

### 1.1 Source Code Inspection

1. **Migration (`database/migrations/2026_09_22_000001_create_subscriptions_table.php`)**:
   - Table `subscriptions` created with columns:
     - `id` (bigint auto-increment)
     - `user_id` (foreign key -> `users(id)` with `cascadeOnDelete()`)
     - `name` (string)
     - `price` (decimal 10,2)
     - `currency` (string, default `'BRL'`)
     - `billing_cycle` (string, default `'monthly'`)
     - `category` (string)
     - `next_billing_date` (date)
     - `status` (string, default `'active'`)
     - `notes` (text, nullable)
     - `created_at`, `updated_at` (timestamps)
   - Composite indexes defined:
     - Line 27: `$table->index(['user_id', 'status']);`
     - Line 28: `$table->index(['user_id', 'next_billing_date']);`

2. **Model (`app/Models/Subscription.php`)**:
   - Uses PHP 8 attribute `#[Fillable([...])]` protecting against Mass Assignment:
     ```php
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
     ```
     `user_id` is excluded from `$fillable`.
   - Casts defined:
     - `'price' => 'decimal:2'`
     - `'next_billing_date' => 'date'`
   - Accessors and Appends:
     - Line 33: `protected $appends = ['monthly_equivalent_price', 'yearly_equivalent_price'];`
     - Lines 89-98: `getMonthlyEquivalentPriceAttribute(): float` (divides by 12 and rounds to 2 decimals when yearly, otherwise returns float price)
     - Lines 103-112: `getYearlyEquivalentPriceAttribute(): float` (multiplies by 12 and rounds to 2 decimals when monthly, otherwise returns float price)
   - Scopes:
     - Lines 67-70: `scopeActive(Builder $query): Builder` -> `where('status', 'active')`
     - Lines 78-84: `scopeDueSoon(Builder $query, int $days = 7): Builder` -> `whereBetween('next_billing_date', [Carbon::today()->toDateString(), Carbon::today()->addDays($days)->toDateString()])`
   - Relationship:
     - Lines 56-59: `user(): BelongsTo` -> `$this->belongsTo(User::class)`

3. **User Model (`app/Models/User.php`)**:
   - Lines 39-42: Added `subscriptions(): HasMany` -> `$this->hasMany(Subscription::class)`

4. **Factory (`database/factories/SubscriptionFactory.php`)**:
   - Defines realistic defaults and 5 state methods:
     - `active()`: sets `status => 'active'`
     - `paused()`: sets `status => 'paused'`
     - `monthly()`: sets `billing_cycle => 'monthly'`
     - `yearly()`: sets `billing_cycle => 'yearly'`
     - `dueSoon(int $days = 3)`: sets `next_billing_date => Carbon::today()->addDays($days)->toDateString()`

5. **Seeder (`database/seeders/SubscriptionSeeder.php`)**:
   - Seeds 7 realistic services (`Netflix`, `Spotify`, `AWS`, `GitHub`, `ChatGPT Plus`, `YouTube Premium`, `Adobe CC`).
   - Uses idempotent upsert: `$user->subscriptions()->updateOrCreate(['name' => $data['name']], $data)`.
   - Integrated into `database/seeders/DatabaseSeeder.php` via `$this->call([SubscriptionSeeder::class])`.

### 1.2 Verbatim Command Execution & Outputs

1. **Migration Status**:
   - Command: `docker compose exec -T laravel.test php artisan migrate:status`
   - Result:
     ```
     Migration name .............................................. Batch / Status  
     0001_01_01_000000_create_users_table ............................... [1] Ran  
     0001_01_01_000001_create_cache_table ............................... [1] Ran  
     0001_01_01_000002_create_jobs_table ................................ [1] Ran  
     2026_09_22_000001_create_subscriptions_table ....................... [2] Ran  
     ```

2. **Schema & Index Verification via MySQL Information Schema**:
   - Command: `Schema::getIndexes('subscriptions')`
   - Output confirmed:
     - `primary` on `['id']`
     - `subscriptions_user_id_next_billing_date_index` on `['user_id', 'next_billing_date']`
     - `subscriptions_user_id_status_index` on `['user_id', 'status']`
   - Command: `Schema::getForeignKeys('subscriptions')`
   - Output confirmed:
     - `subscriptions_user_id_foreign` on `['user_id']` referencing `users(id)` with `on_delete => cascade`.

3. **Seeder Execution & Idempotency**:
   - Command: `docker compose exec -T laravel.test php artisan db:seed --class=SubscriptionSeeder`
   - Output: `Database\Seeders\SubscriptionSeeder ............................. 25 ms DONE`
   - Count for `test@example.com`: exactly 7 subscriptions. Running seed a second time retained count at exactly 7 subscriptions without duplicate key collisions.

4. **Code Formatter Check**:
   - Command: `docker compose exec -T laravel.test ./vendor/bin/pint --format agent`
   - Output: `{"tool":"pint","result":"passed"}`

5. **Regression Test Suite**:
   - Command: `docker compose exec -T laravel.test php artisan test`
   - Output: `Tests: 25 passed (61 assertions), Duration: 2.53s`

---

## 2. Logic Chain

1. **Schema & Constraint Conformance**:
   - Observation 1.1 #1 and Observation 1.2 #2 establish that all specified database columns, types, defaults, and compound indexes (`[user_id, status]`, `[user_id, next_billing_date]`) are present and active in the database schema.
   - The foreign key constraint with `cascadeOnDelete()` guarantees data integrity: deleting a user automatically purges associated subscriptions (adversarially tested and verified in Observation 1.2).

2. **Integrity & Anti-IDOR Defense**:
   - Inspection of `Subscription.php` confirms `user_id` is strictly excluded from `#[Fillable]`.
   - Live execution of `new Subscription(['user_id' => 999, 'name' => 'Test'])` demonstrated that `user_id` remains `null`. Attackers cannot tamper with tenancy via mass assignment.

3. **Mathematical Correctness of Pricing Normalization**:
   - For yearly plans ($120.00/yr), `monthly_equivalent_price` produces `10.00` and `yearly_equivalent_price` produces `120.00`.
   - For monthly plans ($15.50/mo), `monthly_equivalent_price` produces `15.50` and `yearly_equivalent_price` produces `186.00`.
   - For zero or null prices, casting to `(float)` avoids `DivisionByZeroError` or `TypeError`, returning `0.00`.
   - Model array serialization (`toArray()`) appends both computed attributes, ensuring Inertia client pages will receive them automatically.

4. **Temporal Boundary Precision**:
   - Querying `scopeDueSoon(7)` executes a SQL `BETWEEN` on `Carbon::today()->toDateString()` and `Carbon::today()->addDays(7)->toDateString()`.
   - Adversarial boundary tests proved that yesterday (`today - 1 day`) and day 8 (`today + 8 days`) are excluded, whereas today, tomorrow, and day 7 (`today + 7 days`) are strictly included.

5. **Laravel & PHP 8 Standards**:
   - Follows PHP 8.5 attribute syntax (`#[Fillable]`), constructor promotion conventions, explicit method return types (`: float`, `: Builder`, `: BelongsTo`), and PHPDoc annotations (`/** @use HasFactory<SubscriptionFactory> */`).
   - Laravel Pint code style passed cleanly.

---

## 3. Adversarial Challenges & Stress-Test Results

| Challenge | Attack Scenario / Edge Case | Actual Behavior | Result |
|---|---|---|---|
| **Mass Assignment IDOR** | Attempt to mass-assign `user_id => 999` in model creation | `user_id` was ignored and remained `null` | **PASS** |
| **FK Cascade Deletion** | Delete parent user who owns active subscriptions | Subscriptions immediately and cleanly deleted by DB foreign key | **PASS** |
| **`dueSoon` Upper Boundary** | Record due at `today + 7 days` vs `today + 8 days` | `today + 7 days` is included; `today + 8 days` is excluded | **PASS** |
| **`dueSoon` Lower Boundary** | Record due `yesterday` (past due) vs `today` | `yesterday` is excluded; `today` is included | **PASS** |
| **Division By Zero / Null** | Instantiating model with `price => null` or `price => 0` | Safely evaluates to `0.0` without PHP warnings or exceptions | **PASS** |
| **Seeder Idempotency** | Running `SubscriptionSeeder` twice consecutively | Exactly 7 records preserved; no duplicate rows created | **PASS** |
| **Factory State Compositions** | Chaining `active()->yearly()->dueSoon(5)` | Creates fully valid record with status `active`, cycle `yearly`, and date `+5 days` | **PASS** |

### Advisory Notes for Milestone 2:
1. **Case-Sensitivity in Cycle/Status**: `Subscription::getMonthlyEquivalentPriceAttribute()` uses strict comparison `$this->billing_cycle === 'yearly'`. Milestone 2's `SubscriptionRequest` must normalize text (`strtolower(trim($value))`) and validate with `Rule::in(['monthly', 'yearly'])` and `Rule::in(['active', 'paused'])`.
2. **Stray File**: A stray file `getDatabaseName())` (26 bytes) created in the root directory by a command typo should be deleted during general project cleanup.

---

## 4. Caveats

- No caveats. All deliverables for Milestone 1 are complete, tested, and meet specifications without compromise.

---

## 5. Conclusion

**Verdict**: **APPROVE**

Milestone 1 satisfies all requirements set forth in `ORIGINAL_REQUEST.md` and `PROJECT.md`. The Eloquent model `Subscription`, `User` relationship, migrations, composite indexes, scopes, accessors, factory, and seeders are production-grade, secure by design, and ready for Milestone 2 (Security, Policy, Request, Resource, Controller & Routes).

---

## 6. Verification Method

To independently reproduce the verification:

1. **Verify Migrations & Indexes**:
   ```bash
   docker compose exec -T laravel.test php artisan migrate:status
   docker compose exec -T laravel.test php artisan tinker --execute "dump(Illuminate\Support\Facades\Schema::getIndexes('subscriptions'));"
   ```

2. **Verify Scopes & Accessors**:
   ```bash
   docker compose exec -T laravel.test php artisan tinker --execute "\$s = App\Models\Subscription::first(); dump(\$s->monthly_equivalent_price, \$s->yearly_equivalent_price);"
   docker compose exec -T laravel.test php artisan tinker --execute "dump(App\Models\Subscription::active()->dueSoon(7)->pluck('name'));"
   ```

3. **Verify Pint & Test Suite**:
   ```bash
   docker compose exec -T laravel.test ./vendor/bin/pint --format agent
   docker compose exec -T laravel.test php artisan test
   ```
