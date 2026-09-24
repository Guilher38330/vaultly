# Comprehensive Analysis & Architectural Survey: R1 Financial Analytics Charts

**Project**: Vaultly / AuraSpace Subscription Tracker  
**Author**: Teamwork Explorer 1 (Survey & Architecture)  
**Date**: 2026-09-23  
**Status**: Complete  

---

## 1. Executive Summary

This investigation surveys the current frontend and backend architecture of the Vaultly subscription tracker to formulate an implementation specification for **Requirement 1 (R1: Financial Analytics Charts)**.

### Key Takeaways:
1. **Frontend Foundation**: React `18.3.1`, Inertia.js `2.3.28`, Vite `8.3.0`, and Tailwind CSS `3.2.1` with `@tailwindcss/vite 4.0.0` and `@headlessui/react 2.2.10`.
2. **Package Environment**: `recharts` is not yet installed. Due to Node `24.21.0` / npm `12.0.2` default constraints (`allow-remote = "none"`) and a peer dependency mismatch between `@vitejs/plugin-react` and `vite 8.3.0`, package installations must use `--allow-remote=all --legacy-peer-deps` (or configure `.npmrc`). Dry-run tests confirm `recharts@3.10.1` installs cleanly with these flags.
3. **Data Completeness**: The `/dashboard` Inertia endpoint already delivers complete subscription objects via `SubscriptionResource::collection($subscriptions)` with all necessary dimensions: `price`, `currency` (`BRL`, `USD`, `EUR`), `billing_cycle` (`monthly`, `yearly`), `category`, `next_billing_date`, `status` (`active`, `paused`), `monthly_equivalent_price`, and `yearly_equivalent_price`.
4. **Optimal Aggregation Strategy**: Performing projection and breakdown aggregation on the **frontend** in React (`useMemo`) is recommended. It enables instantaneous currency switching (`BRL`/`USD`/`EUR`) and horizon switching (`6`/`12` months) with zero network latency, no loading spinners, smooth animation transitions, and strictly zero risk to the 87 existing passing PHPUnit tests that assert the exact shape of `SubscriptionController::index`.
5. **Cosmic Design Consistency**: The project features a distinct cosmic/emerald visual identity (`cosmic-500: #10b981`, dark mode `zinc-950`, emerald glows). Both the Donut chart and Area/Bar charts must adopt this aesthetic to integrate seamlessly into `Dashboard.jsx`.

---

## 2. Dependency Environment & Build Tooling

### Installed Package Audit (`package.json`)

```json
{
    "devDependencies": {
        "@headlessui/react": "^2.0.0",
        "@inertiajs/react": "^2.0.0",
        "@tailwindcss/forms": "^0.5.3",
        "@tailwindcss/vite": "^4.0.0",
        "@vitejs/plugin-react": "^4.2.0",
        "autoprefixer": "^10.4.12",
        "concurrently": "^10.0.3",
        "laravel-vite-plugin": "^3.1",
        "postcss": "^8.4.31",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "tailwindcss": "^3.2.1",
        "vite": "^8.0.0"
    }
}
```

- **Active Runtime Versions in Container (`laravel.test`)**:
  - Node: `v24.21.0`
  - npm: `12.0.2`
  - React: `18.3.1`
  - React-DOM: `18.3.1`
  - Inertia React: `2.3.28`
  - Vite: `8.3.0`
- **Recharts Status**: Not installed.
- **Other Feature Libraries Requested (R2, R3, R4)**: `sonner`, `framer-motion`, `three`, `@react-three/fiber`, and `lucide-react` are also not installed yet.

### Critical Discovery: npm 12 & Vite 8 Installation Requirements
Running standard `npm install <package>` in the container fails with two distinct blockers:
1. `npm error code EALLOWREMOTE`: npm 12 defaults to `allow-remote = "none"`.
2. `npm error code ERESOLVE`: `@vitejs/plugin-react@4.2.0` has a peer dependency on `vite < 8.0.0`, while the repo uses `vite@8.3.0`.

