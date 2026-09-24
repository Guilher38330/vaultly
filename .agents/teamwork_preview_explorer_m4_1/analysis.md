# Technical Architecture & Formulation: R3F Canvas & Scene Lifecycle (Milestone 4 / Task M4.1)

- **Agent**: Explorer M4.1 (`teamwork_preview_explorer_m4_1`)
- **Date**: 2026-09-24T12:21:00Z
- **Target File**: `resources/js/Components/CosmicShowcase3D.jsx`
- **Scope**: R3F Canvas Configuration, Camera & Renderer Settings, Lifecycle Management, Performance Controls, Teardown Disposal, WebGL Context Loss Recovery, and SSR Fallback Guard.

---

## 1. Executive Summary & Problem Formulation

### 1.1 Current Architecture & Limitations
The current `CosmicShowcase3D.jsx` (741 lines) implements an HTML5 2D canvas (`<canvas ref={canvasRef} />`) inside a 2D rendering context (`canvas.getContext('2d')`). While it ingeniously simulates 3D perspective via custom trigonometric transformation matrices (`rotate3D()`), radial gradients, and manually split front/back ring arc segments, it suffers from fundamental architectural shortcomings:
1. **CPU Bound**: All planetary shading, star twinkling, ring projection, and depth sorting are computed on the main JavaScript thread via `requestAnimationFrame`, causing potential frame drops on CPU-constrained devices.
2. **Pseudo-3D Depth**: There is no hardware depth buffer (`Z-buffer`). Rings, moons, and planetary bands are drawn using arbitrary conditional layer ordering (`z < 0` vs `z >= 0`), resulting in clipping artifacts and lack of true spatial depth.
3. **No Physically Based Rendering (PBR)**: Shading is limited to 2D canvas radial gradients without real roughness, metalness, clearcoat, specular highlights, or directional reflections.

### 1.2 Target R3F WebGL Architecture
The application already has the necessary dependencies installed in `package.json`:
- `three`: `^0.170.0`
- `@react-three/fiber`: `^8.18.0` (React 18-compatible major version)
- `@react-three/drei`: `^9.122.0` (React 18-compatible major version)

Explorer M4.1 designs the **Canvas and Scene Lifecycle infrastructure** to host the PBR celestial materials (formulated by M4.2) and volumetric particles / interaction damping (formulated by M4.3).

---

## 2. `<Canvas>` Setup & Hardware Configuration

### 2.1 Perspective Camera Specification
The camera must be placed to achieve cinematic celestial proportions within the card viewport without optical distortion:

```jsx
<Canvas
    camera={{
        fov: 45,
        near: 0.1,
        far: 1000,
        position: [0, 0, 8],
    }}
    ...
>
```

#### Camera Parameter Rationale:
- **Field of View (`fov: 45`)**: A standard 45° vertical field of view provides a natural focal length that prevents wide-angle barrel distortion along the card edges while maintaining sufficient perspective divergence for depth perception.
- **Position (`[0, 0, 8]`)**: With the camera positioned at $Z = 8$ and origin $(0, 0, 0)$, the visible frustum height at the scene center is:
  $$H = 2 \times 8 \times \tan(22.5^\circ) \approx 6.627 \text{ units}$$
  A central emerald planet with radius $R \approx 1.35$ units occupies $\approx 40\%$ of the viewport height, fitting naturally within the organic papercut SVG frame (`viewBox="0 0 500 700"`).
- **Clipping Planes (`near: 0.1, far: 1000`)**: Deep enough to encompass volumetric star particles in $[-12, 12]$ without Z-fighting or precision loss in the 24-bit depth buffer.

### 2.2 WebGL Renderer (`gl`) Configuration
```jsx
gl={{
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
}}
```

#### Renderer Attributes Rationale:
1. **`antialias: true`**: Activates hardware 4x MSAA (Multi-Sample Anti-Aliasing) to eliminate jagged edges on planetary silhouettes, ring toruses, and orbiting satellites.
2. **`alpha: true`**: Enables transparent canvas composition. The deep space background gradient (`from-emerald-950 via-teal-950 to-zinc-950`) and radiant nebula blurs configured in the parent DOM container shine through seamlessly.
3. **`powerPreference: 'high-performance'`**: Explicitly prompts dual-GPU laptops (e.g., MacBook Pro, Windows gaming laptops) to utilize the discrete GPU (NVIDIA/AMD) rather than the low-power integrated chip, ensuring guaranteed 60fps rendering under PBR workloads.
4. **`preserveDrawingBuffer: false`**: Automatically releases the drawing buffer after frame swap, reducing GPU VRAM allocation by up to 50% compared to preserved buffers.

