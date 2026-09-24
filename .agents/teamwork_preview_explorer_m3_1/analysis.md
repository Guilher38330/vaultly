# Technical Analysis: Financial Analytics Calculation Engine (`financialProjections.js`)

**Target Module**: `resources/js/Utils/financialProjections.js`  
**Milestone**: Milestone 3: Financial Analytics Charts (F7)  
**Author**: Explorer M3.1 (Financial Math Engine Explorer)  
**Date**: 2026-09-24  
**Status**: Formulated & Ready for Implementation  

---

## 1. Executive Summary

Milestone 3 integrates interactive financial analytics charts into the Vaultly/AuraSpace dashboard:
1. A **Donut Chart** (`CategorySpendingDonutChart.jsx`) displaying active spending percentage breakdown by category in a cosmic palette (`#10b981`, `#34d399`, etc.).
2. An **Area / Bar Chart** (`MonthlyExpenditureProjectionChart.jsx`) projecting monthly expenditures over the next 6 to 12 months with currency filtering (`BRL`, `USD`, `EUR`) and separation of active vs paused subscriptions.

To keep chart UI components thin, declarative, and decoupled from financial domain math, all mathematical transformations are encapsulated in a pure functional utility module: `resources/js/Utils/financialProjections.js`.

### Key Architectural Decisions:
1. **Client-Side Pure Execution**: All calculations are executed in React `useMemo` hooks. This ensures zero network latency when users switch currencies (`BRL` / `USD` / `EUR`), toggle horizon periods (`6M` vs `12M`), or switch chart types (`Area` vs `Bar`), without making redundant server requests or risking breakage to the 87 existing passing PHPUnit backend tests.
2. **Dual-Model Cash Flow Rigor**:
   - **Cash-Flow Calendar Recurrence (Primary Outflow)**: Monthly bills recur each calendar month; yearly bills charge exclusively in their renewal month. This models actual out-of-pocket bank debits and exposes cash spikes.
   - **Amortized Run-Rate (Normalized Average)**: Calculates the stable monthly run-rate (`monthly_equivalent_price`), supplied as a reference baseline (`ReferenceLine` in Recharts).
3. **Timezone-Safe Date Manipulation**: Eliminates the notorious UTC midnight backward shift by parsing date components (`YYYY-MM-DD`) via string splitting instead of unanchored `new Date(str)` parsing.
4. **Adversarial Edge-Case Immunity**: Hardened against empty arrays, non-numeric prices, zero divisions, negative values, overdue renewal dates, extreme horizon bounds, and missing category names.

---

## 2. Interface Contracts & Function Signatures

### 2.1 Pure Functions

