# Technical Analysis: R4 (Advanced 3D WebGL Experience) & R5 (Infrastructure & Verification)

- **Explorer**: Explorer 3 (`teamwork_preview_explorer_survey_3`)
- **Date**: 2026-09-23T15:27:00Z
- **Working Directory**: `z:\home\guilhherme\projetos\meu-app-react`
- **Scope**: Requirements R4 & R5 from `ORIGINAL_REQUEST.md`

---

## 1. Executive Summary

This investigation surveys the current state of 3D celestial rendering and the Docker/container verification environment for the Vaultly / AuraSpace subscription tracker application. 

### Key Findings
1. **Existing 3D Component**: Located at `resources/js/Components/CosmicShowcase3D.jsx` (741 lines). It is currently an HTML5 2D Canvas simulation implementing trigonometric 3D rotation matrices (`rotate3D()`), radial gradients, and manually sliced 2D ellipses to fake depth. It is actively mounted in `resources/js/Layouts/GuestLayout.jsx` wrapping all guest authentication flows (`Login`, `Register`, `ForgotPassword`, etc.).
2. **3D Packages Missing**: No WebGL or 3D libraries (`three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`) are currently installed in `package.json`.
3. **Critical React 18 Dependency Constraint**: The project runs React `18.2.0`. Installing latest `@react-three/fiber` (v9) or `@react-three/drei` (v10) will fail because they mandate React 19 (`^19`). R3F must be pinned to `@react-three/fiber@^8.18.0` and `@react-three/drei@^9.120.0`.
4. **NPM 12 & Vite Peer Resolution Trap**: Node `v24.21.0` and npm `12.0.2` run in the container. npm 12 defaults `allow-remote = "none"` (causing `EALLOWREMOTE`), and `vite@8.3.0` conflicts with `@vitejs/plugin-react@4.2.0` peer expectations (causing `ERESOLVE`). Adding `allow-remote=all` and `legacy-peer-deps=true` to `.npmrc` (or passing flags) completely resolves all dependency installations without error.
5. **Infrastructure Health (R5)**: Container `laravel.test` is fully operational. Verification commands run cleanly:
   - `php artisan test`: **87 passed, 864 assertions** (100% pass rate).
   - `./vendor/bin/pint --test`: **58 files passed**.
   - `npm run build`: **Vite 8.3.0 succeeds in 1.62s** with 1002 modules.

---

## 2. Dependency Audit & Package Ecosystem (R4 & R5)

### 2.1 Current `package.json`
```json
{
    "private": true,
    "type": "module",
    "scripts": {
        "build": "vite build",
        "dev": "vite"
    },
    "devDependencies": {
        "@headlessui/react": "^2.0.0",
        "@inertiajs/react": "^2.0.0",
        "@tailwindcss/forms": "^0.5.3",
        "@tailwindcss/vite": "^4.0.0",
        "@vitejs/plugin-react": "^4.2.0",
        "autoprefixer": "^10.4.12",
        "concurrently": "^10.0.3",
        "laravel-vite-plugin": "^3.1",
        "postcss": "^8.4.31",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "tailwindcss": "^3.2.1",
        "vite": "^8.0.0"
    }
}
```

### 2.2 Target 3D Libraries & Version Matrix

| Library | Status | Required Version Pin | Notes |
|---|---|---|---|
| `three` | Not installed | `^0.170.0` (or `^0.174.0` / `^0.186.0`) | Core WebGL engine |
| `@types/three` | Not installed | `^0.170.0` | Optional / TypeScript definitions |
| `@react-three/fiber` | Not installed | `^8.18.0` | **Crucial:** R3F v9 requires React 19. v8.18.0 supports React `^18.2.0`. |
| `@react-three/drei` | Not installed | `^9.120.0` | **Crucial:** Drei v10 requires React 19. v9.120.0 supports React 18 & R3F 8. |

### 2.3 Container NPM 12 Environment Nuances

During testing inside `docker compose exec -T laravel.test`:
1. **`EALLOWREMOTE`**: npm 12 disables remote tarball downloads by default (`allow-remote = "none"`).
2. **`ERESOLVE`**: `@vitejs/plugin-react@4.2.0` has a peer dependency of `vite: ^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0`, but `vite@8.3.0` is installed.

