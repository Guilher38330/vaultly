# Forensic Audit Report: Milestone 1 — Backend Data & Eloquent Layer

**Auditor Agent**: `auditor_m1_1`  
**Milestone Audited**: M1 (Backend Data & Models)  
**Profile**: General Project  
**Date**: 2026-09-22  
**Target Repository**: `z:\home\guilhherme\projetos\meu-app-react`  
**Verdict**: **CLEAN**

---

## Forensic Audit Summary

| Check | Expected | Observed | Status |
|-------|----------|----------|--------|
| **Hardcoded Outputs** | Genuine mathematical logic in accessors | Dynamic division/multiplication with round() | **PASS** |
| **Facade Implementations** | Real Eloquent scopes and schema | Full SQL query builder scopes and MySQL indexes | **PASS** |
| **Pre-populated Artifacts** | Clean workspace without fabricated results | Only standard runtime logs (`laravel.log`, `browser.log`) | **PASS** |
| **Backdoors & Evasion** | No testing overrides or IDOR backdoors | `user_id` strictly blocked from mass assignment | **PASS** |
| **Database Schema & Indexes** | Composite indexes `[user_id, status]`, `[user_id, next_billing_date]` | Verified on MySQL 8.4 engine | **PASS** |
| **Foreign Key Cascade** | Cascade delete on `users(id)` | Deleting parent deletes subscriptions | **PASS** |
| **Scope Boundary Conditions** | `dueSoon` includes today to day 7, excludes past and day 8+ | Empirically verified across boundary dates | **PASS** |
| **Factory States** | All states valid and realistic | `active`, `paused`, `monthly`, `yearly`, `dueSoon` verified | **PASS** |
| **Seeder Idempotency** | Re-running seeder does not duplicate records | Executed twice, count remains 7 | **PASS** |
| **Pint Code Formatting** | Clean agent format | `{"tool":"pint","result":"passed"}` | **PASS** |
| **Baseline Test Suite** | 25 tests passing | 25 passed (61 assertions), 0 failures | **PASS** |

---

## 1. Observation

### 1.1 Source Code Verification
The following files were inspected line-by-line:
1. `database/migrations/2026_09_22_000001_create_subscriptions_table.php` (lines 14–29):
   - Defines columns: `id`, `user_id` (foreignId constrained cascadeOnDelete), `name`, `price` (decimal 10,2), `currency` (default 'BRL'), `billing_cycle` (default 'monthly'), `category`, `next_billing_date` (date), `status` (default 'active'), `notes` (text nullable), timestamps.
   - Defines composite indexes:
     - `$table->index(['user_id', 'status']);`
     - `$table->index(['user_id', 'next_billing_date']);`
2. `app/Models/Subscription.php`:
   - Line 13: `#[Fillable(['name', 'price', 'currency', 'billing_cycle', 'category', 'next_billing_date', 'status', 'notes'])]` -> `user_id` is excluded, preventing IDOR mass assignment.
   - Lines 33–36: `$appends = ['monthly_equivalent_price', 'yearly_equivalent_price']`.
   - Lines 43–49: casts `'price' => 'decimal:2'`, `'next_billing_date' => 'date'`.
   - Lines 67–70: `scopeActive`: `$query->where('status', 'active')`.
   - Lines 78–84: `scopeDueSoon`: `$query->whereBetween('next_billing_date', [Carbon::today()->toDateString(), Carbon::today()->addDays($days)->toDateString()])`.
   - Lines 89–98: `getMonthlyEquivalentPriceAttribute`: `$price = (float) $this->price; if ($this->billing_cycle === 'yearly') { return round($price / 12, 2); } return $price;`.
   - Lines 103–112: `getYearlyEquivalentPriceAttribute`: `$price = (float) $this->price; if ($this->billing_cycle === 'monthly') { return round($price * 12, 2); } return $price;`.
3. `app/Models/User.php` (lines 39–42):
   - `subscriptions(): HasMany` to `Subscription::class`.
4. `database/factories/SubscriptionFactory.php` (lines 66–111):
   - States: `active()`, `paused()`, `monthly()`, `yearly()`, `dueSoon(int $days = 3)`.
5. `database/seeders/SubscriptionSeeder.php` (lines 23–101):
   - 7 realistic records seeded with `updateOrCreate(['name' => $data['name']], $data)`.
6. `database/seeders/DatabaseSeeder.php` (lines 18–27):
   - Ensures `test@example.com` exists and executes `SubscriptionSeeder`.

### 1.2 Tool Executions and Verbatim Output Proofs

#### Check 1: Migration Status
Command: `docker compose exec -T laravel.test php artisan migrate:status`
```text
  Migration name .............................................. Batch / Status  
  0001_01_01_000000_create_users_table ............................... [1] Ran  
  0001_01_01_000001_create_cache_table ............................... [1] Ran  
  0001_01_01_000002_create_jobs_table ................................ [1] Ran  
  2026_09_22_000001_create_subscriptions_table ....................... [2] Ran  
```