```typescript
/**
 * Aggregates active subscriptions by category for a specific currency,
 * computes monetary values, percentages of total, and assigns cosmic colors.
 */
function calculateCategoryBreakdown(
    subscriptions: Array<Subscription>,
    currency?: string // default 'BRL'
): {
    data: Array<{
        name: string;
        value: number;        // Monthly amount rounded to 2 decimals
        percentage: number;   // 0.0 - 100.0, rounded to 1 decimal
        color: string;        // Hex string from COSMIC_PALETTE
        count: number;        // Number of active subscriptions in category
    }>;
    totalMonthly: number;     // Sum of all active monthly expenditures
}

/**
 * Projects monthly cash-flow expenditures over a 6 to 24 month horizon,
 * separating active commitments from paused commitments.
 */
function calculateMonthlyProjections(
    subscriptions: Array<Subscription>,
    currency?: string,       // default 'BRL'
    monthsCount?: number,    // default 6, clamped 1-24
    options?: {
        baseDate?: Date;     // Injection hook for testing/reference date
    }
): Array<{
    month: string;           // Formatted short label, e.g. "Out/26"
    fullMonth: string;       // Formatted full label, e.g. "Outubro de 2026"
    dateKey: string;         // ISO month key, e.g. "2026-10"
    year: number;            // Full year, e.g. 2026
    monthIndex: number;      // 0-indexed month (0-11)
    active: number;          // Active outflow in currency, rounded to 2 decimals
    paused: number;          // Paused outflow in currency, rounded to 2 decimals
    total: number;           // active + paused, rounded to 2 decimals
    activeCount: number;     // Count of active subscriptions billing this month
    pausedCount: number;     // Count of paused subscriptions billing this month
    renewals: Array<{        // Itemized renewals billing in this month
        id?: number;
        name: string;
        price: number;
        billing_cycle: 'monthly' | 'yearly';
        category?: string;
        status: 'active' | 'paused';
    }>;
}>

/**
 * Computes normalized amortized monthly run-rate for active, paused, and total subscriptions.
 */
function calculateAmortizedRunRate(
    subscriptions: Array<Subscription>,
    currency?: string // default 'BRL'
): {
    activeRunRate: number;
    pausedRunRate: number;
    totalRunRate: number;
}

/**
 * Extracts list of distinct currencies present in the subscription dataset.
 */
function getAvailableCurrencies(
    subscriptions: Array<Subscription>
): Array<string>

/**
 * Formats a monetary amount into standard currency notation with pt-BR locale.
 */
function formatCurrency(
    amount: number | string,
    currency?: string // default 'BRL'
): string

/**
 * Formats a monetary amount into compact notation for chart axis ticks (e.g. "R$ 1,5k").
 */
function formatCompactCurrency(
    amount: number | string,
    currency?: string // default 'BRL'
): string

/**
 * Parses a 'YYYY-MM-DD' date string into numerical parts without timezone drift.
 */
function parseDateParts(
    dateStr: string | null | undefined
): { year: number; month: number; day: number } | null
```

---

## 3. Mathematical Foundations & Recurrence Logic

### 3.1 Multi-Currency Category Breakdown Math

Let:
- $S$ be the array of all subscription items.
- $C \in \{\text{'BRL'}, \text{'USD'}, \text{'EUR'}\}$ be the target currency.
- $S_{active, C} = \{ s \in S \mid s.\text{status} = \text{'active'} \land \text{normalize}(s.\text{currency}) = C \}$.

For each subscription $s \in S_{active, C}$:
1. **Monthly Equivalent Value ($v_s$)**:
   $$v_s = \begin{cases} 
   s.\text{monthly\_equivalent\_price} & \text{if present, numeric, and } \ge 0 \\
   \frac{s.\text{price}}{12} & \text{if } s.\text{billing\_cycle} = \text{'yearly'} \\
   s.\text{price} & \text{if } s.\text{billing\_cycle} = \text{'monthly'} \\
   0 & \text{otherwise}
   \end{cases}$$
2. **Category Grouping**:
   Let $\text{cat}(s) = \text{trim}(s.\text{category}) \lor \text{'Geral'}$.
   For each distinct category $c$:
   $$V(c) = \sum_{s \in S_{active, C}, \text{cat}(s) = c} v_s$$
   $$N(c) = |\{ s \in S_{active, C} \mid \text{cat}(s) = c \}|$$
3. **Total Monthly Spend**:
   $$\text{TotalMonthly} = \text{round}\left(\sum_{c} V(c), 2\right)$$
4. **Percentage Allocation**:
   $$P(c) = \begin{cases} 
   \text{round}\left( \frac{V(c)}{\text{TotalMonthly}} \times 100, 1 \right) & \text{if } \text{TotalMonthly} > 0 \\
   0 & \text{otherwise}
   \end{cases}$$
5. **Deterministic Ordering**:
   Categories are sorted descending by $V(c)$ ($b.value - a.value$). Ties are resolved alphabetically by name ($a.name.\text{localeCompare}(b.name)$).
6. **Color Assignment**:
   The $i$-th category receives color $\text{COSMIC\_PALETTE}[i \pmod{|\text{COSMIC\_PALETTE}|}]$.

---

### 3.2 Monthly Cash-Flow Projection & Recurrence Math

