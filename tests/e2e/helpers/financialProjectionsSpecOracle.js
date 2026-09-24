/**
 * Authoritative Specification Oracle: Financial Analytics Calculation Engine
 * 
 * Derived strictly from:
 * - ORIGINAL_REQUEST.md §R1
 * - PROJECT.md §Interface Contracts
 * - TEST_INFRA.md §Feature Inventory (Items 1 & 2)
 */

export const COSMIC_PALETTE = {
  'Streaming': '#10b981',
  'Trabalho': '#34d399',
  'Educação': '#14b8a6',
  'Música': '#06b6d4',
  'Jogos': '#059669',
  'Saúde': '#6ee7b7',
  'Finanças': '#0f766e',
  'Cloud': '#047857',
  default: [
    '#10b981', '#34d399', '#14b8a6', '#06b6d4', '#059669',
    '#6ee7b7', '#0f766e', '#047857', '#8b5cf6', '#0ea5e9'
  ]
};

const MONTH_LABELS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Normalizes monthly equivalent price for a subscription.
 */
export function getMonthlyEquivalentPrice(sub) {
  if (sub.monthly_equivalent_price !== undefined && sub.monthly_equivalent_price !== null) {
    return Number(sub.monthly_equivalent_price);
  }
  const price = Number(sub.price || 0);
  if (sub.billing_cycle === 'yearly') {
    return Math.round((price / 12) * 100) / 100;
  }
  return price;
}

/**
 * Calculates spending breakdown grouped by category for a specific currency.
 *
 * @param {Array} subscriptions
 * @param {string} currency - 'BRL' | 'USD' | 'EUR'
 * @returns {{ data: Array<{ name: string, value: number, percentage: number, color: string, count: number }>, totalMonthly: number }}
 */
export function calculateCategoryBreakdown(subscriptions = [], currency = 'BRL') {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return { data: [], totalMonthly: 0 };
  }

  // Filter to active subscriptions matching target currency
  const activeSubs = subscriptions.filter(
    (s) => s.status === 'active' && s.currency === currency
  );

  if (activeSubs.length === 0) {
    return { data: [], totalMonthly: 0 };
  }

  // Aggregate amounts and counts by category
  const categoryMap = new Map();
  let totalMonthlyRaw = 0;

  for (const sub of activeSubs) {
    const monthlyVal = getMonthlyEquivalentPrice(sub);
    totalMonthlyRaw += monthlyVal;

    const catName = sub.category || 'Outros';
    const current = categoryMap.get(catName) || { amount: 0, count: 0 };
    current.amount += monthlyVal;
    current.count += 1;
    categoryMap.set(catName, current);
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

    let color = COSMIC_PALETTE[name];
    if (!color) {
      color = COSMIC_PALETTE.default[defaultColorIndex % COSMIC_PALETTE.default.length];
      defaultColorIndex++;
    }

    data.push({
      name,
      value: roundedValue,
      percentage,
      color,
      count: stats.count
    });
  }

  // Sort descending by value
  data.sort((a, b) => b.value - a.value);

  return { data, totalMonthly };
}

/**
 * Projects monthly expenditures over a forward horizon (e.g. 6 to 12 months).
 * Separates active vs paused commitments and accounts for calendar renewal occurrences.
 *
 * @param {Array} subscriptions
 * @param {string} currency - 'BRL' | 'USD' | 'EUR'
 * @param {number} monthsCount - Horizon length (default 12)
 * @param {Date} [referenceDate] - Baseline start date (defaults to current date)
 * @returns {Array<{ month: string, fullMonth: string, active: number, paused: number, total: number, activeItemsCount: number, renewalsList: string[] }>}
 */
export function calculateMonthlyProjections(
  subscriptions = [],
  currency = 'BRL',
  monthsCount = 12,
  referenceDate = new Date()
) {
  if (!Array.isArray(subscriptions) || monthsCount <= 0) {
    return [];
  }

  const horizon = Math.max(1, Math.min(36, Number(monthsCount) || 12));
  const baseDate = referenceDate instanceof Date && !isNaN(referenceDate)
    ? referenceDate
    : new Date();

  const startYear = baseDate.getFullYear();
  const startMonthIndex = baseDate.getMonth();

  const filteredSubs = subscriptions.filter((s) => s.currency === currency);

  const projections = [];

  for (let k = 0; k < horizon; k++) {
    const totalMonthIndex = startMonthIndex + k;
    const targetYear = startYear + Math.floor(totalMonthIndex / 12);
    const targetMonthIndex = totalMonthIndex % 12;

    const shortYear = String(targetYear).slice(-2);
    const monthLabel = `${MONTH_LABELS_PT[targetMonthIndex]}/${shortYear}`;
    const fullMonth = `${MONTH_LABELS_PT[targetMonthIndex]} de ${targetYear}`;

    let activeRaw = 0;
    let pausedRaw = 0;
    let activeItemsCount = 0;
    const renewalsList = [];

    for (const sub of filteredSubs) {
      const price = Number(sub.price || 0);
      const isMonthly = sub.billing_cycle === 'monthly';
      const isYearly = sub.billing_cycle === 'yearly';

      let appliesThisMonth = false;

      if (isMonthly) {
        appliesThisMonth = true;
      } else if (isYearly && sub.next_billing_date) {
        // Parse billing date in UTC or local
        const dateParts = String(sub.next_billing_date).split('-');
        if (dateParts.length === 3) {
          const billingMonth = parseInt(dateParts[1], 10) - 1;
          if (billingMonth === targetMonthIndex) {
            appliesThisMonth = true;
            renewalsList.push(sub.name);
          }
        }
      }

      if (appliesThisMonth) {
        if (sub.status === 'active') {
          activeRaw += price;
          activeItemsCount++;
        } else if (sub.status === 'paused') {
          pausedRaw += price;
        }
      }
    }

    const active = Math.round(activeRaw * 100) / 100;
    const paused = Math.round(pausedRaw * 100) / 100;
    const total = Math.round((active + paused) * 100) / 100;

    projections.push({
      month: monthLabel,
      fullMonth,
      active,
      paused,
      total,
      activeItemsCount,
      renewalsList
    });
  }

  return projections;
}