### 2.3 Device Pixel Ratio Clamping (`dpr={[1, 2]}`)
Modern smartphones and retina displays often boast device pixel ratios of 2.5x, 3x, or 4x (e.g., Samsung Galaxy S-series, iPhone Pro, 4K displays).
- Rendering a full WebGL canvas at 3x or 4x DPR increases fragment shader invocations quadratically ($3^2 = 9\times$, $4^2 = 16\times$), which quickly exhausts mobile GPU fillrate, drains battery, and causes thermal throttling.
- Passing `dpr={[1, 2]}` clamps the rendering resolution between 1x and 2x. A 2x cap delivers razor-sharp visual acuity while preventing mobile thermal degradation.

---

## 3. Lifecycle & Performance Controls

### 3.1 Viewport IntersectionObserver & Auto-Pause (`frameloop`)
When the authentication card is scrolled out of view (e.g., on small mobile viewports where forms push content downward, or in tabbed layouts), continuing to render WebGL at 60fps is a severe waste of device resources.

R3F provides the `frameloop` prop with three modes: `'always'`, `'demand'`, and `'never'`.

#### Implementation Architecture:
```javascript
const [isVisible, setIsVisible] = useState(true);

useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
        ([entry]) => {
            setIsVisible(entry.isIntersecting);
        },
        {
            root: null, // Viewport
            rootMargin: '50px', // Pre-wake margin
            threshold: 0.05, // Trigger when 5% visible
        }
    );

    observer.observe(container);

    return () => {
        observer.disconnect();
    };
}, []);
```

#### Canvas Integration:
```jsx
<Canvas
    frameloop={isVisible ? 'always' : 'never'}
    ...
>
```

- When `isVisible === true`: Continuous 60fps render loop with real-time pointer reactivity and celestial animations.
- When `isVisible === false`: Render loop is completely suspended (`'never'`). 0% GPU and 0% CPU consumption.
- `rootMargin: '50px'`: Wakes the render loop 50px before entering viewport, eliminating pop-in stutter during scrolling.

---

### 3.2 Clean Unmount Teardown & Resource Disposal
In an Inertia.js Single Page Application, navigating between authentication routes (`/login`, `/register`, `/forgot-password`) swaps React layout components in memory without a full page reload.

If WebGL resources are not explicitly destroyed on unmount:
1. GPU vertex buffer objects (geometries) remain allocated in VRAM.
2. Compiled GLSL shader programs and materials leak memory.
3. The browser hits the WebGL context limit (typically 8–16 active contexts per origin), throwing:
   `WARNING: Too many active WebGL contexts. Oldest context will be lost.`
   causing other canvases or subsequent pages to crash.

#### Teardown Mechanism (`SceneLifecycleTeardown`):
Inside the `<Canvas>` tree, a dedicated lifecycle child component accesses Three.js scene and renderer via `useThree()`:

```javascript
function SceneLifecycleTeardown({ glRef }) {
    const { gl, scene } = useThree();

    useEffect(() => {
        if (glRef) glRef.current = gl;

        return () => {
            // 1. Recursive Scene Traversal & Buffer Disposal
            scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((mat) => {
                            if (mat.map) mat.map.dispose();
                            mat.dispose();
                        });
                    } else {
                        if (object.material.map) object.material.map.dispose();
                        object.material.dispose();
                    }
                }
            });

            // 2. Clear Scene Graph Hierarchy
            scene.clear();

            // 3. Renderer Disposal
            try {
                if (gl && typeof gl.dispose === 'function') {
                    gl.dispose();
                }
            } catch (err) {
                // Silently handle any teardown race conditions
            }
        };
    }, [gl, scene, glRef]);

    return null;
}
```

---

### 3.3 WebGL Context Loss Handling (`webglcontextlost` & `webglcontextrestored`)
WebGL contexts can be forcibly dropped by the operating system or browser when:
- The GPU driver crashes or resets.
- The computer enters sleep/hibernate mode.
- System memory pressure triggers GPU context scavenging.

#### WebGL Specification Rule:
Under the WebGL specification (Section 5.14.13), if the `webglcontextlost` event is received and `event.preventDefault()` is **not** called, the browser assumes the application cannot recover and **permanently destroys the context**.