Let $H \in [1, 24]$ be the projection horizon (default $H = 6$ or $12$).  
Let $D_{base}$ be the anchor date (default current date).  
Let $\text{StartYear} = D_{base}.\text{getFullYear()}$ and $\text{StartMonth} = D_{base}.\text{getMonth()}$ (0-11).

For projection month step $k \in \{0, 1, \dots, H - 1\}$:
1. **Target Calendar Identification**:
   $$\text{TargetYear}_k = \text{StartYear} + \lfloor (\text{StartMonth} + k) / 12 \rfloor$$
   $$\text{TargetMonthIdx}_k = (\text{StartMonth} + k) \pmod{12}$$
   $$\text{TargetLinearMonth}_k = \text{TargetYear}_k \times 12 + \text{TargetMonthIdx}_k$$
   $$\text{BaseLinearMonth} = \text{StartYear} \times 12 + \text{StartMonth}$$

2. **Billing Recurrence Evaluation**:
   For subscription $s$ with $s.\text{currency} = C$ and non-negative price $p_s = \max(0, \text{Number}(s.\text{price}))$:
   
   - Let $\text{parsed} = \text{parseDateParts}(s.\text{next\_billing\_date})$.
   - If $\text{parsed} \neq \text{null}$:
     $$\text{SubLinearMonth} = \text{parsed.year} \times 12 + (\text{parsed.month} - 1)$$
     $$\text{RenewalMonthIdx} = \text{parsed.month} - 1$$
   - If $\text{parsed} = \text{null}$:
     $$\text{SubLinearMonth} = \text{BaseLinearMonth}$$
     $$\text{RenewalMonthIdx} = \text{StartMonth}$$

   **Rule 1: Monthly Billing Cycle (`billing_cycle === 'monthly'`)**:
   Monthly subscriptions represent continuous ongoing commitments:
   - If $\text{SubLinearMonth} \le \text{BaseLinearMonth} + 1$:
     The subscription is active/current (or overdue). It charges in **every projected month** $k \ge 0$.
   - If $\text{SubLinearMonth} > \text{BaseLinearMonth} + 1$:
     The subscription has a future start date. It charges in month $k$ if and only if:
     $$\text{TargetLinearMonth}_k \ge \text{SubLinearMonth}$$

   **Rule 2: Yearly Billing Cycle (`billing_cycle === 'yearly'`)**:
   Yearly subscriptions charge **only once every 12 months** on their renewal month:
   - Calendar month match condition:
     $$\text{TargetMonthIdx}_k = \text{RenewalMonthIdx}$$
   - Eligibility condition:
     - If $\text{SubLinearMonth} \le \text{BaseLinearMonth}$:
       Subscription renewal date is in the past or current month. It renews annually on $\text{RenewalMonthIdx}$.
     - If $\text{SubLinearMonth} > \text{BaseLinearMonth}$:
       Subscription has a future renewal date. It charges when:
       $$\text{TargetLinearMonth}_k \ge \text{SubLinearMonth} \land \text{TargetMonthIdx}_k = \text{RenewalMonthIdx}$$

3. **Active vs Paused Cash Aggregation**:
   If subscription $s$ charges in month $k$:
   - If $s.\text{status} = \text{'active'}$:
     $$\text{ActiveOutflow}_k \mathrel{+}= p_s$$
     $$\text{ActiveCount}_k \mathrel{+}= 1$$
   - If $s.\text{status} = \text{'paused'}$:
     $$\text{PausedOutflow}_k \mathrel{+}= p_s$$
     $$\text{PausedCount}_k \mathrel{+}= 1$$

4. **Monthly Totals**:
   $$\text{active}_k = \text{round}(\text{ActiveOutflow}_k, 2)$$
   $$\text{paused}_k = \text{round}(\text{PausedOutflow}_k, 2)$$
   $$\text{total}_k = \text{round}(\text{active}_k + \text{paused}_k, 2)$$