#### Recommended `.npmrc` Configuration
To make package installation transparent and frictionless for the team, `.npmrc` should include:
```ini
ignore-scripts=true
audit=true
legacy-peer-deps=true
allow-remote=all
```
#### Dry-Run Verification Command
Tested in `laravel.test` container:
```bash
docker compose exec -T laravel.test npm install --dry-run --allow-remote=all --legacy-peer-deps three @react-three/fiber@^8.18.0 @react-three/drei@^9.120.0 recharts sonner framer-motion lucide-react
```
**Result**: Exit code 0, 115 packages resolved cleanly in 2.0s without warnings or broken dependencies.

---

## 3. Existing 3D Cosmic Showcase Architecture

### 3.1 Component Location & Mounting Hierarchy
- **Primary Component**: `resources/js/Components/CosmicShowcase3D.jsx` (741 lines)
- **Mount Point**: `resources/js/Layouts/GuestLayout.jsx` (lines 28–41):
```jsx
<CosmicShowcase3D
    badgeText={badge}
    welcomeTitle={title}
    welcomeSubtitle={subtitle}
    description={description}
/>
```
- **Referencing Pages**:
  - `resources/js/Pages/Auth/Login.jsx`
  - `resources/js/Pages/Auth/Register.jsx`
  - `resources/js/Pages/Auth/ForgotPassword.jsx`
  - `resources/js/Pages/Auth/ResetPassword.jsx`
  - `resources/js/Pages/Auth/ConfirmPassword.jsx`
  - `resources/js/Pages/Auth/VerifyEmail.jsx`
- **Legacy Sibling**: `resources/js/Components/CosmicShowcasePanel.jsx` (381 lines) is an older SVG-only layout that is completely unreferenced.

### 3.2 Visual & DOM Hierarchy of `CosmicShowcase3D.jsx`
The current component structure combines UI and canvas rendering:
```
<div containerRef (3D perspective tilt & mouse hover/drag handlers)>
  ├── Background Nebula Aura (<div ...>)
  ├── <canvas ref={canvasRef}> (Currently 2D HTML5 Canvas)
  ├── Concentric Papercut SVG Cutout Frame (p3dLayer1, p3dLayer2 organic contours)
  ├── Ambient Bottom Scrim (<div ...>)
  ├── Top Bar: Crown Badge & Aura Green Status Indicator
  ├── Center Drag Hint ("Gire em 3D ✦")
  └── Bottom Typography & Feature Badges (HELLO!, title, subtitle, tags)
</div>
```

### 3.3 What Needs to be Upgraded
Currently, the `<canvas>` tag is manipulated via `canvas.getContext('2d')`:
- Stars are drawn as 2D circles (`ctx.arc`) and 2D cross polygons.
- The planet is a 2D radial gradient with manual trigonometry rotating latitude contour paths.
- Rings are split into back segments (`z < 0`) and front segments (`z >= 0`) and drawn using 2D stroke lines.
- Moons are 2D radial gradient circles drawn conditionally before or after the planet.

Upgrading to **React Three Fiber** will replace this pseudo-3D 2D canvas with true GPU-accelerated WebGL while preserving the surrounding organic papercut frame, brand badges, and responsive typography.

---

## 4. Detailed 3D WebGL Technical Requirements (R4)

### 4.1 Realistic PBR Lighting
True Physically Based Rendering requires a calibrated balance of materials and light sources:

1. **Materials**:
   - **Central Emerald Planet**:
     - Use `MeshPhysicalMaterial` (or `MeshStandardMaterial`):
       - `color`: `#059669` (rich emerald core)
       - `roughness`: `0.22` (smooth mineral surface)
       - `metalness`: `0.18` (subtle metallic luster)
       - `clearcoat`: `0.65` (glossy atmospheric glaze)
       - `clearcoatRoughness`: `0.15`
       - `emissive`: `#022c22`, `emissiveIntensity`: `0.25`
   - **Atmospheric Glow / Fresnel Rim**:
     - Outer sphere with slightly larger radius (`scale={[1.05, 1.05, 1.05]}`), transparent with inverted normals or additive fresnel shader/material (`blending={THREE.AdditiveBlending}`).
   - **Secondary Celestial Planet**:
     - `MeshStandardMaterial` with teal/cyan palette (`color: "#0d9488"`, `roughness: 0.35`, `metalness: 0.2`).
   - **Moons & Satellites**:
     - `MeshStandardMaterial` with pearlescent mint tint (`color: "#d1fae5"`, `roughness: 0.45`).