#### Resilient Context Recovery Architecture:
```javascript
const [isContextLost, setIsContextLost] = useState(false);
const [canvasKey, setCanvasKey] = useState(0);
const glDomElementRef = useRef(null);

const handleCanvasCreated = useCallback(({ gl }) => {
    const domElement = gl.domElement;
    glDomElementRef.current = domElement;

    const handleContextLost = (event) => {
        // MANDATORY: Prevents permanent context termination
        event.preventDefault();
        setIsContextLost(true);
    };

    const handleContextRestored = () => {
        setIsContextLost(false);
        // Force React to mount a clean R3F root with rebuilt WebGL buffers & shaders
        setCanvasKey((prev) => prev + 1);
    };

    domElement.addEventListener('webglcontextlost', handleContextLost, false);
    domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    domElement._cleanupContextListeners = () => {
        domElement.removeEventListener('webglcontextlost', handleContextLost);
        domElement.removeEventListener('webglcontextrestored', handleContextRestored);
    };
}, []);

// Detach event listeners on unmount
useEffect(() => {
    return () => {
        if (glDomElementRef.current && glDomElementRef.current._cleanupContextListeners) {
            glDomElementRef.current._cleanupContextListeners();
        }
    };
}, []);
```

Key features:
1. `event.preventDefault()` satisfies the WebGL specification to request restoration.
2. When `webglcontextrestored` fires, `canvasKey` increments, cleanly remounting `<Canvas key={canvasKey}>`.
3. When `isContextLost === true`, the component displays the zero-CLS fallback layer while waiting for recovery.

---

### 3.4 SSR & Hydration Guard (`checkWebGLSupport` & `CosmicFallback`)
Three.js and R3F depend directly on browser APIs (`window`, `document`, `HTMLCanvasElement`, `WebGLRenderingContext`). In SSR environments or client environments without WebGL hardware support, direct instantiation will throw fatal exceptions.

#### Safe WebGL Capability Detection:
```javascript
export function checkWebGLSupport() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return false;
    }
    try {
        const canvas = document.createElement('canvas');
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl2') ||
             canvas.getContext('webgl') ||
             canvas.getContext('experimental-webgl'))
        );
    } catch {
        return false;
    }
}
```

#### Client Hydration Guard:
```javascript
const [isMounted, setIsMounted] = useState(false);
const [hasWebGL, setHasWebGL] = useState(true);

useEffect(() => {
    setIsMounted(true);
    setHasWebGL(checkWebGLSupport());
}, []);
```

#### Zero-CLS CSS/SVG Fallback (`CosmicFallback`):
When `!isMounted` (during SSR / pre-hydration) or `!hasWebGL` (headless/unsupported devices) or `isContextLost`:
```jsx
function CosmicFallback() {
    return (
        <div
            className="absolute inset-0 h-full w-full flex items-center justify-center overflow-hidden pointer-events-none"
            aria-hidden="true"
        >
            {/* Ambient Nebula Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.22),rgba(4,120,87,0.08)_50%,transparent_75%)] animate-pulse duration-3000" />
            
            {/* CSS Celestial Sphere Simulation */}
            <div className="relative flex items-center justify-center">
                {/* Secondary satellite dot */}
                <div className="absolute -top-16 -right-16 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-300 to-teal-800 shadow-[0_0_15px_rgba(52,211,153,0.5)] opacity-80" />
                
                {/* Back Ring simulation */}
                <div className="absolute h-36 w-64 rounded-full border-2 border-emerald-400/40 -rotate-12 blur-[0.5px]" />
                
                {/* Central Planet Disc */}
                <div className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-gradient-to-br from-emerald-200 via-emerald-600 to-teal-950 shadow-[0_0_35px_rgba(16,185,129,0.45),inset_-8px_-8px_16px_rgba(2,44,34,0.9)]" />
                
                {/* Front Ring simulation */}
                <div className="absolute h-36 w-64 rounded-full border-t-4 border-r-2 border-emerald-300/80 -rotate-12 shadow-[0_0_12px_rgba(110,231,183,0.6)]" />
            </div>

            {/* Ambient Star Sparkles (CSS/SVG) */}
            <div className="absolute top-1/4 left-1/4 h-1.5 w-1.5 rounded-full bg-emerald-200 shadow-[0_0_8px_#a7f3d0] animate-ping" />
            <div className="absolute top-1/3 right-1/4 h-2 w-2 rounded-full bg-white shadow-[0_0_10px_#ffffff] opacity-70" />
            <div className="absolute bottom-1/3 left-1/3 h-1 w-1 rounded-full bg-teal-300 opacity-60" />
        </div>
    );
}
```

Benefits:
- Identical visual bounding box: zero layout shift (Cumulative Layout Shift = 0).
- Pure CSS/Tailwind: zero external asset loads, zero WebGL calls.
- Completely immune to SSR hydration mismatches.

