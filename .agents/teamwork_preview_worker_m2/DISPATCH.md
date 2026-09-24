## 2026-09-23T16:21:17Z
You are Worker M2 for Milestone 2: Fluid Interface Animations.
Your working directory is: z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_worker_m2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read z:\home\guilhherme\projetos\meu-app-react\.agents\ORIGINAL_REQUEST.md before starting work.
Also read:
- z:\home\guilhherme\projetos\meu-app-react\.agents\orchestrator_1\PROJECT.md
- z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m2_1\analysis.md
- z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m2_2\analysis.md
- z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m2_3\analysis.md

Your exclusive file write boundaries:
- `resources/js/Components/Modal.jsx`
- `resources/js/Pages/Dashboard.jsx`

Implementation Tasks:
1. Upgrade `resources/js/Components/Modal.jsx` with Framer Motion spring physics:
   - Wrap `@headlessui/react`'s `<Dialog static open={show} onClose={close}>` with `<AnimatePresence>` and `<DialogPanel as={motion.div}>`.
   - Fixed backdrop with blur (`backdrop-blur-sm bg-zinc-950/70`) and fade (`opacity: 0 -> 1`).
   - Damped harmonic spring physics on panel (`damping: 26, stiffness: 360, mass: 0.8`).
   - Accessible reduced motion support via `useReducedMotion()`.
   - Maintain 100% prop compatibility for `SubscriptionModal.jsx`, `DeleteSubscriptionModal.jsx`, and `DeleteUserForm.jsx`.
2. Upgrade `resources/js/Pages/Dashboard.jsx` with Staggered Entrance Animations:
   - Define `staggerContainer` (`staggerChildren: 0.08, delayChildren: 0.05`) and `staggerCard` (`y: 20 -> 0, scale: 0.98 -> 1`, spring `stiffness: 300, damping: 24, mass: 0.8`).
   - Staggered entrance for Due Soon alert banner, Metric Cards grid (3 cards), placeholder for upcoming financial charts, and filter controls.
   - Use `useReducedMotion()` to skip animations when user prefers reduced motion.
3. Upgrade `resources/js/Pages/Dashboard.jsx` with Smooth Layout Filter & Sort Animations:
   - Add client-side sorting state: `sortField` (default `'next_billing_date'`) and `sortOrder` (default `'asc'`).
   - Implement memoized sorting pipeline matching `analysis.md` (null-safe chronological comparison for `next_billing_date`, `monthly_equivalent_price` for `price`, locale-aware `name` and `category`, `status` [active before paused], with secondary tie-breakers).
   - Make table headers clickable (`Serviço`, `Categoria`, `Próxima Cobrança`, `Valor`) with animated chevron indicators showing active column and order.
   - Add mobile `<SelectInput>` sort dropdown in filter controls.
   - Table rows: use `motion.tr` with `layout="position"` inside `<AnimatePresence initial={false}>` to eliminate cell width distortion. Fixed column percentage widths on `<th>`.
   - Mobile cards: use `motion.div layout` with `<AnimatePresence mode="popLayout" initial={false}>`.
4. Run container verification commands:
   - `docker compose exec -T laravel.test php artisan test`
   - `docker compose exec -T laravel.test ./vendor/bin/pint --test`
   - `docker compose exec -T laravel.test npm run build`
   - `docker compose exec -T laravel.test node tests/e2e/run_all.js`
5. Write your handoff report to `handoff.md` in your working directory.
Send a completion message back when finished.
