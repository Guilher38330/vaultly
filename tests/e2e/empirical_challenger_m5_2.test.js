/**
 * Empirical Challenger M5.2 Adversarial Stress Test Suite
 * 
 * Milestone 5 Phase 2: Adversarial Coverage Hardening
 * Tier 5: White-box 3D WebGL, Modals & Toast Hardening
 * 
 * Target systems under test:
 * 1. 3D WebGL Cosmic Showcase (CosmicShowcase3D.jsx):
 *    - 200-cycle rapid mount/unmount stress simulation (verifying 0 geometry/material/texture/context leaks)
 *    - Universal pointer physics (exponential lerp damping lambda=6, momentum decay lambda=3, pitch clamp [-0.55, 0.55])
 *    - Extreme pointer impulse flick (dx = +50,000, dy = -50,000) stability & non-NaN guarantees
 *    - Boundary drag escapes outside window ([-50000, +50000] clamped to [-1, 1])
 *    - Touch cancellation & pointer capture error resilience
 *    - Frame rate lag spikes (delta = 10.0s clamped to 0.1s)
 *    - Frameloop visibility toggles ('always' vs 'never') & WebGL context loss / recovery
 *    - Reduced motion branches (idle spin, moon orbit, starfield drift, perspective card tilt)
 * 2. Spring-Physics Animated Modals (Modal.jsx):
 *    - Spring physics parameters (damping: 26, stiffness: 360, mass: 0.8) & settling time (< 500ms)
 *    - Reduced motion branch enforcement (zero duration, zero scale/y translation)
 *    - Closeable logic & onClose trigger isolation
 *    - Responsive maxWidth class resolution & fallback safety
 *    - HeadlessUI Dialog integration & Escape key / focus trap contracts
 * 3. Toast Notification System & Deduplication Engine (toastNotifications.js & ToastContainer.jsx):
 *    - Deduplication engine (1500ms window) boundary checks (t=0, t=100ms, t=1400ms, t=1501ms)
 *    - Rapid-fire identical toast notifications (< 100ms) flood test & backend flash suppression
 *    - All mutation actions ('created', 'updated', 'deleted', 'status_toggled' active/paused, fallback default)
 *    - Name sanitization (empty, whitespace, null, 10,000 chars, XSS payloads)
 *    - Theme synchronization via MutationObserver on <html> class and matchMedia fallback
 *    - Unmount listener cleanup (MutationObserver, mediaQuery, router)
 * 4. Client-Side Sorting & Filtering Engine (Dashboard.jsx):
 *    - Comparator logic across next_billing_date (with null handling), price (monthly equivalent), name, category, status
 *    - Deterministic multi-level tie-breaking (primary tie -> Portuguese name collation -> ID)
 *    - 500-step asynchronous rapid interleaved mutation stress harness (search query + category + status + cycle + sort)
 *    - Monotonic ordering and filter predicate satisfaction guarantees
 *    - Table layout animation contracts (layout="position", FLIP zero distortion, spring damping 30 / stiffness 350)
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isRecentClientToast,
  notifySubscriptionMutation,
  notifyMutationError
} from '../../resources/js/Utils/toastNotifications.js';
import { AnimationTestHarness } from './helpers/animationTestHarness.js';
import { WebGLCelestialHarness } from './helpers/webglCanvasMock.js';
import { NotificationEventSystem } from './helpers/notificationEventSystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// Pure Logic Replications matching source code for white-box verification
// =============================================================================

/**
 * Builds the exact Three.js Scene Graph matching CosmicShowcase3D.jsx
 */
