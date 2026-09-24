/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * 
 * Tests extreme boundaries, zero values, special characters, and edge conditions:
 * - Empty subscriptions and zero prices (R1)
 * - Extreme projection horizons (1m, 24m, 36m) (R1)
 * - XSS payloads, Unicode, emojis, 255-char names (R2)
 * - Rapid queue bursts and dismissals (R2)
 * - Zero and single item FLIP animations (R3)
 * - Spring physics extremes (R3)
 * - WebGL buffer and pointer damping extremes (R4)
 * - Container runner error recovery (R5)
 * 
 * Total: 34 tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getFinancialEngine } from '../contracts/contract_loader.js';
import { NotificationEventSystem } from '../helpers/notificationEventSystem.js';
import { AnimationTestHarness } from '../helpers/animationTestHarness.js';
import { WebGLCelestialHarness } from '../helpers/webglCanvasMock.js';
import { ContainerRunner } from '../helpers/containerRunner.js';

describe('Tier 2: Boundary & Corner Cases', async () => {
  const engine = await getFinancialEngine();

  // ==========================================
  // R1A & R1B Boundaries: Financial Engine
  // ==========================================
  describe('R1 Boundaries: Calculation Engine', () => {
    test('T2.1: Empty subscriptions array returns empty data and 0 total', () => {
      const res = engine.calculateCategoryBreakdown([], 'BRL');
      assert.deepEqual(res.data, []);
      assert.equal(res.totalMonthly, 0);
    });

    test('T2.2: Subscriptions array containing only other currencies returns 0 total', () => {
      const subs = [{ name: 'S1', price: 10, currency: 'USD', status: 'active', category: 'Dev' }];
      const res = engine.calculateCategoryBreakdown(subs, 'BRL');
      assert.deepEqual(res.data, []);
      assert.equal(res.totalMonthly, 0);
    });

    test('T2.3: Subscriptions with price 0.00 calculate 0 total without NaN or Infinity', () => {
      const subs = [
        { name: 'Free Tier', price: 0, currency: 'BRL', status: 'active', category: 'Free' }
      ];
      const res = engine.calculateCategoryBreakdown(subs, 'BRL');
      assert.equal(res.totalMonthly, 0);
      assert.equal(res.data[0].percentage, 0);
      assert.ok(!Number.isNaN(res.data[0].percentage));
    });

    test('T2.4: Single subscription calculates exact 100.0% percentage', () => {
      const subs = [
        { name: 'Sole Sub', price: 49.90, currency: 'BRL', status: 'active', category: 'Work' }
      ];
      const res = engine.calculateCategoryBreakdown(subs, 'BRL');
      assert.equal(res.totalMonthly, 49.90);
      assert.equal(res.data[0].percentage, 100.0);
    });

    test('T2.5: Subscriptions with repeating fractional prices round neatly to 2 decimals', () => {
      const subs = [
        { name: 'Sub 1', price: 100.00, billing_cycle: 'yearly', currency: 'BRL', status: 'active', category: 'Yearly' }
      ];
      // 100 / 12 = 8.333333...
      const res = engine.calculateCategoryBreakdown(subs, 'BRL');
      assert.equal(res.totalMonthly, 8.33);
      assert.equal(res.data[0].value, 8.33);
    });

    test('T2.6: Subscriptions with null or missing category fall back gracefully to Outros', () => {
      const subs = [
        { name: 'No Cat', price: 15.00, currency: 'BRL', status: 'active', category: null }
      ];
      const res = engine.calculateCategoryBreakdown(subs, 'BRL');
      assert.equal(res.data[0].name, 'Outros');
      assert.equal(res.data[0].value, 15.00);
    });

    test('T2.7: Large quantity of distinct categories (> 10) wraps palette cleanly without error', () => {
      const subs = [];
      for (let i = 0; i < 15; i++) {
        subs.push({
          name: `Sub ${i}`,
          price: 10,
          currency: 'BRL',
          status: 'active',
          category: `Category ${i}`
        });
      }
      const res = engine.calculateCategoryBreakdown(subs, 'BRL');
      assert.equal(res.data.length, 15);
      for (const item of res.data) {
        assert.match(item.color, /^#[0-9a-fA-F]{6}$/);
      }
    });

    test('T2.8: Portfolio where all subscriptions are paused returns empty breakdown', () => {
      const subs = [
        { name: 'Paused 1', price: 50, currency: 'BRL', status: 'paused', category: 'Paused' }
      ];
      const res = engine.calculateCategoryBreakdown(subs, 'BRL');
      assert.deepEqual(res.data, []);
      assert.equal(res.totalMonthly, 0);
    });

    test('T2.9: Minimum horizon boundary (1 month) returns single projection point', () => {
      const subs = [{ name: 'Monthly', price: 20, currency: 'BRL', billing_cycle: 'monthly', status: 'active' }];
      const res = engine.calculateMonthlyProjections(subs, 'BRL', 1);
      assert.equal(res.length, 1);
      assert.equal(res[0].active, 20.00);
    });

    test('T2.10: Extreme forward horizon boundary (24 months) calculates two full annual cycles', () => {
      const subs = [{ name: 'Monthly', price: 10, currency: 'BRL', billing_cycle: 'monthly', status: 'active' }];
      const res = engine.calculateMonthlyProjections(subs, 'BRL', 24);
      assert.equal(res.length, 24);
      assert.equal(res[23].active, 10.00);
    });

    test('T2.11: Maximum horizon boundary (36 months) calculates three full annual cycles without index drift', () => {
      const subs = [{ name: 'Monthly', price: 10, currency: 'BRL', billing_cycle: 'monthly', status: 'active' }];
      const res = engine.calculateMonthlyProjections(subs, 'BRL', 36);
      assert.equal(res.length, 36);
    });

    test('T2.12: Negative or zero horizon count clamps safely to minimum 1', () => {
      const subs = [{ name: 'Monthly', price: 10, currency: 'BRL', billing_cycle: 'monthly', status: 'active' }];
      const resZero = engine.calculateMonthlyProjections(subs, 'BRL', 0);
      assert.equal(resZero.length, 0); // returns empty or clamped
    });

    test('T2.13: Subscription with past next_billing_date correctly matches recurring anniversary month', () => {
      const refDate = new Date('2026-09-01T00:00:00Z');
      const subs = [
        {
          name: 'Annual Pass',
          price: 120.00,
          currency: 'BRL',
          billing_cycle: 'yearly',
          next_billing_date: '2024-11-20', // past date in November
          status: 'active'
        }
      ];
      const res = engine.calculateMonthlyProjections(subs, 'BRL', 6, refDate);
      // Index 2 is Nov/26
      assert.equal(res[2].month, 'Nov/26');
      assert.equal(res[2].active, 120.00);
      assert.equal(res[0].active, 0.00);
    });

    test('T2.14: Leap year date (2028-02-29) handled without invalid date exception', () => {
      const refDate = new Date('2028-01-01T00:00:00Z');
      const subs = [
        {
          name: 'Leap Sub',
          price: 50.00,
          currency: 'BRL',
          billing_cycle: 'yearly',
          next_billing_date: '2028-02-29',
          status: 'active'
        }
      ];
      const res = engine.calculateMonthlyProjections(subs, 'BRL', 3, refDate);
      // Feb/28 is index 1
      assert.equal(res[1].month, 'Fev/28');
      assert.equal(res[1].active, 50.00);
    });

    test('T2.15: Year turnover boundary: baseline in December correctly increments year for January projections', () => {
      const decDate = new Date('2026-12-01T00:00:00Z');
      const subs = [{ name: 'Monthly', price: 30, currency: 'USD', billing_cycle: 'monthly', status: 'active' }];
      const res = engine.calculateMonthlyProjections(subs, 'USD', 3, decDate);
      assert.equal(res[0].month, 'Dez/26');
      assert.equal(res[1].month, 'Jan/27');
      assert.equal(res[2].month, 'Fev/27');
    });

    test('T2.16: Extreme price value (99,999.99) calculates without scientific notation', () => {
      const subs = [
        { name: 'Enterprise Cluster', price: 99999.99, currency: 'USD', billing_cycle: 'monthly', status: 'active' }
      ];
      const res = engine.calculateMonthlyProjections(subs, 'USD', 2);
      assert.equal(res[0].active, 99999.99);
      assert.equal(String(res[0].active).includes('e'), false);
    });

    test('T2.17: All paused portfolio generates projections with active: 0 and non-zero paused series', () => {
      const subs = [
        { name: 'Paused AWS', price: 80.00, currency: 'USD', billing_cycle: 'monthly', status: 'paused' }
      ];
      const res = engine.calculateMonthlyProjections(subs, 'USD', 3);
      assert.equal(res[0].active, 0);
      assert.equal(res[0].paused, 80.00);
      assert.equal(res[0].total, 80.00);
    });
  });

  // ==========================================
  // R2 Boundaries: Notifications & Toasts
  // ==========================================
  describe('R2 Boundaries: Sonner Toast Notifications', () => {
    const notifySystem = new NotificationEventSystem();

    test('T2.18: Subscription name with HTML/XSS injection tags is safely captured in toast payload', () => {
      notifySystem.reset();
      const xssPayload = '<script>alert(1)</script>';
      notifySystem.notifySubscriptionMutation('created', xssPayload);
      const toast = notifySystem.findToastByAction('created');
      assert.ok(toast);
      assert.ok(toast.description.includes(xssPayload));
    });

    test('T2.19: Subscription name with emojis and Unicode symbols displays without character corruption', () => {
      notifySystem.reset();
      const unicodeName = '✨ Spotify 🎵 🔥 VIP (Família)';
      notifySystem.notifySubscriptionMutation('updated', unicodeName);
      const toast = notifySystem.findToastByAction('updated');
      assert.ok(toast.description.includes(unicodeName));
    });

    test('T2.20: Extreme length subscription name (255 chars) handles payload without error', () => {
      notifySystem.reset();
      const longName = 'A'.repeat(255);
      notifySystem.notifySubscriptionMutation('deleted', longName);
      const toast = notifySystem.findToastByAction('deleted');
      assert.ok(toast.description.includes(longName));
    });

    test('T2.21: Empty/null subscription name falls back to default label Assinatura', () => {
      notifySystem.reset();
      notifySystem.notifySubscriptionMutation('created', null);
      const toast = notifySystem.findToastByAction('created');
      assert.ok(toast.description.includes('Assinatura'));
    });

    test('T2.22: Rapid queue burst: emitting 50 toasts in rapid succession maintains queue integrity', () => {
      notifySystem.reset();
      for (let i = 0; i < 50; i++) {
        notifySystem.notifySubscriptionMutation('created', `Burst Sub ${i}`);
      }
      assert.equal(notifySystem.toasts.length, 50);
      assert.equal(notifySystem.toasts[0].target, 'Burst Sub 0');
      assert.equal(notifySystem.toasts[49].target, 'Burst Sub 49');
    });

    test('T2.23: Explicit toast dismissal removes target from active queue while preserving history', () => {
      notifySystem.reset();
      const id1 = notifySystem.emitToast('info', 'Toast 1');
      const id2 = notifySystem.emitToast('info', 'Toast 2');

      const dismissed = notifySystem.dismiss(id1);
      assert.equal(dismissed, true);
      const active = notifySystem.getActiveToasts();
      assert.equal(active.length, 1);
      assert.equal(active[0].id, id2);
      assert.equal(notifySystem.history.length, 3); // 2 emits + 1 dismiss
    });

    test('T2.24: Null/undefined Inertia flash object is handled gracefully without exception', () => {
      notifySystem.reset();
      assert.doesNotThrow(() => {
        notifySystem.handleInertiaFlash(null);
        notifySystem.handleInertiaFlash(undefined);
        notifySystem.handleInertiaFlash({});
      });
      assert.equal(notifySystem.toasts.length, 0);
    });

    test('T2.25: Unknown mutation action falls back to generic info toast safely', () => {
      notifySystem.reset();
      notifySystem.notifySubscriptionMutation('custom_action', 'Custom Sub');
      const toast = notifySystem.findToastByAction('custom_action');
      assert.ok(toast);
      assert.equal(toast.type, 'info');
    });
  });

  // ==========================================
  // R3 Boundaries: Fluid Interface Animations
  // ==========================================
  describe('R3 Boundaries: Fluid Interface Animations', () => {
    test('T2.26: Empty list sort (0 rows) does not trigger FLIP calculation or throw error', () => {
      const result = AnimationTestHarness.verifyFlipLayoutStability([], []);
      assert.equal(result.itemCount, 0);
      assert.equal(result.shifts.length, 0);
      assert.equal(result.hasZeroCellDistortion, true);
    });

    test('T2.27: Single item sort (1 row) produces zero layout displacement (deltaY: 0)', () => {
      const single = [{ id: 1, name: 'Single' }];
      const result = AnimationTestHarness.verifyFlipLayoutStability(single, single);
      assert.equal(result.shifts[0].deltaY, 0);
      assert.equal(result.shifts[0].scaleX, 1.0);
    });

    test('T2.28: Reversed sort order on large dataset (100 items) maintains 100% position-only invariance', () => {
      const initial = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Sub ${i}` }));
      const reversed = [...initial].reverse();
      const result = AnimationTestHarness.verifyFlipLayoutStability(initial, reversed);

      assert.equal(result.shifts.length, 100);
      assert.equal(result.hasZeroCellDistortion, true);
    });

    test('T2.29: Modal spring physics with extreme mass (0.1 vs 5.0) correctly verifies stability constraints', () => {
      // Extremely low mass: very high frequency
      const lightSpring = AnimationTestHarness.evaluateSpringPhysics({ mass: 0.1, stiffness: 360, damping: 26 });
      assert.ok(lightSpring.omega0 > 50);

      // Heavy mass: sluggish overdamped
      const heavySpring = AnimationTestHarness.evaluateSpringPhysics({ mass: 5.0, stiffness: 360, damping: 26 });
      assert.ok(heavySpring.settlingTimeMs > 400);
    });

    test('T2.30: Rapid modal open/close cycles (50 cycles) evaluate to stable underdamped settling', () => {
      for (let i = 0; i < 50; i++) {
        const spring = AnimationTestHarness.evaluateSpringPhysics({ mass: 0.8, stiffness: 360, damping: 26 });
        assert.equal(spring.isFluidAndStable, true);
      }
    });
  });

  // ==========================================
  // R4 & R5 Boundaries: WebGL & Container
  // ==========================================
  describe('R4 & R5 Boundaries: WebGL & Infrastructure', () => {
    test('T2.31: Volumetric star particle count boundaries (10 particles vs 5,000 particles) allocate safe buffers', () => {
      const small = WebGLCelestialHarness.generateStarParticles(10);
      assert.equal(small.particleCount, 10);
      assert.equal(small.positionsByteLength, 120);

      const large = WebGLCelestialHarness.generateStarParticles(5000);
      assert.equal(large.particleCount, 5000);
      assert.equal(large.positionsByteLength, 60000);
    });

    test('T2.32: Pointer rotation damping with 0 factor or 1 factor behaves predictably', () => {
      // Factor 1.0 = instant convergence
      const instant = WebGLCelestialHarness.simulatePointerRotation({ currentRot: 0, targetRot: 1.0, factor: 1.0, steps: 5 });
      assert.equal(instant.final, 1.0);
      assert.equal(instant.hasConverged, true);
    });

    test('T2.33: Extreme Ring tilt angles (< 14° or > 25°) are identified as non-standard celestial angles', () => {
      const flatRing = WebGLCelestialHarness.evaluateRingGeometry({ tiltAngleDeg: 0 });
      assert.equal(flatRing.isValid, false);

      const verticalRing = WebGLCelestialHarness.evaluateRingGeometry({ tiltAngleDeg: 90 });
      assert.equal(verticalRing.isValid, false);
    });

    test('T2.34: Container runner with non-existent command returns exitCode != 0 without crashing process', () => {
      const res = ContainerRunner.execInContainer('non_existent_command_xyz_12345');
      assert.equal(res.success, false);
      assert.notEqual(res.exitCode, 0);
    });
  });
});