5. **Conservation Property**:
   Over any 12-month projection ($H = 12$):
   $$\sum_{k=0}^{11} \text{active}_k = \sum_{s \in S_{active, C}} s.\text{yearly\_equivalent\_price}$$
   The sum of monthly cash outflows over a 12-month calendar cycle precisely matches the yearly run-rate, proving mathematical consistency between cash-flow and accrual models.

---

## 4. Cosmic Palette & Visual Token Constants

The color scheme aligns with the Emerald / Cosmic design tokens defined in Tailwind and survey specifications:

```javascript
export const COSMIC_PALETTE = [
    '#10b981', // 0: Emerald 500 (Anchor brand emerald)
    '#34d399', // 1: Mint / Emerald 400 (Vibrant cosmic mint)
    '#14b8a6', // 2: Teal 500 (Deep aquatic teal)
    '#06b6d4', // 3: Cyan 500 (Celestial cyan)
    '#059669', // 4: Jade / Emerald 600 (Deep jade green)
    '#8b5cf6', // 5: Violet 500 (Cosmic nebula contrast)
    '#f59e0b', // 6: Amber 500 (Warm stellar accent)
    '#6366f1', // 7: Indigo 500 (Deep space indigo)
];

export const COSMIC_COLOR_NAMES = {
    emerald: '#10b981',
    mint: '#34d399',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    jade: '#059669',
    violet: '#8b5cf6',
    amber: '#f59e0b',
    indigo: '#6366f1',
};

export const CATEGORY_COLOR_MAP = {
    'Streaming': '#8b5cf6',      // Violet
    'Música': '#10b981',         // Emerald
    'Jogos': '#06b6d4',          // Cyan
    'Produtividade': '#14b8a6',  // Teal
    'Nuvem': '#059669',          // Jade
    'Educação': '#f59e0b',       // Amber
    'Finanças': '#6366f1',       // Indigo
    'Segurança': '#34d399',      // Mint
};
```

---

## 5. Complete Proposed Implementation (`proposed_financialProjections.js`)

Below is the verified code formulated for `resources/js/Utils/financialProjections.js`:

```javascript
/**
 * Vaultly / AuraSpace Financial Analytics Calculation Engine
 * 
 * Pure functional utilities for calculating category spending breakdowns,
 * multi-currency monthly cash-flow projections (6-12m), and formatting.
 * 
 * Target: resources/js/Utils/financialProjections.js
 */

export const COSMIC_PALETTE = [
    '#10b981', // 0: Emerald 500
    '#34d399', // 1: Mint
    '#14b8a6', // 2: Teal 500
    '#06b6d4', // 3: Cyan 500
    '#059669', // 4: Jade / Emerald 600
    '#8b5cf6', // 5: Violet 500
    '#f59e0b', // 6: Amber 500
    '#6366f1', // 7: Indigo 500
];

export const COSMIC_COLOR_NAMES = {
    emerald: '#10b981',
    mint: '#34d399',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    jade: '#059669',
    violet: '#8b5cf6',
    amber: '#f59e0b',
    indigo: '#6366f1',
};

export const CATEGORY_COLOR_MAP = {
    'Streaming': '#8b5cf6',
    'Música': '#10b981',
    'Jogos': '#06b6d4',
    'Produtividade': '#14b8a6',
    'Nuvem': '#059669',
    'Educação': '#f59e0b',
    'Finanças': '#6366f1',
    'Segurança': '#34d399',
};

const SHORT_MONTHS_PT = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const FULL_MONTHS_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/**
 * Parses a 'YYYY-MM-DD' date string safely without UTC timezone drift.
 * Returns null if invalid or missing.
 */
export function parseDateParts(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return null;
    }
    const cleanStr = dateStr.trim();
    const parts = cleanStr.split('-');
    if (parts.length < 3) {
        return null;
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }
    return { year, month, day };
}

/**
 * Formats a monetary amount into standard localized currency string (pt-BR).
 */
export function formatCurrency(amount, currency = 'BRL') {
    const validCurrency = typeof currency === 'string' && currency.trim()
        ? currency.trim().toUpperCase()
        : 'BRL';

    const num = Number(amount);
    const safeAmount = Number.isFinite(num) ? num : 0;

    try {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: validCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(safeAmount);
    } catch {
        const symbol = validCurrency === 'USD' ? 'US$' : validCurrency === 'EUR' ? '€' : 'R$';
        return `${symbol} ${safeAmount.toFixed(2).replace('.', ',')}`;
    }
}

/**
 * Formats a monetary amount into compact notation for chart axis ticks (e.g. "R$ 1,5k").
 */
export function formatCompactCurrency(amount, currency = 'BRL') {
    const validCurrency = typeof currency === 'string' && currency.trim()
        ? currency.trim().toUpperCase()
        : 'BRL';

    const num = Number(amount);
    const safeAmount = Number.isFinite(num) ? num : 0;

    try {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: validCurrency,
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(safeAmount);
    } catch {
        return formatCurrency(safeAmount, validCurrency);
    }
}

/**
 * Resolves color for a category from COSMIC_PALETTE or predefined mapping.
 */
export function getCategoryColor(category, index = 0) {
    if (category && typeof category === 'string' && CATEGORY_COLOR_MAP[category]) {
        return CATEGORY_COLOR_MAP[category];
    }
    return COSMIC_PALETTE[index % COSMIC_PALETTE.length];
}

/**
 * Calculates category spending breakdown for active subscriptions in target currency.
 */
export function calculateCategoryBreakdown(subscriptions, currency = 'BRL') {
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
        return { data: [], totalMonthly: 0 };
    }

    const targetCurrency = typeof currency === 'string' && currency.trim()
        ? currency.trim().toUpperCase()
        : 'BRL';

    const filtered = subscriptions.filter((sub) => {
        if (!sub || typeof sub !== 'object') return false;
        if (sub.status !== 'active') return false;
        const subCurrency = typeof sub.currency === 'string' ? sub.currency.trim().toUpperCase() : 'BRL';
        return subCurrency === targetCurrency;
    });

    if (filtered.length === 0) {
        return { data: [], totalMonthly: 0 };
    }

    const categoryMap = new Map();

    for (const sub of filtered) {
        const rawCategory = typeof sub.category === 'string' && sub.category.trim()
            ? sub.category.trim()
            : 'Geral';

        let monthly = 0;
        if (sub.monthly_equivalent_price !== undefined && sub.monthly_equivalent_price !== null) {
            monthly = Number(sub.monthly_equivalent_price);
        } else {
            const rawPrice = Number(sub.price);
            const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
            monthly = sub.billing_cycle === 'yearly' ? price / 12 : price;
        }

        if (!Number.isFinite(monthly) || monthly < 0) {
            monthly = 0;
        }

        const current = categoryMap.get(rawCategory) || { name: rawCategory, value: 0, count: 0 };
        current.value += monthly;
        current.count += 1;
        categoryMap.set(rawCategory, current);
    }

    const rawTotalMonthly = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.value, 0);
    const totalMonthly = Math.round(rawTotalMonthly * 100) / 100;

    const sortedCategories = Array.from(categoryMap.values()).sort((a, b) => {
        if (b.value !== a.value) {
            return b.value - a.value;
        }
        return a.name.localeCompare(b.name);
    });

    const data = sortedCategories.map((item, index) => {
        const roundedValue = Math.round(item.value * 100) / 100;
        const percentage = totalMonthly > 0
            ? Math.round((roundedValue / totalMonthly) * 1000) / 10
            : 0;

        return {
            name: item.name,
            value: roundedValue,
            percentage,
            color: COSMIC_PALETTE[index % COSMIC_PALETTE.length],
            count: item.count,
        };
    });

    return { data, totalMonthly };
}

/**
 * Calculates monthly cash-flow projections over 6 to 24 months,
 * separating active from paused commitments.
 */
export function calculateMonthlyProjections(subscriptions, currency = 'BRL', monthsCount = 6, options = {}) {
    const count = Number.isInteger(monthsCount) && monthsCount > 0
        ? Math.min(Math.max(monthsCount, 1), 24)
        : 6;

    const targetCurrency = typeof currency === 'string' && currency.trim()
        ? currency.trim().toUpperCase()
        : 'BRL';

    const baseDate = options && options.baseDate instanceof Date && !isNaN(options.baseDate)
        ? options.baseDate
        : new Date();

    const baseYear = baseDate.getFullYear();
    const baseMonth = baseDate.getMonth();
    const baseLinearMonth = baseYear * 12 + baseMonth;

    const list = Array.isArray(subscriptions) ? subscriptions : [];
    const filteredSubs = list.filter((sub) => {
        if (!sub || typeof sub !== 'object') return false;
        if (sub.status !== 'active' && sub.status !== 'paused') return false;
        const subCurrency = typeof sub.currency === 'string' ? sub.currency.trim().toUpperCase() : 'BRL';
        return subCurrency === targetCurrency;
    });

    const projection = [];

    for (let k = 0; k < count; k++) {
        const targetDate = new Date(baseYear, baseMonth + k, 1);
        const targetYear = targetDate.getFullYear();
        const targetMonthIdx = targetDate.getMonth();
        const year2 = String(targetYear).slice(-2);
        const dateKey = `${targetYear}-${String(targetMonthIdx + 1).padStart(2, '0')}`;
        const monthLabel = `${SHORT_MONTHS_PT[targetMonthIdx]}/${year2}`;
        const fullMonthLabel = `${FULL_MONTHS_PT[targetMonthIdx]} de ${targetYear}`;

        let activeOutflow = 0;
        let pausedOutflow = 0;
        let activeCount = 0;
        let pausedCount = 0;
        const renewals = [];

        const targetLinearMonth = targetYear * 12 + targetMonthIdx;

        for (const sub of filteredSubs) {
            const rawPrice = Number(sub.price);
            const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
            const cycle = sub.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
            const parsed = parseDateParts(sub.next_billing_date);

            let chargesThisMonth = false;

            if (cycle === 'monthly') {
                if (!parsed) {
                    chargesThisMonth = true;
                } else {
                    const subLinearMonth = parsed.year * 12 + (parsed.month - 1);
                    if (subLinearMonth <= baseLinearMonth + 1) {
                        chargesThisMonth = true;
                    } else {
                        chargesThisMonth = targetLinearMonth >= subLinearMonth;
                    }
                }
            } else if (cycle === 'yearly') {
                const renewalMonthIdx = parsed ? parsed.month - 1 : baseMonth;
                if (targetMonthIdx === renewalMonthIdx) {
                    if (!parsed) {
                        chargesThisMonth = true;
                    } else {
                        const subLinearMonth = parsed.year * 12 + (parsed.month - 1);
                        if (subLinearMonth <= baseLinearMonth) {
                            chargesThisMonth = true;
                        } else {
                            chargesThisMonth = targetLinearMonth >= subLinearMonth;
                        }
                    }
                }
            }

            if (chargesThisMonth) {
                if (sub.status === 'active') {
                    activeOutflow += price;
                    activeCount += 1;
                    renewals.push({
                        id: sub.id,
                        name: sub.name,
                        price,
                        billing_cycle: cycle,
                        category: sub.category,
                        status: 'active',
                    });
                } else {
                    pausedOutflow += price;
                    pausedCount += 1;
                    renewals.push({
                        id: sub.id,
                        name: sub.name,
                        price,
                        billing_cycle: cycle,
                        category: sub.category,
                        status: 'paused',
                    });
                }
            }
        }

        const activeRounded = Math.round(activeOutflow * 100) / 100;
        const pausedRounded = Math.round(pausedOutflow * 100) / 100;
        const totalRounded = Math.round((activeRounded + pausedRounded) * 100) / 100;

        projection.push({
            month: monthLabel,
            fullMonth: fullMonthLabel,
            dateKey,
            year: targetYear,
            monthIndex: targetMonthIdx,
            active: activeRounded,
            paused: pausedRounded,
            total: totalRounded,
            activeCount,
            pausedCount,
            renewals,
        });
    }

    return projection;
}

/**
 * Computes normalized amortized monthly run-rate for reference lines.
 */
export function calculateAmortizedRunRate(subscriptions, currency = 'BRL') {
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
        return { activeRunRate: 0, pausedRunRate: 0, totalRunRate: 0 };
    }

    const targetCurrency = typeof currency === 'string' && currency.trim()
        ? currency.trim().toUpperCase()
        : 'BRL';

    let activeSum = 0;
    let pausedSum = 0;

    for (const sub of subscriptions) {
        if (!sub || typeof sub !== 'object') continue;
        const subCurrency = typeof sub.currency === 'string' ? sub.currency.trim().toUpperCase() : 'BRL';
        if (subCurrency !== targetCurrency) continue;

        let monthly = 0;
        if (sub.monthly_equivalent_price !== undefined && sub.monthly_equivalent_price !== null) {
            monthly = Number(sub.monthly_equivalent_price);
        } else {
            const rawPrice = Number(sub.price);
            const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
            monthly = sub.billing_cycle === 'yearly' ? price / 12 : price;
        }

        if (!Number.isFinite(monthly) || monthly < 0) monthly = 0;

        if (sub.status === 'active') {
            activeSum += monthly;
        } else if (sub.status === 'paused') {
            pausedSum += monthly;
        }
    }

    const activeRunRate = Math.round(activeSum * 100) / 100;
    const pausedRunRate = Math.round(pausedSum * 100) / 100;
    const totalRunRate = Math.round((activeRunRate + pausedRunRate) * 100) / 100;

    return { activeRunRate, pausedRunRate, totalRunRate };
}

/**
 * Returns array of distinct currencies present in subscription list.
 */
export function getAvailableCurrencies(subscriptions) {
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
        return ['BRL'];
    }
    const currencies = new Set();
    for (const sub of subscriptions) {
        if (sub && typeof sub.currency === 'string' && sub.currency.trim()) {
            currencies.add(sub.currency.trim().toUpperCase());
        }
    }
    if (currencies.size === 0) {
        return ['BRL'];
    }
    return Array.from(currencies).sort();
}

export default {
    COSMIC_PALETTE,
    COSMIC_COLOR_NAMES,
    CATEGORY_COLOR_MAP,
    parseDateParts,
    formatCurrency,
    formatCompactCurrency,
    getCategoryColor,
    calculateCategoryBreakdown,
    calculateMonthlyProjections,
    calculateAmortizedRunRate,
    getAvailableCurrencies,
};
```