**Tested Working Solution**:
All package installations within the Sail container must be invoked with:
```bash
docker compose exec -T laravel.test npm install --allow-remote=all --legacy-peer-deps recharts
```
Alternatively, updating `.npmrc` with:
```ini
allow-remote=all
legacy-peer-deps=true
```
allows clean, standard `npm install` invocations. Dry-run verified: `recharts@3.10.1` installs and resolves without errors.

---

## 3. Existing Frontend Architecture

### Page Structure: `resources/js/Pages/Dashboard.jsx`
The Dashboard page currently spans 796 lines. Its structure is organized as follows:

```
Dashboard.jsx
├── Header (Title & "Nova Assinatura" CTA button)
├── Flash Success Alert (from Inertia flash.success)
├── Due Soon Alert Banner (shown when due_soon.length > 0)
├── Metric Cards Grid (3 cards):
│   ├── Card 1: Total Mensal Projetado (BRL)
│   ├── Card 2: Moedas Estrangeiras (USD & EUR)
│   └── Card 3: Status das Assinaturas (Active vs Paused progress bar)
├── [PROPOSED LOCATION: R1 Financial Analytics Charts Section]
├── Search & Multi-Filter Bar (Search text, Category, Status, Cycle, Clear filters)
├── Subscriptions List:
│   ├── Empty States (First-time user or no matching filter results)
│   ├── Desktop Table (columns: Serviço, Categoria, Ciclo, Próxima Cobrança, Valor, Status, Ações)
│   └── Mobile Card Grid (responsive layout for sm/xs viewports)
└── Modals:
    ├── SubscriptionModal (Create & Edit subscription)
    └── DeleteSubscriptionModal (Confirmation dialog)
```

### Layout and Theme: `AuthenticatedLayout.jsx` & `tailwind.config.js`
- **Dark Mode**: Managed via `darkMode: 'class'`. The `<html>` element has the `dark` class toggled by `ThemeToggle.jsx` (`localStorage` key: `'vaultly_theme'`).
- **Color Tokens**:
  - `cosmic`: Emerald palette spanning `cosmic-50` (`#ecfdf5`) to `cosmic-950` (`#022c22`).
  - `emerald-glow`: `0 0 25px -5px rgba(16, 185, 129, 0.35)`.
  - Surface backgrounds: Light mode `bg-white` / `bg-zinc-100/70`, Dark mode `bg-zinc-900` / `bg-zinc-950`.
  - Border colors: Light mode `border-zinc-200/80`, Dark mode `border-zinc-800`.
- **Existing Category Styling (`CategoryBadge.jsx`)**:
  - Implements a deterministic string hash (`stringHash(category) % PALETTES.length`).
  - Supports 10 palettes: `emerald`, `sky`, `violet`, `amber`, `rose`, `indigo`, `teal`, `cyan`, `fuchsia`, `orange`.

---

## 4. Backend Architecture, Models & Data Serialization

### 1. Subscription Model (`app/Models/Subscription.php`)
- **Table**: `subscriptions`
- **Fields**:
  - `id`: `bigint unsigned`
  - `user_id`: `bigint unsigned` (foreign key, cascade delete)
  - `name`: `string(255)`
  - `price`: `decimal(10, 2)`
  - `currency`: `string(3)` (strictly `'BRL'`, `'USD'`, or `'EUR'`)
  - `billing_cycle`: `string` (strictly `'monthly'` or `'yearly'`)
  - `category`: `string(100)`
  - `next_billing_date`: `date` (`YYYY-MM-DD`)
  - `status`: `string` (strictly `'active'` or `'paused'`)
  - `notes`: `text` (nullable)
- **Appends / Accessors**:
  - `monthly_equivalent_price`:
    - If `billing_cycle === 'yearly'`: `round($price / 12, 2)`
    - If `billing_cycle === 'monthly'`: `$price`
  - `yearly_equivalent_price`:
    - If `billing_cycle === 'monthly'`: `round($price * 12, 2)`
    - If `billing_cycle === 'yearly'`: `$price`
- **Scopes**:
  - `scopeActive($query)`: `where('status', 'active')`
  - `scopeDueSoon($query, int $days = 7)`: `whereBetween('next_billing_date', [today, today + 7 days])`

