# Handoff Report: R3F Canvas & Scene Lifecycle Architecture (Milestone 4 / M4.1)

- **Agent**: Explorer M4.1 (`teamwork_preview_explorer_m4_1`)
- **Date**: 2026-09-24T12:21:30Z
- **Type**: Hard Handoff (Task Complete)
- **Target File**: `resources/js/Components/CosmicShowcase3D.jsx`
- **Working Directory**: `z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m4_1`

---

## 1. Observation

1. **Installed Dependency Versions**:
   - In `package.json`:
     - Line 28: `"@react-three/drei": "^9.122.0"`
     - Line 29: `"@react-three/fiber": "^8.18.0"`
     - Line 33: `"three": "^0.170.0"`
     - Line 19: `"react": "^18.2.0"`
   - Node import test inside `laravel.test` container:
     - Command: `docker compose exec -T laravel.test node --input-type=module -e "import('@react-three/fiber').then(m => console.log('R3F OK', Object.keys(m).length)); import('@react-three/drei').then(m => console.log('Drei OK', Object.keys(m).length)); import('three').then(m => console.log('Three OK', Object.keys(m).length));"`
     - Result: `R3F OK 34`, `Drei OK 220`, `Three OK 415`. Three.js revision: `170`. Exit code 0.
2. **Existing Implementation**:
   - File: `resources/js/Components/CosmicShowcase3D.jsx` (741 lines).
   - Line 114–117:
     ```javascript
     const canvas = canvasRef.current;
     if (!canvas) return;
     const ctx = canvas.getContext('2d');
     ```
   - Lines 321–343: Implements a custom 3D rotation matrix function `rotate3D(x, y, z)` computing Euler yaw, pitch, and roll on CPU.
   - Lines 518–548: Rings are split into back segments (`pt.z < 0`) and front segments (`pt.z >= 0`) via manual trigonometric filtering and drawn with 2D strokes.
   - Lines 596–609: Outer container div sets up pointer listeners (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerLeave`, `onPointerEnter`), 3D card perspective tilt, and styling.
   - Lines 621–667: Concentric organic papercut SVG overlay (`p3dLayer1`, `p3dLayer2`) with viewBox `0 0 500 700`.
   - Lines 670–737: Brand badge link, status badge, center drag hint, and bottom typography/pill tags.
3. **Mount Point in Application**:
   - `resources/js/Layouts/GuestLayout.jsx`: Lines 28–41 mount `<CosmicShowcase3D />` wrapping all guest authentication views (`Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, etc.).
4. **Build & Test Baseline**:
   - Command: `docker compose exec -T laravel.test npm run build` succeeds in 1.18s (1984 modules transformed).
   - Command: `docker compose exec -T laravel.test php artisan test` passes 87/87 tests (864 assertions).
   - Command: `docker compose exec -T laravel.test ./vendor/bin/pint --test` passes 58/58 PHP files.

---

## 2. Logic Chain

1. **Need for Hardware Acceleration (R4)**:
   - *Observation 1 & 2*: The current canvas executes manual Euler matrix multiplications, gradient rasterizations, and path slicing on the CPU main thread (`getContext('2d')`), lacking depth buffers, hardware MSAA, and PBR shading.
   - *Inference*: Migrating to `@react-three/fiber` with `@react-three/drei` and `three@0.170.0` offloads 3D projection, depth sorting, and shading to the GPU.
2. **Camera & Viewport Frustum Calibration**:
   - *Observation 2*: The card has dimensions $\sim 500 \times 700$ with central planet occupying approximately 35-40% height.
   - *Inference*: Using `fov: 45` at camera distance `[0, 0, 8]` yields a view frustum height of $H = 2 \times 8 \times \tan(22.5^\circ) \approx 6.627$ units. A central planet sphere of radius $R \approx 1.35$ fits the container without wide-angle edge distortion.
3. **Power & Performance Throttling**:
   - *Observation 1*: Retina and mobile devices run at 2.5x to 4x DPR.
   - *Inference*: Without clamping, fillrate is penalised by up to $16\times$. Setting `dpr={[1, 2]}` caps resolution at 2x. Setting `gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}` selects the discrete GPU and frees framebuffers immediately.
4. **Lifecycle & Viewport Observer**:
   - *Observation 3*: The showcase is mounted in `GuestLayout.jsx`. On mobile devices or when scrolling, the card may exit the active viewport.
   - *Inference*: Mounting an `IntersectionObserver` on `containerRef` and binding `frameloop={isVisible ? 'always' : 'never'}` stops `requestAnimationFrame` when the element is off-screen, dropping CPU and GPU consumption to 0%.
