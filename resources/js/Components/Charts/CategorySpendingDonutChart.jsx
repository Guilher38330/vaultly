import React, { useState, useMemo, useCallback } from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Sector,
} from 'recharts';
import { useReducedMotion } from 'framer-motion';
import { SparkleIcon } from '@/Components/Icons';
import {
    calculateCategoryBreakdown,
    formatCurrency,
    COSMIC_PALETTE,
} from '@/Utils/financialProjections';

/**
 * Fallback currency formatter if utility is unavailable.
 */
function formatMoney(amount, currency = 'BRL') {
    if (typeof formatCurrency === 'function') {
        return formatCurrency(amount, currency);
    }
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



/**
 * Active shape renderer for interactive slice expansion on hover.
 */
const renderActiveSector = (props) => {
    const {
        cx,
        cy,
        innerRadius,
        outerRadius,
        startAngle,
        endAngle,
        fill,
    } = props;

    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius - 3}
                outerRadius={outerRadius + 5}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                cornerRadius={6}
                className="filter drop-shadow-[0_0_10px_rgba(16,185,129,0.35)] transition-all duration-300"
            />
        </g>
    );
};

/**
 * CategorySpendingDonutChart Component
 *
 * Displays a Recharts donut chart with active category spending breakdown,
 * interactive legend, center metric, and empty state.
 */
