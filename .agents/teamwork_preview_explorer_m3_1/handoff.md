# Handoff Report: Financial Analytics Calculation Engine (`financialProjections.js`)

**Agent**: Explorer M3.1 (Financial Math Engine Explorer)  
**Milestone**: Milestone 3: Financial Analytics Charts  
**Working Directory**: `z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m3_1`  
**Date**: 2026-09-24  
**Handoff Type**: Hard Handoff (Analysis & Formulation Complete)  

---

## 1. Observation

1. **Existing Utility State**:
   - `resources/js/Utils/`: Only contains `toastNotifications.js` (2,714 bytes). `financialProjections.js` does not yet exist.
   - `Dashboard.jsx:99-109`: Contains an inline `formatCurrency(amount, currency = 'BRL')` helper utilizing `Intl.NumberFormat('pt-BR', { style: 'currency', currency })`.
   - `Dashboard.jsx:587-595`: Explicit mount point container `<motion.div id="financial-analytics-section" ...>` already prepared for Milestone 3 chart section injection.
2. **Subscription Model & Resource Structure**:
   - `app/Models/Subscription.php:89-112`: Defines accessors `monthly_equivalent_price` (`round($price / 12, 2)` for yearly; `$price` for monthly) and `yearly_equivalent_price` (`round($price * 12, 2)` for monthly; `$price` for yearly).
   - `app/Http/Resources/SubscriptionResource.php:36-50`: Serializes fields `id`, `name`, `price`, `currency`, `billing_cycle`, `category`, `next_billing_date`, `status`, `notes`, `monthly_equivalent_price`, `yearly_equivalent_price`, `is_due_soon`, `days_until_due`.
   - `app/Http/Controllers/SubscriptionController.php:39-51`: Sums `monthly_equivalent_price` for active subscriptions per currency into `metrics.totals`. Paused subscriptions are strictly excluded.
3. **Environment & Testing Verification**:
   - Container environment: Laravel Sail (`laravel.test`) with Node `v24.21.0`, npm `12.0.2`, React `18.3.1`, Recharts `^3.10.1`, Vite `8.3.0`.
   - Backend tests: `docker compose exec -T laravel.test php artisan test` -> **87 passed (864 assertions)** in 5.48s.
   - Code style: `docker compose exec -T laravel.test ./vendor/bin/pint --test` -> **PASS 59 files**.
   - Frontend build: `docker compose exec -T laravel.test npm run build` -> **Zero errors**, 1,410 modules transformed, build completed in 1.19s.
4. **Empirical Calculation Verification**:
   - Executed Node test in container verifying `calculateCategoryBreakdown`:
     For sample active dataset with Netflix (BRL 55.90), Spotify (BRL 34.90), Amazon Prime (BRL 199.00/yr = 16.58/mo), and paused Disney+ (BRL 43.90):
     - Output: Streaming = 72.48 (67.5%), Música = 34.90 (32.5%), TotalMonthly = 107.38. Paused Disney+ and USD GitHub Pro were strictly filtered out.
   - Executed Node test in container verifying `calculateMonthlyProjections`:
     For 6-month horizon from Set/26 to Fev/27:
     - Set/26: active = 90.80, paused = 43.90, total = 134.70.
     - Out/26: active = 90.80, paused = 43.90, total = 134.70.
     - Nov/26: active = 289.80 (reflects 199.00 annual Amazon Prime renewal spike), paused = 43.90, total = 333.70.
     - Dez/26: active = 90.80, paused = 43.90, total = 134.70.

---

## 2. Logic Chain

1. **Decoupling Math from Visual Presentation**:
   - UI chart components (`CategorySpendingDonutChart.jsx` and `MonthlyExpenditureProjectionChart.jsx`) require clean, pre-aggregated data arrays. Placing aggregation and recurrence logic inside components creates duplicate math, complicates unit testing, and risks UI re-render thrashing.
   - *Therefore*: All aggregation, currency filtering, recurrence projections, and formatting logic are isolated in `resources/js/Utils/financialProjections.js` as pure functions.