### 2. SubscriptionResource (`app/Http/Resources/SubscriptionResource.php`)
Serializes subscriptions with the following contract:
```json
{
  "id": 1,
  "name": "Netflix",
  "price": 55.90,
  "currency": "BRL",
  "billing_cycle": "monthly",
  "category": "Streaming",
  "next_billing_date": "2026-09-25",
  "status": "active",
  "notes": "Plano 4K",
  "monthly_equivalent_price": 55.90,
  "yearly_equivalent_price": 670.80,
  "is_due_soon": true,
  "days_until_due": 2
}
```

### 3. Controller Props Contract (`SubscriptionController::index`)
The controller passes the following props to `Dashboard`:
```php
return Inertia::render('Dashboard', [
    'subscriptions' => SubscriptionResource::collection($subscriptions),
    'metrics' => [
        'totals' => ['BRL' => float, 'USD' => float, 'EUR' => float],
        'yearly_totals' => ['BRL' => float, 'USD' => float, 'EUR' => float],
        'active_count' => int,
        'paused_count' => int,
        'due_soon_count' => int,
    ],
    'due_soon' => SubscriptionResource::collection($dueSoon),
    'categories' => string[],
]);
```

### 4. Test Suite Guardrails (`tests/Feature/SubscriptionTest.php`)
The repository contains 87 tests (864 assertions) covering IDOR isolation, XSS tag sanitization, decimal rounding, and strict multi-currency totals assertions:
- `metrics.totals.BRL`, `USD`, `EUR` must remain exact sums of active subscriptions.
- Paused subscriptions must never be included in `metrics.totals`.
- Any code changes to `SubscriptionController` must preserve this exact response contract to keep 100% test pass rate.

---

## 5. Detailed R1 Specifications

### Requirement 1A: Donut Chart (Spending Percentage Breakdown by Category)

#### 1. Core Objectives
- Display spending percentage breakdown categorized by subscription category.
- Apply a harmonious **emerald/cosmic** celestial color scheme.
- Maintain mathematical correctness across multi-currency environments.

#### 2. Multi-Currency Alignment
A common pitfall in financial charts is aggregating amounts across different currencies (e.g. summing R$ 50 + $ 45 into 95). To ensure complete financial rigor:
- The category breakdown must filter by the selected currency (`BRL` default, with quick-switch toggles for `USD` and `EUR`).
- If a user has subscriptions in both `BRL` and `USD`, selecting `BRL` breaks down all BRL spending; selecting `USD` breaks down USD spending.
- An optional currency pill or a shared chart currency controller allows synchronizing the Donut Chart and Projection Chart.

#### 3. Data Aggregation Formula
For selected currency $C \in \{\text{'BRL'}, \text{'USD'}, \text{'EUR'}\}$:
1. Filter:
   $$S_{active, C} = \{ s \in \text{subscriptions} \mid s.\text{status} = \text{'active'} \land s.\text{currency} = C \}$$
2. Group by `category`:
   For each distinct category $cat$:
   $$\text{Amount}(cat) = \sum_{s \in S_{active, C}, s.\text{category} = cat} s.\text{monthly\_equivalent\_price}$$
   $$\text{Count}(cat) = |\{ s \in S_{active, C} \mid s.\text{category} = cat \}|$$
3. Total Spending in Currency:
   $$\text{Total}_C = \sum_{cat} \text{Amount}(cat)$$
4. Percentage:
   $$\text{Percentage}(cat) = \begin{cases} \left( \frac{\text{Amount}(cat)}{\text{Total}_C} \right) \times 100 & \text{if } \text{Total}_C > 0 \\ 0 & \text{otherwise} \end{cases}$$
5. Sort categories descending by amount for clean visual presentation.

#### 4. Emerald/Cosmic Palette System
To fulfill the cosmic theme, we define a curated spectrum of emerald, jade, mint, cyan, and cosmic accent colors:

| Index | Color Token | Hex Code | Visual Character |
|:---:|:---|:---:|:---|
| 0 | `cosmic-primary` | `#10b981` | Emerald 500 (Anchor brand color) |
| 1 | `cosmic-mint` | `#34d399` | Mint / Seafoam (Bright accent) |
| 2 | `cosmic-teal` | `#14b8a6` | Teal 500 (Deep aquatic celestial) |
| 3 | `cosmic-cyan` | `#06b6d4` | Cyan 500 (Vibrant cosmic nebula) |
| 4 | `cosmic-jade` | `#059669` | Emerald 600 (Rich jade green) |
| 5 | `cosmic-light-mint` | `#6ee7b7` | Emerald 300 (Soft highlight) |
| 6 | `cosmic-dark-teal` | `#0f766e` | Teal 700 (Deep space teal) |
| 7 | `cosmic-deep-emerald`| `#047857` | Emerald 700 (Forest celestial) |
| 8 | `cosmic-violet-accent` | `#8b5cf6` | Violet 500 (Harmonious contrast) |
| 9 | `cosmic-sky` | `#0ea5e9` | Sky 500 (Atmospheric cyan) |

#### 5. Donut Chart UI Specifications
- **Component**: Recharts `PieChart` wrapped in `ResponsiveContainer` (`height={280}`).
- **Donut Geometry**: `innerRadius={65}`, `outerRadius={92}`, `paddingAngle={3}`, `cornerRadius={6}`.
- **Center "Hole" Metric**:
  - Center HTML overlay or SVG text displaying:
    - Small uppercase label: `"TOTAL ATIVO"`
    - Bold primary text: formatted total in currency (e.g., `R$ 407,70`)
    - Subtitle: `"/mês"`
- **Interactive Tooltip**:
  - Glassmorphic card (`bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl p-3`).
  - Displays Category Name, color indicator dot, monthly amount formatted in currency, percentage of total spending, and number of subscriptions in that category.
- **Interactive Legend**:
  - Grid or list beneath/beside the chart.
  - Hovering a slice highlights the corresponding legend item; hovering a legend item highlights the chart slice (`activeIndex` state).
- **Empty State**:
  - When no active subscriptions exist in the chosen currency, render a subtle dashed ring with a cosmic spark icon and message: `"Sem gastos ativos nesta moeda"`.

---

### Requirement 1B: Area/Bar Chart (Projected Monthly Expenditures over 6 to 12 Months)

#### 1. Core Objectives
- Project future recurring monthly commitments over the next 6 to 12 months.
- Support instant **currency filtering** (`BRL`, `USD`, `EUR`).
- Separate **Active** vs **Paused** subscriptions to highlight both committed cash-flow and potential reactivation exposure.
- Allow switching between **Area Chart** (continuous cash-flow horizon) and **Bar Chart** (monthly discrete totals).

#### 2. Projection Logic: Cash-Flow Calendar Recurrence vs Amortized Run-Rate

A major architectural consideration is how monthly vs yearly subscriptions should be projected into future calendar months:

- **Monthly Subscriptions**:
  - Recur every single calendar month.
  - In each projected month $m$, cost $= \text{subscription.price}$.
- **Yearly Subscriptions**:
  - Two valid financial perspectives exist:
    - **Perspective 1: Cash-Flow Calendar Outflow (Occurrence-based)**:
      A yearly bill charges only in its renewal month! For example, GitHub Pro ($100/yr renewal in November) charges $100 in November and $0 in October, December, etc. This shows the user real out-of-pocket spikes.
    - **Perspective 2: Normalized Accrual Run-Rate (Amortized)**:
      Every month accounts for `price / 12` (`monthly_equivalent_price`).

**Recommended Implementation Strategy**:
- **Primary Projection (Default)**: Cash-Flow Calendar Outflow. This reflects actual bank account debits when bills occur, answering the user's immediate question: *"Which month will have heavy renewals?"*
- **Reference Line**: Render a dashed horizontal `ReferenceLine` showing the **Média Mensal Normalizada** (Amortized Run-Rate). This combines both perspectives into a single intuitive view.

#### 3. Step-by-Step Mathematical Projection Algorithm

Let:
- $D_{today}$ be the reference date (e.g. today).
- $H \in \{6, 12\}$ be the horizon in months.
- $C \in \{\text{'BRL'}, \text{'USD'}, \text{'EUR'}\}$ be the selected currency.

