/**
 * Vaultly / AuraSpace Financial Analytics Calculation Engine
 * 
 * Pure functional utilities for calculating category spending breakdowns,
 * multi-currency monthly cash-flow projections (6-36m), amortized run-rates,
 * and currency formatters.
 * 
 * Target: resources/js/Utils/financialProjections.js
 */

export const CATEGORY_PALETTE = {
    'Streaming': '#10b981',
    'Trabalho': '#34d399',
    'Educação': '#14b8a6',
    'Música': '#06b6d4',
    'Jogos': '#059669',
    'Saúde': '#6ee7b7',
    'Finanças': '#0f766e',
    'Cloud': '#047857',
    'Nuvem': '#047857',
    'Segurança': '#34d399',
    'Produtividade': '#14b8a6',
    'Outros': '#8b5cf6',
};

const DEFAULT_COSMIC_COLORS = [
    '#10b981', // Emerald 500
    '#34d399', // Mint / Emerald 400
    '#14b8a6', // Teal 500
    '#06b6d4', // Cyan 500
    '#059669', // Jade / Emerald 600
    '#6ee7b7', // Mint 300
    '#0f766e', // Teal 700
    '#047857', // Emerald 700
    '#8b5cf6', // Violet 500
    '#0ea5e9', // Sky 500
];

/**
 * COSMIC_PALETTE: Hybrid array & category dictionary.
 * Supports:
 * - Array access: COSMIC_PALETTE[0], COSMIC_PALETTE.length, COSMIC_PALETTE.map()
 * - Category dictionary: COSMIC_PALETTE['Streaming'], COSMIC_PALETTE['Trabalho']
 * - Default list: COSMIC_PALETTE.default
 */
export const COSMIC_PALETTE = Object.assign(
    [...DEFAULT_COSMIC_COLORS],
    {
        ...CATEGORY_PALETTE,
        default: DEFAULT_COSMIC_COLORS,
    }
);