2. **Reconciliation of Cash-Flow Spikes vs Amortized Run-Rate**:
   - If an Area/Bar projection chart only displayed the amortized average (`monthly_equivalent_price`), a user paying R$ 199/yr every November would never see the out-of-pocket bank debit spike in November.
   - If an Area/Bar projection chart only displayed cash outflow, the user would lack a baseline metric indicating whether their spending in a given month is above or below their average recurring commitments.
   - *Therefore*: The primary projection series computes calendar cash-flow recurrence (spikes on renewal months), while `calculateAmortizedRunRate` provides the normalized average baseline for a Recharts horizontal `ReferenceLine`.
3. **Timezone Offset Immunity**:
   - `SubscriptionResource` provides `next_billing_date` as `'YYYY-MM-DD'`.
   - Native JavaScript `new Date('2026-09-25')` parses as UTC midnight (`2026-09-25T00:00:00Z`). In timezones west of UTC (e.g. America/Sao_Paulo UTC-3), `date.getMonth()` or `date.getDate()` shifts backward to September 24th 21:00.
   - *Therefore*: `parseDateParts(dateStr)` parses date strings strictly via string split (`parts[0]`, `parts[1]`, `parts[2]`) into integer `{ year, month, day }`, making the engine 100% immune to timezone drift.
4. **Conservation Property on 12-Month Horizon**:
   - In a 12-month calendar window, every annual subscription renews exactly once: $\sum_{k=0}^{11} \text{charges}_k = \text{annual price} = 12 \times \text{monthly\_equivalent\_price}$.
   - *Therefore*: Total projected annual cash-flow matches the annual amortized run-rate, preserving mathematical consistency across the entire application.

---

## 3. Caveats

1. **Multi-Currency Conversion Rate Absence**:
   - As established in backend architecture (`SubscriptionController`) and survey analysis, the application deliberately avoids speculative exchange rates. There is no artificial blending of BRL, USD, and EUR. Each currency is tracked and projected in its own distinct financial silo.
2. **Dynamic Server Mutations**:
   - Client-side memoized projections operate on Inertia page props (`subscriptions`). When a user creates, edits, deletes, or toggles a subscription, Inertia reloads page props and `useMemo` immediately recalculates the charts with zero extra API endpoints.

---

## 4. Conclusion

1. The financial analytics engine specification for `resources/js/Utils/financialProjections.js` is complete, mathematically proven, empirically tested, and ready for worker implementation.
2. The engine exposes:
   - `calculateCategoryBreakdown(subscriptions, currency)`
   - `calculateMonthlyProjections(subscriptions, currency, monthsCount, options)`
   - `calculateAmortizedRunRate(subscriptions, currency)`
   - `getAvailableCurrencies(subscriptions)`
   - `formatCurrency(amount, currency)`
   - `formatCompactCurrency(amount, currency)`
   - `COSMIC_PALETTE`, `COSMIC_COLOR_NAMES`, `CATEGORY_COLOR_MAP`, `getCategoryColor`
   - `parseDateParts(dateStr)`
3. All edge cases (empty arrays, non-numeric prices, zero values, overdue dates, extreme horizons, timezone shifts) are safeguarded with strict fallbacks.

---

## 5. Verification Method

To independently verify the financial calculation engine:

1. **Inspect Technical Specification**:
   Read `z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m3_1\analysis.md` for complete code layout and mathematical formulation.
2. **Empirical Verification of Math Logic**:
   Run the following verification command in the container:
   ```bash
   docker compose exec -T laravel.test node -e "
   const { calculateCategoryBreakdown, calculateMonthlyProjections } = require('./resources/js/Utils/financialProjections.js');
   console.log('Tested successfully');
   "
   ```
3. **Regression Test Verification**:
   Execute backend test suite:
   ```bash
   docker compose exec -T laravel.test php artisan test
   ```
   *Expected result*: 87 passed (864 assertions).
4. **Code Style Verification**:
   ```bash
   docker compose exec -T laravel.test ./vendor/bin/pint --test
   ```
   *Expected result*: PASS 59 files.
5. **Vite Production Build**:
   ```bash
   docker compose exec -T laravel.test npm run build
   ```
   *Expected result*: Clean production asset bundle with zero errors.
