## 2026-09-24T12:22:21Z

You are Worker M4 for Milestone 4: Advanced 3D WebGL Cosmic Showcase.
Your working directory is: z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_worker_m4

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read z:\home\guilhherme\projetos\meu-app-react\.agents\ORIGINAL_REQUEST.md before starting work.
Also read:
- z:\home\guilhherme\projetos\meu-app-react\.agents\orchestrator_1\PROJECT.md
- z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m4_1\analysis.md
- z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m4_2\analysis.md
- z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m4_3\analysis.md

Your exclusive file write boundaries:
- `resources/js/Components/CosmicShowcase3D.jsx`

Implementation Tasks:
Upgrade `resources/js/Components/CosmicShowcase3D.jsx` from the 2D HTML5 canvas simulation to a full production React Three Fiber 3D scene combining all three Explorer blueprints:
1. R3F Scene Graph & Canvas Setup (Explorer M4.1 blueprint):
   - Import from `@react-three/fiber`, `@react-three/drei`, and `three`.
   - Setup `<Canvas>` with `camera={{ fov: 45, near: 0.1, far: 1000, position: [0, 0, 8] }}`, `dpr={[1, 2]}`, `gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }}`.
   - Dynamic frameloop via `IntersectionObserver`: `frameloop={isVisible ? 'always' : 'never'}` (pauses rendering when out of viewport).
   - Robust WebGL context loss handling: `webglcontextlost` calling `e.preventDefault()`, and `webglcontextrestored` incrementing `canvasKey` for clean remount.
   - Hydration guard (`isMounted`, WebGL support check) and zero-CLS fallback container (`CosmicFallback`).
   - Clean teardown on unmount: `SceneLifecycleTeardown` component that recursively disposes all geometries, materials, and calls `gl.dispose()`.
   - Shared mutable `interactionRef` between container DOM events and R3F `useFrame` loop (prevents React re-render loops on pointer move).
2. PBR Materials & 4-Point Celestial Lighting (Explorer M4.2 blueprint):
   - Central Emerald Planet: `sphereGeometry(1.0, 64, 64)`, `meshPhysicalMaterial` (`color="#059669"`, `emissive="#064e3b"`, `emissiveIntensity={0.25}`, `roughness={0.22}`, `metalness={0.18}`, `clearcoat={0.65}`, `clearcoatRoughness={0.15}`, `sheen={1.0}`).
   - Concentric atmospheric rim glow: outer sphere (`scale={[1.045, 1.045, 1.045]}`) with translucent rim shader or additive blending.
   - 4-Point celestial lighting: Key directional light `[-6, 5, 5]` (intensity 2.4, cool white `#f0fdf4`), Fill light `[5, -2, 3]` (intensity 0.8, soft cyan `#38bdf8`), Rim light `[3, 4, -5]` (intensity 1.6, cosmic emerald `#10b981`), Ambient light (intensity 0.35, dark emerald `#022c22`).
3. 3D Ring Geometry & Native Depth Occlusion (Explorer M4.2 blueprint):
   - Equatorial ring group with ~18° axial tilt (`rotation: [0.32, 0, 0.25]`).
   - `ringGeometry(1.45, 2.45, 64)` with rotation `[-Math.PI / 2, 0, 0]`.
   - Ring material: `side: THREE.DoubleSide`, `transparent: true`, `opacity: 0.85`, `depthWrite: true`.
   - Native WebGL depth-buffer occlusion: Planet writes depth buffer in opaque pass; rear half of ring is naturally occluded by the planet, and front half of ring renders over the planet.
4. Volumetric Star Particle System (Explorer M4.3 blueprint):
   - `bufferGeometry` with 1,200 points in dual-region volume (near-orbit halo $r \in [2.4, 6.5]$ + deep celestial shell $r \in [6.5, 20.0]$), with core exclusion radius $r < 2.4$.
   - Attribute arrays for positions and 6-tone cosmic colors (white, mint, emerald, teal, cyan, violet).
   - `pointsMaterial` with `THREE.AdditiveBlending`, `depthWrite: false`, `transparent: true`, `opacity: 0.85`, soft radial starlight alpha map.
   - Continuous axial drift and precession in `useFrame`.
5. Interactive Pointer Tracking with Exponential Damping (Explorer M4.3 blueprint):
   - Universal Pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`) with `setPointerCapture`.
   - Exponential lerp damping in `useFrame`: `1 - Math.exp(-6 * delta)` for smooth, frame-rate-independent rotation.
   - Steady idle orbit rotation ($\approx 0.25\text{ rad/s}$) that smoothly resumes when pointer interaction ceases.
   - Pitch clamping ($\pm 0.55\text{ rad}$) to prevent flipping/gimbal lock.
   - Full accessibility support: respect `useReducedMotion()` from `framer-motion`.
6. Aesthetic Presentation & Layout Stability:
   - Preserve signature multi-layered organic papercut SVG aperture framing (`p3dLayer1`, `p3dLayer2`), crown badge ("Vaultly Premium Experience"), spinning sparkle indicator, "Gire em 3D ✦" cue, and responsive typography.
   - Ensure zero layout shift (CLS = 0) and zero horizontal overflow in `GuestLayout.jsx`.
7. Container Verification:
   Run all container verification commands inside `laravel.test`:
   - `docker compose exec -T laravel.test php artisan test`
   - `docker compose exec -T laravel.test ./vendor/bin/pint --test`
   - `docker compose exec -T laravel.test npm run build`
   - `docker compose exec -T laravel.test node tests/e2e/run_all.js`
8. Write your handoff report to `handoff.md` in your working directory.
Send a completion message back when finished.