#### Check 2: Schema Columns, Indexes, and Foreign Keys
Command: `docker compose exec -T laravel.test php artisan tinker --execute "dump(Schema::getColumnListing('subscriptions')); dump(Schema::getIndexes('subscriptions')); dump(Schema::getForeignKeys('subscriptions'));"`
```text
array:12 [
  0 => "id"
  1 => "user_id"
  2 => "name"
  3 => "price"
  4 => "currency"
  5 => "billing_cycle"
  6 => "category"
  7 => "next_billing_date"
  8 => "status"
  9 => "notes"
  10 => "created_at"
  11 => "updated_at"
]
array:3 [
  0 => array:5 [
    "name" => "primary"
    "columns" => array:1 [0 => "id"]
    "type" => "btree"
    "unique" => true
    "primary" => true
  ]
  1 => array:5 [
    "name" => "subscriptions_user_id_next_billing_date_index"
    "columns" => array:2 [0 => "user_id", 1 => "next_billing_date"]
    "type" => "btree"
    "unique" => false
    "primary" => false
  ]
  2 => array:5 [
    "name" => "subscriptions_user_id_status_index"
    "columns" => array:2 [0 => "user_id", 1 => "status"]
    "type" => "btree"
    "unique" => false
    "primary" => false
  ]
]
array:1 [
  0 => array:7 [
    "name" => "subscriptions_user_id_foreign"
    "columns" => array:1 [0 => "user_id"]
    "foreign_schema" => "laravel"
    "foreign_table" => "users"
    "foreign_columns" => array:1 [0 => "id"]
    "on_update" => "no action"
    "on_delete" => "cascade"
  ]
]
```

#### Check 3: Mass Assignment Protection & Fillable Attributes
Command: `docker compose exec -T laravel.test php artisan tinker --execute "\$sub = new App\Models\Subscription(['user_id' => 999, 'name' => 'Netflix']); dump(\$sub->user_id); dump(\$sub->getFillable());"`
```text
null
array:8 [
  0 => "name"
  1 => "price"
  2 => "currency"
  3 => "billing_cycle"
  4 => "category"
  5 => "next_billing_date"
  6 => "status"
  7 => "notes"
]
```

#### Check 4: Dynamic Calculations & Stress-Testing of Accessors
Command: `docker compose exec -T laravel.test php artisan tinker --execute "dump([
  'yearly_100' => (new App\Models\Subscription(['price' => 100, 'billing_cycle' => 'yearly']))->monthly_equivalent_price,
  'monthly_55_90' => (new App\Models\Subscription(['price' => 55.90, 'billing_cycle' => 'monthly']))->yearly_equivalent_price,
  'yearly_359_88' => (new App\Models\Subscription(['price' => 359.88, 'billing_cycle' => 'yearly']))->monthly_equivalent_price,
  'monthly_19_99' => (new App\Models\Subscription(['price' => 19.99, 'billing_cycle' => 'monthly']))->yearly_equivalent_price,
  'zero_yearly' => (new App\Models\Subscription(['price' => 0, 'billing_cycle' => 'yearly']))->monthly_equivalent_price,
  'zero_monthly' => (new App\Models\Subscription(['price' => 0, 'billing_cycle' => 'monthly']))->yearly_equivalent_price,
]);"`
```text
array:6 [
  "yearly_100" => 8.33
  "monthly_55_90" => 670.8
  "yearly_359_88" => 29.99
  "monthly_19_99" => 239.88
  "zero_yearly" => 0.0
  "zero_monthly" => 0.0
]
```

#### Check 5: Scopes Raw SQL & Date Boundary Verification
Command: `docker compose exec -T laravel.test php artisan tinker --execute "
\$q1 = App\Models\Subscription::active()->toRawSql();
\$q2 = App\Models\Subscription::dueSoon(7)->toRawSql();
dump('active SQL:', \$q1);
dump('dueSoon(7) SQL:', \$q2);
"`
```text
"active SQL:"
"select * from \`subscriptions\` where \`status\` = 'active'"
"dueSoon(7) SQL:"
"select * from \`subscriptions\` where \`next_billing_date\` between '2026-09-22' and '2026-09-29'"
```

Empirical Boundary Testing (yesterday, today, day 7, day 8, paused):
```text
"Active names:"
array:4 [
  0 => "Sub Yesterday"
  1 => "Sub Today"
  2 => "Sub Day 7"
  3 => "Sub Day 8"
]
"DueSoon(7) names:"
array:3 [
  0 => "Sub Today"
  1 => "Sub Day 7"
  2 => "Sub Paused"
]
"Active + DueSoon(7) names:"
array:2 [
  0 => "Sub Today"
  1 => "Sub Day 7"
]
```
- Sub Yesterday (`2026-09-21`): excluded from dueSoon.
- Sub Today (`2026-09-22`): included in dueSoon.
- Sub Day 7 (`2026-09-29`): included in dueSoon.
- Sub Day 8 (`2026-09-30`): excluded from dueSoon.
- Sub Paused: excluded from active query; included in dueSoon (date-only filter), excluded when chained `active()->dueSoon(7)`.