For $k = 0, 1, \dots, H - 1$:
1. Determine the target calendar month:
   $$\text{Year}_k = \text{year}(D_{today}) + \lfloor (\text{month}(D_{today}) + k) / 12 \rfloor$$
   $$\text{MonthIndex}_k = (\text{month}(D_{today}) + k) \pmod{12}$$
   Generate localized label: e.g., `"Out/26"`, `"Nov/26"`, `"Dez/26"`, `"Jan/27"`.

2. Initialize monthly totals:
   $$\text{ActiveTotal}_k = 0$$
   $$\text{PausedTotal}_k = 0$$

3. For each subscription $s$ where $s.\text{currency} = C$:
   - If $s.\text{billing\_cycle} = \text{'monthly'}$:
     - If $s.\text{status} = \text{'active'}$: $\text{ActiveTotal}_k += s.\text{price}$
     - If $s.\text{status} = \text{'paused'}$: $\text{PausedTotal}_k += s.\text{price}$
   - If $s.\text{billing\_cycle} = \text{'yearly'}$:
     - Parse renewal date: $D_{renew} = \text{parseDate}(s.\text{next\_billing\_date})$.
     - Renewal month index: $M_{renew} = \text{month}(D_{renew})$.
     - The yearly charge falls in month $k$ if $\text{MonthIndex}_k = M_{renew}$.
     - When this condition matches:
       - If $s.\text{status} = \text{'active'}$: $\text{ActiveTotal}_k += s.\text{price}$
       - If $s.\text{status} = \text{'paused'}$: $\text{PausedTotal}_k += s.\text{price}$

4. Compute combined total:
   $$\text{Total}_k = \text{ActiveTotal}_k + \text{PausedTotal}_k$$

5. Return dataset array:
   ```json
   [
     {
       "month": "Out/26",
       "fullMonth": "Outubro de 2026",
       "active": 365.80,
       "paused": 41.90,
       "total": 407.70,
       "activeItemsCount": 4,
       "renewalsList": ["Netflix", "Spotify", "Adobe CC"]
     },
     ...
   ]
   ```

#### 4. Area / Bar Chart UI & Styling Specifications
- **Controls Bar**:
  - **Currency Filter**: Segmented tabs (`BRL`, `USD`, `EUR`) with active indicator.
  - **Horizon Filter**: Segmented buttons (`6 Meses`, `12 Meses`).
  - **Chart Mode Toggle**: Icon buttons for `Área` (AreaChart) vs `Barras` (BarChart).
- **Series & Colors**:
  - **Active Series (`ativas`)**:
    - Area: Stroke `#10b981` (2.5px), Gradient fill from `rgba(16, 185, 129, 0.4)` to `rgba(16, 185, 129, 0.02)`.
    - Bar: Fill `#10b981` with rounded top corners (`radius={[4, 4, 0, 0]}`).
  - **Paused Series (`pausadas`)**:
    - Area: Stroke `#94a3b8` (Slate 400, 2px dashed or solid), Gradient fill from `rgba(148, 163, 184, 0.25)` to `rgba(148, 163, 184, 0.01)`.
    - Bar: Fill `#64748b` (Slate 500) stacked with `stackId="commitments"`.
- **Axes & Grid Lines**:
  - `CartesianGrid`: `strokeDasharray="3 3"`, `stroke="currentColor"` with `opacity-10` (adapts to light/dark automatically).
  - `XAxis`: Clean month labels (`Out/26`), `tick={{ fill: '#71717a', fontSize: 12 }}`.
  - `YAxis`: Formats numbers with currency symbol (`tickFormatter={(v) => formatShortCurrency(v, currency)}`).
- **Interactive Tooltip**:
  - Custom glassmorphic tooltip with:
    - Month Header (e.g., `"Novembro de 2026"`)
    - Ativas: Formatted amount with emerald bullet
    - Pausadas: Formatted amount with slate bullet
    - Total Projetado: Highlighted combined sum
    - List of upcoming renewals occurring in that month.

---

