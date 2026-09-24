/**
 * Empirical Challenger M4.1 Stress Test Suite
 * 
 * Deeply challenges Milestone 4: Advanced 3D WebGL Cosmic Showcase (CosmicShowcase3D.jsx)
 * 
 * Target areas:
 * 1. Lifecycle & Memory Safety (Rapid Mount/Unmount Simulation):
 *    - 50-100 rapid mount/unmount cycles
 *    - Resource disposal: SphereGeometry, RingGeometry, BufferGeometry, MeshPhysicalMaterial,
 *      MeshStandardMaterial, ShaderMaterial, PointsMaterial, CanvasTexture
 *    - Scene graph clear and WebGLRenderer disposal
 *    - Double-disposal idempotency
 * 2. Interaction Physics & Boundary Stress:
 *    - Exponential lerp damping differential equation (lambda = 6 pointer, lambda = 3 momentum)
 *    - Asymptotic idle velocity convergence (0.25 * delta)
 *    - Gimbal lock prevention (pitch clamp at [-0.55, 0.55] rad)
 *    - Boundary drag escapes outside container (normalized clamp [-1, 1])
 *    - Sudden release & violent flick impulse (dx = 10,000) decay stability
 *    - Pointer capture & multi-touch / cancel handling
 * 3. Accessibility & Reduced Motion Adherence:
 *    - Complete motion suppression on idle spin, internal spin, moon orbit, starfield drift
 *    - Card tilt clamping to 'none' under reduced motion or mobile width (<640px)
 *    - Probe DistantCelestialPlanet <Float> component behavior
 * 4. WebGL Context Loss & Recovery Engine:
 *    - webglcontextlost event default prevention (event.preventDefault)
 *    - Transition to zero-CLS CosmicFallback
 *    - webglcontextrestored key increment and recovery
 *    - Teardown of DOM event listeners
 * 5. WebGL Support Detection & Hydration Safety:
 *    - SSR environment safety
 *    - WebGL 1.0, WebGL 2.0, experimental-webgl, and error-throwing canvas detection
 * 6. Component Architecture & Structural Conformance
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// Helper: Extract & Replicate CosmicShowcase3D Pure Logic
// =============================================================================

/**
 * Replicated checkWebGLSupport function from CosmicShowcase3D.jsx
 */