const MONTH_LABELS_PT = [
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
 * Normalizes monthly equivalent price for a subscription.
 */
export function getMonthlyEquivalentPrice(sub) {
    if (!sub || typeof sub !== 'object') {
        return 0;
    }
    if (sub.monthly_equivalent_price !== undefined && sub.monthly_equivalent_price !== null) {
        const val = Number(sub.monthly_equivalent_price);
        return Number.isFinite(val) && val >= 0 ? val : 0;
    }
    const rawPrice = Number(sub.price || 0);
    const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
    if (sub.billing_cycle === 'yearly') {
        return Math.round((price / 12) * 100) / 100;
    }
    return price;
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
 * Short currency format alias for chart ticks.
 */
export const formatShortCurrency = formatCompactCurrency;

/**
 * Resolves color for a category from CATEGORY_PALETTE or COSMIC_PALETTE.
 */
export function getCategoryColor(category, index = 0) {
    if (category && typeof category === 'string') {
        const trimmed = category.trim();
        if (CATEGORY_PALETTE[trimmed]) {
            return CATEGORY_PALETTE[trimmed];
        }
        if (COSMIC_PALETTE[trimmed]) {
            return COSMIC_PALETTE[trimmed];
        }
    }
    return COSMIC_PALETTE.default[index % COSMIC_PALETTE.default.length];
}

/**
 * Calculates category spending breakdown for active subscriptions in target currency.
 *
 * @param {Array} subscriptions
 * @param {string} currency - 'BRL' | 'USD' | 'EUR'
 * @returns {{ data: Array<{ name: string, value: number, percentage: number, color: string, count: number }>, totalMonthly: number }}
 */
export function calculateCategoryBreakdown(subscriptions = [], currency = 'BRL') {
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
        return { data: [], totalMonthly: 0 };
    }

    const targetCurrency = typeof currency === 'string' && currency.trim()
        ? currency.trim().toUpperCase()
        : 'BRL';

    // Filter to active subscriptions matching target currency
    const activeSubs = subscriptions.filter((sub) => {
        if (!sub || typeof sub !== 'object') return false;
        if (sub.status !== 'active') return false;
        const subCurrency = typeof sub.currency === 'string' ? sub.currency.trim().toUpperCase() : 'BRL';
        return subCurrency === targetCurrency;
    });

    if (activeSubs.length === 0) {
        return { data: [], totalMonthly: 0 };
    }

    // Aggregate amounts and counts by category
    const categoryMap = new Map();
    let totalMonthlyRaw = 0;

    for (const sub of activeSubs) {
        const monthlyVal = getMonthlyEquivalentPrice(sub);
        totalMonthlyRaw += monthlyVal;

        const rawCat = typeof sub.category === 'string' && sub.category.trim()
            ? sub.category.trim()
            : 'Outros';

        const current = categoryMap.get(rawCat) || { amount: 0, count: 0 };
        current.amount += monthlyVal;
        current.count += 1;
        categoryMap.set(rawCat, current);
    }

    const totalMonthly = Math.round(totalMonthlyRaw * 100) / 100;

    // Convert to formatted data array
    const data = [];
    let defaultColorIndex = 0;

    for (const [name, stats] of categoryMap.entries()) {
        const roundedValue = Math.round(stats.amount * 100) / 100;
        const percentage = totalMonthly > 0
            ? Math.round(((stats.amount / totalMonthly) * 100) * 10) / 10
            : 0;

        let color = CATEGORY_PALETTE[name] || COSMIC_PALETTE[name];
        if (!color) {
            color = COSMIC_PALETTE.default[defaultColorIndex % COSMIC_PALETTE.default.length];
            defaultColorIndex++;
        }

        data.push({
            name,
            value: roundedValue,
            percentage,
            color,
            count: stats.count,
        });
    }

    // Sort descending by value; tie-break alphabetically by name
    data.sort((a, b) => {
        if (b.value !== a.value) {
            return b.value - a.value;
        }
        return a.name.localeCompare(b.name);
    });

    return { data, totalMonthly };
}

/**
 * Calculates monthly cash-flow projections over a forward horizon (e.g. 6 to 36 months),
 * separating active from paused commitments.
 *
 * @param {Array} subscriptions
 * @param {string} currency - 'BRL' | 'USD' | 'EUR'
 * @param {number} monthsCount - Horizon length (default 6)
 * @param {Date|Object} referenceDate - Baseline start date (or { baseDate: Date })
 * @returns {Array<{ month: string, fullMonth: string, dateKey: string, year: number, monthIndex: number, active: number, paused: number, total: number, activeItemsCount: number, activeCount: number, pausedCount: number, renewalsList: string[], renewals: Array }>}
 */
export function calculateMonthlyProjections(
    subscriptions = [],
    currency = 'BRL',
    monthsCount = 6,
    referenceDate = new Date()
) {
    if (!Array.isArray(subscriptions) || monthsCount <= 0) {
        return [];
    }

    const horizon = Math.max(1, Math.min(36, Number(monthsCount) || 6));

    let baseDate = new Date();
    if (referenceDate instanceof Date && !isNaN(referenceDate.getTime())) {
        baseDate = referenceDate;
    } else if (referenceDate && referenceDate.baseDate instanceof Date && !isNaN(referenceDate.baseDate.getTime())) {
        baseDate = referenceDate.baseDate;
    }

    const targetCurrency = typeof currency === 'string' && currency.trim()
        ? currency.trim().toUpperCase()
        : 'BRL';

    const startYear = baseDate.getFullYear();
    const startMonthIndex = baseDate.getMonth();

    const filteredSubs = subscriptions.filter((sub) => {
        if (!sub || typeof sub !== 'object') return false;
        const subCurrency = typeof sub.currency === 'string' ? sub.currency.trim().toUpperCase() : 'BRL';
        return subCurrency === targetCurrency;
    });

    const projections = [];

    for (let k = 0; k < horizon; k++) {
        const totalMonthIndex = startMonthIndex + k;
        const targetYear = startYear + Math.floor(totalMonthIndex / 12);
        const targetMonthIndex = totalMonthIndex % 12;

        const shortYear = String(targetYear).slice(-2);
        const monthLabel = `${MONTH_LABELS_PT[targetMonthIndex]}/${shortYear}`;
        const fullMonth = `${FULL_MONTHS_PT[targetMonthIndex]} de ${targetYear}`;
        const dateKey = `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}`;

        let activeRaw = 0;
        let pausedRaw = 0;
        let activeItemsCount = 0;
        let pausedItemsCount = 0;
        const renewalsList = [];
        const renewals = [];

        for (const sub of filteredSubs) {
            const rawPrice = Number(sub.price || 0);
            const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
            const isMonthly = sub.billing_cycle === 'monthly';
            const isYearly = sub.billing_cycle === 'yearly';

            let appliesThisMonth = false;

            if (isMonthly) {
                appliesThisMonth = true;
            } else if (isYearly && sub.next_billing_date) {
                const dateParts = String(sub.next_billing_date).trim().split('-');
                if (dateParts.length >= 2) {
                    const billingMonth = parseInt(dateParts[1], 10) - 1;
                    if (billingMonth === targetMonthIndex) {
                        appliesThisMonth = true;
                        renewalsList.push(sub.name);
                        renewals.push({
                            id: sub.id,
                            name: sub.name,
                            price,
                            billing_cycle: 'yearly',
                            category: sub.category || 'Outros',
                            status: sub.status,
                        });
                    }
                }
            }

            if (appliesThisMonth) {
                if (sub.status === 'active') {
                    activeRaw += price;
                    activeItemsCount++;
                } else if (sub.status === 'paused') {
                    pausedRaw += price;
                    pausedItemsCount++;
                }
            }
        }

        const active = Math.round(activeRaw * 100) / 100;
        const paused = Math.round(pausedRaw * 100) / 100;
        const total = Math.round((active + paused) * 100) / 100;

        projections.push({
            month: monthLabel,
            fullMonth,
            dateKey,
            year: targetYear,
            monthIndex: targetMonthIndex,
            active,
            paused,
            total,
            activeItemsCount,
            activeCount: activeItemsCount,
            pausedCount: pausedItemsCount,
            renewalsList,
            renewals,
        });
    }

    return projections;
}

/**
 * Computes normalized amortized monthly run-rate for active, paused, and total subscriptions.
 */
export function calculateAmortizedRunRate(subscriptions = [], currency = 'BRL') {
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

        const monthly = getMonthlyEquivalentPrice(sub);

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
 * Extracts distinct list of currencies present in subscription list.
 */
export function getAvailableCurrencies(subscriptions = []) {
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
    CATEGORY_PALETTE,
    parseDateParts,
    getMonthlyEquivalentPrice,
    formatCurrency,
    formatCompactCurrency,
    formatShortCurrency,
    getCategoryColor,
    calculateCategoryBreakdown,
    calculateMonthlyProjections,
    calculateAmortizedRunRate,
    getAvailableCurrencies,
};