2. **Lighting Arrangement**:
   - `ambientLight`: `intensity={0.35}`, `color="#022c22"` (deep emerald fill light).
   - `directionalLight` (Sun / Key Light): `position={[-6, 5, 5]}`, `intensity={2.4}`, `color="#f0fdf4"` (crisp highlight and defined shadows).
   - `pointLight` (Planet Core Glow): `position={[2, 1, 2]}`, `intensity={1.2}`, `color="#6ee7b7"` (emerald subsurface/atmospheric radiance).
   - `directionalLight` (Back / Rim Light): `position={[4, -3, -4]}`, `intensity={0.9}`, `color="#10b981"` (celestial silhouette illumination).

### 4.2 3D Ring Geometry
- **Geometry**:
  - `TorusGeometry` or `RingGeometry`:
    - Outer Ring: `args={[2.1, 0.035, 16, 128]}` (torus) OR `args={[1.65, 2.25, 128]}` (ring plane rotated `Math.PI / 2`).
    - Inner Ring: `args={[1.75, 0.015, 16, 128]}` for concentric dual-ring realism.
- **Material**:
  - `MeshStandardMaterial`:
    - `color`: `#34d399`
    - `emissive`: `#10b981`, `emissiveIntensity`: `0.6`
    - `transparent`: `true`, `opacity`: `0.85`
    - `side`: `THREE.DoubleSide`
- **Axial Tilt & Depth Sorting**:
  - Tilt the planetary group by ~16° to 22° (`rotation.z = -0.28 rad`).
  - Because WebGL uses true 3D depth testing (`depthTest={true}`, `depthWrite={true}`), the ring naturally traverses behind the back hemisphere and in front of the front hemisphere without manual split-drawing hacks!

### 4.3 Volumetric Star Particles
- **Geometry**:
  - `BufferGeometry` populated with 1,000–1,500 particles distributed inside a 3D bounding box or sphere (`radius: 20`):
    - `positions`: Float32Array (`count * 3`) with randomized coordinates `[-12..12, -12..12, -12..12]`.
    - `colors`: Float32Array (`count * 3`) containing normalized RGB values sampled from the cosmic palette:
      - Mint (`#a7f3d0`: 0.65, 0.95, 0.81)
      - Emerald (`#34d399`: 0.20, 0.83, 0.60)
      - Soft White (`#ffffff`: 1.0, 1.0, 1.0)
      - Cyan (`#6ee7b7`: 0.43, 0.90, 0.72)
- **Material**:
  - `PointsMaterial`:
    - `size`: `0.04` to `0.06`
    - `sizeAttenuation`: `true`
    - `vertexColors`: `true`
    - `transparent`: `true`
    - `opacity`: `0.85`
    - `blending`: `THREE.AdditiveBlending`
- **Volumetric Parallax Motion**:
  - In `useFrame`, slowly rotate the starfield group around the Y and X axes (`starsRef.current.rotation.y += 0.0003`).
  - Apply pointer parallax offset for dynamic depth perception.

### 4.4 Interactive Rotation & Smooth Damping (Lerp)
- **Pointer & Touch Tracking**:
  - Pointer down, pointer move, pointer up handlers attached to container / canvas.
  - Track `isDragging`, `lastPointerPosition`, `velX`, `velY`.
- **Damping Loop (`useFrame`)**:
  - When dragging:
    ```javascript
    const dx = pointer.x - lastPointer.x;
    const dy = pointer.y - lastPointer.y;
    velY = dx * 0.01;
    velX = dy * 0.01;
    ```
  - When released (idle):
    - Smooth friction decay: `velX *= 0.95`, `velY = velY * 0.95 + 0.003 * 0.05` (smooth return to idle orbit speed).
    - Limit X tilt to prevent vertical inversion: `Math.max(-0.6, Math.min(0.6, rotX))`.
  - Lerp / Damping:
    - Use `THREE.MathUtils.damp` or `THREE.MathUtils.lerp` for micro-interaction smoothness.
    - Full touch support with `touch-none` prevents mobile gesture conflicts.