## 6. Architecture & Implementation Plan

### Recommended Component Architecture

To maintain high code quality and clean separation of concerns, the following modular structure is proposed:

```
resources/js/
├── Utils/
│   └── financialProjections.js        <-- Pure calculation engine (unit testable)
└── Components/
    └── Charts/
        ├── CategorySpendingDonutChart.jsx     <-- R1A: Donut Chart component
        ├── MonthlyExpenditureProjectionChart.jsx <-- R1B: Area/Bar Projection component
        └── FinancialAnalyticsSection.jsx       <-- Composite container with shared filters & responsive grid
```

### Component Breakdown & Responsibilities

1. **`financialProjections.js`**:
   - `calculateCategoryBreakdown(subscriptions, currency)`: Aggregates active subscriptions by category, computes percentages and sorting.
   - `calculateMonthlyProjections(subscriptions, currency, horizonMonths)`: Runs calendar recurrence projection for active and paused commitments.
   - `formatChartCurrency(amount, currency)`: Consistent currency formatting helper.
   - `COSMIC_PALETTE`: Array of 10 emerald/cosmic color hex strings.

2. **`CategorySpendingDonutChart.jsx`**:
   - Wraps Recharts `PieChart`, `Pie`, `Cell`, `Tooltip`.
   - Renders the Donut Hole center statistic with total monthly active spend.
   - Renders the interactive category legend with percentages and subscription counts.

3. **`MonthlyExpenditureProjectionChart.jsx`**:
   - Wraps Recharts `AreaChart` or `BarChart` based on the selected mode.
   - Manages horizon selector (`6M` vs `12M`) and view toggle (`Área` vs `Barras`).
   - Renders custom glassmorphic tooltip and reference line for average run-rate.

4. **`FinancialAnalyticsSection.jsx`**:
   - Manages the selected currency state (`'BRL'`, `'USD'`, `'EUR'`).
   - Auto-selects the currency with the highest active spending if BRL is empty.
   - Provides a cohesive card header with currency selector pills.
   - Renders a 2-column responsive grid on desktop (`grid-cols-1 lg:grid-cols-12 gap-6`):
     - Left (5 cols): `CategorySpendingDonutChart`
     - Right (7 cols): `MonthlyExpenditureProjectionChart`

5. **`Dashboard.jsx` Integration**:
   - Mount `<FinancialAnalyticsSection subscriptions={subscriptions} categories={categories} />` right after the Metric Cards Grid.
   - Completely preserves existing table, filters, modals, and props.

---

## 7. Verification & Safety Strategy

### Build & Test Commands
All commands must be executed through Docker Sail:
1. **PHPUnit Backend Tests**:
   ```bash
   docker compose exec -T laravel.test php artisan test
   ```
   *Expectation*: 100% pass (87/87 tests).
2. **Pint Code Style Formatter**:
   ```bash
   docker compose exec -T laravel.test ./vendor/bin/pint --test
   ```
   *Expectation*: Zero violations across all PHP files.
3. **Frontend Asset Build**:
   ```bash
   docker compose exec -T laravel.test npm run build
   ```
   *Expectation*: Clean Vite build with zero bundle errors and proper chunks created.

### Potential Failure Modes & Safeguards

| Potential Risk | Root Cause | Preventive Safeguard |
|:---|:---|:---|
| `ResponsiveContainer` dimension loop | Recharts re-measuring container with 0 height | Wrap all charts in a container with explicit min-height (e.g. `h-[280px] w-full`) and set `minWidth={0}`. |
| Mixed currency aggregation | Summing BRL, USD, and EUR directly | Strict currency filtering on both Donut and Projection charts before any arithmetic sum. |
| Division by zero in percentage | Zero total spending in a currency | Check `total > 0` before calculating `(amount / total) * 100`. |
| Missing billing date | Incomplete or unparsed date string | Provide fallback date parsing and default to current month. |
| npm installation failure | `EALLOWREMOTE` and peer dependency conflict | Always use `--allow-remote=all --legacy-peer-deps` or configure `.npmrc`. |

---
*Report concluded. Ready for handoff and implementation planning.*
