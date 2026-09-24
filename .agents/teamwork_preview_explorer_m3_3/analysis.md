# Technical Analysis: Monthly Expenditure Projection Chart & Financial Analytics Dashboard Section

**Milestone**: Milestone 3: Financial Analytics Charts (F9 & F10)  
**Agent**: Teamwork Explorer M3.3  
**Date**: 2026-09-24  
**Status**: Complete  

---

## 1. Executive Summary

This technical analysis formulates the complete design, component architecture, data flow, and dashboard integration for the **Monthly Expenditure Projection Chart** (`MonthlyExpenditureProjectionChart.jsx`) and the **Financial Analytics Dashboard Section** (`FinancialAnalyticsSection.jsx`).

### Key Highlights:
1. **Projection Chart Architecture (`MonthlyExpenditureProjectionChart.jsx`)**:
   - Built on Recharts `AreaChart` (with optional `BarChart` toggle), `ResponsiveContainer`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, and `ReferenceLine`.
   - **Stacked Series**: Active expenditures as the foundational layer with an Emerald 500 gradient (`#10b981`), topped with Paused expenditures in a Slate 400 gradient (`#94a3b8`), sharing `stackId="expenditure"`.
   - **Horizon Switcher**: Dynamic toggle between 6-month and 12-month projection windows.
   - **Multi-Currency Synchronization**: Seamless switching between `BRL` (R$), `USD` ($), and `EUR` (€) synchronized bidirectionally with the section parent state.
   - **Average Run-Rate Reference Line**: Dashed horizontal guide line reflecting the average monthly active commitment across the selected horizon.
   - **Glassmorphic Tooltip**: High-contrast, semi-transparent frosted card (`backdrop-blur-md`) providing a comprehensive breakdown of active commitments, paused commitments, grand total, and specific renewal events.
   - **Zero-Height Loop Prevention**: Explicit container min-height (`h-72 sm:h-80 w-full min-w-0`) avoiding Recharts dimension recalculation loops.

2. **Section Architecture (`FinancialAnalyticsSection.jsx`)**:
   - Master container orchestrating state and layout for both charts:
     - Left (5 cols): `CategorySpendingDonutChart` (formulated by M3.2).
     - Right (7 cols): `MonthlyExpenditureProjectionChart`.
   - Cohesive Section Header featuring title, cosmic sparkle badge, synchronized currency selector tabs with active subscription count pills, and current monthly run-rate badge.
   - Full responsiveness: side-by-side on desktop (`lg:grid-cols-12`), stacked on mobile (`grid-cols-1`).

3. **Dashboard Integration (`Dashboard.jsx`)**:
   - Mounts directly into the designated Tier 3 container at `#financial-analytics-section` (lines 587–595 of `Dashboard.jsx`).
   - Seamlessly adopts Framer Motion staggered entrance animations (`cardVariants`).
   - Zero changes to backend APIs or existing controller contracts, preserving 100% of the 87 passing PHPUnit tests.

---

## 2. Component Architecture & Data Flow

```
Dashboard.jsx (Inertia Page Props: subscriptions, categories, metrics)
  │
  └── <motion.div variants={cardVariants} id="financial-analytics-section">
        │
        └── <FinancialAnalyticsSection subscriptions={subscriptions} categories={categories} />
              │
              ├── [Shared State: selectedCurrency ('BRL' | 'USD' | 'EUR')]
              │
              ├── Section Header (Title, Currency Tabs: BRL / USD / EUR, Monthly Total Metric)
              │
              ├── Responsive Grid Container (grid-cols-1 lg:grid-cols-12 gap-6)
              │     │
              │     ├── [lg:col-span-5] <CategorySpendingDonutChart />
              │     │     ├── Props: subscriptions, selectedCurrency
              │     │     └── Calls: calculateCategoryBreakdown(subscriptions, selectedCurrency)
              │     │
              │     └── [lg:col-span-7] <MonthlyExpenditureProjectionChart />
              │           ├── Props: subscriptions, selectedCurrency, onCurrencyChange
              │           └── Calls: calculateMonthlyProjections(subscriptions, selectedCurrency, horizon)
              │                 ├── Horizon Switcher (6M vs 12M)
              │                 ├── View Mode Switcher (Area vs Bar)
              │                 ├── ReferenceLine (Average Run-Rate)
              │                 └── Custom Glassmorphic Tooltip
```

