# Handoff Report: Explorer M3.3 (Monthly Expenditure Projection Chart & Dashboard Section)

**Milestone**: Milestone 3: Financial Analytics Charts  
**Author**: Teamwork Explorer M3.3  
**Date**: 2026-09-24  
**Handoff Type**: Hard (Task complete)  

---

## 1. Observation

1. **Recharts Package Availability**:
   - `package.json` line 31 specifies `"recharts": "^3.10.1"`.
   - `node_modules/recharts/package.json` confirmed Recharts version 3.10.1 is installed and available in the local repository.
2. **Dashboard Integration Anchor**:
   - `resources/js/Pages/Dashboard.jsx` lines 587–595:
     ```jsx
     587:                     {/* Tier 3: Financial Analytics Section Container (Milestone 3 Mount Point) */}
     588:                     <motion.div
     589:                         variants={cardVariants}
     590:                         id="financial-analytics-section"
     591:                         className="w-full"
     592:                     >
     593:                         {/* Milestone 3 will inject <FinancialAnalyticsSection subscriptions={subscriptions} /> here */}
     594:                     </motion.div>
     ```
     The container is already wrapped with Framer Motion `variants={cardVariants}` and carries the exact target ID `#financial-analytics-section`.
3. **Subscriptions Props & Structure**:
   - `app/Http/Resources/SubscriptionResource.php` delivers subscriptions with fields: `id`, `name`, `price`, `currency` (`'BRL'`, `'USD'`, `'EUR'`), `billing_cycle` (`'monthly'`, `'yearly'`), `category`, `next_billing_date`, `status` (`'active'`, `'paused'`), `monthly_equivalent_price`, and `yearly_equivalent_price`.
   - `SubscriptionFactory.php` lines 53–58 confirm that currencies are strictly `'BRL'`, `'USD'`, and `'EUR'`, billing cycles are `'monthly'` and `'yearly'`, and statuses are `'active'` and `'paused'`.
4. **Theme and Styling Conventions**:
   - `ThemeToggle.jsx` toggles the `.dark` class on `document.documentElement`.
   - The cosmic color palette centers on Emerald 500 (`#10b981`), Mint (`#34d399`), and Slate 400/500 (`#94a3b8` / `#64748b`) for paused/inactive states.

---

## 2. Logic Chain

1. **Stacked Area Representation**:
   - *Premise*: The prompt requires active expenditures (emerald gradient) separated from paused expenditures (slate/zinc gradient) in a projection chart.
   - *Mechanism*: Using Recharts `<Area stackId="expenditure" ... />`, Recharts stacks the `paused` series directly on top of the `active` series. The bottom layer represents guaranteed active commitments, while the stacked top layer represents total potential expenditure if paused services were reactivated.
   - *Design*: The active area is assigned `fill="url(#emeraldGradient)"` with a stroke of `#10b981` (2.5px), and the paused area is assigned `fill="url(#slateGradient)"` with a stroke of `#94a3b8` (2px dashed).
2. **Horizon and View Mode Controls**:
   - *Premise*: The prompt specifies horizon switchers for 6 vs 12 months.
   - *Mechanism*: Local state `horizon` (6 or 12) drives the input to `calculateMonthlyProjections(subscriptions, selectedCurrency, horizon)`. In addition, an area vs bar chart toggle gives the user choice between smooth cash-flow curves and discrete monthly bars.
3. **Currency Synchronization**:
   - *Premise*: The prompt requires currency switchers (BRL, USD, EUR) synchronized with parent state.
   - *Mechanism*: `FinancialAnalyticsSection.jsx` maintains `selectedCurrency` and passes both `selectedCurrency` and `onCurrencyChange={setSelectedCurrency}` to `MonthlyExpenditureProjectionChart.jsx` and `CategorySpendingDonutChart.jsx`. Switching currency in either the section header or the projection chart updates both charts simultaneously without reloading or network calls.
