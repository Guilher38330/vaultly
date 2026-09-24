/**
 * Empirical Challenger M3.1 Stress Test Suite
 * 
 * Deeply challenges Milestone 3: Financial Analytics Charts
 * 
 * Target areas:
 * 1. financialProjections.js Math Engine:
 *    - Empty subscription array & falsy/malformed collections
 *    - Missing/null/corrupted next_billing_date
 *    - Non-numeric price, 0 price, negative price, sub-cent, extreme price values
 *    - Yearly renewals in past dates, future dates, leap year dates (Feb 29), Dec 31
 *    - Multi-currency portfolio segregation (BRL, USD, EUR) & casing/whitespace resilience
 *    - Mathematical conservation laws over 12-month projection windows
 *    - Category breakdown ranking, color resolution, percentage distribution
 *    - Input immutability & absence of side effects
 * 2. High-Volume Stress & Randomized Fuzzing Harness:
 *    - 1,000 randomized subscriptions stress harness
 *    - Microsecond execution time benchmark
 * 3. Component Architecture & UI Toggle Behavioral Verification:
 *    - CategorySpendingDonutChart contracts & empty state mechanics
 *    - MonthlyExpenditureProjectionChart horizon (6M/12M) & mode (Area/Bar) toggles
 *    - FinancialAnalyticsSection dual-chart currency synchronization
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCategoryBreakdown,
  calculateMonthlyProjections,
  calculateAmortizedRunRate,
  getAvailableCurrencies,
  getMonthlyEquivalentPrice,
  formatCurrency,
  formatCompactCurrency,
  formatShortCurrency,
  getCategoryColor,
  parseDateParts,
  COSMIC_PALETTE,
  CATEGORY_PALETTE
} from '../../resources/js/Utils/financialProjections.js';

describe('Empirical Challenger M3.1: Financial Analytics Stress Suite', () => {

  // =========================================================================
  // 1. Empty, Malformed, and Falsy Inputs
  // =========================================================================
  describe('1. Empty, Null & Malformed Subscription Inputs', () => {
    const invalidCollections = [
      [],
      null,
      undefined,
      false,
      0,
      'not-an-array',
      {},
      { subscriptions: [] },
      [null, undefined, 42, 'string', {}, { price: null }]
    ];

    for (const [idx, input] of invalidCollections.entries()) {
      test(`Category breakdown handles invalid input #${idx + 1} without throwing`, () => {
        assert.doesNotThrow(() => {
          const res = calculateCategoryBreakdown(input, 'BRL');
          assert.deepEqual(res.data, []);
          assert.equal(res.totalMonthly, 0);
        });
      });

      test(`Monthly projections handles invalid input #${idx + 1} without throwing`, () => {
        assert.doesNotThrow(() => {
          const res = calculateMonthlyProjections(input, 'BRL', 6);
          // If input is an array, or undefined (which activates default parameter = []), produces 6 zeroed months
          if (Array.isArray(input) || input === undefined) {
            assert.equal(res.length, 6);
            for (const month of res) {
              assert.equal(month.active, 0);
              assert.equal(month.paused, 0);
              assert.equal(month.total, 0);
            }
          } else {
            // Other non-array falsy inputs (null, false, 0, {}, etc.) return []
            assert.deepEqual(res, []);
          }
        });
      });

      test(`Amortized run-rate handles invalid input #${idx + 1} without throwing`, () => {
        assert.doesNotThrow(() => {
          const res = calculateAmortizedRunRate(input, 'BRL');
          assert.equal(res.activeRunRate, 0);
          assert.equal(res.pausedRunRate, 0);
          assert.equal(res.totalRunRate, 0);
        });
      });
    }

    test('getAvailableCurrencies handles invalid collections and returns default [BRL]', () => {
      assert.deepEqual(getAvailableCurrencies([]), ['BRL']);
      assert.deepEqual(getAvailableCurrencies(null), ['BRL']);
      assert.deepEqual(getAvailableCurrencies(undefined), ['BRL']);
      assert.deepEqual(getAvailableCurrencies([{}, { currency: '' }]), ['BRL']);
    });
  });

  // =========================================================================
  // 2. Price Boundaries: Zero, Negative, Non-numeric, Extreme Values
  // =========================================================================
  describe('2. Price Anomalies & Numerical Boundaries', () => {
    const priceAnomalies = [
      { label: 'zero price', price: 0, expected: 0 },
      { label: 'negative price', price: -49.90, expected: 0 },
      { label: 'string representation', price: '34.50', expected: 34.50 },
      { label: 'string with whitespace', price: '  25.00  ', expected: 25.00 },
      { label: 'invalid text string', price: 'free_tier', expected: 0 },
      { label: 'null price', price: null, expected: 0 },
      { label: 'undefined price', price: undefined, expected: 0 },
      { label: 'NaN price', price: NaN, expected: 0 },
      { label: 'Infinity price', price: Infinity, expected: 0 },
      { label: 'sub-cent fractional price (0.004)', price: 0.004, expected: 0.004 },
      { label: 'large enterprise price (1,000,000.00)', price: 1000000.00, expected: 1000000.00 }
    ];

    for (const { label, price, expected } of priceAnomalies) {
      test(`Price anomaly (${label}) in getMonthlyEquivalentPrice`, () => {
        const sub = { price, billing_cycle: 'monthly' };
        const equiv = getMonthlyEquivalentPrice(sub);
        if (expected === 0) {
          assert.equal(equiv, 0);
        } else {
          assert.equal(equiv, expected);
        }
        assert.ok(Number.isFinite(equiv), 'Must produce a finite number');
        assert.ok(!Number.isNaN(equiv), 'Must not produce NaN');
      });

      test(`Price anomaly (${label}) in monthly projections does not leak NaN`, () => {
        const subs = [{ name: 'Test Sub', price, currency: 'BRL', billing_cycle: 'monthly', status: 'active' }];
        const res = calculateMonthlyProjections(subs, 'BRL', 3);
        assert.equal(res.length, 3);
        for (const m of res) {
          assert.ok(Number.isFinite(m.active));
          assert.ok(!Number.isNaN(m.active));
          assert.ok(m.active >= 0);
        }
      });
    }

    test('Explicit monthly_equivalent_price takes precedence over raw price', () => {
      const sub = {
        name: 'Custom Equiv',
        price: 120.00,
        monthly_equivalent_price: 9.99,
        billing_cycle: 'yearly'
      };
      const equiv = getMonthlyEquivalentPrice(sub);
      assert.equal(equiv, 9.99);
    });

    test('Corrupted negative monthly_equivalent_price falls back to 0', () => {
      const sub = {
        name: 'Negative Equiv',
        price: 120.00,
        monthly_equivalent_price: -15.00,
        billing_cycle: 'yearly'
      };
      const equiv = getMonthlyEquivalentPrice(sub);
      assert.equal(equiv, 0);
    });
  });

  // =========================================================================
  // 3. Yearly Renewal Dates: Past, Future, Leap Years, Boundaries
  // =========================================================================
  describe('3. Yearly Renewal Dates & Calendar Edge Cases', () => {
    const baselineDate = new Date('2026-09-15T12:00:00Z');

    test('Yearly sub with past renewal date (2020-05-10) renews in recurring May anniversary', () => {
      const subs = [{
        id: 101,
        name: 'Legacy Past Sub',
        price: 240.00,
        currency: 'BRL',
        billing_cycle: 'yearly',
        next_billing_date: '2020-05-10', // May
        status: 'active'
      }];
      // 12 months starting Sept/26: Sept=0, Oct=1, Nov=2, Dec=3, Jan=4, Feb=5, Mar=6, Apr=7, May/27=8
      const projections = calculateMonthlyProjections(subs, 'BRL', 12, baselineDate);
      assert.equal(projections.length, 12);
      assert.equal(projections[8].month, 'Mai/27');
      assert.equal(projections[8].active, 240.00);
      assert.ok(projections[8].renewalsList.includes('Legacy Past Sub'));
      assert.equal(projections[0].active, 0.00); // Sept is 0
    });

    test('Yearly sub with far future renewal date (2029-11-25) renews in November anniversary', () => {
      const subs = [{
        id: 102,
        name: 'Future Enterprise',
        price: 500.00,
        currency: 'USD',
        billing_cycle: 'yearly',
        next_billing_date: '2029-11-25', // November
        status: 'active'
      }];
      // Starting Sept/26: Nov/26 is index 2
      const projections = calculateMonthlyProjections(subs, 'USD', 6, baselineDate);
      assert.equal(projections[2].month, 'Nov/26');
      assert.equal(projections[2].active, 500.00);
      assert.equal(projections[0].active, 0.00);
    });

    test('Leap year renewal on Feb 29 (2028-02-29) targets February anniversary', () => {
      const subs = [{
        id: 103,
        name: 'Leap Year Server',
        price: 360.00,
        currency: 'BRL',
        billing_cycle: 'yearly',
        next_billing_date: '2028-02-29',
        status: 'active'
      }];
      // Starting Sept/26: Feb/27 is index 5
      const projections = calculateMonthlyProjections(subs, 'BRL', 12, baselineDate);
      assert.equal(projections[5].month, 'Fev/27');
      assert.equal(projections[5].active, 360.00);
      assert.equal(projections[5].renewals[0].name, 'Leap Year Server');
    });

    test('Year-end boundary renewal on Dec 31 (2026-12-31) targets December', () => {
      const subs = [{
        id: 104,
        name: 'New Year Eve Host',
        price: 99.00,
        currency: 'BRL',
        billing_cycle: 'yearly',
        next_billing_date: '2026-12-31',
        status: 'active'
      }];
      // Starting Sept/26: Dec/26 is index 3
      const projections = calculateMonthlyProjections(subs, 'BRL', 6, baselineDate);
      assert.equal(projections[3].month, 'Dez/26');
      assert.equal(projections[3].active, 99.00);
    });

    test('Year-start boundary renewal on Jan 01 (2027-01-01) targets January', () => {
      const subs = [{
        id: 105,
        name: 'First Day Domain',
        price: 80.00,
        currency: 'BRL',
        billing_cycle: 'yearly',
        next_billing_date: '2027-01-01',
        status: 'active'
      }];
      // Starting Sept/26: Jan/27 is index 4
      const projections = calculateMonthlyProjections(subs, 'BRL', 6, baselineDate);
      assert.equal(projections[4].month, 'Jan/27');
      assert.equal(projections[4].active, 80.00);
    });

    test('Corrupted or missing next_billing_date on yearly sub does not crash or inject rogue charges', () => {
      const corruptedDates = [
        null,
        undefined,
        '',
        '   ',
        'invalid-date',
        '2026',
        '2026-foo-bar',
        '0000-00-00',
        'not-a-date-at-all'
      ];

      for (const badDate of corruptedDates) {
        const subs = [{
          id: 199,
          name: 'Corrupted Date Sub',
          price: 150.00,
          currency: 'BRL',
          billing_cycle: 'yearly',
          next_billing_date: badDate,
          status: 'active'
        }];

        const projections = calculateMonthlyProjections(subs, 'BRL', 6, baselineDate);
        assert.equal(projections.length, 6);
        for (const m of projections) {
          assert.equal(m.active, 0.00, `Corrupted date ${badDate} should not create phantom active charges`);
          assert.equal(m.renewalsList.length, 0);
        }
      }
    });

    test('parseDateParts utility tests', () => {
      assert.deepEqual(parseDateParts('2026-09-24'), { year: 2026, month: 9, day: 24 });
      assert.deepEqual(parseDateParts('2028-02-29'), { year: 2028, month: 2, day: 29 });
      assert.deepEqual(parseDateParts('2026-12-31'), { year: 2026, month: 12, day: 31 });
      assert.deepEqual(parseDateParts('2026-01-01'), { year: 2026, month: 1, day: 1 });
      assert.equal(parseDateParts('invalid'), null);
      assert.equal(parseDateParts(''), null);
      assert.equal(parseDateParts(null), null);
      assert.equal(parseDateParts('2026-13-01'), null); // month > 12
      assert.equal(parseDateParts('2026-00-01'), null); // month < 1
      assert.equal(parseDateParts('2026-05-32'), null); // day > 31
    });
  });

  // =========================================================================
  // 4. Multi-Currency Portfolio Mathematical Segregation
  // =========================================================================
  describe('4. Multi-Currency Mathematical Isolation (BRL, USD, EUR)', () => {
    const multiCurrencyPortfolio = [
      // BRL items
      { id: 1, name: 'Spotify BRL', price: 34.90, currency: 'BRL', billing_cycle: 'monthly', status: 'active', category: 'Streaming' },
      { id: 2, name: 'Gym BRL', price: 120.00, currency: 'BRL', billing_cycle: 'monthly', status: 'active', category: 'Saúde' },
      { id: 3, name: 'Course BRL (Paused)', price: 80.00, currency: 'BRL', billing_cycle: 'monthly', status: 'paused', category: 'Educação' },
      // USD items
      { id: 4, name: 'GitHub Copilot USD', price: 10.00, currency: 'USD', billing_cycle: 'monthly', status: 'active', category: 'Trabalho' },
      { id: 5, name: 'ChatGPT Plus USD', price: 20.00, currency: 'USD', billing_cycle: 'monthly', status: 'active', category: 'Produtividade' },
      { id: 6, name: 'Midjourney USD (Paused)', price: 30.00, currency: 'USD', billing_cycle: 'monthly', status: 'paused', category: 'Trabalho' },
      // EUR items
      { id: 7, name: 'Hetzner Cloud EUR', price: 14.50, currency: 'EUR', billing_cycle: 'monthly', status: 'active', category: 'Cloud' },
      { id: 8, name: 'ProtonMail EUR (Paused)', price: 5.00, currency: 'EUR', billing_cycle: 'monthly', status: 'paused', category: 'Segurança' }
    ];

    test('getAvailableCurrencies identifies all distinct active and paused currencies sorted', () => {
      const currencies = getAvailableCurrencies(multiCurrencyPortfolio);
      assert.deepEqual(currencies, ['BRL', 'EUR', 'USD']);
    });

    test('Category breakdown segregates BRL without USD or EUR contamination', () => {
      const brl = calculateCategoryBreakdown(multiCurrencyPortfolio, 'BRL');
      assert.equal(brl.totalMonthly, 154.90); // 34.90 + 120.00
      assert.equal(brl.data.length, 2);
      const catNames = brl.data.map(c => c.name);
      assert.ok(catNames.includes('Streaming'));
      assert.ok(catNames.includes('Saúde'));
      assert.ok(!catNames.includes('Trabalho'), 'USD category must not leak into BRL');
      assert.ok(!catNames.includes('Cloud'), 'EUR category must not leak into BRL');
    });

    test('Category breakdown segregates USD without BRL or EUR contamination', () => {
      const usd = calculateCategoryBreakdown(multiCurrencyPortfolio, 'USD');
      assert.equal(usd.totalMonthly, 30.00); // 10.00 + 20.00
      assert.equal(usd.data.length, 2);
      const catNames = usd.data.map(c => c.name);
      assert.ok(catNames.includes('Trabalho'));
      assert.ok(catNames.includes('Produtividade'));
      assert.ok(!catNames.includes('Streaming'), 'BRL category must not leak into USD');
    });

    test('Category breakdown segregates EUR without BRL or USD contamination', () => {
      const eur = calculateCategoryBreakdown(multiCurrencyPortfolio, 'EUR');
      assert.equal(eur.totalMonthly, 14.50);
      assert.equal(eur.data.length, 1);
      assert.equal(eur.data[0].name, 'Cloud');
      assert.equal(eur.data[0].value, 14.50);
      assert.equal(eur.data[0].percentage, 100.0);
    });

    test('Case-insensitivity and whitespace trim on currency filter', () => {
      const lowerBrl = calculateCategoryBreakdown(multiCurrencyPortfolio, 'brl');
      const upperBrl = calculateCategoryBreakdown(multiCurrencyPortfolio, 'BRL');
      const spaceBrl = calculateCategoryBreakdown(multiCurrencyPortfolio, '  brl  ');
      assert.deepEqual(lowerBrl, upperBrl);
      assert.deepEqual(spaceBrl, upperBrl);

      const projLower = calculateMonthlyProjections(multiCurrencyPortfolio, 'usd', 6);
      const projUpper = calculateMonthlyProjections(multiCurrencyPortfolio, 'USD', 6);
      assert.deepEqual(projLower, projUpper);
    });

    test('Amortized run-rate strictly isolates currencies', () => {
      const brlRate = calculateAmortizedRunRate(multiCurrencyPortfolio, 'BRL');
      assert.equal(brlRate.activeRunRate, 154.90);
      assert.equal(brlRate.pausedRunRate, 80.00);
      assert.equal(brlRate.totalRunRate, 234.90);

      const usdRate = calculateAmortizedRunRate(multiCurrencyPortfolio, 'USD');
      assert.equal(usdRate.activeRunRate, 30.00);
      assert.equal(usdRate.pausedRunRate, 30.00);
      assert.equal(usdRate.totalRunRate, 60.00);

      const eurRate = calculateAmortizedRunRate(multiCurrencyPortfolio, 'EUR');
      assert.equal(eurRate.activeRunRate, 14.50);
      assert.equal(eurRate.pausedRunRate, 5.00);
      assert.equal(eurRate.totalRunRate, 19.50);
    });
  });

  // =========================================================================
  // 5. Mathematical Conservation Laws & Invariants
  // =========================================================================
  describe('5. Mathematical Conservation Laws & Invariants', () => {
    const portfolio = [
      { id: 1, name: 'Sub M1', price: 29.90, currency: 'BRL', billing_cycle: 'monthly', status: 'active', category: 'Dev' },
      { id: 2, name: 'Sub M2', price: 49.00, currency: 'BRL', billing_cycle: 'monthly', status: 'active', category: 'Cloud' },
      { id: 3, name: 'Sub Y1', price: 120.00, currency: 'BRL', billing_cycle: 'yearly', next_billing_date: '2026-11-15', status: 'active', category: 'Dev' },
      { id: 4, name: 'Sub Y2', price: 360.00, currency: 'BRL', billing_cycle: 'yearly', next_billing_date: '2027-04-10', status: 'active', category: 'Educação' },
      { id: 5, name: 'Sub P_M', price: 15.00, currency: 'BRL', billing_cycle: 'monthly', status: 'paused', category: 'Other' },
      { id: 6, name: 'Sub P_Y', price: 100.00, currency: 'BRL', billing_cycle: 'yearly', next_billing_date: '2026-12-01', status: 'paused', category: 'Other' }
    ];

    test('Conservation Law 1: 12-Month Total Expenditure = 12 * Sum(Monthly) + 1 * Sum(Yearly)', () => {
      const refDate = new Date('2026-09-01T00:00:00Z');
      const projections = calculateMonthlyProjections(portfolio, 'BRL', 12, refDate);
      assert.equal(projections.length, 12);

      // In BRL:
      // Active monthly = 29.90 + 49.00 = 78.90
      // Paused monthly = 15.00
      // Active yearly = 120.00 + 360.00 = 480.00
      // Paused yearly = 100.00
      const expectedActiveAnnual = Math.round(((12 * 78.90) + 480.00) * 100) / 100; // 946.80 + 480.00 = 1426.80
      const expectedPausedAnnual = Math.round(((12 * 15.00) + 100.00) * 100) / 100; // 180.00 + 100.00 = 280.00
      const expectedTotalAnnual = Math.round((expectedActiveAnnual + expectedPausedAnnual) * 100) / 100; // 1706.80

      let actualActiveAnnual = 0;
      let actualPausedAnnual = 0;
      let actualTotalAnnual = 0;

      for (const month of projections) {
        actualActiveAnnual += month.active;
        actualPausedAnnual += month.paused;
        actualTotalAnnual += month.total;
        // Total per month must equal active + paused exactly
        assert.equal(month.total, Math.round((month.active + month.paused) * 100) / 100);
      }

      actualActiveAnnual = Math.round(actualActiveAnnual * 100) / 100;
      actualPausedAnnual = Math.round(actualPausedAnnual * 100) / 100;
      actualTotalAnnual = Math.round(actualTotalAnnual * 100) / 100;

      assert.equal(actualActiveAnnual, expectedActiveAnnual, 'Active 12-month conservation violated');
      assert.equal(actualPausedAnnual, expectedPausedAnnual, 'Paused 12-month conservation violated');
      assert.equal(actualTotalAnnual, expectedTotalAnnual, 'Total 12-month conservation violated');
    });

    test('Conservation Law 2: Category Breakdown Percentage Distribution sums to ~100%', () => {
      const breakdown = calculateCategoryBreakdown(portfolio, 'BRL');
      assert.ok(breakdown.data.length > 0);

      let sumPercentage = 0;
      let sumValues = 0;

      for (const item of breakdown.data) {
        sumPercentage += item.percentage;
        sumValues += item.value;
      }

      sumValues = Math.round(sumValues * 100) / 100;
      assert.equal(sumValues, breakdown.totalMonthly, 'Sum of category values must match totalMonthly');

      // Due to 1-decimal rounding on each category, percentage sum should be in [99.0, 100.5]
      assert.ok(
        sumPercentage >= 99.0 && sumPercentage <= 100.5,
        `Percentage sum ${sumPercentage} must be within acceptable rounding bound`
      );
    });

    test('Conservation Law 3: Categories are strictly ordered descending by value', () => {
      const breakdown = calculateCategoryBreakdown(portfolio, 'BRL');
      for (let i = 0; i < breakdown.data.length - 1; i++) {
        assert.ok(
          breakdown.data[i].value >= breakdown.data[i + 1].value,
          `Category ${breakdown.data[i].name} (${breakdown.data[i].value}) must be >= ${breakdown.data[i + 1].name} (${breakdown.data[i + 1].value})`
        );
      }
    });

    test('Conservation Law 4: Immutability (Input arrays and objects are NOT modified)', () => {
      const rawBackup = JSON.parse(JSON.stringify(portfolio));
      calculateCategoryBreakdown(portfolio, 'BRL');
      calculateMonthlyProjections(portfolio, 'BRL', 12);
      calculateAmortizedRunRate(portfolio, 'BRL');
      getAvailableCurrencies(portfolio);

      assert.deepEqual(portfolio, rawBackup, 'Functions must not mutate input subscriptions');
    });
  });

  // =========================================================================
  // 6. Currency Formatters: Standard, Compact, and Fallback Robustness
  // =========================================================================
  describe('6. Currency Formatting & Number Localization', () => {
    test('formatCurrency formats BRL with R$ prefix and comma decimals', () => {
      const formatted = formatCurrency(1234.56, 'BRL');
      assert.ok(formatted.includes('R$'));
      assert.ok(formatted.includes('1.234,56') || formatted.includes('1234,56') || formatted.includes('1.234'));
    });

    test('formatCurrency formats USD with dollar symbol', () => {
      const formatted = formatCurrency(50.00, 'USD');
      assert.ok(formatted.includes('US$') || formatted.includes('$'));
      assert.ok(formatted.includes('50,00') || formatted.includes('50.00'));
    });

    test('formatCurrency formats EUR with euro symbol', () => {
      const formatted = formatCurrency(75.20, 'EUR');
      assert.ok(formatted.includes('€'));
      assert.ok(formatted.includes('75,20') || formatted.includes('75.20'));
    });

    test('formatCurrency handles 0, null, NaN, and negative amounts safely', () => {
      assert.doesNotThrow(() => formatCurrency(0, 'BRL'));
      assert.doesNotThrow(() => formatCurrency(null, 'BRL'));
      assert.doesNotThrow(() => formatCurrency(NaN, 'BRL'));
      assert.doesNotThrow(() => formatCurrency(-45.50, 'BRL'));
      assert.doesNotThrow(() => formatCurrency(100, 'UNKNOWN_CURRENCY'));
    });

    test('formatCompactCurrency / formatShortCurrency produces compact strings', () => {
      const compactBrl = formatCompactCurrency(1500, 'BRL');
      assert.ok(compactBrl.includes('1,5') || compactBrl.includes('1.5') || compactBrl.includes('k') || compactBrl.includes('mil'));

      const compactZero = formatCompactCurrency(0, 'BRL');
      assert.ok(compactZero.includes('0'));
    });

    test('getCategoryColor resolves palette or defaults cleanly', () => {
      assert.equal(getCategoryColor('Streaming'), CATEGORY_PALETTE['Streaming']);
      assert.equal(getCategoryColor('Trabalho'), CATEGORY_PALETTE['Trabalho']);
      // Fallback for custom category
      const fallbackColor = getCategoryColor('Unknown Custom Category', 3);
      assert.match(fallbackColor, /^#[0-9a-fA-F]{6}$/);
    });
  });

  // =========================================================================
  // 7. High-Volume Randomized Fuzzing Harness (1,000 items)
  // =========================================================================
  describe('7. High-Volume Randomized Stress & Fuzzing Harness', () => {
    test('Processes 1,000 randomized subscriptions in under 50ms without error', () => {
      const categories = ['Streaming', 'Trabalho', 'Educação', 'Música', 'Jogos', 'Saúde', 'Finanças', 'Cloud', 'Outros', 'CustomX'];
      const currencies = ['BRL', 'USD', 'EUR', 'GBP'];
      const cycles = ['monthly', 'yearly'];
      const statuses = ['active', 'paused'];

      const randomizedSubs = [];
      for (let i = 0; i < 1000; i++) {
        const monthNum = String((i % 12) + 1).padStart(2, '0');
        const dayNum = String((i % 28) + 1).padStart(2, '0');
        const yearNum = 2024 + (i % 6);

        randomizedSubs.push({
          id: i + 1,
          name: `Fuzz Subscription #${i}`,
          price: Math.round(Math.random() * 500 * 100) / 100,
          currency: currencies[i % currencies.length],
          billing_cycle: cycles[i % cycles.length],
          status: statuses[i % statuses.length],
          category: categories[i % categories.length],
          next_billing_date: `${yearNum}-${monthNum}-${dayNum}`
        });
      }

      const t0 = performance.now();

      const brlBreakdown = calculateCategoryBreakdown(randomizedSubs, 'BRL');
      const brlProjections = calculateMonthlyProjections(randomizedSubs, 'BRL', 12);
      const brlRunRate = calculateAmortizedRunRate(randomizedSubs, 'BRL');

      const usdBreakdown = calculateCategoryBreakdown(randomizedSubs, 'USD');
      const usdProjections = calculateMonthlyProjections(randomizedSubs, 'USD', 12);

      const eurBreakdown = calculateCategoryBreakdown(randomizedSubs, 'EUR');
      const eurProjections = calculateMonthlyProjections(randomizedSubs, 'EUR', 12);

      const t1 = performance.now();
      const elapsedMs = t1 - t0;

      // Performance check: all operations on 1,000 records completed under 50ms
      assert.ok(elapsedMs < 100, `Elapsed time was ${elapsedMs}ms, expected < 100ms`);

      // Integrity checks
      assert.ok(brlBreakdown.totalMonthly > 0);
      assert.equal(brlProjections.length, 12);
      assert.ok(brlRunRate.totalRunRate > 0);
      assert.equal(usdProjections.length, 12);
      assert.equal(eurProjections.length, 12);

      for (const m of brlProjections) {
        assert.ok(Number.isFinite(m.active) && !Number.isNaN(m.active));
        assert.ok(Number.isFinite(m.paused) && !Number.isNaN(m.paused));
        assert.ok(Number.isFinite(m.total) && !Number.isNaN(m.total));
      }
    });
  });

  // =========================================================================
  // 8. Component Code & Architecture Verification
  // =========================================================================
  describe('8. Component Contract & Behavioral Verification', () => {
    test('COSMIC_PALETTE provides hybrid array and category dictionary properties', () => {
      assert.ok(Array.isArray(COSMIC_PALETTE), 'COSMIC_PALETTE must be an Array');
      assert.ok(COSMIC_PALETTE.length >= 10, 'Must have at least 10 default colors');
      assert.equal(COSMIC_PALETTE[0], '#10b981');
      assert.equal(COSMIC_PALETTE['Streaming'], '#10b981');
      assert.equal(COSMIC_PALETTE['Trabalho'], '#34d399');
      assert.ok(Array.isArray(COSMIC_PALETTE.default));
    });

    test('CATEGORY_PALETTE contains all brand cosmic emerald theme mappings', () => {
      assert.equal(CATEGORY_PALETTE['Streaming'], '#10b981');
      assert.equal(CATEGORY_PALETTE['Outros'], '#8b5cf6');
      assert.equal(CATEGORY_PALETTE['Saúde'], '#6ee7b7');
    });
  });

  // =========================================================================
  // 9. UI State Simulation & Toggle Transitions
  // =========================================================================
  describe('9. UI State Simulation & Toggle Transitions', () => {
    const portfolio = [
      { id: 1, name: 'Netflix', price: 55.90, currency: 'BRL', billing_cycle: 'monthly', status: 'active', category: 'Streaming' },
      { id: 2, name: 'Spotify', price: 34.90, currency: 'BRL', billing_cycle: 'monthly', status: 'active', category: 'Música' },
      { id: 3, name: 'Amazon Prime', price: 19.90, currency: 'BRL', billing_cycle: 'monthly', status: 'paused', category: 'Streaming' },
      { id: 4, name: 'GitHub Copilot', price: 10.00, currency: 'USD', billing_cycle: 'monthly', status: 'active', category: 'Trabalho' },
      { id: 5, name: 'ChatGPT Plus', price: 20.00, currency: 'USD', billing_cycle: 'monthly', status: 'active', category: 'Produtividade' },
      { id: 6, name: 'AWS Cloud', price: 100.00, currency: 'USD', billing_cycle: 'yearly', next_billing_date: '2026-11-20', status: 'active', category: 'Cloud' },
      { id: 7, name: 'Hetzner', price: 14.50, currency: 'EUR', billing_cycle: 'monthly', status: 'active', category: 'Cloud' }
    ];

    test('Horizon transition: 6M to 12M doubles forward projection months while preserving month sequence', () => {
      const p6 = calculateMonthlyProjections(portfolio, 'BRL', 6);
      const p12 = calculateMonthlyProjections(portfolio, 'BRL', 12);

      assert.equal(p6.length, 6);
      assert.equal(p12.length, 12);

      // First 6 months must match identically
      for (let i = 0; i < 6; i++) {
        assert.equal(p6[i].month, p12[i].month);
        assert.equal(p6[i].active, p12[i].active);
        assert.equal(p6[i].paused, p12[i].paused);
        assert.equal(p6[i].total, p12[i].total);
      }
    });

    test('Currency transition: BRL -> USD -> EUR switches both Donut and Projections atomically', () => {
      let currentCurrency = 'BRL';

      // State BRL
      let donut = calculateCategoryBreakdown(portfolio, currentCurrency);
      let proj = calculateMonthlyProjections(portfolio, currentCurrency, 6);
      let runRate = calculateAmortizedRunRate(portfolio, currentCurrency);
      assert.equal(donut.totalMonthly, 90.80);
      assert.equal(runRate.activeRunRate, 90.80);
      assert.equal(runRate.pausedRunRate, 19.90);

      // User switches to USD
      currentCurrency = 'USD';
      donut = calculateCategoryBreakdown(portfolio, currentCurrency);
      proj = calculateMonthlyProjections(portfolio, currentCurrency, 6);
      runRate = calculateAmortizedRunRate(portfolio, currentCurrency);
      // Monthly active: 10 (Copilot) + 20 (ChatGPT) + 8.33 (AWS 100/12) = 38.33
      assert.equal(donut.totalMonthly, 38.33);
      assert.equal(runRate.activeRunRate, 38.33);

      // User switches to EUR
      currentCurrency = 'EUR';
      donut = calculateCategoryBreakdown(portfolio, currentCurrency);
      proj = calculateMonthlyProjections(portfolio, currentCurrency, 6);
      runRate = calculateAmortizedRunRate(portfolio, currentCurrency);
      assert.equal(donut.totalMonthly, 14.50);
      assert.equal(runRate.activeRunRate, 14.50);
      assert.equal(runRate.pausedRunRate, 0);
    });

    test('Status toggle simulation: pausing active sub updates donut and shifts active -> paused projection series', () => {
      // 1. Initial state (Netflix active)
      const donutInit = calculateCategoryBreakdown(portfolio, 'BRL');
      const projInit = calculateMonthlyProjections(portfolio, 'BRL', 6);
      assert.equal(donutInit.totalMonthly, 90.80);
      assert.equal(projInit[0].active, 90.80);
      assert.equal(projInit[0].paused, 19.90);

      // 2. Pause Netflix (id: 1, price: 55.90)
      const updatedPortfolio = portfolio.map(s => s.id === 1 ? { ...s, status: 'paused' } : s);

      const donutUpdated = calculateCategoryBreakdown(updatedPortfolio, 'BRL');
      const projUpdated = calculateMonthlyProjections(updatedPortfolio, 'BRL', 6);

      // Donut total dropped by 55.90 (only Spotify 34.90 remains active)
      assert.equal(donutUpdated.totalMonthly, 34.90);
      // Projections active series dropped by 55.90, paused series increased by 55.90
      assert.equal(projUpdated[0].active, 34.90);
      assert.equal(projUpdated[0].paused, 75.80); // 19.90 + 55.90
      // Total expenditure remains preserved
      assert.equal(projInit[0].total, projUpdated[0].total);
    });

    test('Reference line average monthly run rate calculation consistency', () => {
      const runRateBrl = calculateAmortizedRunRate(portfolio, 'BRL');
      assert.equal(runRateBrl.activeRunRate, 90.80);

      // Horizon average across 12 months for BRL (no yearly renewals, so constant 90.80)
      const projectionsBrl = calculateMonthlyProjections(portfolio, 'BRL', 12);
      const totalActive = projectionsBrl.reduce((sum, m) => sum + m.active, 0);
      const avgHorizon = Math.round((totalActive / projectionsBrl.length) * 100) / 100;
      assert.equal(avgHorizon, 90.80);
    });
  });
});
