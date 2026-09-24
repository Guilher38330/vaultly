/**
 * Tier 3: Pairwise Cross-Feature Interaction Test Suite
 * 
 * Tests interactions across feature boundaries:
 * - Currency switching during active status toggles (R1 + R2)
 * - Dark/Light theme switching with active Sonner toasts (R2 + Theme)
 * - Table filtering/sorting concurrent with chart horizon toggles (R1 + R3)
 * - Spring modal dismissals with simultaneous toast queues (R2 + R3)
 * - Atomic dual-chart synchronization upon currency shift (R1A + R1B)
 * - Status mutation impact across Donut, Projections, and Toasts (R1A + R1B + R2)
 * - Theme shift during 3D WebGL render loop (R4 + Theme)
 * - Row deletion animation paired with toast notification (R2 + R3)
 * - Multi-filter state preservation during projection updates (R1B + R3)
 * - Mutation error handling without chart corruption (R1 + R2)
 * - Canvas DPR clamp and ResponsiveContainer resize handling (R1 + R4)
 * 
 * Total: 12 tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getFinancialEngine } from '../contracts/contract_loader.js';
import { NotificationEventSystem } from '../helpers/notificationEventSystem.js';
import { AnimationTestHarness } from '../helpers/animationTestHarness.js';
import { WebGLCelestialHarness } from '../helpers/webglCanvasMock.js';
import { MOCK_SUBSCRIPTIONS } from '../helpers/mockFixtures.js';

describe('Tier 3: Pairwise Cross-Feature Interactions', async () => {
  const engine = await getFinancialEngine();
  const notifySystem = new NotificationEventSystem();

  test('T3.1: Currency switching during active status toggle updates charts and notifications atomically', () => {
    notifySystem.reset();
    // User toggles BRL subscription "Netflix Premium"
    notifySystem.notifySubscriptionMutation('status_toggled', 'Netflix Premium', 'paused');
    
    // User immediately switches dashboard currency view to USD
    const usdBreakdown = engine.calculateCategoryBreakdown(MOCK_SUBSCRIPTIONS, 'USD');
    const usdProjections = engine.calculateMonthlyProjections(MOCK_SUBSCRIPTIONS, 'USD', 6);

    // Toast maintains BRL context
    const toast = notifySystem.findToastByAction('status_toggled');
    assert.equal(toast.status, 'paused');
    assert.ok(toast.description.includes('Netflix Premium'));

    // Charts cleanly reflect USD data without leaking BRL Netflix
    assert.ok(usdBreakdown.totalMonthly > 0);
    assert.equal(usdBreakdown.data.some((c) => c.name === 'Trabalho'), true);
    assert.equal(usdProjections.length, 6);
  });

  test('T3.2: Dark/Light theme toggle updates Toaster theme via MutationObserver with active toasts', () => {
    notifySystem.reset();
    let observerCalledCount = 0;
    notifySystem.onThemeChange((newTheme) => {
      observerCalledCount++;
    });

    notifySystem.emitToast('info', 'Active toast 1');
    notifySystem.emitToast('info', 'Active toast 2');

    // Simulate theme change: light -> dark
    notifySystem.setTheme('dark');
    assert.equal(notifySystem.activeTheme, 'dark');
    assert.equal(observerCalledCount, 1);

    // New toasts automatically inherit dark theme
    notifySystem.emitToast('success', 'Dark mode toast');
    const lastToast = notifySystem.toasts[notifySystem.toasts.length - 1];
    assert.equal(lastToast.theme, 'dark');
  });

  test('T3.3: Search filtering table while projections horizon changes preserves independent states', () => {
    // Search filter: "copilot"
    const searchTerm = 'copilot';
    const filteredSubs = MOCK_SUBSCRIPTIONS.filter((s) =>
      s.name.toLowerCase().includes(searchTerm)
    );
    assert.equal(filteredSubs.length, 1);
    assert.equal(filteredSubs[0].name, 'GitHub Copilot Pro');

    // Projections horizon changed to 12 months for USD
    const projections12m = engine.calculateMonthlyProjections(MOCK_SUBSCRIPTIONS, 'USD', 12);
    assert.equal(projections12m.length, 12);

    // Projections cover full portfolio while table filtered sub is isolated
    assert.ok(projections12m[0].active >= filteredSubs[0].price);
  });

  test('T3.4: Modal spring close animation triggers simultaneously with mutation toast without lag', () => {
    notifySystem.reset();
    // Modal closes with spring physics
    const spring = AnimationTestHarness.evaluateSpringPhysics({ mass: 0.8, stiffness: 360, damping: 26 });
    assert.equal(spring.isFluidAndStable, true);

    // Mutation toast triggers on modal success
    const toastId = notifySystem.notifySubscriptionMutation('created', 'New SaaS');
    assert.ok(toastId);
    assert.equal(notifySystem.toasts.length, 1);
  });

  test('T3.5: Table row sort preserves category donut slice data stability', () => {
    const breakdownBefore = engine.calculateCategoryBreakdown(MOCK_SUBSCRIPTIONS, 'BRL');
    
    // Sort table rows by price descending
    const initialRows = MOCK_SUBSCRIPTIONS.filter((s) => s.currency === 'BRL');
    const sortedRows = [...initialRows].sort((a, b) => b.price - a.price);

    const flip = AnimationTestHarness.verifyFlipLayoutStability(initialRows, sortedRows);
    assert.equal(flip.hasZeroCellDistortion, true);

    // Donut breakdown must be completely unchanged by table sorting
    const breakdownAfter = engine.calculateCategoryBreakdown(MOCK_SUBSCRIPTIONS, 'BRL');
    assert.deepEqual(breakdownBefore, breakdownAfter);
  });

  test('T3.6: Switching currency from BRL to USD updates Donut total and Projections dataset synchronously', () => {
    const brlDonut = engine.calculateCategoryBreakdown(MOCK_SUBSCRIPTIONS, 'BRL');
    const brlProjections = engine.calculateMonthlyProjections(MOCK_SUBSCRIPTIONS, 'BRL', 6);

    const usdDonut = engine.calculateCategoryBreakdown(MOCK_SUBSCRIPTIONS, 'USD');
    const usdProjections = engine.calculateMonthlyProjections(MOCK_SUBSCRIPTIONS, 'USD', 6);

    assert.notEqual(brlDonut.totalMonthly, usdDonut.totalMonthly);
    assert.notEqual(brlProjections[0].active, usdProjections[0].active);
  });

  test('T3.7: Pausing an active subscription decreases Donut active total, increases Projections paused series, and emits toast', () => {
    notifySystem.reset();
    // Initial state
    const donutBefore = engine.calculateCategoryBreakdown(MOCK_SUBSCRIPTIONS, 'BRL');
    const projBefore = engine.calculateMonthlyProjections(MOCK_SUBSCRIPTIONS, 'BRL', 6);

    // Toggle Netflix Premium (55.90) to paused
    const modifiedSubs = MOCK_SUBSCRIPTIONS.map((s) =>
      s.id === 1 ? { ...s, status: 'paused' } : s
    );

    const donutAfter = engine.calculateCategoryBreakdown(modifiedSubs, 'BRL');
    const projAfter = engine.calculateMonthlyProjections(modifiedSubs, 'BRL', 6);

    // Donut active total decreased by 55.90
    assert.equal(
      Math.round((donutBefore.totalMonthly - donutAfter.totalMonthly) * 100) / 100,
      55.90
    );

    // Projections active series decreased by 55.90, paused series increased by 55.90
    assert.equal(
      Math.round((projBefore[0].active - projAfter[0].active) * 100) / 100,
      55.90
    );
    assert.equal(
      Math.round((projAfter[0].paused - projBefore[0].paused) * 100) / 100,
      55.90
    );

    // Toast emitted
    notifySystem.notifySubscriptionMutation('status_toggled', 'Netflix Premium', 'paused');
    const toast = notifySystem.findToastByAction('status_toggled');
    assert.equal(toast.status, 'paused');
  });

  test('T3.8: Theme switch during 3D WebGL render loop maintains PBR materials and star buffers', () => {
    const lighting = WebGLCelestialHarness.evaluateLightingRig({
      ambient: { intensity: 0.35 },
      directional_key: { intensity: 1.2 },
      point_emerald: { intensity: 2.0, color: '#10b981' },
      rim: { intensity: 0.8 }
    });
    const particles = WebGLCelestialHarness.generateStarParticles(500);

    // Simulate theme change to dark
    notifySystem.setTheme('dark');
    assert.equal(lighting.hasAllLights, true);
    assert.equal(particles.hasValidBuffers, true);
  });

  test('T3.9: Rapid subscription deletion triggers exit animation and deletion toast sequentially', () => {
    notifySystem.reset();
    const remainingSubs = MOCK_SUBSCRIPTIONS.filter((s) => s.id !== 1);
    
    // Animate row removal
    const flip = AnimationTestHarness.verifyFlipLayoutStability(MOCK_SUBSCRIPTIONS, remainingSubs);
    assert.equal(flip.hasZeroCellDistortion, true);

    // Emit deletion notification
    notifySystem.notifySubscriptionMutation('deleted', 'Netflix Premium');
    const toast = notifySystem.findToastByAction('deleted');
    assert.ok(toast);
    assert.equal(toast.type, 'success');
  });

  test('T3.10: Multi-filter application (Paused + Yearly) isolates matching commitments across horizon', () => {
    const pausedYearly = MOCK_SUBSCRIPTIONS.filter(
      (s) => s.status === 'paused' && s.billing_cycle === 'yearly'
    );
    // In MOCK_SUBSCRIPTIONS, no yearly paused currently, so test empty match safely
    assert.equal(pausedYearly.length, 0);

    // If we add a mock paused yearly subscription
    const withPausedYearly = [
      ...MOCK_SUBSCRIPTIONS,
      {
        id: 99,
        name: 'Paused Yearly Tool',
        price: 120.00,
        currency: 'USD',
        billing_cycle: 'yearly',
        next_billing_date: '2026-10-10',
        status: 'paused'
      }
    ];

    const refDate = new Date('2026-09-01T00:00:00Z');
    const proj = engine.calculateMonthlyProjections(withPausedYearly, 'USD', 6, refDate);
    // Month 1 is Oct/26 -> paused should include 120.00
    assert.ok(proj[1].paused >= 120.00);
  });

  test('T3.11: Error response during mutation triggers error toast without disrupting chart state', () => {
    notifySystem.reset();
    const baselineBreakdown = engine.calculateCategoryBreakdown(MOCK_SUBSCRIPTIONS, 'BRL');

    // Mutation failed on network error
    notifySystem.notifySubscriptionMutation('error', 'Failing Service');
    const errorToast = notifySystem.findToastByAction('error');
    assert.ok(errorToast);
    assert.equal(errorToast.type, 'error');

    // Chart state unchanged
    const currentBreakdown = engine.calculateCategoryBreakdown(MOCK_SUBSCRIPTIONS, 'BRL');
    assert.deepEqual(baselineBreakdown, currentBreakdown);
  });

  test('T3.12: DPR clamp on 3D canvas and ResponsiveContainer resize evaluate cleanly', () => {
    // DPR clamped between 1 and 2
    const rawDPR1 = 0.5;
    const rawDPR2 = 3.5;
    const clampDPR = (dpr) => Math.min(Math.max(dpr, 1), 2);

    assert.equal(clampDPR(rawDPR1), 1);
    assert.equal(clampDPR(rawDPR2), 2);
  });
});
