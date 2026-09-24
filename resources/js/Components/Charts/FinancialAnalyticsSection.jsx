import React, { useState, useMemo } from 'react';
import CategorySpendingDonutChart from '@/Components/Charts/CategorySpendingDonutChart';
import MonthlyExpenditureProjectionChart from '@/Components/Charts/MonthlyExpenditureProjectionChart';
import { SparkleIcon } from '@/Components/Icons';
import { formatCurrency, getMonthlyEquivalentPrice } from '@/Utils/financialProjections';

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
    // Determine currency stats and counts for header pills
    const currencyStats = useMemo(() => {
        const stats = {
            BRL: { active: 0, paused: 0, totalMonthly: 0 },
            USD: { active: 0, paused: 0, totalMonthly: 0 },
            EUR: { active: 0, paused: 0, totalMonthly: 0 },
        };

        (subscriptions || []).forEach((sub) => {
            if (!sub || typeof sub !== 'object') return;
            const curr = typeof sub.currency === 'string' && sub.currency.trim()
                ? sub.currency.trim().toUpperCase()
                : 'BRL';

            if (!stats[curr]) {
                stats[curr] = { active: 0, paused: 0, totalMonthly: 0 };
            }

            const monthlyPrice = typeof getMonthlyEquivalentPrice === 'function'
                ? getMonthlyEquivalentPrice(sub)
                : Number(sub.monthly_equivalent_price ?? (sub.billing_cycle === 'yearly' ? sub.price / 12 : sub.price) ?? 0);

            if (sub.status === 'active') {
                stats[curr].active += 1;
                stats[curr].totalMonthly += monthlyPrice;
            } else if (sub.status === 'paused') {
                stats[curr].paused += 1;
            }
        });

        return stats;
    }, [subscriptions]);

    // Auto-select initial currency intelligently based on available active data
    const initialCurrency = useMemo(() => {
        const targetDefault = defaultCurrency?.toUpperCase() || 'BRL';
        if (currencyStats[targetDefault]?.active > 0) return targetDefault;
        for (const curr of ['BRL', 'USD', 'EUR']) {
            if (currencyStats[curr]?.active > 0) return curr;
        }
        return targetDefault;
    }, [currencyStats, defaultCurrency]);

    const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency);

    const formatter = typeof formatCurrency === 'function' ? formatCurrency : defaultFormatCurrency;
    const currentActiveTotal = currencyStats[selectedCurrency]?.totalMonthly || 0;

    return (
        <section
            aria-label="Inteligência Financeira"
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
                <div className="lg:col-span-5 flex flex-col min-w-0">
                    <CategorySpendingDonutChart
                        subscriptions={subscriptions}
                        selectedCurrency={selectedCurrency}
                        className="h-full"
                    />
                </div>

                {/* Right: Monthly Expenditure Projection Chart (7 cols) */}
                <div className="lg:col-span-7 flex flex-col min-w-0">
                    <MonthlyExpenditureProjectionChart
                        subscriptions={subscriptions}
                        selectedCurrency={selectedCurrency}
                        onCurrencyChange={setSelectedCurrency}
                        className="h-full"
                    />
                </div>
            </div>
        </section>
    );
}
