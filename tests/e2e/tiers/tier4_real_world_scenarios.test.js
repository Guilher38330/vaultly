/**
 * Tier 4: Real-World Application Scenarios (S1 - S5)
 * 
 * Verifies end-to-end multi-step user workflows per TEST_INFRA.md:
 * - S1: Multi-currency portfolio (BRL, USD, EUR) with active & paused separation
 * - S2: Full subscription lifecycle (Create, Status Toggle, Edit, Delete)
 * - S3: High-volume dashboard sorting & category filtering without layout shifts
 * - S4: Dynamic theme shift with active notifications and charting
 * - S5: Guest navigation with 3D WebGL cosmic showcase lifecycle & teardown
 * 
 * Total: 5 scenarios
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getFinancialEngine } from '../contracts/contract_loader.js';
import { NotificationEventSystem } from '../helpers/notificationEventSystem.js';
import { AnimationTestHarness } from '../helpers/animationTestHarness.js';
import { WebGLCelestialHarness } from '../helpers/webglCanvasMock.js';
import { MOCK_SUBSCRIPTIONS } from '../helpers/mockFixtures.js';

describe('Tier 4: Real-World Application Scenarios', async () => {
  const engine = await getFinancialEngine();

  // =========================================================================
  // Scenario 1 (S1): Multi-Currency Portfolio Across 12-Month Projections
  // =========================================================================
  test('Scenario S1: Multi-currency portfolio (BRL, USD, EUR) with mixed active and paused subscriptions', () => {
    const refDate = new Date('2026-09-01T00:00:00Z');

    // 1. Evaluate BRL Portfolio
    const brlDonut = engine.calculateCategoryBreakdown(MOCK_SUBSCRIPTIONS, 'BRL');
    const brlProjections = engine.calculateMonthlyProjections(MOCK_SUBSCRIPTIONS, 'BRL', 12, refDate);

    // Active BRL: Netflix (55.90), Spotify (34.90), PS Plus (32.49) = 123.29/mo
    assert.equal(brlDonut.totalMonthly, 123.29);
    assert.equal(brlDonut.data.length, 3); // Streaming, Música, Jogos
    assert.equal(brlProjections.length, 12);
    // PS Plus yearly renewal hits in Dec/26 (month index 3: Sept=0, Oct=1, Nov=2, Dec=3)
    assert.equal(brlProjections[3].month, 'Dez/26');
    assert.ok(brlProjections[3].active > 380, 'Dec/26 must include PS Plus yearly fee');

    // 2. Evaluate USD Portfolio
    const usdDonut = engine.calculateCategoryBreakdown(MOCK_SUBSCRIPTIONS, 'USD');
    const usdProjections = engine.calculateMonthlyProjections(MOCK_SUBSCRIPTIONS, 'USD', 12, refDate);

    // Active USD: Copilot (10), ChatGPT (20), JetBrains (24.92/mo) = 54.92/mo
    assert.equal(usdDonut.totalMonthly, 54.92);
    assert.equal(usdDonut.data.length, 1); // All Trabalho
    assert.equal(usdProjections.length, 12);
    // JetBrains renewal in Nov/26 (month index 2)
    assert.equal(usdProjections[2].month, 'Nov/26');
    assert.equal(usdProjections[2].active, 329.00); // 10 + 20 + 299

    // 3. Evaluate EUR Portfolio
    const eurDonut = engine.calculateCategoryBreakdown(MOCK_SUBSCRIPTIONS, 'EUR');
    const eurProjections = engine.calculateMonthlyProjections(MOCK_SUBSCRIPTIONS, 'EUR', 12, refDate);

    // Active EUR: Hetzner Cloud (14.50)
    assert.equal(eurDonut.totalMonthly, 14.50);
    assert.equal(eurProjections.length, 12);
    assert.equal(eurProjections[0].active, 14.50);

    // 4. Assert strict multi-currency isolation
    assert.notEqual(brlDonut.totalMonthly, usdDonut.totalMonthly);
    assert.notEqual(usdDonut.totalMonthly, eurDonut.totalMonthly);
  });

  // =========================================================================
  // Scenario 2 (S2): Full Subscription Lifecycle (Create -> Toggle -> Edit -> Delete)
  // =========================================================================
  test('Scenario S2: Full subscription lifecycle with responsive toasts and modal spring dynamics', () => {
    const notifySystem = new NotificationEventSystem();
    notifySystem.reset();
    let portfolio = [...MOCK_SUBSCRIPTIONS];

    // Step 1: CREATE
    const springOpen = AnimationTestHarness.evaluateSpringPhysics({ mass: 0.8, stiffness: 360, damping: 26 });
    assert.equal(springOpen.isFluidAndStable, true);

    const newSub = {
      id: 101,
      name: 'Disney+ Standard',
      price: 43.90,
      currency: 'BRL',
      billing_cycle: 'monthly',
      category: 'Streaming',
      next_billing_date: '2026-10-10',
      status: 'active',
      monthly_equivalent_price: 43.90,
      yearly_equivalent_price: 526.80
    };
    portfolio.push(newSub);

    notifySystem.notifySubscriptionMutation('created', newSub.name);
    const createToast = notifySystem.findToastByAction('created');
    assert.ok(createToast);
    assert.equal(createToast.message, 'Assinatura cadastrada!');
    assert.ok(createToast.description.includes('Disney+ Standard'));

    let donut = engine.calculateCategoryBreakdown(portfolio, 'BRL');
    // Previous 123.29 + 43.90 = 167.19
    assert.equal(donut.totalMonthly, 167.19);

    // Step 2: TOGGLE STATUS (Pause)
    portfolio = portfolio.map((s) => s.id === 101 ? { ...s, status: 'paused' } : s);
    notifySystem.notifySubscriptionMutation('status_toggled', newSub.name, 'paused');
    const pauseToast = notifySystem.findToastByAction('status_toggled');
    assert.equal(pauseToast.status, 'paused');
    assert.equal(pauseToast.message, 'Assinatura pausada');

    donut = engine.calculateCategoryBreakdown(portfolio, 'BRL');
    assert.equal(donut.totalMonthly, 123.29); // Paused sub excluded

    // Step 3: TOGGLE STATUS (Reactivate)
    portfolio = portfolio.map((s) => s.id === 101 ? { ...s, status: 'active' } : s);
    notifySystem.notifySubscriptionMutation('status_toggled', newSub.name, 'active');
    const reactivateToast = notifySystem.toasts[notifySystem.toasts.length - 1];
    assert.equal(reactivateToast.status, 'active');
    assert.equal(reactivateToast.message, 'Assinatura reativada');

    // Step 4: EDIT (Price update)
    portfolio = portfolio.map((s) =>
      s.id === 101
        ? { ...s, price: 49.90, monthly_equivalent_price: 49.90 }
        : s
    );
    notifySystem.notifySubscriptionMutation('updated', 'Disney+ Standard');
    const updateToast = notifySystem.findToastByAction('updated');
    assert.ok(updateToast);
    assert.equal(updateToast.message, 'Assinatura atualizada!');

    donut = engine.calculateCategoryBreakdown(portfolio, 'BRL');
    // 123.29 + 49.90 = 173.19
    assert.equal(donut.totalMonthly, 173.19);

    // Step 5: DELETE
    const beforeDelete = [...portfolio];
    portfolio = portfolio.filter((s) => s.id !== 101);
    notifySystem.notifySubscriptionMutation('deleted', 'Disney+ Standard');
    const deleteToast = notifySystem.findToastByAction('deleted');
    assert.ok(deleteToast);
    assert.equal(deleteToast.message, 'Assinatura removida!');

    const flipDelete = AnimationTestHarness.verifyFlipLayoutStability(beforeDelete, portfolio);
    assert.equal(flipDelete.hasZeroCellDistortion, true);

    donut = engine.calculateCategoryBreakdown(portfolio, 'BRL');
    assert.equal(donut.totalMonthly, 123.29);
  });

  // =========================================================================
  // Scenario 3 (S3): High-Volume Sorting & Filtering Layout Invariance
  // =========================================================================
  test('Scenario S3: Interactive dashboard sorting and category filtering under high item count', () => {
    // Generate 60 realistic subscriptions across 6 categories
    const categories = ['Streaming', 'Trabalho', 'Educação', 'Música', 'Jogos', 'Cloud'];
    const largePortfolio = [];
    for (let i = 1; i <= 60; i++) {
      largePortfolio.push({
        id: i,
        name: `Service #${i}`,
        price: 10 + (i % 50),
        currency: 'BRL',
        billing_cycle: i % 4 === 0 ? 'yearly' : 'monthly',
        category: categories[i % categories.length],
        status: i % 5 === 0 ? 'paused' : 'active'
      });
    }

    // 1. Filter by category "Trabalho"
    const filteredByCategory = largePortfolio.filter((s) => s.category === 'Trabalho');
    assert.equal(filteredByCategory.length, 10);

    // 2. Sort by price descending
    const sortedByPrice = [...filteredByCategory].sort((a, b) => b.price - a.price);

    // 3. Verify FLIP layout position transformation preserves cell scales
    const flip = AnimationTestHarness.verifyFlipLayoutStability(filteredByCategory, sortedByPrice);
    assert.equal(flip.hasZeroCellDistortion, true);
    assert.equal(flip.shifts.every((s) => s.scaleX === 1.0 && s.scaleY === 1.0), true);

    // 4. Staggered entrance timeline for 60 items remains predictable
    const stagger = AnimationTestHarness.calculateStaggerTimeline(10, 0.05, 0.05);
    assert.ok(stagger.isUnderBudget);
  });

  // =========================================================================
  // Scenario 4 (S4): Dynamic Theme Shift with Active Notifications and Charting
  // =========================================================================
  test('Scenario S4: Light/Dark theme switching during active notifications and charting', () => {
    const notifySystem = new NotificationEventSystem();
    notifySystem.reset();

    // 1. Initial Light Mode with active toasts and charts
    assert.equal(notifySystem.activeTheme, 'light');
    notifySystem.emitToast('info', 'Assinatura próxima do vencimento');

    // 2. User toggles to Dark Mode
    notifySystem.setTheme('dark');
    assert.equal(notifySystem.activeTheme, 'dark');

    // 3. New notifications immediately inherit dark theme
    notifySystem.notifySubscriptionMutation('created', 'Dark Theme SaaS');
    const toast = notifySystem.findToastByAction('created');
    assert.equal(toast.theme, 'dark');

    // 4. Charts adapt color tokens
    const breakdown = engine.calculateCategoryBreakdown(MOCK_SUBSCRIPTIONS, 'BRL');
    assert.ok(breakdown.data.length > 0);
    for (const item of breakdown.data) {
      assert.ok(item.color.startsWith('#'), 'Palette retains hex integrity in dark mode');
    }

    // 5. User toggles back to Light Mode cleanly
    notifySystem.setTheme('light');
    assert.equal(notifySystem.activeTheme, 'light');
  });

  // =========================================================================
  // Scenario 5 (S5): Guest Navigation Flow with 3D WebGL Cosmic Showcase
  // =========================================================================
  test('Scenario S5: Guest navigation to/from Login & Register with 3D Cosmic Showcase initialization and teardown', () => {
    const webglHarness = new WebGLCelestialHarness();

    // 1. Mount on /login
    const lighting = WebGLCelestialHarness.evaluateLightingRig({
      ambient: { intensity: 0.35 },
      directional_key: { intensity: 1.2 },
      point_emerald: { intensity: 2.0, color: '#10b981' },
      rim: { intensity: 0.8 }
    });
    assert.equal(lighting.isBalanced, true);

    const ring = WebGLCelestialHarness.evaluateRingGeometry({
      innerRadius: 2.2,
      outerRadius: 3.6,
      tiltAngleDeg: 18
    });
    assert.equal(ring.isValid, true);

    const starParticles = WebGLCelestialHarness.generateStarParticles(1500);
    assert.equal(starParticles.particleCount, 1500);

    // 2. Interactive pointer tracking
    const rotation = WebGLCelestialHarness.simulatePointerRotation({
      currentRot: 0,
      targetRot: 1.5,
      factor: 0.08,
      steps: 40
    });
    assert.equal(rotation.hasConverged, true);
    assert.ok(rotation.final > 1.35);

    // 3. Guest clicks link to /register -> unmount & clean teardown
    const teardown = webglHarness.teardownScene(
      [{ name: 'PlanetSphere' }, { name: 'EquatorialRing' }, { name: 'StarField' }],
      [{ name: 'MeshPhysicalMaterial' }, { name: 'PointsMaterial' }],
      [{ name: 'PlanetTexture' }]
    );
    assert.equal(teardown.disposedGeometries, 3);
    assert.equal(teardown.disposedMaterials, 2);
    assert.equal(teardown.disposedTextures, 1);
    assert.equal(teardown.cleanTeardown, true);
    assert.equal(webglHarness.isContextLost, true);

    // 4. Mount fresh instance on /register
    const registerStarParticles = WebGLCelestialHarness.generateStarParticles(1500);
    assert.equal(registerStarParticles.hasValidBuffers, true);
  });
});