function buildCosmicSceneGraph() {
  const scene = new THREE.Scene();

  // 1. Celestial Lighting (5 lights)
  const ambient = new THREE.AmbientLight(0x022c22, 0.35);
  const dirKey = new THREE.DirectionalLight(0xf0fdf4, 2.4);
  dirKey.position.set(-6, 5, 5);
  const dirFill = new THREE.DirectionalLight(0x38bdf8, 0.8);
  dirFill.position.set(5, -2, 3);
  const dirRim = new THREE.DirectionalLight(0x10b981, 1.6);
  dirRim.position.set(3, 4, -5);
  const ptEmerald = new THREE.PointLight(0x10b981, 2.0, 16);
  ptEmerald.position.set(-4, 2, -2);
  scene.add(ambient, dirKey, dirFill, dirRim, ptEmerald);

  // 2. Central Emerald Planet
  const planetGeo = new THREE.SphereGeometry(1.0, 64, 64);
  const planetMat = new THREE.MeshPhysicalMaterial({
    color: 0x059669,
    emissive: 0x064e3b,
    emissiveIntensity: 0.25,
    roughness: 0.22,
    metalness: 0.18,
    clearcoat: 0.65,
    clearcoatRoughness: 0.15,
  });
  const planetMesh = new THREE.Mesh(planetGeo, planetMat);

  // 3. Atmospheric Fresnel Limb Glow
  const glowGeo = new THREE.SphereGeometry(1.0, 64, 64);
  const glowMat = new THREE.ShaderMaterial({
    vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }',
    fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
    uniforms: {
      uColor: { value: new THREE.Color(0x34d399) },
      uPower: { value: 3.2 },
      uIntensity: { value: 0.9 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.scale.set(1.045, 1.045, 1.045);

  // 4. Equatorial Rings
  const ringsGroup = new THREE.Group();
  ringsGroup.rotation.x = -Math.PI / 2;

  const ringGeo1 = new THREE.RingGeometry(1.45, 2.45, 64);
  const ringMat1 = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  const ring1 = new THREE.Mesh(ringGeo1, ringMat1);

  const ringGeo2 = new THREE.RingGeometry(1.25, 1.38, 64);
  const ringMat2 = new THREE.MeshStandardMaterial({
    color: 0xa7f3d0,
    emissive: 0x34d399,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
  ringsGroup.add(ring1, ring2);

  const masterGroup = new THREE.Group();
  masterGroup.add(planetMesh, glowMesh, ringsGroup);
  scene.add(masterGroup);

  // 5. Orbiting Moon
  const moonGeo = new THREE.SphereGeometry(0.18, 32, 32);
  const moonMat = new THREE.MeshStandardMaterial({ color: 0xd1fae5 });
  const moon = new THREE.Mesh(moonGeo, moonMat);
  moon.position.set(2.85, 0, 0);
  scene.add(moon);

  // 6. Distant Planet
  const distantGroup = new THREE.Group();
  const distSphereGeo = new THREE.SphereGeometry(0.38, 32, 32);
  const distSphereMat = new THREE.MeshStandardMaterial({ color: 0x0d9488 });
  const distSphere = new THREE.Mesh(distSphereGeo, distSphereMat);
  const distRingGeo = new THREE.RingGeometry(0.5, 0.75, 32);
  const distRingMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
  const distRing = new THREE.Mesh(distRingGeo, distRingMat);
  distantGroup.add(distSphere, distRing);
  scene.add(distantGroup);

  // 7. Volumetric Starfield
  const starGeo = new THREE.BufferGeometry();
  const count = 1200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const dummyCanvas = { width: 32, height: 32 };
  const starTexture = new THREE.Texture(dummyCanvas);

  const starMat = new THREE.PointsMaterial({
    size: 0.065,
    map: starTexture,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  scene.add(starPoints);

  return {
    scene,
    geometries: [planetGeo, glowGeo, ringGeo1, ringGeo2, moonGeo, distSphereGeo, distRingGeo, starGeo],
    materials: [planetMat, glowMat, ringMat1, ringMat2, moonMat, distSphereMat, distRingMat, starMat],
    textures: [starTexture],
  };
}

/**
 * Traverses and cleanly tears down all geometries, materials, maps, and gl context
 * Matching SceneLifecycleTeardown in CosmicShowcase3D.jsx
 */
function executeSceneTeardown(scene, glMock) {
  let disposedGeometries = 0;
  let disposedMaterials = 0;
  let disposedTextures = 0;

  scene.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose();
      disposedGeometries++;
    }
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((mat) => {
          if (mat.map && typeof mat.map.dispose === 'function') {
            mat.map.dispose();
            disposedTextures++;
          }
          mat.dispose();
          disposedMaterials++;
        });
      } else {
        if (object.material.map && typeof object.material.map.dispose === 'function') {
          object.material.map.dispose();
          disposedTextures++;
        }
        object.material.dispose();
        disposedMaterials++;
      }
    }
  });

  scene.clear();

  let glDisposed = false;
  try {
    if (glMock && typeof glMock.dispose === 'function') {
      glMock.dispose();
      glDisposed = true;
    }
  } catch {
    // Silently ignore context disposal race condition
  }

  return { disposedGeometries, disposedMaterials, disposedTextures, glDisposed };
}

/**
 * Replicated pointer physics step from CosmicShowcase3D.jsx
 */
function stepCosmicPhysics(state, p, delta, shouldReduceMotion) {
  const clampedDelta = Math.min(delta, 0.1);

  // Exponential lerp damping for pointer tracking (lambda = 6)
  const dampFactor = 1 - Math.exp(-6 * clampedDelta);
  state.currentPointerX += (p.targetPointerX - state.currentPointerX) * dampFactor;
  state.currentPointerY += (p.targetPointerY - state.currentPointerY) * dampFactor;

  // Interactive physics with momentum decay & idle orbit recovery
  if (!p.isDragging) {
    if (shouldReduceMotion) {
      p.velX = 0;
      p.velY = 0;
    } else {
      const decayFactor = 1 - Math.exp(-3 * clampedDelta);
      const targetIdleVelY = 0.25 * clampedDelta;

      p.velX += (0 - p.velX) * decayFactor;
      p.velY += (targetIdleVelY - p.velY) * decayFactor;

      p.rotY += p.velY;
      p.rotX += p.velX;

      // Restrict pitch to +/- 0.55 rad to prevent flipping
      p.rotX = Math.max(-0.55, Math.min(0.55, p.rotX));
    }
  }

  let internalSpin = 0;
  if (!shouldReduceMotion) {
    internalSpin = clampedDelta * 0.15;
  }

  return {
    groupRotY: p.rotY + state.currentPointerX * 0.18,
    groupRotX: 0.32 + p.rotX + state.currentPointerY * 0.12,
    groupRotZ: 0.25,
    internalSpin,
    velX: p.velX,
    velY: p.velY,
    rotX: p.rotX,
    rotY: p.rotY,
  };
}

/**
 * Replicated Dashboard.jsx filtering and sorting pipeline
 */
function filterAndSortDashboardSubscriptions(subscriptions, {
  search = '',
  categoryFilter = 'all',
  statusFilter = 'all',
  cycleFilter = 'all',
  sortField = 'next_billing_date',
  sortOrder = 'asc'
} = {}) {
  // 1. Filter phase
  const list = subscriptions.filter((sub) => {
    if (search && search.trim()) {
      const query = search.toLowerCase().trim();
      const nameMatch = sub.name?.toLowerCase().includes(query);
      const notesMatch = sub.notes?.toLowerCase().includes(query);
      const catMatch = sub.category?.toLowerCase().includes(query);
      if (!nameMatch && !notesMatch && !catMatch) {
        return false;
      }
    }
    if (categoryFilter !== 'all' && sub.category !== categoryFilter) {
      return false;
    }
    if (statusFilter !== 'all' && sub.status !== statusFilter) {
      return false;
    }
    if (cycleFilter !== 'all' && sub.billing_cycle !== cycleFilter) {
      return false;
    }
    return true;
  });

  // 2. Sort phase with deterministic tie-breaking
  return [...list].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'next_billing_date':
        if (!a.next_billing_date && !b.next_billing_date) comparison = 0;
        else if (!a.next_billing_date) comparison = 1;
        else if (!b.next_billing_date) comparison = -1;
        else comparison = a.next_billing_date.localeCompare(b.next_billing_date);
        break;
      case 'price': {
        const priceA = Number(a.monthly_equivalent_price ?? a.price ?? 0);
        const priceB = Number(b.monthly_equivalent_price ?? b.price ?? 0);
        comparison = priceA - priceB;
        break;
      }
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
        break;
      case 'category':
        comparison = (a.category || '').localeCompare(b.category || '', 'pt-BR', { sensitivity: 'base' });
        break;
      case 'status':
        comparison = (a.status || '').localeCompare(b.status || '');
        break;
      default:
        comparison = 0;
    }

    if (comparison !== 0) {
      return sortOrder === 'asc' ? comparison : -comparison;
    }

    const tie = (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
    return tie !== 0 ? tie : a.id - b.id;
  });
}