### Data Contract Alignment with `financialProjections.js` (M3.1)
The projection chart consumes the output of `calculateMonthlyProjections(subscriptions, currency, monthsCount)`:

```typescript
interface MonthlyProjectionPoint {
    month: string;           // Formatted short month, e.g. "Out/26", "Nov/26"
    fullMonth: string;       // Localized full name, e.g. "Outubro de 2026"
    year: number;            // 2026
    monthIndex: number;      // 0-11
    active: number;          // Active subscription total for this month
    paused: number;          // Paused subscription total for this month
    total: number;           // active + paused
    activeCount: number;     // Number of active charges in this month
    pausedCount: number;     // Number of paused charges in this month
    renewals?: Array<{       // List of renewals occurring in this month
        name: string;
        price: number;
        billing_cycle: string;
        status: string;
    }>;
}
```

---

## 3. Design of `MonthlyExpenditureProjectionChart.jsx`

### 3.1 Visual Design Tokens
- **Emerald Active Gradient**:
  - Top stop: `#10b981` at 45% opacity.
  - Middle stop: `#10b981` at 15% opacity.
  - Bottom stop: `#10b981` at 0% opacity.
  - Line stroke: `#10b981`, stroke-width: `2.5px`.
- **Slate Paused Gradient**:
  - Top stop: `#94a3b8` (Slate 400) at 35% opacity.
  - Middle stop: `#94a3b8` at 10% opacity.
  - Bottom stop: `#94a3b8` at 0% opacity.
  - Line stroke: `#94a3b8`, stroke-width: `2px`, stroke-dasharray: `"4 2"`.
- **ReferenceLine (Average Run-Rate)**:
  - Stroke: `#059669` (light mode) / `#34d399` (dark mode), stroke-dasharray: `"4 4"`, stroke-width: `1.5px`.
  - Position: `insideTopRight`.
- **Cartesian Grid**:
  - Stroke: `currentColor` with opacity `0.10`–`0.15`.
  - `vertical={false}` to eliminate vertical visual noise.
- **Glassmorphic Tooltip**:
  - Container: `bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-700/80 shadow-xl rounded-2xl p-4`.

### 3.2 Full Proposed Implementation