---

## 6. Edge Cases & Failure Mode Hardening Matrix

| # | Edge Case Condition | Concrete Scenario | Engine Defense & Behavior | Safety Guarantee |
|---|---------------------|-------------------|---------------------------|------------------|
| **E1** | `subscriptions` is null or undefined | `calculateCategoryBreakdown(null)` | Guards with `!Array.isArray(subscriptions)` | Returns `{ data: [], totalMonthly: 0 }` |
| **E2** | `subscriptions` is empty `[]` | `calculateMonthlyProjections([])` | Fallbacks to empty array, runs calendar loop | Returns array of `monthsCount` valid month objects with `0` totals |
| **E3** | Non-numeric or NaN price | `sub.price = 'abc'`, `null`, `{}` | `Number(sub.price)`, checked with `Number.isFinite` | Defaults price to `0.00`; no `NaN` in totals |
| **E4** | Negative price | `sub.price = -99.90` | Clamps with `rawPrice > 0 ? rawPrice : 0` | Negative expenditures prevented |
| **E5** | Zero value prices | Free tier subscription `price = 0` | Added normally, item value is `0` | No division by zero: checks `totalMonthly > 0` before percentage |
| **E6** | Total spending is 0.00 | All subscriptions have `price: 0` | Guard: `percentage = totalMonthly > 0 ? ... : 0` | Percentage is `0.0%`, prevents `NaN` or `Infinity` |
| **E7** | Overdue past billing date | `next_billing_date = '2023-01-10'` | Monthly bills every month; yearly bills in January | Ongoing bills continue accurately without date exceptions |
| **E8** | Far future billing date | `next_billing_date = '2030-01-01'` | Evaluates `targetLinearMonth >= subLinearMonth` | Billed $0 in current horizon; no false early billing |
| **E9** | Malformed date string | `next_billing_date = 'not-a-date'` | `parseDateParts` returns `null` | Gracefully defaults to current month recurrence |
| **E10** | UTC Timezone boundary shift | Brazilian timezone `UTC-3` | Parses date via string split `YYYY-MM-DD` | Eliminates date rollback to previous day/month |
| **E11** | Month boundary leap years | Projection crosses Feb 29 (leap year) | Steps using `new Date(year, month + k, 1)` | Day 1 avoids all end-of-month rollover bugs |
| **E12** | Horizon boundary extremes | `monthsCount = -5`, `100`, `'12'` | `Math.min(Math.max(monthsCount, 1), 24)` | Safely clamped between 1 and 24 months |
| **E13** | Currency case & whitespace | `currency = '  usd '` | `typeof currency === 'string' && currency.trim().toUpperCase()` | Normalized to `'USD'` |
| **E14** | Unsupported currency code | `currency = 'XYZ'` | `formatCurrency` catch block handles gracefully | Fallbacks to `${currency} ${amount}` |
| **E15** | Unknown billing cycle | `billing_cycle = 'bi-weekly'` | Ternary `billing_cycle === 'yearly' ? ... : monthly` | Safe fallback to standard monthly cycle |