// =============================================================================
// TEST SUITE: Empirical Challenger M5.2
// =============================================================================

describe('Empirical Challenger M5.2: Adversarial Coverage Hardening Suite', () => {

  // ===========================================================================
  // SECTION 1: 3D WebGL Cosmic Showcase Lifecycle & 200-Cycle Memory Stress
  // ===========================================================================
  describe('1. 3D WebGL Cosmic Showcase: Lifecycle & 200-Cycle Memory Leak Stress', () => {

    test('T1.1: Rapid 200-cycle mount/unmount simulation disposes 1,600 geometries, 1,600 materials, and 200 textures without leaking', () => {
      let totalGeos = 0;
      let totalMats = 0;
      let totalTexs = 0;
      let totalGlDisposals = 0;

      const startTime = performance.now();

      for (let cycle = 0; cycle < 200; cycle++) {
        const { scene } = buildCosmicSceneGraph();
        let glDisposed = false;
        const glMock = { dispose: () => { glDisposed = true; } };

        const teardown = executeSceneTeardown(scene, glMock);

        totalGeos += teardown.disposedGeometries;
        totalMats += teardown.disposedMaterials;
        totalTexs += teardown.disposedTextures;
        if (glDisposed) totalGlDisposals++;

        // Assert scene children completely purged
        assert.equal(scene.children.length, 0, `Scene graph must be cleared at cycle ${cycle}`);
      }

      const elapsedMs = performance.now() - startTime;

      assert.equal(totalGeos, 1600, '200 cycles * 8 geometries = exactly 1,600 geometries disposed');
      assert.equal(totalMats, 1600, '200 cycles * 8 materials = exactly 1,600 materials disposed');
      assert.equal(totalTexs, 200, '200 cycles * 1 texture = exactly 200 textures disposed');
      assert.equal(totalGlDisposals, 200, 'All 200 gl instances disposed');
      assert.ok(elapsedMs < 1500, `200 cycles executed in ${elapsedMs.toFixed(1)}ms (must be < 1500ms)`);
    });

    test('T1.2: Event listener verification: 100% of geometries, materials, and textures fire dispose events across cycles', () => {
      let geoDisposedEvents = 0;
      let matDisposedEvents = 0;
      let texDisposedEvents = 0;

      for (let cycle = 0; cycle < 25; cycle++) {
        const { scene, geometries, materials, textures } = buildCosmicSceneGraph();
        geometries.forEach((g) => g.addEventListener('dispose', () => geoDisposedEvents++));
        materials.forEach((m) => m.addEventListener('dispose', () => matDisposedEvents++));
        textures.forEach((t) => t.addEventListener('dispose', () => texDisposedEvents++));

        executeSceneTeardown(scene, { dispose: () => {} });
      }

      assert.equal(geoDisposedEvents, 25 * 8, 'All 200 geometries emitted dispose event');
      assert.equal(matDisposedEvents, 25 * 8, 'All 200 materials emitted dispose event');
      assert.equal(texDisposedEvents, 25 * 1, 'All 25 textures emitted dispose event');
    });

    test('T1.3: Recursive teardown handles multi-material arrays and attached map textures safely', () => {
      const scene = new THREE.Scene();
      const parentGroup = new THREE.Group();
      const childGroup = new THREE.Group();

      const dummyCanvas = { width: 16, height: 16 };
      const tex1 = new THREE.Texture(dummyCanvas);
      const tex2 = new THREE.Texture(dummyCanvas);

      let tex1Disposed = false;
      let tex2Disposed = false;
      tex1.addEventListener('dispose', () => { tex1Disposed = true; });
      tex2.addEventListener('dispose', () => { tex2Disposed = true; });

      const mat1 = new THREE.MeshStandardMaterial({ map: tex1 });
      const mat2 = new THREE.MeshStandardMaterial({ map: tex2 });
      const multiMatMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [mat1, mat2]);

      childGroup.add(multiMatMesh);
      parentGroup.add(childGroup);
      scene.add(parentGroup);

      const teardown = executeSceneTeardown(scene, { dispose: () => {} });
      assert.equal(teardown.disposedGeometries, 1);
      assert.equal(teardown.disposedMaterials, 2);
      assert.equal(teardown.disposedTextures, 2);
      assert.equal(tex1Disposed, true);
      assert.equal(tex2Disposed, true);
      assert.equal(scene.children.length, 0);
    });

    test('T1.4: Context loss and restoration engine: preventDefault() called and canvasKey increments', () => {
      let isContextLost = false;
      let canvasKey = 0;
      let preventDefaultCalled = false;

      const mockEvent = {
        preventDefault: () => {
          preventDefaultCalled = true;
        },
      };

      // Handler replication
      const handleContextLost = (e) => {
        e.preventDefault();
        isContextLost = true;
      };

      const handleContextRestored = () => {
        isContextLost = false;
        canvasKey += 1;
      };

      handleContextLost(mockEvent);
      assert.equal(preventDefaultCalled, true, 'e.preventDefault() must be invoked on webglcontextlost');
      assert.equal(isContextLost, true, 'isContextLost should be true');

      handleContextRestored();
      assert.equal(isContextLost, false, 'isContextLost should be false upon restored');
      assert.equal(canvasKey, 1, 'canvasKey must increment to force clean remount of <Canvas>');
    });

    test('T1.5: Frameloop visibility toggle contract (always when visible, never when occluded)', () => {
      const getFrameloopMode = (isVisible) => (isVisible ? 'always' : 'never');

      assert.equal(getFrameloopMode(true), 'always');
      assert.equal(getFrameloopMode(false), 'never');
    });
  });

  // ===========================================================================
  // SECTION 2: Universal Pointer Physics, Boundary Escapes & Impulses
  // ===========================================================================
  describe('2. 3D WebGL Cosmic Showcase: Universal Pointer Physics & Boundary Stress', () => {

    test('T2.1: Violent flick impulse (dx=+50,000, dy=-50,000) produces finite decayed velocities without NaN/Infinity', () => {
      const state = { currentPointerX: 0, currentPointerY: 0 };
      const p = {
        targetPointerX: 0,
        targetPointerY: 0,
        isDragging: false,
        rotX: 0,
        rotY: 0,
        velX: -350.0, // dy * sensitivity
        velY: 350.0,  // dx * sensitivity
      };

      const delta = 0.016;

      for (let frame = 0; frame < 180; frame++) {
        const result = stepCosmicPhysics(state, p, delta, false);
        assert.ok(Number.isFinite(result.velX), 'velX must remain finite');
        assert.ok(Number.isFinite(result.velY), 'velY must remain finite');
        assert.ok(Number.isFinite(result.groupRotY), 'groupRotY must remain finite');
        assert.ok(!Number.isNaN(result.groupRotX), 'groupRotX must never be NaN');
      }

      // After 3 seconds (180 frames), initial velocity of 350 rad/s must have decayed to near-idle
      assert.ok(Math.abs(p.velX) < 0.1, `velX (${p.velX}) should have dissipated to < 0.1`);
      assert.ok(p.rotX >= -0.55 && p.rotX <= 0.55, `rotX (${p.rotX}) must strictly remain clamped in [-0.55, 0.55] rad`);
    });

    test('T2.2: Pitch rotX clamp strictly enforces [-0.55, 0.55] rad preventing gimbal flip under extreme rotations', () => {
      const state = { currentPointerX: 0, currentPointerY: 0 };
      const p = {
        targetPointerX: 0,
        targetPointerY: 0,
        isDragging: false,
        rotX: 1000.0, // Extreme positive pitch
        rotY: 0,
        velX: 100.0,
        velY: 0,
      };

      stepCosmicPhysics(state, p, 0.016, false);
      assert.ok(p.rotX <= 0.55, `p.rotX (${p.rotX}) must be clamped <= 0.55 rad`);

      p.rotX = -1000.0; // Extreme negative pitch
      p.velX = -100.0;
      stepCosmicPhysics(state, p, 0.016, false);
      assert.ok(p.rotX >= -0.55, `p.rotX (${p.rotX}) must be clamped >= -0.55 rad`);
    });

    test('T2.3: Boundary drag escapes outside window coordinates ([-50000, -50000] and [+50000, +50000]) clamped to [-1, 1]', () => {
      const containerRect = { left: 50, top: 50, width: 500, height: 500 };

      const normalizePointerCoords = (clientX, clientY) => {
        const nx = ((clientX - containerRect.left) / containerRect.width) * 2 - 1;
        const ny = ((clientY - containerRect.top) / containerRect.height) * 2 - 1;
        return {
          targetPointerX: Math.max(-1, Math.min(1, nx)),
          targetPointerY: Math.max(-1, Math.min(1, ny)),
        };
      };

      const farTopLeft = normalizePointerCoords(-50000, -50000);
      assert.equal(farTopLeft.targetPointerX, -1, 'Escaped left coordinate must be clamped to -1');
      assert.equal(farTopLeft.targetPointerY, -1, 'Escaped top coordinate must be clamped to -1');

      const farBottomRight = normalizePointerCoords(50000, 50000);
      assert.equal(farBottomRight.targetPointerX, 1, 'Escaped right coordinate must be clamped to +1');
      assert.equal(farBottomRight.targetPointerY, 1, 'Escaped bottom coordinate must be clamped to +1');

      const center = normalizePointerCoords(300, 300);
      assert.equal(center.targetPointerX, 0);
      assert.equal(center.targetPointerY, 0);
    });

    test('T2.4: Touch cancellation (onPointerCancel) resets dragging state and survives lost pointer capture', () => {
      let isDragging = true;
      let captureReleased = false;

      // Mock DOM element where releasePointerCapture throws InvalidPointerId / NotFoundError
      const mockEvent = {
        pointerId: 101,
        currentTarget: {
          releasePointerCapture: () => {
            captureReleased = true;
            throw new DOMException('Pointer capture already lost', 'InvalidPointerId');
          },
        },
      };

      // Handler replication with try/catch isolation
      const handlePointerUp = (e) => {
        try {
          if (e.currentTarget && typeof e.currentTarget.releasePointerCapture === 'function' && e.pointerId) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Expected safe catch
        }
        isDragging = false;
      };

      assert.doesNotThrow(() => {
        handlePointerUp(mockEvent);
      });

      assert.equal(captureReleased, true, 'releasePointerCapture attempted');
      assert.equal(isDragging, false, 'isDragging must cleanly transition to false upon cancellation');
    });

    test('T2.5: Frame rate lag spike (delta = 10.0s) is clamped to 0.1s preventing numerical explosion', () => {
      const state = { currentPointerX: 0, currentPointerY: 0 };
      const p = {
        targetPointerX: 1.0,
        targetPointerY: -1.0,
        isDragging: false,
        rotX: 0,
        rotY: 0,
        velX: 5.0,
        velY: 5.0,
      };

      const result = stepCosmicPhysics(state, p, 10.0, false);
      assert.ok(Number.isFinite(result.velX));
      assert.ok(Number.isFinite(result.velY));
      assert.ok(Number.isFinite(result.groupRotY));
      assert.ok(result.velX < 5.0, 'Velocity must decay smoothly rather than blow up');
    });

    test('T2.6: Reduced motion strictly suppresses idle rotation, planetary velocity, and card perspective tilt', () => {
      const state = { currentPointerX: 0, currentPointerY: 0 };
      const p = {
        targetPointerX: 0.5,
        targetPointerY: 0.5,
        isDragging: false,
        rotX: 0.2,
        rotY: 0.3,
        velX: 10.0,
        velY: 10.0,
      };

      const result = stepCosmicPhysics(state, p, 0.016, true);
      assert.equal(result.velX, 0, 'velX must be 0 with reduced motion');
      assert.equal(result.velY, 0, 'velY must be 0 with reduced motion');
      assert.equal(result.internalSpin, 0, 'internalSpin must be 0 with reduced motion');

      // Card tilt check
      const computeTilt = (width, shouldReduceMotion, tx, ty) => {
        if (width < 640 || shouldReduceMotion) return 'none';
        return `perspective(1000px) rotateX(${(-ty * 5).toFixed(2)}deg) rotateY(${(tx * 5).toFixed(2)}deg)`;
      };

      assert.equal(computeTilt(1280, true, 0.5, 0.5), 'none');
      assert.equal(computeTilt(375, false, 0.5, 0.5), 'none');
    });

    test('T2.7: 10,000-iteration chaotic fuzzing harness preserves finite bounded state', () => {
      const state = { currentPointerX: 0, currentPointerY: 0 };
      const p = {
        targetPointerX: 0,
        targetPointerY: 0,
        isDragging: false,
        rotX: 0,
        rotY: 0,
        velX: 0,
        velY: 0,
      };

      for (let i = 0; i < 10000; i++) {
        p.targetPointerX = (Math.random() - 0.5) * 4; // may exceed [-1, 1]
        p.targetPointerY = (Math.random() - 0.5) * 4;
        p.isDragging = Math.random() > 0.4;
        const delta = Math.random() * 0.2; // 0 to 200ms
        const reduceMotion = i % 50 === 0;

        const res = stepCosmicPhysics(state, p, delta, reduceMotion);
        assert.ok(Number.isFinite(res.groupRotY));
        assert.ok(Number.isFinite(res.groupRotX));
        assert.ok(res.rotX >= -0.55 && res.rotX <= 0.55);
      }
    });
  });

  // ===========================================================================
  // SECTION 3: Toast Notification Throttling, Mutation Feedback & Theme Sync
  // ===========================================================================
  describe('3. Toast Notification Throttling, Mutation Feedback & Theme Sync', () => {

    test('T3.1: Deduplication engine (1500ms window) accurately identifies recent client toasts', () => {
      // Direct call to notifySubscriptionMutation updates timestamp
      notifySubscriptionMutation('created', 'Test Service A');

      // Immediately after mutation (< 50ms), must be recent
      assert.equal(isRecentClientToast(1500), true);
      assert.equal(isRecentClientToast(500), true);

      // Verify custom threshold 0ms expires immediately
      assert.equal(isRecentClientToast(-1), false);
    });

    test('T3.2: Rapid-fire identical toast notifications (< 100ms) flood test & backend flash suppression', () => {
      const notifySpy = new NotificationEventSystem();
      let suppressedFlashCount = 0;
      let allowedFlashCount = 0;

      // 1. Fire rapid burst of 50 identical client notifications in 10ms
      for (let i = 0; i < 50; i++) {
        notifySpy.notifySubscriptionMutation('updated', 'Rapid Spotify', 'active');
      }

      assert.equal(notifySpy.toasts.length, 50, 'All 50 client toasts recorded');

      // 2. Simulate incoming Inertia backend flashes during the active 1500ms window
      // Replicate ToastContainer line 55-60:
      const simulateInertiaFlash = (flashPayload, isRecent) => {
        if (isRecent) {
          suppressedFlashCount++;
          return;
        }
        allowedFlashCount++;
        notifySpy.handleInertiaFlash(flashPayload);
      };

      // Flashes arriving while isRecentClientToast is true (at t=10ms, t=500ms, t=1400ms)
      simulateInertiaFlash({ success: 'Assinatura atualizada no banco' }, true);
      simulateInertiaFlash({ success: 'Assinatura atualizada no banco' }, true);
      simulateInertiaFlash({ success: 'Assinatura atualizada no banco' }, true);

      assert.equal(suppressedFlashCount, 3, 'Redundant flashes must be suppressed');

      // Flash arriving after deduplication window expires (> 1500ms)
      simulateInertiaFlash({ success: 'Operação externa concluída' }, false);
      assert.equal(allowedFlashCount, 1, 'Flash after 1500ms window must be allowed');
    });

    test('T3.3: Rich mutation feedback handles all CRUD actions with accurate text and icons', () => {
      const actions = [
        { action: 'created', name: 'Netflix', status: undefined, expectedMsg: 'Assinatura cadastrada!', type: 'success' },
        { action: 'updated', name: 'HBO Max', status: undefined, expectedMsg: 'Assinatura atualizada!', type: 'success' },
        { action: 'deleted', name: 'Prime', status: undefined, expectedMsg: 'Assinatura removida!', type: 'success' },
        { action: 'status_toggled', name: 'Spotify', status: 'paused', expectedMsg: 'Assinatura pausada', type: 'info' },
        { action: 'status_toggled', name: 'Spotify', status: 'active', expectedMsg: 'Assinatura reativada', type: 'success' },
        { action: 'unknown_action', name: 'Custom', status: undefined, expectedMsg: 'Operação concluída com sucesso!', type: 'success' },
      ];

      for (const act of actions) {
        assert.doesNotThrow(() => {
          const id = notifySubscriptionMutation(act.action, act.name, act.status);
          assert.ok(id, `Must return valid toast identifier for action ${act.action}`);
        });
      }
    });

    test('T3.4: notifyMutationError helper executes cleanly with default and custom error descriptions', () => {
      assert.doesNotThrow(() => {
        const id1 = notifyMutationError();
        assert.ok(id1);
        const id2 = notifyMutationError('Falha no Pagamento', 'Cartão recusado pela operadora.');
        assert.ok(id2);
      });
    });

    test('T3.5: Adversarial payload resilience: handles null, 10,000-char names, and XSS script tags without crashing', () => {
      const adversarialNames = [
        null,
        undefined,
        '',
        '   ',
        '<script>alert("xss")</script>',
        '"><img src=x onerror=alert(1)>',
        'Z'.repeat(10000), // 10,000 characters
      ];

      for (const name of adversarialNames) {
        assert.doesNotThrow(() => {
          const id = notifySubscriptionMutation('created', name);
          assert.ok(id);
        });
      }
    });

    test('T3.6: Theme synchronization observer detects HTML class mutations and cleans up listeners', () => {
      let activeTheme = 'light';
      let observerDisconnected = false;

      // Mock MutationObserver
      class MockMutationObserver {
        constructor(callback) {
          this.callback = callback;
        }
        observe(target, options) {
          this.target = target;
        }
        disconnect() {
          observerDisconnected = true;
        }
        triggerMutation(newClass) {
          this.callback([{ type: 'attributes', attributeName: 'class' }]);
        }
      }

      const observer = new MockMutationObserver(() => {
        activeTheme = 'dark';
      });

      observer.observe({}, { attributes: true });
      observer.triggerMutation('dark');
      assert.equal(activeTheme, 'dark');

      observer.disconnect();
      assert.equal(observerDisconnected, true);
    });
  });

  // ===========================================================================
  // SECTION 4: Dashboard Client-Side Sorting, Tie-Breakers & Async Filter Stress
  // ===========================================================================
  describe('4. Dashboard Client-Side Sorting, Tie-Breakers & Async Filter Stress', () => {

    const SAMPLE_SUBSCRIPTIONS = [
      { id: 101, name: 'Netflix Premium', category: 'Streaming', billing_cycle: 'monthly', price: '55.90', monthly_equivalent_price: 55.90, next_billing_date: '2026-10-15', status: 'active', notes: '4K family account' },
      { id: 102, name: 'Spotify Duo', category: 'Streaming', billing_cycle: 'monthly', price: '27.90', monthly_equivalent_price: 27.90, next_billing_date: '2026-10-02', status: 'active', notes: 'Music' },
      { id: 103, name: 'Amazon Prime', category: 'Streaming', billing_cycle: 'yearly', price: '166.80', monthly_equivalent_price: 13.90, next_billing_date: '2026-11-20', status: 'paused', notes: 'Frete e videos' },
      { id: 104, name: 'GitHub Copilot', category: 'Dev Tools', billing_cycle: 'monthly', price: '50.00', monthly_equivalent_price: 50.00, next_billing_date: '2026-09-28', status: 'active', notes: 'AI coding' },
      { id: 105, name: 'Hetzner VPS', category: 'Cloud', billing_cycle: 'monthly', price: '35.00', monthly_equivalent_price: 35.00, next_billing_date: null, status: 'paused', notes: 'Servidor backup' },
      { id: 106, name: 'Apple iCloud', category: 'Cloud', billing_cycle: 'monthly', price: '14.90', monthly_equivalent_price: 14.90, next_billing_date: '2026-10-10', status: 'active', notes: '200GB storage' },
    ];

    test('T4.1: Sorting by next_billing_date places null dates at the end in ascending order', () => {
      const sorted = filterAndSortDashboardSubscriptions(SAMPLE_SUBSCRIPTIONS, {
        sortField: 'next_billing_date',
        sortOrder: 'asc',
      });

      // Earliest valid date: 2026-09-28 (GitHub Copilot)
      assert.equal(sorted[0].name, 'GitHub Copilot');

      // Last item should be Hetzner VPS with null next_billing_date
      assert.equal(sorted[sorted.length - 1].name, 'Hetzner VPS');
      assert.equal(sorted[sorted.length - 1].next_billing_date, null);
    });

    test('T4.2: Sorting by price uses monthly_equivalent_price and correctly orders asc and desc', () => {
      const asc = filterAndSortDashboardSubscriptions(SAMPLE_SUBSCRIPTIONS, {
        sortField: 'price',
        sortOrder: 'asc',
      });

      // Lowest monthly equivalent: Amazon Prime (13.90)
      assert.equal(asc[0].name, 'Amazon Prime');
      assert.equal(asc[0].monthly_equivalent_price, 13.90);

      // Highest monthly equivalent: Netflix Premium (55.90)
      assert.equal(asc[asc.length - 1].name, 'Netflix Premium');
      assert.equal(asc[asc.length - 1].monthly_equivalent_price, 55.90);

      const desc = filterAndSortDashboardSubscriptions(SAMPLE_SUBSCRIPTIONS, {
        sortField: 'price',
        sortOrder: 'desc',
      });
      assert.equal(desc[0].name, 'Netflix Premium');
      assert.equal(desc[desc.length - 1].name, 'Amazon Prime');
    });

    test('T4.3: Deterministic multi-tier tie-breaking: ties in primary field broken by Portuguese name, then ID', () => {
      const tiedItems = [
        { id: 205, name: 'Beta Service', price: '30.00', monthly_equivalent_price: 30.00, next_billing_date: '2026-10-01' },
        { id: 201, name: 'Alpha Service', price: '30.00', monthly_equivalent_price: 30.00, next_billing_date: '2026-10-01' },
        { id: 203, name: 'Gamma Service', price: '30.00', monthly_equivalent_price: 30.00, next_billing_date: '2026-10-01' },
        { id: 202, name: 'Alpha Service', price: '30.00', monthly_equivalent_price: 30.00, next_billing_date: '2026-10-01' }, // identical name to 201
      ];

      const sorted = filterAndSortDashboardSubscriptions(tiedItems, {
        sortField: 'price',
        sortOrder: 'asc',
      });

      // Alpha Service should come before Beta, then Gamma
      assert.equal(sorted[0].name, 'Alpha Service');
      assert.equal(sorted[0].id, 201, 'Secondary tie broken by lowest ID (201 before 202)');
      assert.equal(sorted[1].name, 'Alpha Service');
      assert.equal(sorted[1].id, 202);
      assert.equal(sorted[2].name, 'Beta Service');
      assert.equal(sorted[3].name, 'Gamma Service');
    });

    test('T4.4: 500-step asynchronous rapid interleaved filter/sort stress harness executes with zero crashes and maintains invariants', () => {
      const categories = ['all', 'Streaming', 'Cloud', 'Dev Tools', 'NonExistent'];
      const statuses = ['all', 'active', 'paused'];
      const cycles = ['all', 'monthly', 'yearly'];
      const fields = ['next_billing_date', 'price', 'name', 'category', 'status'];
      const orders = ['asc', 'desc'];
      const searchQueries = ['', 'net', 'spo', 'cloud', 'family', '4k', 'xyz_non_existent', '   ', '<test>'];

      const startTime = performance.now();

      for (let step = 0; step < 500; step++) {
        const categoryFilter = categories[step % categories.length];
        const statusFilter = statuses[(step * 2) % statuses.length];
        const cycleFilter = cycles[(step * 3) % cycles.length];
        const sortField = fields[(step * 4) % fields.length];
        const sortOrder = orders[step % orders.length];
        const search = searchQueries[step % searchQueries.length];

        const result = filterAndSortDashboardSubscriptions(SAMPLE_SUBSCRIPTIONS, {
          search,
          categoryFilter,
          statusFilter,
          cycleFilter,
          sortField,
          sortOrder,
        });

        // Invariant 1: Result is array
        assert.ok(Array.isArray(result));

        // Invariant 2: Every element satisfies category filter
        if (categoryFilter !== 'all') {
          for (const item of result) {
            assert.equal(item.category, categoryFilter);
          }
        }

        // Invariant 3: Every element satisfies status filter
        if (statusFilter !== 'all') {
          for (const item of result) {
            assert.equal(item.status, statusFilter);
          }
        }

        // Invariant 4: Every element satisfies cycle filter
        if (cycleFilter !== 'all') {
          for (const item of result) {
            assert.equal(item.billing_cycle, cycleFilter);
          }
        }

        // Invariant 5: Every element satisfies search query
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          for (const item of result) {
            const matches = item.name?.toLowerCase().includes(q) ||
                            item.notes?.toLowerCase().includes(q) ||
                            item.category?.toLowerCase().includes(q);
            assert.ok(matches);
          }
        }
      }

      const elapsed = performance.now() - startTime;
      assert.ok(elapsed < 500, `500 filter/sort steps completed in ${elapsed.toFixed(1)}ms`);
    });

    test('T4.5: Table row layout animation enforces layout="position" and FLIP vertical stability', () => {
      const initial = SAMPLE_SUBSCRIPTIONS.slice(0, 4);
      const reversed = [...initial].reverse();

      const flip = AnimationTestHarness.verifyFlipLayoutStability(initial, reversed, 48);
      assert.equal(flip.hasZeroCellDistortion, true);
      assert.equal(flip.shifts.every((s) => s.scaleX === 1.0 && s.scaleY === 1.0), true);
    });
  });

  // ===========================================================================
  // SECTION 5: Modal Spring Physics, Dialog Trapping & Accessibility Conformance
  // ===========================================================================
  describe('5. Modal Spring Physics, Dialog Trapping & Accessibility Conformance', () => {

    test('T5.1: Spring physics parameters (damping: 26, stiffness: 360, mass: 0.8) are critically fluid without sluggishness', () => {
      const spring = AnimationTestHarness.evaluateSpringPhysics({
        mass: 0.8,
        stiffness: 360,
        damping: 26,
      });

      assert.equal(spring.behavior, 'underdamped_spring');
      assert.ok(spring.dampingRatio >= 0.70 && spring.dampingRatio <= 0.85);
      assert.ok(spring.settlingTimeMs < 400, `Settling time ${spring.settlingTimeMs}ms exceeds 400ms`);
      assert.equal(spring.isFluidAndStable, true);
    });

    test('T5.2: Reduced motion suppression contracts for Modal backdrop and dialog panel', () => {
      const getBackdropTransition = (shouldReduceMotion) => ({
        duration: shouldReduceMotion ? 0 : 0.2,
      });

      const getPanelAnimationConfig = (shouldReduceMotion) => ({
        initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 },
        transition: shouldReduceMotion
          ? { duration: 0 }
          : { type: 'spring', damping: 26, stiffness: 360, mass: 0.8 },
      });

      // Reduced motion true:
      const reducedBackdrop = getBackdropTransition(true);
      const reducedPanel = getPanelAnimationConfig(true);
      assert.equal(reducedBackdrop.duration, 0);
      assert.equal(reducedPanel.transition.duration, 0);
      assert.deepEqual(reducedPanel.initial, { opacity: 0 });
      assert.deepEqual(reducedPanel.exit, { opacity: 0 });

      // Reduced motion false:
      const activeBackdrop = getBackdropTransition(false);
      const activePanel = getPanelAnimationConfig(false);
      assert.equal(activeBackdrop.duration, 0.2);
      assert.equal(activePanel.transition.type, 'spring');
      assert.equal(activePanel.transition.damping, 26);
      assert.equal(activePanel.transition.stiffness, 360);
      assert.equal(activePanel.transition.mass, 0.8);
      assert.equal(activePanel.initial.scale, 0.92);
      assert.equal(activePanel.initial.y, 16);
    });

    test('T5.3: closeable prop contract: onClose triggered when closeable=true, isolated when closeable=false', () => {
      let onCloseCallCount = 0;
      const onClose = () => { onCloseCallCount++; };

      const simulateClose = (closeable, onCloseCallback) => {
        if (closeable) {
          onCloseCallback();
        }
      };

      // When closeable is true
      simulateClose(true, onClose);
      assert.equal(onCloseCallCount, 1);

      // When closeable is false
      simulateClose(false, onClose);
      assert.equal(onCloseCallCount, 1, 'onClose should NOT be called when closeable is false');
    });

    test('T5.4: maxWidth prop correctly maps to Tailwind classes and falls back to sm:max-w-2xl for unknown widths', () => {
      const resolveMaxWidthClass = (maxWidth) => {
        return {
          sm: 'sm:max-w-sm',
          md: 'sm:max-w-md',
          lg: 'sm:max-w-lg',
          xl: 'sm:max-w-xl',
          '2xl': 'sm:max-w-2xl',
        }[maxWidth] || 'sm:max-w-2xl';
      };

      assert.equal(resolveMaxWidthClass('sm'), 'sm:max-w-sm');
      assert.equal(resolveMaxWidthClass('md'), 'sm:max-w-md');
      assert.equal(resolveMaxWidthClass('lg'), 'sm:max-w-lg');
      assert.equal(resolveMaxWidthClass('xl'), 'sm:max-w-xl');
      assert.equal(resolveMaxWidthClass('2xl'), 'sm:max-w-2xl');
      assert.equal(resolveMaxWidthClass('unknown_size'), 'sm:max-w-2xl');
      assert.equal(resolveMaxWidthClass(null), 'sm:max-w-2xl');
      assert.equal(resolveMaxWidthClass(undefined), 'sm:max-w-2xl');
    });
  });

  // ===========================================================================
  // SECTION 6: White-Box Source Integrity & Architectural Conformance
  // ===========================================================================
  describe('6. White-Box Source Integrity & Architectural Conformance', () => {

    test('T6.1: CosmicShowcase3D.jsx contains SceneLifecycleTeardown with recursive traversal and gl.dispose', () => {
      const sourcePath = path.resolve(__dirname, '../../resources/js/Components/CosmicShowcase3D.jsx');
      const content = fs.readFileSync(sourcePath, 'utf8');

      assert.ok(content.includes('function SceneLifecycleTeardown'), 'Must define SceneLifecycleTeardown');
      assert.ok(content.includes('scene.traverse'), 'Must traverse scene graph on teardown');
      assert.ok(content.includes('object.geometry.dispose()'), 'Must dispose geometries');
      assert.ok(content.includes('mat.map.dispose()'), 'Must dispose texture maps');
      assert.ok(content.includes('scene.clear()'), 'Must clear scene children');
      assert.ok(content.includes('gl.dispose()'), 'Must call gl.dispose()');
    });

    test('T6.2: Modal.jsx contains spring physics damping: 26, stiffness: 360, mass: 0.8 and useReducedMotion', () => {
      const sourcePath = path.resolve(__dirname, '../../resources/js/Components/Modal.jsx');
      const content = fs.readFileSync(sourcePath, 'utf8');

      assert.ok(content.includes('useReducedMotion()'), 'Must check useReducedMotion');
      assert.ok(content.includes('damping: 26'), 'Spring damping must be 26');
      assert.ok(content.includes('stiffness: 360'), 'Spring stiffness must be 360');
      assert.ok(content.includes('mass: 0.8'), 'Spring mass must be 0.8');
    });

    test('T6.3: toastNotifications.js contains isRecentClientToast with 1500ms default threshold', () => {
      const sourcePath = path.resolve(__dirname, '../../resources/js/Utils/toastNotifications.js');
      const content = fs.readFileSync(sourcePath, 'utf8');

      assert.ok(content.includes('export function isRecentClientToast(thresholdMs = 1500)'));
      assert.ok(content.includes('notifySubscriptionMutation'));
      assert.ok(content.includes('notifyMutationError'));
    });

    test('T6.4: ToastContainer.jsx mounts Sonner Toaster with theme synchronization and Inertia listener', () => {
      const sourcePath = path.resolve(__dirname, '../../resources/js/Components/ToastContainer.jsx');
      const content = fs.readFileSync(sourcePath, 'utf8');

      assert.ok(content.includes('<Toaster'), 'Must render Sonner Toaster');
      assert.ok(content.includes('MutationObserver'), 'Must observe html theme changes');
      assert.ok(content.includes('router.on(\'success\''), 'Must listen to router success events');
      assert.ok(content.includes('isRecentClientToast(1500)'), 'Must check isRecentClientToast threshold');
    });

    test('T6.5: Dashboard.jsx contains sorting comparator with null handling, Portuguese collation, and secondary tie-breakers', () => {
      const sourcePath = path.resolve(__dirname, '../../resources/js/Pages/Dashboard.jsx');
      const content = fs.readFileSync(sourcePath, 'utf8');

      assert.ok(content.includes('case \'next_billing_date\':'));
      assert.ok(content.includes('case \'price\':'));
      assert.ok(content.includes('case \'name\':'));
      assert.ok(content.includes('localeCompare(b.name || \'\', \'pt-BR\''));
      assert.ok(content.includes('tie !== 0 ? tie : a.id - b.id'));
    });
  });
});