#### Check 6: Cascade on Delete Verification
Empirical test deleting parent user:
```text
"Created sub id:" 174
"Subscription exists after user deletion:" false
"Cascade delete SUCCESSFUL"
```

#### Check 7: Factory States Verification
Command:
```text
"Factory checks:"
array:7 [
  "default_has_name" => true
  "default_has_price" => true
  "active_status" => true
  "paused_status" => true
  "monthly_cycle" => true
  "yearly_cycle" => true
  "dueSoon_5_days" => true
]
```

#### Check 8: Seeder Idempotency Verification
- Run 1 count for `test@example.com`: `7`
- Run 2 count for `test@example.com`: `7`

#### Check 9: Serialization Integrity (Array and JSON)
```text
"Has monthly_equivalent_price in array:" true
"Has yearly_equivalent_price in array:" true
"JSON contains monthly_equivalent_price:" true
"JSON contains yearly_equivalent_price:" true
```

#### Check 10: Laravel Pint Style Compliance
Command: `wsl -d Ubuntu bash -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail bin pint --format agent"`
```json
{"tool":"pint","result":"passed"}
```

#### Check 11: Regression Test Suite
Command: `wsl -d Ubuntu bash -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail artisan test"`
```text
  Tests:    25 passed (61 assertions)
  Duration: 2.72s
```

---

## 2. Logic Chain

1. **No Hardcoding (Observation 1.1, 1.2 Check 4)**:
   - Pricing accessors were tested with 6 varied numeric inputs (`100`, `55.90`, `359.88`, `19.99`, `0`). All calculations matched arithmetic expectations exactly (`100 / 12 = 8.33`, `55.90 * 12 = 670.80`, `359.88 / 12 = 29.99`). This proves the logic is computational, dynamic, and non-hardcoded.
2. **Authentic Scopes (Observation 1.1, 1.2 Check 5)**:
   - `scopeActive` and `scopeDueSoon` generate authentic SQL query constraints (`status = 'active'` and `next_billing_date between ...`). Boundary dates (today - 1, today, today + 7, today + 8) were empirically tested in live DB transactions and proved exact boundary adherence.
3. **Tenant Security & Anti-IDOR (Observation 1.1, 1.2 Check 3)**:
   - `Subscription` model restricts `$fillable` to 8 non-tenant fields and excludes `user_id`. Direct instantiation with `user_id` leaves the attribute `null`. This prevents mass-assignment IDOR attacks.
4. **Relational Integrity (Observation 1.1, 1.2 Check 2, Check 6)**:
   - MySQL 8.4 engine maintains composite indexes `[user_id, status]` and `[user_id, next_billing_date]`, and enforces foreign key cascading (`users(id)` cascade on delete).
5. **Clean Workspace & No Pre-populated Artifacts (Observation 1.2)**:
   - Workspace contains zero synthetic pass logs, mocks, or attestation bypasses.
6. **Code Style & Test Health (Observation 1.2 Check 10, Check 11)**:
   - Code adheres to Laravel standards via Pint and passes all 25 application tests cleanly.

---

## 3. Caveats

- **No Caveats**: Milestone 1 deliverables are strictly scoped to backend data structures, models, scopes, accessors, factories, and seeders. All Milestone 1 requirements were tested directly in the target environment (MySQL 8.4 + Laravel Sail) and validated without exception.

---

## 4. Conclusion

**Verdict: CLEAN**

Milestone 1 is genuinely implemented without hardcoded values, facade implementations, mock shortcuts, or security evasion patterns. The work product satisfies all constraints outlined in `ORIGINAL_REQUEST.md` and `PROJECT.md`. The project is approved to proceed to Milestone 2.

---

## 5. Verification Method

To independently reproduce this forensic audit:

1. **Verify Schema and Indexes**:
   ```bash
   docker compose exec -T laravel.test php artisan tinker --execute "dump(Schema::getIndexes('subscriptions'));"
   ```
2. **Stress-Test Dynamic Calculations**:
   ```bash
   docker compose exec -T laravel.test php artisan tinker --execute "dump((new App\Models\Subscription(['price' => 359.88, 'billing_cycle' => 'yearly']))->monthly_equivalent_price);"
   ```
3. **Verify Boundary Conditions on Scopes**:
   ```bash
   docker compose exec -T laravel.test php artisan tinker --execute "dump(App\Models\Subscription::dueSoon(7)->toRawSql());"
   ```
4. **Run Pint Code Formatter**:
   ```bash
   wsl -d Ubuntu bash -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail bin pint --format agent"
   ```
5. **Run Full Test Suite**:
   ```bash
   wsl -d Ubuntu bash -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail artisan test"
   ```