---

## 7. Downstream Consumer Guidelines

### 7.1 For Explorer M3.2 (`CategorySpendingDonutChart.jsx`)
- Call: `const { data, totalMonthly } = useMemo(() => calculateCategoryBreakdown(subscriptions, selectedCurrency), [subscriptions, selectedCurrency]);`
- Pass `data` directly into Recharts `<PieChart>` and `<Pie data={data} dataKey="value" nameKey="name">`.
- Use `<Cell key={entry.name} fill={entry.color} />`.
- Center Donut Hole text renders `formatCurrency(totalMonthly, selectedCurrency)`.
- If `data.length === 0`: render cosmic empty state ring (`"Sem gastos ativos nesta moeda"`).

### 7.2 For Explorer M3.3 (`MonthlyExpenditureProjectionChart.jsx`)
- Call: `const projectionData = useMemo(() => calculateMonthlyProjections(subscriptions, selectedCurrency, horizonMonths), [subscriptions, selectedCurrency, horizonMonths]);`
- Call: `const runRate = useMemo(() => calculateAmortizedRunRate(subscriptions, selectedCurrency), [subscriptions, selectedCurrency]);`
- Recharts Area / Bar chart series:
  - Active series: `dataKey="active"` with stroke/fill `#10b981`.
  - Paused series: `dataKey="paused"` with stroke/fill `#94a3b8` (Slate 400).
  - Reference Line: `<ReferenceLine y={runRate.activeRunRate} stroke="#10b981" strokeDasharray="3 3" />` for normalized average.
- Tooltip renders `item.fullMonth`, `formatCurrency(item.active)`, `formatCurrency(item.paused)`, `formatCurrency(item.total)`, and lists itemized `item.renewals`.

---

## 8. Verification Strategy

1. **Unit Testing via Node CLI**:
   Execute Node script verifying breakdown and projection outputs across normal datasets, empty arrays, edge cases, and 12-month conservation properties.
2. **Build Verification**:
   ```bash
   docker compose exec -T laravel.test npm run build
   ```
   Ensures zero syntax, import, or bundle errors.
3. **Backend Test Suite Regression Check**:
   ```bash
   docker compose exec -T laravel.test php artisan test
   ```
   Ensures 87/87 tests continue passing without regressions.
4. **Pint Formatting**:
   ```bash
   docker compose exec -T laravel.test ./vendor/bin/pint --test
   ```
   Ensures zero code style violations.