5. **Teardown & Memory Leak Prevention in Inertia SPAs**:
   - *Observation 3*: Inertia SPAs switch routes without full page reloads. Repeated navigations between `/login` and `/register` mount and unmount `CosmicShowcase3D`.
   - *Inference*: WebGL contexts leak if geometries, materials, and renderer are not disposed. Placing `SceneLifecycleTeardown` inside `<Canvas>` to traverse the scene (`geometry.dispose()`, `material.dispose()`) and call `gl.dispose()` frees all GPU VRAM and eliminates the "Too many active WebGL contexts" crash.
6. **WebGL Context Loss Recovery**:
   - *Observation 1 & WebGL Spec*: GPU driver resets or OS sleep trigger `webglcontextlost`. If `event.preventDefault()` is omitted, the browser permanently destroys the WebGL context.
   - *Inference*: Adding listeners for `webglcontextlost` (calling `event.preventDefault()`) and `webglcontextrestored` (incrementing `canvasKey` to trigger a clean remount of `<Canvas key={canvasKey}>`) ensures 100% automated recovery without user page reloads.
7. **Hydration & SSR Safety**:
   - *Observation 1*: WebGL requires browser DOM APIs (`HTMLCanvasElement`, `WebGLRenderingContext`).
   - *Inference*: Checking `checkWebGLSupport()` and gating `<Canvas>` with `isMounted` renders `<CosmicFallback />` during SSR or on unsupported devices, avoiding hydration mismatches and guaranteeing Cumulative Layout Shift (CLS) = 0.

---

## 3. Caveats

1. **Subsystem Coordination**:
   - Explorer M4.1 provides the Canvas container, lifecycle hooks, context loss handler, SSR fallback, and shared `interactionRef`.
   - Planetary PBR materials and 3D rings are formulated by Explorer M4.2.
   - Volumetric starfield particles and smooth pointer damping are formulated by Explorer M4.3.
   - The implementing Worker M4 must combine these three modular specifications into `CosmicShowcase3D.jsx`.
2. **Container Drag vs Mesh Pointer Events**:
   - In the reference design, dragging anywhere on the card rotates the celestial planet. The shared mutable `interactionRef` pattern on the container is chosen over R3F raycasting to preserve this exact behavior and avoid React re-renders on high-frequency pointer moves.

---

## 4. Conclusion

The R3F Canvas and Scene lifecycle architecture is fully formulated:
1. Replace 2D canvas with R3F `<Canvas>`:
   - Perspective Camera: `fov: 45, near: 0.1, far: 1000, position: [0, 0, 8]`
   - WebGL Renderer: `antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false`
   - DPR Clamping: `dpr={[1, 2]}`
2. Performance & Lifecycle:
   - Viewport `IntersectionObserver` driving `frameloop={isVisible ? 'always' : 'never'}`
   - Clean unmount teardown via `SceneLifecycleTeardown` traversing scene and calling `gl.dispose()`
   - WebGL context loss handling via `webglcontextlost` (`event.preventDefault()`) and `canvasKey` increment on `webglcontextrestored`
   - Client hydration guard (`isMounted`, `checkWebGLSupport()`) and zero-CLS CSS/SVG `<CosmicFallback />`
3. All required findings and drop-in code blueprints are documented in `analysis.md`.

---

## 5. Verification Method

1. **Vite Production Compilation**:
   ```bash
   docker compose exec -T laravel.test npm run build
   ```
   *Expected*: Compiles successfully with zero syntax, JSX, or Rollup module resolution errors.
2. **Automated Backend & Layout Test Suite**:
   ```bash
   docker compose exec -T laravel.test php artisan test
   ```
   *Expected*: 87/87 tests pass (including all Auth and GuestLayout-rendered feature tests).
3. **Code Style Verification**:
   ```bash
   docker compose exec -T laravel.test ./vendor/bin/pint --test
   ```
   *Expected*: Clean pass across all PHP files.
4. **Component Inspection**:
   - Open `resources/js/Components/CosmicShowcase3D.jsx`.
   - Verify `checkWebGLSupport()`, `<Canvas>`, `frameloop={isVisible ? 'always' : 'never'}`, `SceneLifecycleTeardown`, and `CosmicFallback` match the architecture in `analysis.md`.