```jsx
import React, { useState, useMemo } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
} from 'recharts';
import {
    calculateMonthlyProjections,
    formatCurrency,
    formatShortCurrency,
} from '@/Utils/financialProjections';

/**
 * Fallback currency formatters in case utility is not yet loaded.
 */
function defaultFormatCurrency(amount, currency = 'BRL') {
    const num = Number(amount) || 0;
    try {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency || 'BRL',
        }).format(num);
    } catch {
        return `${currency} ${num.toFixed(2)}`;
    }
}

function defaultFormatShortCurrency(amount, currency = 'BRL') {
    const num = Number(amount) || 0;
    const symbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : '€';
    if (num >= 1000) {
        return `${symbol} ${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}k`;
    }
    return `${symbol} ${Math.round(num)}`;
}

/**
 * Custom Glassmorphic Tooltip Component
 */
function CustomGlassmorphicTooltip({ active, payload, currency = 'BRL' }) {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    const activeAmount = Number(data.active) || 0;
    const pausedAmount = Number(data.paused) || 0;
    const totalAmount = Number(data.total) || (activeAmount + pausedAmount);
    const activePercent = totalAmount > 0 ? Math.round((activeAmount / totalAmount) * 100) : 0;

    const formatter = typeof formatCurrency === 'function' ? formatCurrency : defaultFormatCurrency;

    return (
        <div className="z-50 min-w-[230px] rounded-2xl border border-zinc-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:shadow-2xl dark:shadow-emerald-950/20">
            {/* Header: Month & Indicator */}
            <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    {data.fullMonth || data.month}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Projeção
                </span>
            </div>

            {/* Breakdown Rows */}
            <div className="space-y-2 text-xs">
                {/* Active Subscriptions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
                        <span className="text-zinc-600 dark:text-zinc-300">Ativas ({activePercent}%)</span>
                    </div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatter(activeAmount, currency)}
                    </span>
                </div>

                {/* Paused Subscriptions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-zinc-500" />
                        <span className="text-zinc-600 dark:text-zinc-400">Pausadas</span>
                    </div>
                    <span className="font-medium text-zinc-600 dark:text-zinc-400">
                        {formatter(pausedAmount, currency)}
                    </span>
                </div>

                {/* Total Row */}
                <div className="border-t border-dashed border-zinc-200 pt-2 dark:border-zinc-800">
                    <div className="flex items-center justify-between font-bold">
                        <span className="text-zinc-800 dark:text-zinc-200">Total Previsto</span>
                        <span className="text-sm text-emerald-600 dark:text-emerald-400">
                            {formatter(totalAmount, currency)}
                        </span>
                    </div>
                </div>

                {/* Renewal events if present */}
                {data.renewals && data.renewals.length > 0 && (
                    <div className="mt-2.5 rounded-xl bg-zinc-50 p-2.5 text-[11px] text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                        <p className="font-semibold text-zinc-700 dark:text-zinc-200">
                            Cobranças programadas ({data.renewals.length}):
                        </p>
                        <div className="mt-1 max-h-24 space-y-1 overflow-y-auto">
                            {data.renewals.map((r, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <span className="truncate max-w-[130px]">{r.name}</span>
                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                        {formatter(r.price, currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Custom Legend Component
 */
function CustomLegend() {
    return (
        <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs">
            <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Assinaturas Ativas
                </span>
            </div>
            <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-zinc-500" />
                <span className="font-medium text-zinc-500 dark:text-zinc-400">
                    Assinaturas Pausadas
                </span>
            </div>
            <div className="flex items-center gap-2">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-emerald-500" />
                <span className="font-medium text-zinc-500 dark:text-zinc-400">
                    Média Run-Rate
                </span>
            </div>
        </div>
    );
}

export default function MonthlyExpenditureProjectionChart({
    subscriptions = [],
    selectedCurrency = 'BRL',
    onCurrencyChange,
    defaultHorizon = 6,
    className = '',
}) {
    // Horizon switcher: 6 months vs 12 months
    const [horizon, setHorizon] = useState(defaultHorizon);

    // Chart mode toggle: 'area' vs 'bar'
    const [chartMode, setChartMode] = useState('area');

    // Projection calculation via pure functional utility
    const projectionData = useMemo(() => {
        if (typeof calculateMonthlyProjections === 'function') {
            return calculateMonthlyProjections(subscriptions, selectedCurrency, horizon);
        }
        return [];
    }, [subscriptions, selectedCurrency, horizon]);

    // Average run-rate calculation
    const averageMonthlyRunRate = useMemo(() => {
        if (!projectionData || projectionData.length === 0) return 0;
        const totalActive = projectionData.reduce((acc, curr) => acc + (Number(curr.active) || 0), 0);
        return Math.round((totalActive / projectionData.length) * 100) / 100;
    }, [projectionData]);

    // Check if any subscriptions exist in selected currency
    const hasDataForCurrency = useMemo(() => {
        return subscriptions.some((s) => s.currency === selectedCurrency);
    }, [subscriptions, selectedCurrency]);

    const formatShort = typeof formatShortCurrency === 'function' ? formatShortCurrency : defaultFormatShortCurrency;
    const formatFull = typeof formatCurrency === 'function' ? formatCurrency : defaultFormatCurrency;

    return (
        <div
            className={`flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
        >
            {/* Header: Title and Controls */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Projeção de Despesas Recorrentes
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Fluxo de caixa previsto para os próximos {horizon} meses ({selectedCurrency})
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Horizon Switcher (6M vs 12M) */}
                    <div className="inline-flex items-center rounded-xl bg-zinc-100 p-0.5 dark:bg-zinc-800/80">
                        <button
                            type="button"
                            onClick={() => setHorizon(6)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                horizon === 6
                                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-emerald-400'
                                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                            }`}
                        >
                            6 Meses
                        </button>
                        <button
                            type="button"
                            onClick={() => setHorizon(12)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                horizon === 12
                                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-emerald-400'
                                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                            }`}
                        >
                            12 Meses
                        </button>
                    </div>

                    {/* Chart Mode Switcher: Area vs Bar */}
                    <div className="inline-flex items-center rounded-xl bg-zinc-100 p-0.5 dark:bg-zinc-800/80">
                        <button
                            type="button"
                            onClick={() => setChartMode('area')}
                            title="Visualização em Área"
                            className={`rounded-lg p-1 text-xs font-medium transition-all ${
                                chartMode === 'area'
                                    ? 'bg-white text-emerald-600 shadow-xs dark:bg-zinc-900 dark:text-emerald-400'
                                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
                            }`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartMode('bar')}
                            title="Visualização em Barras"
                            className={`rounded-lg p-1 text-xs font-medium transition-all ${
                                chartMode === 'bar'
                                    ? 'bg-white text-emerald-600 shadow-xs dark:bg-zinc-900 dark:text-emerald-400'
                                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
                            }`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-5 4 3 6-8" />
                            </svg>
                        </button>
                    </div>

                    {/* Currency Switcher (if onCurrencyChange provided) */}
                    {onCurrencyChange && (
                        <div className="inline-flex items-center rounded-xl bg-zinc-100 p-0.5 dark:bg-zinc-800/80">
                            {['BRL', 'USD', 'EUR'].map((curr) => (
                                <button
                                    key={curr}
                                    type="button"
                                    onClick={() => onCurrencyChange(curr)}
                                    className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                                        selectedCurrency === curr
                                            ? 'bg-emerald-500 text-white shadow-xs'
                                            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                                    }`}
                                >
                                    {curr}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chart Body */}
            {!hasDataForCurrency ? (
                /* Empty state for selected currency */
                <div className="flex h-72 sm:h-80 w-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800">
                    <div className="rounded-full bg-zinc-100 p-3 text-zinc-400 dark:bg-zinc-800/80 dark:text-zinc-500">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Nenhuma despesa em {selectedCurrency}
                    </p>
                    <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                        Cadastre ou ative assinaturas nesta moeda para visualizar o gráfico de fluxo de caixa futuro.
                    </p>
                </div>
            ) : (
                <div className="h-72 sm:h-80 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                        {chartMode === 'area' ? (
                            <AreaChart
                                data={projectionData}
                                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                            >
                                <defs>
                                    {/* Active Emerald Gradient */}
                                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                                        <stop offset="60%" stopColor="#10b981" stopOpacity={0.12} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                                    </linearGradient>

                                    {/* Paused Slate Gradient */}
                                    <linearGradient id="slateGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.35} />
                                        <stop offset="60%" stopColor="#94a3b8" stopOpacity={0.10} />
                                        <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="currentColor"
                                    opacity={0.1}
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={{ stroke: '#71717a', opacity: 0.2 }}
                                    tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
                                    dy={6}
                                />

                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#71717a', fontSize: 11 }}
                                    tickFormatter={(val) => formatShort(val, selectedCurrency)}
                                    width={45}
                                />

                                <Tooltip content={<CustomGlassmorphicTooltip currency={selectedCurrency} />} />
                                <Legend content={<CustomLegend />} />

                                {averageMonthlyRunRate > 0 && (
                                    <ReferenceLine
                                        y={averageMonthlyRunRate}
                                        stroke="#10b981"
                                        strokeDasharray="4 4"
                                        strokeWidth={1.5}
                                        label={{
                                            value: `Média: ${formatShort(averageMonthlyRunRate, selectedCurrency)}`,
                                            position: 'insideTopRight',
                                            fill: '#10b981',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            offset: 6,
                                        }}
                                    />
                                )}

                                {/* Stacked Series: Active on bottom, Paused on top */}
                                <Area
                                    type="monotone"
                                    dataKey="active"
                                    name="Ativas"
                                    stackId="expenditure"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fill="url(#emeraldGradient)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="paused"
                                    name="Pausadas"
                                    stackId="expenditure"
                                    stroke="#94a3b8"
                                    strokeWidth={2}
                                    strokeDasharray="4 2"
                                    fill="url(#slateGradient)"
                                />
                            </AreaChart>
                        ) : (
                            <BarChart
                                data={projectionData}
                                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="currentColor"
                                    opacity={0.1}
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={{ stroke: '#71717a', opacity: 0.2 }}
                                    tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
                                    dy={6}
                                />

                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#71717a', fontSize: 11 }}
                                    tickFormatter={(val) => formatShort(val, selectedCurrency)}
                                    width={45}
                                />

                                <Tooltip content={<CustomGlassmorphicTooltip currency={selectedCurrency} />} />
                                <Legend content={<CustomLegend />} />

                                {averageMonthlyRunRate > 0 && (
                                    <ReferenceLine
                                        y={averageMonthlyRunRate}
                                        stroke="#10b981"
                                        strokeDasharray="4 4"
                                        strokeWidth={1.5}
                                        label={{
                                            value: `Média: ${formatShort(averageMonthlyRunRate, selectedCurrency)}`,
                                            position: 'insideTopRight',
                                            fill: '#10b981',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            offset: 6,
                                        }}
                                    />
                                )}

                                {/* Stacked Bars */}
                                <Bar
                                    dataKey="active"
                                    name="Ativas"
                                    stackId="expenditure"
                                    fill="#10b981"
                                    radius={[0, 0, 0, 0]}
                                />
                                <Bar
                                    dataKey="paused"
                                    name="Pausadas"
                                    stackId="expenditure"
                                    fill="#64748b"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
```

---

## 4. Design of `FinancialAnalyticsSection.jsx`

### 4.1 Master Container Responsibilities
1. **Master Currency Controller**: Maintains `selectedCurrency` state (`BRL`, `USD`, `EUR`). Automatically selects the primary active currency if the user only has foreign subscriptions.
2. **Synchronized State Propagation**: Passes `selectedCurrency` to both `CategorySpendingDonutChart` and `MonthlyExpenditureProjectionChart`. Both charts update immediately when currency changes.
3. **Cosmic Section Header**:
   - Title: "Inteligência Financeira" with cosmic Sparkle icon.
   - Subtitle: "Detalhamento de gastos por categoria e fluxo de caixa projetado".
   - Segmented Currency Tabs: `BRL (R$)`, `USD ($)`, `EUR (€)` with count of active subscriptions for each.
   - Monthly Run-Rate Pill: Shows total active monthly spend for the selected currency.
4. **Responsive Grid**:
   - `grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch`.
   - Donut Chart: `lg:col-span-5` (ideal for round proportions and centered metric).
   - Projection Chart: `lg:col-span-7` (broad width for 6-12 month horizontal time series).

### 4.2 Full Proposed Implementation

```jsx
import React, { useState, useMemo } from 'react';
import CategorySpendingDonutChart from '@/Components/Charts/CategorySpendingDonutChart';
import MonthlyExpenditureProjectionChart from '@/Components/Charts/MonthlyExpenditureProjectionChart';
import { SparkleIcon } from '@/Components/Icons';
import { formatCurrency } from '@/Utils/financialProjections';

function defaultFormatCurrency(amount, currency = 'BRL') {
    const num = Number(amount) || 0;
    try {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency || 'BRL',
        }).format(num);
    } catch {
        return `${currency} ${num.toFixed(2)}`;
    }
}

export default function FinancialAnalyticsSection({
    subscriptions = [],
    categories = [],
    defaultCurrency = 'BRL',
    className = '',
}) {
    // Determine currency counts for badges
    const currencyStats = useMemo(() => {
        const stats = {
            BRL: { active: 0, paused: 0, totalMonthly: 0 },
            USD: { active: 0, paused: 0, totalMonthly: 0 },
            EUR: { active: 0, paused: 0, totalMonthly: 0 },
        };

        subscriptions.forEach((sub) => {
            const curr = sub.currency || 'BRL';
            if (!stats[curr]) stats[curr] = { active: 0, paused: 0, totalMonthly: 0 };

            const monthlyPrice = Number(
                sub.monthly_equivalent_price ??
                (sub.billing_cycle === 'yearly' ? sub.price / 12 : sub.price) ??
                0
            );

            if (sub.status === 'active') {
                stats[curr].active += 1;
                stats[curr].totalMonthly += monthlyPrice;
            } else if (sub.status === 'paused') {
                stats[curr].paused += 1;
            }
        });

        return stats;
    }, [subscriptions]);

    // Auto-select initial currency intelligently
    const initialCurrency = useMemo(() => {
        if (currencyStats[defaultCurrency]?.active > 0) return defaultCurrency;
        for (const curr of ['BRL', 'USD', 'EUR']) {
            if (currencyStats[curr]?.active > 0) return curr;
        }
        return defaultCurrency;
    }, [currencyStats, defaultCurrency]);

    const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency);

    const formatter = typeof formatCurrency === 'function' ? formatCurrency : defaultFormatCurrency;
    const currentActiveTotal = currencyStats[selectedCurrency]?.totalMonthly || 0;

    return (
        <section
            aria-label="Análise Financeira"
            className={`space-y-4 ${className}`}
        >
            {/* Section Header */}
            <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400">
                        <SparkleIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                            Inteligência Financeira
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Detalhamento por categoria e fluxo de caixa projetado
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Active Run-Rate Metric Badge */}
                    <div className="hidden sm:flex flex-col items-end pr-2 border-r border-zinc-200 dark:border-zinc-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Total Mensal Ativo
                        </span>
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                            {formatter(currentActiveTotal, selectedCurrency)}
                        </span>
                    </div>

                    {/* Master Currency Switcher Pills */}
                    <div className="inline-flex items-center rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                        {[
                            { code: 'BRL', label: 'BRL', symbol: 'R$' },
                            { code: 'USD', label: 'USD', symbol: '$' },
                            { code: 'EUR', label: 'EUR', symbol: '€' },
                        ].map((curr) => {
                            const isSelected = selectedCurrency === curr.code;
                            const count = currencyStats[curr.code]?.active || 0;

                            return (
                                <button
                                    key={curr.code}
                                    type="button"
                                    onClick={() => setSelectedCurrency(curr.code)}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        isSelected
                                            ? 'bg-emerald-500 text-white shadow-xs'
                                            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                                    }`}
                                >
                                    <span>{curr.label}</span>
                                    {count > 0 && (
                                        <span
                                            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                                                isSelected
                                                    ? 'bg-emerald-600/60 text-white'
                                                    : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                                            }`}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Responsive Charts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
                {/* Left: Category Spending Donut Chart (5 cols) */}
                <div className="lg:col-span-5 flex flex-col">
                    <CategorySpendingDonutChart
                        subscriptions={subscriptions}
                        selectedCurrency={selectedCurrency}
                    />
                </div>

                {/* Right: Monthly Expenditure Projection Chart (7 cols) */}
                <div className="lg:col-span-7 flex flex-col">
                    <MonthlyExpenditureProjectionChart
                        subscriptions={subscriptions}
                        selectedCurrency={selectedCurrency}
                        onCurrencyChange={setSelectedCurrency}
                    />
                </div>
            </div>
        </section>
    );
}
```

---

## 5. Dashboard Integration Specification (`Dashboard.jsx`)

### 5.1 Mount Location
The exact target mount point is located in `resources/js/Pages/Dashboard.jsx` at line 588–594:

```jsx
// BEFORE:
{/* Tier 3: Financial Analytics Section Container (Milestone 3 Mount Point) */}
<motion.div
    variants={cardVariants}
    id="financial-analytics-section"
    className="w-full"
>
    {/* Milestone 3 will inject <FinancialAnalyticsSection subscriptions={subscriptions} /> here */}
</motion.div>
```

```jsx
// AFTER:
{/* Tier 3: Financial Analytics Section Container (Milestone 3 Mount Point) */}
<motion.div
    variants={cardVariants}
    id="financial-analytics-section"
    className="w-full"
>
    <FinancialAnalyticsSection
        subscriptions={subscriptions}
        categories={categories}
    />
</motion.div>
```

### 5.2 Required Import at the Top of `Dashboard.jsx`:
```jsx
import FinancialAnalyticsSection from '@/Components/Charts/FinancialAnalyticsSection';
```

### 5.3 Animation Coordination
Because the `#financial-analytics-section` wrapper is already styled as:
```jsx
<motion.div variants={cardVariants} id="financial-analytics-section" className="w-full">
```
it participates natively in the parent `containerVariants` staggered entrance reveal (stagger delay: `0.08s`). When `shouldReduceMotion` is active, it reveals instantaneously with zero transition delay, ensuring full accessibility compliance (WCAG 2.1).

---

## 6. Edge Cases & Resilience Strategy

| Edge Case | Potential Failure Mode | Designed Mitigation |
|:---|:---|:---|
| Zero subscriptions in system | Chart crashes or displays broken NaN axes | Component renders an elegant dashed placeholder card prompting user to create their first subscription. |
| No subscriptions in selected currency | User selects `USD` when they only own `BRL` | Displays friendly empty state: `"Nenhuma despesa em USD"`, guiding user to add USD subscriptions or switch back. |
| Mixed billing cycles (yearly vs monthly) | Spikes or missing months in projections | Functional projection engine maps yearly renewals strictly to their recurring calendar month while maintaining a consistent horizontal run-rate reference line. |
| Overdue billing date | Past date crashes `new Date(item.next_billing_date)` | Safe date parsing with default fallback to current month prevents any unhandled exceptions. |
| Resize layout loops | Recharts `ResponsiveContainer` triggering infinite re-render loops | Enforced explicit `min-h` on parent container (`h-72 sm:h-80 w-full min-w-0`) and `minWidth={0}`, `debounce={50}` on `ResponsiveContainer`. |
| Division by zero in run-rate | Empty projection array results in `0 / 0 = NaN` | Guard condition `projectionData.length === 0 ? 0 : ...` ensures safe mathematical calculation. |
| Dark mode transitions | Axis labels or tooltip invisible against dark background | All SVG text, tooltips, cards, and grid strokes use Tailwind dark mode tokens (`dark:text-zinc-400`, `dark:bg-zinc-900/95`, `dark:border-zinc-700/80`). |

---

## 7. Verification Method

Once implemented, the following verification commands must be executed within the Laravel Sail Docker container:

```bash
# 1. Backend PHPUnit test suite (must remain 100% passing - 87 tests, 864 assertions)
docker compose exec -T laravel.test php artisan test

# 2. Laravel Pint code formatting check
docker compose exec -T laravel.test ./vendor/bin/pint --test

# 3. Frontend production asset build (must build cleanly with 0 errors)
docker compose exec -T laravel.test npm run build
```
