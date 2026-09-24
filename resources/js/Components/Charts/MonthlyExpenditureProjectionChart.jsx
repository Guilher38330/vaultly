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
    calculateAmortizedRunRate,
    formatCurrency,
    formatShortCurrency,
} from '@/Utils/financialProjections';

/**
 * Fallback currency formatters if utility is unavailable.
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
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'R$';
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
                    Média Mensal
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

    // Average run-rate calculation (normalized monthly run-rate or horizon average)
    const averageMonthlyRunRate = useMemo(() => {
        if (!projectionData || projectionData.length === 0) return 0;
        if (typeof calculateAmortizedRunRate === 'function') {
            const runRate = calculateAmortizedRunRate(subscriptions, selectedCurrency);
            if (runRate.activeRunRate > 0) {
                return runRate.activeRunRate;
            }
        }
        const totalActive = projectionData.reduce((acc, curr) => acc + (Number(curr.active) || 0), 0);
        return Math.round((totalActive / projectionData.length) * 100) / 100;
    }, [subscriptions, selectedCurrency, projectionData]);

    // Check if any subscriptions exist in selected currency
    const hasDataForCurrency = useMemo(() => {
        const targetCurr = selectedCurrency?.toUpperCase();
        return (subscriptions || []).some((s) => s.currency?.toUpperCase() === targetCurr);
    }, [subscriptions, selectedCurrency]);

    const formatShort = typeof formatShortCurrency === 'function' ? formatShortCurrency : defaultFormatShortCurrency;

    return (
        <div
            className={`flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
            role="region"
            aria-label={`Projeção de despesas recorrentes em ${selectedCurrency}`}
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
                                    width={48}
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
                                    width={48}
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