export default function CategorySpendingDonutChart({
    subscriptions = [],
    selectedCurrency = 'BRL',
    categoryData = null,
    totalSpend = null,
    onSelectCategory,
    className = '',
}) {
    const [activeIndex, setActiveIndex] = useState(null);
    const shouldReduceMotion = useReducedMotion();

    // Memoize category breakdown data
    const { data, totalMonthly } = useMemo(() => {
        if (categoryData && totalSpend !== null) {
            return { data: categoryData, totalMonthly: totalSpend };
        }
        if (typeof calculateCategoryBreakdown === 'function') {
            try {
                return calculateCategoryBreakdown(subscriptions, selectedCurrency);
            } catch (err) {
                console.warn('Error in calculateCategoryBreakdown:', err);
            }
        }
        return { data: [], totalMonthly: 0 };
    }, [subscriptions, selectedCurrency, categoryData, totalSpend]);

    const activeItem = activeIndex !== null && data && data[activeIndex] ? data[activeIndex] : null;
    const hasData = Boolean(data && data.length > 0 && totalMonthly > 0);

    const handlePieEnter = useCallback((_, index) => {
        setActiveIndex(index);
    }, []);

    const handlePieLeave = useCallback(() => {
        setActiveIndex(null);
    }, []);

    const handleLegendClick = useCallback((item) => {
        if (typeof onSelectCategory === 'function') {
            onSelectCategory(item.name);
        }
    }, [onSelectCategory]);

    return (
        <div
            className={`flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
            role="region"
            aria-label={`Distribuição de gastos por categoria em ${selectedCurrency}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Gastos por Categoria
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Proporção mensal de assinaturas ativas ({selectedCurrency})
                    </p>
                </div>
                {hasData && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {data.length} {data.length === 1 ? 'categoria' : 'categorias'}
                    </span>
                )}
            </div>

            {/* Zero-Data Empty State */}
            {!hasData ? (
                <div className="flex flex-col items-center justify-center py-8 text-center min-h-[280px]">
                    <div className="relative flex items-center justify-center mb-4">
                        {/* Dashed Cosmic Ring */}
                        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                            <circle
                                cx="50"
                                cy="50"
                                r="38"
                                className="stroke-zinc-200 dark:stroke-zinc-800"
                                strokeWidth="7"
                                fill="none"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="38"
                                className="stroke-emerald-500/40 dark:stroke-emerald-500/30"
                                strokeWidth="7"
                                strokeDasharray="4 7"
                                strokeLinecap="round"
                                fill="none"
                            />
                        </svg>
                        {/* Center Icon & Zero Stat */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <SparkleIcon className="w-5 h-5 text-emerald-500/70 dark:text-emerald-400/70 mb-1" />
                            <span className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500">
                                {formatMoney(0, selectedCurrency)}
                            </span>
                        </div>
                    </div>
                    <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Sem gastos ativos em {selectedCurrency}
                    </h4>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-[220px]">
                        Ative assinaturas ou cadastre uma nova para visualizar a divisão por categoria.
                    </p>
                </div>
            ) : (
                <>
                    {/* Chart Container with absolute centered hole stat */}
                    <div className="relative w-full h-[280px] min-h-[280px] min-w-0 flex items-center justify-center my-1">
                        <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={280}>
                            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>

                                <Pie
                                    data={data}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={68}
                                    outerRadius={96}
                                    paddingAngle={3}
                                    cornerRadius={6}
                                    startAngle={90}
                                    endAngle={-270}
                                    stroke="none"
                                    activeIndex={activeIndex}
                                    activeShape={renderActiveSector}
                                    onMouseEnter={handlePieEnter}
                                    onMouseLeave={handlePieLeave}
                                    onClick={(_, index) => {
                                        if (data[index]) handleLegendClick(data[index]);
                                    }}
                                    isAnimationActive={!shouldReduceMotion}
                                    animationDuration={shouldReduceMotion ? 0 : 800}
                                    animationEasing="ease-out"
                                >
                                    {data.map((entry, index) => {
                                        const isDimmed = activeIndex !== null && activeIndex !== index;
                                        return (
                                            <Cell
                                                key={`cell-${entry.name}-${index}`}
                                                fill={entry.color}
                                                opacity={isDimmed ? 0.35 : 1}
                                                className="transition-opacity duration-200 cursor-pointer outline-none"
                                            />
                                        );
                                    })}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Donut Hole Center Statistic Display */}
                        <div
                            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-2 select-none"
                            aria-live="polite"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 transition-colors truncate px-2 max-w-[120px]">
                                {activeItem ? activeItem.name : 'Total Ativo'}
                            </span>
                            <span className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 transition-all">
                                {formatMoney(activeItem ? activeItem.value : totalMonthly, selectedCurrency)}
                            </span>
                            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                {activeItem ? (
                                    <span className="flex flex-col items-center gap-0.5">
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            {activeItem.percentage}% do total
                                        </span>
                                        {activeItem.count !== undefined && (
                                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                                {activeItem.count} {activeItem.count === 1 ? 'assinatura ativa' : 'assinaturas ativas'}
                                            </span>
                                        )}
                                    </span>
                                ) : (
                                    '/mês'
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Interactive Category Legend */}
                    <div
                        className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800/80"
                        role="list"
                        aria-label="Legenda de categorias"
                    >
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 focus:outline-none scrollbar-thin">
                            {data.map((item, index) => {
                                const isActive = activeIndex === index;
                                const isDimmed = activeIndex !== null && !isActive;

                                return (
                                    <button
                                        key={`legend-${item.name}`}
                                        type="button"
                                        onClick={() => handleLegendClick(item)}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onMouseLeave={() => setActiveIndex(null)}
                                        onFocus={() => setActiveIndex(index)}
                                        onBlur={() => setActiveIndex(null)}
                                        className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-zinc-900 ${
                                            isActive
                                                ? 'bg-zinc-100/90 ring-1 ring-emerald-500/50 shadow-xs dark:bg-zinc-800/90'
                                                : isDimmed
                                                  ? 'opacity-40 hover:opacity-100'
                                                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                        }`}
                                        role="listitem"
                                        aria-pressed={isActive}
                                        aria-label={`${item.name}: ${formatMoney(item.value, selectedCurrency)} ao mês, ${item.percentage} por cento`}
                                    >
                                        {/* Left: Indicator dot + Category Name */}
                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <span
                                                className="h-2 w-2 rounded-full shrink-0 ring-2 ring-white dark:ring-zinc-900 transition-transform"
                                                style={{
                                                    backgroundColor: item.color,
                                                    transform: isActive ? 'scale(1.3)' : 'scale(1)',
                                                }}
                                            />
                                            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                                {item.name}
                                            </span>
                                            {item.count > 1 && (
                                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                                    ({item.count})
                                                </span>
                                            )}
                                        </div>

                                        {/* Right: Percentage Badge & Monthly Value */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                                {item.percentage}%
                                            </span>
                                            <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                                {formatMoney(item.value, selectedCurrency)}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