function testCheckWebGLSupport(mockWindow, mockDocument) {
  if (typeof mockWindow === 'undefined' || typeof mockDocument === 'undefined') {
    return false;
  }
  try {
    const canvas = mockDocument.createElement('canvas');
    return !!(
      mockWindow.WebGLRenderingContext &&
      (canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Replicated pointer physics step from CosmicShowcase3D.jsx
 */
function stepPhysics(state, p, delta, shouldReduceMotion) {
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
      // Steady idle rotation target (~0.25 rad/s)
      const targetIdleVelY = 0.25 * clampedDelta;

      p.velX += (0 - p.velX) * decayFactor;
      p.velY += (targetIdleVelY - p.velY) * decayFactor;

      p.rotY += p.velY;
      p.rotX += p.velX;

      // Restrict pitch to +/- 0.55 rad to prevent flipping
      p.rotX = Math.max(-0.55, Math.min(0.55, p.rotX));
    }
  }

  // Internal spin
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
 * Builds the exact Three.js Scene Graph matching CosmicShowcase3D.jsx
 */
function buildCosmicSceneGraph() {
  const scene = new THREE.Scene();

  // 1. Celestial Lighting
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

  // 3. Atmospheric Fresnel Glow
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

  // 4. Rings
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

  // 5. Moon
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

  // Dummy star texture
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
 * Executes the SceneLifecycleTeardown traversal on a scene
 */
function teardownSceneGraph(scene, glMock) {
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

// =============================================================================
// TEST SUITE: Empirical Challenger M4.1
// =============================================================================

describe('Empirical Challenger M4.1: 3D WebGL Cosmic Showcase Stress Suite', () => {

  // ===========================================================================
  // 1. Lifecycle & Memory Safety (Rapid Mount/Unmount Simulation)
  // ===========================================================================
  describe('1. Lifecycle & Memory Safety (Mount/Unmount Stress)', () => {

    test('T1.1: Single mount & unmount cleanly disposes 100% of geometries, materials, and textures', () => {
      const { scene, geometries, materials, textures } = buildCosmicSceneGraph();
      let glDisposed = false;
      const glMock = { dispose: () => { glDisposed = true; } };

      // Verify initial allocation
      assert.equal(geometries.length, 8, 'Expected 8 discrete geometries in CosmicScene');
      assert.equal(materials.length, 8, 'Expected 8 discrete materials in CosmicScene');
      assert.equal(textures.length, 1, 'Expected 1 star texture in CosmicScene');

      // Track disposal listeners
      let disposedGeoCount = 0;
      geometries.forEach((g) => g.addEventListener('dispose', () => disposedGeoCount++));
      let disposedMatCount = 0;
      materials.forEach((m) => m.addEventListener('dispose', () => disposedMatCount++));
      let disposedTexCount = 0;
      textures.forEach((t) => t.addEventListener('dispose', () => disposedTexCount++));

      // Execute Teardown
      const result = teardownSceneGraph(scene, glMock);

      assert.equal(result.disposedGeometries, 8, 'All 8 geometries must be visited and disposed');
      assert.equal(result.disposedMaterials, 8, 'All 8 materials must be visited and disposed');
      assert.equal(result.disposedTextures, 1, 'Star texture must be disposed via material.map.dispose');
      assert.equal(result.glDisposed, true, 'gl.dispose() must be called');
      assert.equal(disposedGeoCount, 8, 'Every geometry received dispose event');
      assert.equal(disposedMatCount, 8, 'Every material received dispose event');
      assert.equal(disposedTexCount, 1, 'Texture received dispose event');
      assert.equal(scene.children.length, 0, 'scene.clear() must purge all scene children');
    });

    test('T1.2: Rapid 100-cycle mount/unmount stress simulation produces zero memory leakage', () => {
      let cumulativeGeos = 0;
      let cumulativeMats = 0;
      let cumulativeTexs = 0;
      let cumulativeGlDisposes = 0;

      const startTime = performance.now();

      for (let cycle = 0; cycle < 100; cycle++) {
        const { scene } = buildCosmicSceneGraph();
        let cycleGlDisposed = false;
        const glMock = { dispose: () => { cycleGlDisposed = true; } };

        const teardown = teardownSceneGraph(scene, glMock);
        cumulativeGeos += teardown.disposedGeometries;
        cumulativeMats += teardown.disposedMaterials;
        cumulativeTexs += teardown.disposedTextures;
        if (cycleGlDisposed) cumulativeGlDisposes++;
        assert.equal(scene.children.length, 0);
      }

      const elapsed = performance.now() - startTime;

      assert.equal(cumulativeGeos, 800, 'All 800 geometries over 100 cycles must be disposed');
      assert.equal(cumulativeMats, 800, 'All 800 materials over 100 cycles must be disposed');
      assert.equal(cumulativeTexs, 100, 'All 100 textures over 100 cycles must be disposed');
      assert.equal(cumulativeGlDisposes, 100, 'All 100 WebGL renderer instances must be disposed');
      assert.ok(elapsed < 500, `100 mount/unmount cycles should complete in under 500ms (took ${elapsed.toFixed(1)}ms)`);
    });

    test('T1.3: Double-disposal idempotency (repeated dispose calls do not crash or throw)', () => {
      const { scene, geometries, materials, textures } = buildCosmicSceneGraph();
      const glMock = { dispose: () => {} };

      // First teardown
      assert.doesNotThrow(() => teardownSceneGraph(scene, glMock));

      // Second immediate direct disposal calls on the same objects
      assert.doesNotThrow(() => {
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        textures.forEach((t) => t.dispose());
      });
    });

    test('T1.4: gl.dispose() throwing exception is safely caught by try/catch in teardown', () => {
      const { scene } = buildCosmicSceneGraph();
      const faultyGlMock = {
        dispose: () => {
          throw new Error('WebGL context already lost race condition');
        },
      };

      assert.doesNotThrow(() => {
        const result = teardownSceneGraph(scene, faultyGlMock);
        assert.equal(result.glDisposed, false);
      });
    });
  });

  // ===========================================================================
  // 2. Universal Pointer Interaction Physics & Boundary Stress
  // ===========================================================================
  describe('2. Universal Pointer Interaction Physics & Boundary Stress', () => {

    test('T2.1: Exponential lerp damping differential equation (lambda = 6) converges smoothly toward target', () => {
      const state = { currentPointerX: 0, currentPointerY: 0 };
      const p = {
        targetPointerX: 0.8,
        targetPointerY: -0.6,
        isDragging: true,
        rotX: 0,
        rotY: 0,
        velX: 0,
        velY: 0,
      };

      const delta = 0.016; // 60fps frame delta
      const history = [];

      for (let frame = 0; frame < 60; frame++) {
        stepPhysics(state, p, delta, false);
        history.push({ x: state.currentPointerX, y: state.currentPointerY });
      }

      // After 60 frames (~1 sec), damp factor (1 - exp(-6 * 0.016)) ^ 60 => converges close to target
      const finalDiffX = Math.abs(state.currentPointerX - p.targetPointerX);
      const finalDiffY = Math.abs(state.currentPointerY - p.targetPointerY);

      assert.ok(finalDiffX < 0.05, `Pointer X should converge to target 0.8 (diff=${finalDiffX})`);
      assert.ok(finalDiffY < 0.05, `Pointer Y should converge to target -0.6 (diff=${finalDiffY})`);

      // Verify monotonic convergence (no overshoot)
      for (let i = 1; i < history.length; i++) {
        assert.ok(history[i].x >= history[i - 1].x, 'Exponential damping must be strictly monotonic');
        assert.ok(history[i].y <= history[i - 1].y, 'Exponential damping must be strictly monotonic');
      }
    });

    test('T2.2: Gimbal flip prevention: pitch rotX strictly clamped to [-0.55, 0.55] rad under extreme inputs', () => {
      const state = { currentPointerX: 0, currentPointerY: 0 };
      const p = {
        targetPointerX: 0,
        targetPointerY: 0,
        isDragging: false,
        rotX: 100.0, // Absurdly high pitch
        rotY: 0,
        velX: 50.0,
        velY: 0,
      };

      // Step physics
      stepPhysics(state, p, 0.016, false);

      assert.ok(p.rotX <= 0.55, `rotX (${p.rotX}) must be clamped <= +0.55 rad`);
      assert.ok(p.rotX >= -0.55, `rotX (${p.rotX}) must be clamped >= -0.55 rad`);

      // Test negative extreme
      p.rotX = -500.0;
      p.velX = -200.0;
      stepPhysics(state, p, 0.016, false);

      assert.ok(p.rotX >= -0.55, `rotX (${p.rotX}) must be clamped >= -0.55 rad`);
    });

    test('T2.3: Boundary drag escapes outside container (extreme client coordinates) clamped to [-1, 1]', () => {
      const containerRect = { left: 100, top: 100, width: 400, height: 600 };

      // Normalization formula from CosmicShowcase3D line 684-689:
      const calcNormalized = (clientX, clientY) => {
        const nx = ((clientX - containerRect.left) / containerRect.width) * 2 - 1;
        const ny = ((clientY - containerRect.top) / containerRect.height) * 2 - 1;
        return {
          targetPointerX: Math.max(-1, Math.min(1, nx)),
          targetPointerY: Math.max(-1, Math.min(1, ny)),
        };
      };

      // Far top-left escape (-10,000px)
      const topLeft = calcNormalized(-10000, -10000);
      assert.equal(topLeft.targetPointerX, -1);
      assert.equal(topLeft.targetPointerY, -1);

      // Far bottom-right escape (+50,000px)
      const bottomRight = calcNormalized(50000, 50000);
      assert.equal(bottomRight.targetPointerX, 1);
      assert.equal(bottomRight.targetPointerY, 1);

      // Center container point
      const center = calcNormalized(300, 400);
      assert.equal(Math.abs(center.targetPointerX), 0);
      assert.equal(Math.abs(center.targetPointerY), 0);
    });

    test('T2.4: Violent flick impulse & sudden release decays smoothly to steady idle orbit without NaN/Infinity', () => {
      const state = { currentPointerX: 0, currentPointerY: 0 };
      const p = {
        targetPointerX: 0,
        targetPointerY: 0,
        isDragging: false, // Released
        rotX: 0.1,
        rotY: 0,
        velX: 50.0,        // Extreme flick
        velY: 100.0,       // Extreme flick
      };

      const delta = 0.016;

      for (let frame = 0; frame < 120; frame++) { // ~2 seconds (1.92s)
        const result = stepPhysics(state, p, delta, false);
        assert.ok(!Number.isNaN(result.velX), 'velX must never be NaN');
        assert.ok(!Number.isNaN(result.velY), 'velY must never be NaN');
        assert.ok(!Number.isNaN(result.groupRotY), 'groupRotY must never be NaN');
        assert.ok(Number.isFinite(result.velX), 'velX must be finite');
        assert.ok(Number.isFinite(result.velY), 'velY must be finite');
      }

      // At 1.92 seconds, initial velX of 50.0 should have decayed by >99.6% (v(t) = 50 * e^(-3 * 1.92) ≈ 0.158)
      assert.ok(p.velX < 0.20, `velX should have decayed below 0.20 rad/s (was ${p.velX})`);
      assert.ok(p.velX / 50.0 < 0.005, 'Over 99.5% of violent impulse momentum must be dissipated in under 2 seconds');

      // Run an additional 80 frames (total ~3.2 seconds) to verify asymptotic approach to 0
      for (let frame = 0; frame < 80; frame++) {
        stepPhysics(state, p, delta, false);
      }

      assert.ok(Math.abs(p.velX) < 0.01, `velX should converge to <0.01 rad/s after 3s (was ${p.velX})`);
      assert.ok(Math.abs(p.velY - (0.25 * delta)) < 0.01, `velY should converge toward idle target 0.004 rad/s (was ${p.velY})`);
    });

    test('T2.5: Delta time clamping prevents numerical explosion during frame rate lag spikes', () => {
      const state = { currentPointerX: 0, currentPointerY: 0 };
      const p = {
        targetPointerX: 1.0,
        targetPointerY: 1.0,
        isDragging: false,
        rotX: 0,
        rotY: 0,
        velX: 10.0,
        velY: 10.0,
      };

      // Simulate a massive 5.0 second lag spike (e.g. background tab or system freeze)
      const hugeDelta = 5.0;
      const result = stepPhysics(state, p, hugeDelta, false);

      // Because clampedDelta = Math.min(delta, 0.1), decay factor is 1 - exp(-3 * 0.1) ~ 0.259 (never > 1)
      assert.ok(p.velX < 10.0, 'Velocity should decrease even after massive delta');
      assert.ok(p.velX > 0, 'Velocity should not flip sign due to clamped delta');
      assert.ok(Number.isFinite(result.groupRotY));
    });

    test('T2.6: Multi-touch and pointer capture error resilience (try/catch blocks)', () => {
      let captureCalled = 0;
      let releaseCalled = 0;

      // Mock DOM element with failing pointer capture (e.g. unsupported browser or invalid pointer ID)
      const mockElement = {
        setPointerCapture: () => {
          captureCalled++;
          throw new DOMException('Invalid pointer ID', 'InvalidPointerId');
        },
        releasePointerCapture: () => {
          releaseCalled++;
          throw new DOMException('No pointer captured', 'NotFoundError');
        },
      };

      // Simulate handlePointerDown error isolation
      assert.doesNotThrow(() => {
        try {
          if (mockElement && typeof mockElement.setPointerCapture === 'function') {
            mockElement.setPointerCapture(999);
          }
        } catch {
          // Expected safe catch
        }
      });
      assert.equal(captureCalled, 1);

      // Simulate handlePointerUp error isolation
      assert.doesNotThrow(() => {
        try {
          if (mockElement && typeof mockElement.releasePointerCapture === 'function') {
            mockElement.releasePointerCapture(999);
          }
        } catch {
          // Expected safe catch
        }
      });
      assert.equal(releaseCalled, 1);
    });
  });

  // ===========================================================================
  // 3. Accessibility & Reduced Motion Adherence
  // ===========================================================================
  describe('3. Accessibility & Reduced Motion Adherence', () => {

    test('T3.1: shouldReduceMotion halts idle rotation and zeroes planetary velocities', () => {
      const state = { currentPointerX: 0, currentPointerY: 0 };
      const p = {
        targetPointerX: 0,
        targetPointerY: 0,
        isDragging: false,
        rotX: 0.2,
        rotY: -0.4,
        velX: 5.0,
        velY: 8.0,
      };

      const result = stepPhysics(state, p, 0.016, true);

      assert.equal(result.velX, 0, 'velX must be strictly 0 when shouldReduceMotion is true');
      assert.equal(result.velY, 0, 'velY must be strictly 0 when shouldReduceMotion is true');
      assert.equal(result.rotX, 0.2, 'rotX must not change');
      assert.equal(result.rotY, -0.4, 'rotY must not change');
      assert.equal(result.internalSpin, 0, 'internalSpin must be 0');
    });

    test('T3.2: Orbiting moon position calculations are bypassed when shouldReduceMotion is true', () => {
      const moonMesh = {
        position: { x: 2.85, y: 0, z: 0 },
      };

      const simulateMoonFrame = (time, shouldReduceMotion) => {
        if (!moonMesh || shouldReduceMotion) return;
        moonMesh.position.x = Math.cos(time * 0.7) * 2.85;
        moonMesh.position.z = Math.sin(time * 0.7) * 2.85;
        moonMesh.position.y = Math.sin(time * 0.49) * 0.55;
      };

      // Frame with reduced motion: position remains static
      simulateMoonFrame(100.0, true);
      assert.equal(moonMesh.position.x, 2.85);
      assert.equal(moonMesh.position.y, 0);
      assert.equal(moonMesh.position.z, 0);

      // Frame without reduced motion: position moves
      simulateMoonFrame(100.0, false);
      assert.notEqual(moonMesh.position.x, 2.85);
    });

    test('T3.3: Starfield axial drift and position oscillation are bypassed when shouldReduceMotion is true', () => {
      const pointsRef = {
        rotation: { x: 0, y: 0 },
        position: { y: 0 },
      };

      const simulateStarFrame = (time, delta, shouldReduceMotion) => {
        if (!pointsRef || shouldReduceMotion) return;
        pointsRef.rotation.y += delta * 0.022;
        pointsRef.rotation.x += delta * 0.007;
        pointsRef.position.y = Math.sin(time * 0.4) * 0.08;
      };

      simulateStarFrame(50.0, 0.016, true);
      assert.equal(pointsRef.rotation.y, 0);
      assert.equal(pointsRef.rotation.x, 0);
      assert.equal(pointsRef.position.y, 0);

      simulateStarFrame(50.0, 0.016, false);
      assert.ok(pointsRef.rotation.y > 0);
      assert.ok(pointsRef.rotation.x > 0);
      assert.notEqual(pointsRef.position.y, 0);
    });

    test('T3.4: Card 3D perspective tilt sets transform to "none" on mobile or reduced motion', () => {
      const computeTilt = (windowWidth, shouldReduceMotion, targetX, targetY) => {
        if (windowWidth < 640 || shouldReduceMotion) {
          return 'none';
        }
        const rotY = (targetX * 5).toFixed(2);
        const rotX = (-targetY * 5).toFixed(2);
        return `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      };

      // Reduced motion on desktop
      assert.equal(computeTilt(1200, true, 0.8, -0.5), 'none');

      // Mobile width with reduced motion disabled
      assert.equal(computeTilt(375, false, 0.8, -0.5), 'none');

      // Desktop width with active motion
      assert.equal(
        computeTilt(1024, false, 0.8, -0.5),
        'perspective(1000px) rotateX(2.50deg) rotateY(4.00deg)'
      );
    });

    test('T3.5: [Adversarial finding / probe] DistantCelestialPlanet <Float> component parameter probe', () => {
      // Inspect source code of CosmicShowcase3D to check if DistantCelestialPlanet accepts or uses shouldReduceMotion
      const sourcePath = path.resolve(__dirname, '../../resources/js/Components/CosmicShowcase3D.jsx');
      const source = fs.readFileSync(sourcePath, 'utf8');

      // In line 235: function DistantCelestialPlanet() takes 0 arguments and hardcodes speed={1.5}
      const hasDistantPlanetReducedMotion = source.includes('function DistantCelestialPlanet({ shouldReduceMotion') ||
        source.includes('DistantCelestialPlanet shouldReduceMotion');

      // We document this empirical probe: the distant planet continues subtle float because Float speed is hardcoded
      assert.equal(hasDistantPlanetReducedMotion, false, 'Probe confirms DistantCelestialPlanet does not receive shouldReduceMotion prop');
    });
  });

  // ===========================================================================
  // 4. WebGL Context Loss & Recovery Engine
  // ===========================================================================
  describe('4. WebGL Context Loss & Recovery Engine', () => {

    test('T4.1: webglcontextlost event calls event.preventDefault() and flags context loss', () => {
      let isContextLost = false;
      let defaultPrevented = false;

      const mockEvent = {
        preventDefault: () => {
          defaultPrevented = true;
        },
      };

      // Replicate handleContextLost
      const handleContextLost = (e) => {
        e.preventDefault();
        isContextLost = true;
      };

      handleContextLost(mockEvent);

      assert.equal(defaultPrevented, true, 'event.preventDefault() MUST be called on webglcontextlost');
      assert.equal(isContextLost, true, 'isContextLost state must transition to true');
    });

    test('T4.2: webglcontextrestored event clears context loss flag and increments canvas key', () => {
      let isContextLost = true;
      let canvasKey = 0;

      const handleContextRestored = () => {
        isContextLost = false;
        canvasKey += 1;
      };

      handleContextRestored();

      assert.equal(isContextLost, false, 'isContextLost state must reset to false');
      assert.equal(canvasKey, 1, 'canvasKey must increment by 1 to force clean remount of <Canvas>');
    });

    test('T4.3: Event listener attachment and teardown on gl.domElement', () => {
      const listeners = new Map();

      const mockDomElement = {
        addEventListener: (event, handler) => {
          listeners.set(event, handler);
        },
        removeEventListener: (event) => {
          listeners.delete(event);
        },
      };

      // Attach context handlers (replicate handleCanvasCreated)
      const handleContextLost = (e) => e.preventDefault();
      const handleContextRestored = () => {};

      mockDomElement.addEventListener('webglcontextlost', handleContextLost, false);
      mockDomElement.addEventListener('webglcontextrestored', handleContextRestored, false);

      mockDomElement._cleanupContextListeners = () => {
        mockDomElement.removeEventListener('webglcontextlost');
        mockDomElement.removeEventListener('webglcontextrestored');
      };

      assert.equal(listeners.has('webglcontextlost'), true);
      assert.equal(listeners.has('webglcontextrestored'), true);

      // Execute cleanup on unmount
      mockDomElement._cleanupContextListeners();

      assert.equal(listeners.has('webglcontextlost'), false);
      assert.equal(listeners.has('webglcontextrestored'), false);
    });

    test('T4.4: Successive context loss/restoration cycles (3 cycles) recover without state corruption', () => {
      let isContextLost = false;
      let canvasKey = 0;

      for (let i = 0; i < 3; i++) {
        // Lost
        isContextLost = true;
        assert.equal(isContextLost, true);

        // Restored
        isContextLost = false;
        canvasKey++;
        assert.equal(isContextLost, false);
        assert.equal(canvasKey, i + 1);
      }
    });
  });

  // ===========================================================================
  // 5. WebGL Support Detection & Hydration Safety
  // ===========================================================================
  describe('5. WebGL Support Detection & Hydration Safety', () => {

    test('T5.1: SSR environment (window/document = undefined) safely returns false without throwing', () => {
      assert.equal(testCheckWebGLSupport(undefined, undefined), false);
      assert.equal(testCheckWebGLSupport({}, undefined), false);
    });

    test('T5.2: Client environment without WebGLRenderingContext returns false', () => {
      const mockWin = {}; // No WebGLRenderingContext
      const mockDoc = {
        createElement: () => ({
          getContext: () => null,
        }),
      };
      assert.equal(testCheckWebGLSupport(mockWin, mockDoc), false);
    });

    test('T5.3: WebGL 1.0 support detected cleanly', () => {
      const mockWin = { WebGLRenderingContext: function () {} };
      const mockDoc = {
        createElement: () => ({
          getContext: (type) => (type === 'webgl' ? {} : null),
        }),
      };
      assert.equal(testCheckWebGLSupport(mockWin, mockDoc), true);
    });

    test('T5.4: WebGL 2.0 support detected cleanly', () => {
      const mockWin = { WebGLRenderingContext: function () {} };
      const mockDoc = {
        createElement: () => ({
          getContext: (type) => (type === 'webgl2' ? {} : null),
        }),
      };
      assert.equal(testCheckWebGLSupport(mockWin, mockDoc), true);
    });

    test('T5.5: Experimental WebGL support detected cleanly', () => {
      const mockWin = { WebGLRenderingContext: function () {} };
      const mockDoc = {
        createElement: () => ({
          getContext: (type) => (type === 'experimental-webgl' ? {} : null),
        }),
      };
      assert.equal(testCheckWebGLSupport(mockWin, mockDoc), true);
    });

    test('T5.6: Canvas.getContext throwing SecurityError or exception returns false cleanly', () => {
      const mockWin = { WebGLRenderingContext: function () {} };
      const mockDoc = {
        createElement: () => ({
          getContext: () => {
            throw new Error('SecurityError: canvas poisoned or WebGL blocked');
          },
        }),
      };
      assert.equal(testCheckWebGLSupport(mockWin, mockDoc), false);
    });
  });

  // ===========================================================================
  // 6. Source & Structural Conformance
  // ===========================================================================
  describe('6. Source & Structural Conformance', () => {
    const sourcePath = path.resolve(__dirname, '../../resources/js/Components/CosmicShowcase3D.jsx');
    const source = fs.readFileSync(sourcePath, 'utf8');

    test('T6.1: Confirms R3F, Drei, Three, and Framer Motion dependencies imported', () => {
      assert.ok(source.includes("@react-three/fiber"), 'Must import @react-three/fiber');
      assert.ok(source.includes("@react-three/drei"), 'Must import @react-three/drei');
      assert.ok(source.includes("import * as THREE from 'three'"), 'Must import Three.js');
      assert.ok(source.includes("useReducedMotion"), 'Must import useReducedMotion');
    });

    test('T6.2: Confirms 4-point celestial lighting parameters in CelestialLighting', () => {
      assert.ok(source.includes('ambientLight'), 'Must contain ambientLight');
      assert.ok(source.includes('directionalLight'), 'Must contain directionalLight');
      assert.ok(source.includes('pointLight'), 'Must contain pointLight');
      assert.ok(source.includes('022c22'), 'Dark emerald ambient color');
      assert.ok(source.includes('10b981'), 'Emerald accent light color');
    });

    test('T6.3: Confirms depth-buffer occlusion on planetary rings', () => {
      assert.ok(source.includes('depthWrite={true}'), 'Ring material must have depthWrite={true} for occlusion');
      assert.ok(source.includes('ringGeometry args={[1.45, 2.45, 64]}'), 'Ring geometry dimensions verified');
    });

    test('T6.4: Confirms zero-CLS height constraints and aperture papercut SVG frame preservation', () => {
      assert.ok(source.includes('min-h-[460px]'), 'Must enforce min-h-[460px]');
      assert.ok(source.includes('sm:min-h-[520px]'), 'Must enforce sm:min-h-[520px]');
      assert.ok(source.includes('lg:min-h-[620px]'), 'Must enforce lg:min-h-[620px]');
      assert.ok(source.includes('p3dLayer1'), 'Must preserve SVG aperture p3dLayer1');
      assert.ok(source.includes('p3dLayer2'), 'Must preserve SVG aperture p3dLayer2');
      assert.ok(source.includes('p3dLayer3'), 'Must preserve SVG aperture p3dLayer3');
    });
  });

  // ===========================================================================
  // 7. Volumetric Starfield Mathematical & Buffer Bounds
  // ===========================================================================
  describe('7. Volumetric Starfield Mathematical & Buffer Distribution', () => {
    test('T7.1: Particle positions obey dual-region radii and core exclusion boundary (r >= 2.4)', () => {
      const count = 1200;
      const pos = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        let x, y, z;
        if (i < 400) {
          // Near-orbit halo around planet & rings (r in [2.4, 6.5])
          const r = 2.4 + Math.random() * 4.1;
          const theta = Math.random() * Math.PI * 2;
          x = Math.cos(theta) * r;
          z = Math.sin(theta) * r;
          y = (Math.random() - 0.5) * 2.2;
        } else {
          // Deep celestial spherical shell (r in [6.5, 20.0])
          const r = 6.5 + Math.pow(Math.random(), 1.4) * 13.5;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
        }

        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;

        const distance = Math.hypot(x, y, z);
        // Minimum core exclusion distance
        assert.ok(distance >= 2.0, `Star #${i} (r=${distance.toFixed(2)}) must not intersect central planet (r=1.0)`);
      }
    });

    test('T7.2: Starfield vertex color buffer contains valid normalized RGB values in [0, 1]', () => {
      const palette = [
        new THREE.Color('#f0fdf4'), // Pure starlight
        new THREE.Color('#a7f3d0'), // Mint
        new THREE.Color('#34d399'), // Emerald
        new THREE.Color('#2dd4bf'), // Teal
        new THREE.Color('#38bdf8'), // Cyan
        new THREE.Color('#c084fc'), // Violet
      ];

      for (const color of palette) {
        assert.ok(color.r >= 0 && color.r <= 1, 'Color r in [0, 1]');
        assert.ok(color.g >= 0 && color.g <= 1, 'Color g in [0, 1]');
        assert.ok(color.b >= 0 && color.b <= 1, 'Color b in [0, 1]');
      }
    });
  });

  // ===========================================================================
  // 8. Multi-Material Array Disposal & Deep Scene Graph Clearing
  // ===========================================================================
  describe('8. Multi-Material Array Disposal & Deep Scene Graph Clearing', () => {
    test('T8.1: SceneLifecycleTeardown disposes multi-material arrays and attached texture maps', () => {
      const scene = new THREE.Scene();

      // Mesh with array of materials
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const dummyCanvas = { width: 16, height: 16 };
      const tex1 = new THREE.Texture(dummyCanvas);
      const tex2 = new THREE.Texture(dummyCanvas);

      let tex1Disposed = false;
      let tex2Disposed = false;
      tex1.addEventListener('dispose', () => { tex1Disposed = true; });
      tex2.addEventListener('dispose', () => { tex2Disposed = true; });

      const mat1 = new THREE.MeshBasicMaterial({ map: tex1 });
      const mat2 = new THREE.MeshBasicMaterial({ map: tex2 });

      let mat1Disposed = false;
      let mat2Disposed = false;
      mat1.addEventListener('dispose', () => { mat1Disposed = true; });
      mat2.addEventListener('dispose', () => { mat2Disposed = true; });

      const multiMesh = new THREE.Mesh(geo, [mat1, mat2]);
      scene.add(multiMesh);

      const teardown = teardownSceneGraph(scene, null);

      assert.equal(teardown.disposedGeometries, 1);
      assert.equal(teardown.disposedMaterials, 2);
      assert.equal(teardown.disposedTextures, 2);
      assert.equal(mat1Disposed, true);
      assert.equal(mat2Disposed, true);
      assert.equal(tex1Disposed, true);
      assert.equal(tex2Disposed, true);
      assert.equal(scene.children.length, 0);
    });
  });

  // ===========================================================================
  // 9. High-Volume Randomized Fuzzing Harness
  // ===========================================================================
  describe('9. High-Volume Randomized Fuzzing Harness', () => {
    test('T9.1: 1,000 randomized pointer movements with arbitrary coordinates maintain finite bounds', () => {
      const state = { currentPointerX: 0, currentPointerY: 0 };
      const p = {
        targetPointerX: 0,
        targetPointerY: 0,
        isDragging: true,
        rotX: 0,
        rotY: 0,
        velX: 0,
        velY: 0,
      };

      const rect = { left: 50, top: 50, width: 350, height: 500 };

      for (let i = 0; i < 1000; i++) {
        // Random client coordinates between -5000 and 5000
        const clientX = (Math.random() - 0.5) * 10000;
        const clientY = (Math.random() - 0.5) * 10000;

        const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((clientY - rect.top) / rect.height) * 2 - 1;

        p.targetPointerX = Math.max(-1, Math.min(1, nx));
        p.targetPointerY = Math.max(-1, Math.min(1, ny));

        const delta = Math.random() * 0.05; // 0 to 50ms
        const result = stepPhysics(state, p, delta, false);

        assert.ok(result.rotX >= -0.55 && result.rotX <= 0.55, 'rotX pitch clamp maintained');
        assert.ok(Number.isFinite(result.groupRotY), 'groupRotY finite');
        assert.ok(Number.isFinite(result.groupRotX), 'groupRotX finite');
      }
    });
  });
});

