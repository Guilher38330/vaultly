## 2026-09-24T12:17:42Z
You are Explorer M4.1 for Milestone 4: Advanced 3D WebGL Cosmic Showcase (R3F Canvas & Scene Lifecycle).
Working directory: z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m4_1

MANDATORY: Read z:\home\guilhherme\projetos\meu-app-react\.agents\ORIGINAL_REQUEST.md before starting work.
Also read:
- z:\home\guilhherme\projetos\meu-app-react\.agents\orchestrator_1\PROJECT.md
- z:\home\guilhherme\projetos\meu-app-react\resources\js\Components\CosmicShowcase3D.jsx
- z:\home\guilhherme\projetos\meu-app-react\resources\js\Layouts\GuestLayout.jsx
- z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_survey_3\analysis.md

Your task:
Analyze and formulate the R3F Canvas and Scene lifecycle architecture in `resources/js/Components\CosmicShowcase3D.jsx`:
1. Formulate replacement of HTML5 2D canvas with React Three Fiber (`@react-three/fiber@8.18.0`, `@react-three/drei@9.122.0`, `three@0.170.0`).
2. Design `<Canvas>` setup: perspective camera (`fov: 45, position: [0, 0, 8]`), `gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}`, `dpr={[1, 2]}`.
3. Formulate lifecycle & performance controls:
   - `IntersectionObserver` on container to toggle `frameloop={isVisible ? 'always' : 'never'}`.
   - Clean unmount teardown: explicitly disposing geometries, materials, and renderer (`gl.dispose()`).
   - WebGL context loss handling (`webglcontextlost`, `webglcontextrestored`).
   - SSR/fallback container to ensure zero hydration issues.
4. Write technical analysis to `analysis.md` and handoff report to `handoff.md` in your working directory.
Send a completion message back when finished.