---

## 4. Shared Interaction Bridge Architecture

To achieve high-frequency pointer responsiveness (60Hz–120Hz) without causing destructive React state re-renders of the component tree, we employ a **mutable ref pattern** (`interactionRef`):

### 4.1 Data Structure (`interactionRef`)
```javascript
const interactionRef = useRef({
    // Normalized pointer coordinates [-1, 1] relative to center
    pointer: { x: 0, y: 0, targetX: 0, targetY: 0 },
    // Drag state
    isDragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
    // Planet rotation angles (radians)
    rotX: 0.15,
    rotY: -0.3,
    rotZ: -0.28, // Axial tilt ~16-18 degrees
    // Rotational velocities
    velX: 0,
    velY: 0.005, // Idle rotation
    // Interactive pulse wave
    clickPulse: 0,
});
```

### 4.2 Data Flow
1. **Container Events (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerLeave`)**:
   - Mutate `interactionRef.current` directly.
   - Zero React re-renders during drag or pointer motion.
2. **Card 3D Perspective Tilt**:
   - Updated in a lightweight RAF loop interpolating `interactionRef.current.pointer` into `cardTransform` style.
3. **R3F Scene Components (`useFrame`)**:
   - Subsystems (planet, rings, starfield) read `interactionRef.current` on each frame tick to update mesh rotations, orbital angles, and starfield parallax.

---

## 5. Architectural Blueprint for `CosmicShowcase3D.jsx`

Here is the structured decomposition to be assembled by Worker M4 with M4.2 and M4.3:

```
resources/js/Components/CosmicShowcase3D.jsx
├── checkWebGLSupport() [Utility helper]
├── CosmicFallback [Zero-CLS CSS/SVG Fallback component]
├── SceneLifecycleTeardown [Internal R3F unmount & disposal component]
├── CosmicScene [Internal R3F scene graph orchestrator]
│   ├── CelestialLighting [From M4.2: 4-point PBR lighting]
│   ├── PlanetGroup [From M4.2: Emerald planet, atmosphere, 3D rings, moons]
│   └── VolumetricStarfield [From M4.3: 1500 particles, points material, parallax]
└── CosmicShowcase3D [Default Export Container]
    ├── State: isVisible, isMounted, hasWebGL, isContextLost, canvasKey, isDragging, isHovered, cardTransform
    ├── Refs: containerRef, interactionRef, glDomElementRef, glRef
    ├── Pointer Handlers: handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave, handlePointerEnter
    └── DOM Structure:
        ├── Deep Space Background & Radial Glows
        ├── R3F Canvas Container / CosmicFallback (Absolute inset-0)
        ├── Concentric Papercut SVG Frame (Preserved 1:1)
        ├── Ambient Bottom Scrim
        ├── Top Bar: Badge Link & Aura Green Status
        ├── Center Hint: "Gire em 3D ✦"
        └── Bottom Content: Typography, Pill Tags, Children
```

---

## 6. Verification & Acceptance Criteria Matrix

| Criterion | Expected Behavior | Verification Method |
|---|---|---|
| **Vite Compilation** | Clean build with zero import or Rollup errors | `docker compose exec -T laravel.test npm run build` |
| **Perspective Camera** | FOV 45, position `[0, 0, 8]` centered at origin | Inspect Canvas props in `CosmicShowcase3D.jsx` |
| **Hardware Config** | MSAA 4x, alpha transparency, high-performance GPU | Verify `gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}` |
| **DPR Clamping** | Clamped to `[1, 2]` to prevent mobile GPU throttling | Verify `dpr={[1, 2]}` |
| **Auto-Pause** | R3F halts render loop when scrolled off-screen | Verify `IntersectionObserver` toggling `frameloop={isVisible ? 'always' : 'never'}` |
| **Clean Teardown** | Geometries, materials, and renderer disposed on unmount | Verify `SceneLifecycleTeardown` calling `object.geometry.dispose()`, `mat.dispose()`, `gl.dispose()` |
| **Context Loss** | Prevents permanent termination and restores cleanly | Verify `event.preventDefault()` on `webglcontextlost` and `setCanvasKey(k => k + 1)` on `webglcontextrestored` |
| **SSR / Hydration** | Zero hydration mismatch or runtime crash without WebGL | Verify `isMounted` guard and `<CosmicFallback />` |
| **Layout Preservation** | Papercut frame, typography, and badges remain pixel-perfect | Visual inspection in `GuestLayout.jsx` |