### 4.5 Performance, 60 FPS & Clean Teardown
- **IntersectionObserver**:
  - Pause rendering when the component is off-screen.
  - In R3F: `frameloop={isVisible ? 'always' : 'never'}` stops the requestAnimationFrame loop entirely when not visible, ensuring zero CPU/GPU overhead when scrolled away.
- **Pixel Ratio Optimization**:
  - Capped `dpr={[1, Math.min(window.devicePixelRatio || 1, 2)]}` to avoid performance degradation on 4K / retina screens.
  - Set `gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}`.
- **Lifecycle Cleanup**:
  - On component unmount, R3F disposes WebGL context and buffers.
  - Explicitly remove window resize listeners and disconnect the IntersectionObserver.

---

## 5. Verification Environment & Test Infrastructure (R5)

### 5.1 Docker Architecture
- Containers running via Docker Compose:
  - `meu-app-react-laravel.test-1`: PHP 8.5.10 CLI, Node v24.21.0, npm 12.0.2, Vite 8.3.0.
  - `meu-app-react-mysql-1`: MySQL 8.4 (healthy on port 3306).
- All operations must be run inside `laravel.test` using:
  ```bash
  docker compose exec -T laravel.test <command>
  ```

### 5.2 Verification Commands Baseline

| Command | Target | Current Status | Execution Time |
|---|---|---|---|
| `docker compose exec -T laravel.test php artisan test` | 12 test files, 87 tests, 864 assertions | **100% PASS** | ~4.73s |
| `docker compose exec -T laravel.test ./vendor/bin/pint --test` | 58 PHP source files | **100% PASS** | ~0.5s |
| `docker compose exec -T laravel.test npm run build` | Vite asset compilation (1002 modules) | **100% PASS** | ~1.62s |

### 5.3 Automated Test Coverage Breakdown
The test suite covers:
- `Tests\Feature\AdversarialArchitectureReviewTest`: IDOR mass assignment, tenant isolation, XSS deep sanitization, route rate limiting, multi-currency accounting.
- `Tests\Feature\Auth\*`: Authentication, registration, email verification, password confirmation, password reset, password update.
- `Tests\Feature\SubscriptionAdversarialStressTest`: SQL injection, price boundaries, non-existent resource 404, unicode/emoji, state machine toggling.
- `Tests\Feature\SubscriptionEmpiricalChallengeTest`: Tag stripping, price boundaries, leak prevention, due soon boundaries.
- `Tests\Feature\SubscriptionTest`: Guest redirects, user isolation, currency aggregation (BRL, USD, EUR), billing cycles, calculations.

---

## 6. Implementation Blueprint & Recommendations for Subsequent Agents

### 6.1 Dependency Installation Step
Configure `.npmrc` with `legacy-peer-deps=true` and `allow-remote=all`, then install:
```bash
docker compose exec -T laravel.test npm install --legacy-peer-deps --allow-remote=all three @react-three/fiber@^8.18.0 @react-three/drei@^9.120.0
```
*(Combined with recharts, sonner, framer-motion, lucide-react if installing all packages at once).*

### 6.2 Component Architecture for R4
1. Keep `resources/js/Components/CosmicShowcase3D.jsx` as the exported entry component to avoid breaking any imports in `GuestLayout.jsx`.
2. Extract the WebGL canvas into an R3F `<Canvas>` sub-tree or internal scene component:
   - `<CelestialScene />`:
     - `<ambientLight ... />`
     - `<directionalLight ... />`
     - `<pointLight ... />`
     - `<EmeraldPlanet />` with `MeshPhysicalMaterial`, axial tilt, and dual torus rings.
     - `<VolumetricStarfield />` with `Points` and `BufferGeometry`.
     - `<OrbitingMoons />` with orbital trigonometry updated in `useFrame`.
3. Wrap the canvas with the existing organic SVG papercut overlay, brand badges, and responsive typography to preserve 100% visual fidelity with the reference design.
4. Verify with:
   - `docker compose exec -T laravel.test npm run build`
   - `docker compose exec -T laravel.test php artisan test`
   - `docker compose exec -T laravel.test ./vendor/bin/pint --test`