4. **Reference Line (Run-Rate)**:
   - *Premise*: The prompt specifies a `ReferenceLine` for average monthly run-rate.
   - *Mechanism*: We compute `averageMonthlyRunRate` by summing active expenditures across the horizon and dividing by the horizon length. A dashed horizontal `<ReferenceLine y={averageMonthlyRunRate} stroke="#10b981" strokeDasharray="4 4" />` with an `insideTopRight` label provides an intuitive benchmark against which spikes in renewal months can be evaluated.
5. **Glassmorphic Tooltip**:
   - *Premise*: The prompt requires a custom glassmorphic tooltip showing breakdown of active, paused, and total.
   - *Mechanism*: `CustomGlassmorphicTooltip` reads `payload[0].payload`, extracts `active`, `paused`, `total`, and optional `renewals` list, and renders a semi-transparent frosted card (`bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border shadow-xl`) with high-contrast text for both light and dark themes.
6. **Responsive Layout & Grid Container**:
   - *Premise*: The prompt requires `FinancialAnalyticsSection.jsx` to house both charts in a responsive grid and integrate into `Dashboard.jsx`.
   - *Mechanism*: A 12-column responsive grid (`grid-cols-1 lg:grid-cols-12 gap-6`) allocates 5 columns to the donut chart and 7 columns to the projection chart. Explicit container heights (`h-72 sm:h-80 w-full min-w-0`) prevent Recharts from triggering infinite resize recalculation loops.

---

## 3. Caveats

- **External Math Dependency**: The components expect `calculateMonthlyProjections(subscriptions, currency, monthsCount)` and `formatCurrency` / `formatShortCurrency` from `resources/js/Utils/financialProjections.js` (being formulated by Explorer M3.1). Defensive fallback functions (`defaultFormatCurrency`, `defaultFormatShortCurrency`, and array null-checks) are included in the component design so it gracefully handles any temporary missing exports.
- **Peer Chart Dependency**: `FinancialAnalyticsSection.jsx` imports `CategorySpendingDonutChart` from `resources/js/Components/Charts/CategorySpendingDonutChart.jsx` (being formulated by Explorer M3.2). Both charts share the exact contract `props: { subscriptions, selectedCurrency }`.

---

## 4. Conclusion

The specification for `MonthlyExpenditureProjectionChart.jsx` and `FinancialAnalyticsSection.jsx` is fully defined, mathematically rigorous, visually harmonized with the cosmic theme, and directly actionable for the implementation worker:
1. `MonthlyExpenditureProjectionChart.jsx` implements all 6 required features: Recharts Area/Bar composition, 6m/12m switchers, BRL/USD/EUR synchronization, stacked emerald/slate series, average run-rate ReferenceLine, and glassmorphic tooltip.
2. `FinancialAnalyticsSection.jsx` provides the master responsive grid (5 cols Donut / 7 cols Projection), coordinated currency state, and rich section header.
3. Integration into `Dashboard.jsx` requires only an import and replacing line 593 inside `#financial-analytics-section`.

---

## 5. Verification Method

Once implemented by the worker:
1. **PHPUnit Backend Tests**:
   ```bash
   docker compose exec -T laravel.test php artisan test
   ```
   *Expected outcome*: 87 tests passing, 864 assertions.
2. **Pint Code Formatter**:
   ```bash
   docker compose exec -T laravel.test ./vendor/bin/pint --test
   ```
   *Expected outcome*: Zero code style violations.
3. **Frontend Asset Build**:
   ```bash
   docker compose exec -T laravel.test npm run build
   ```
   *Expected outcome*: Vite compiles cleanly with 0 errors, bundling `recharts` chunks smoothly.
4. **Visual Inspection in Browser**:
   - Navigate to `/dashboard` and verify `#financial-analytics-section`.
   - Verify 6m vs 12m horizon toggle updates X-axis data points.
   - Verify BRL, USD, EUR currency switcher updates both Donut and Projection charts in sync.
   - Hover data points to verify glassmorphic tooltip breakdown (active, paused, total).
   - Toggle theme (light/dark) to verify color readability and glassmorphic backdrop.
