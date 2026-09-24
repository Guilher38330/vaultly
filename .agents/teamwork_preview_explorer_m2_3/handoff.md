# Handoff Report: Fluid Interface Animations (Filter & Sort Layout Animations)

**Explorer**: M2.3  
**Milestone**: Milestone 2: Fluid Interface Animations (F6)  
**Date**: 2026-09-23  
**Working Directory**: `z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m2_3`  
**Handoff Type**: Hard (Investigation & Formulation Complete)  

---

## 1. Observation

1. **`package.json` Dependencies**:
   Line 30 of `package.json`:
   ```json
   "framer-motion": "^13.4.2",
   ```
   `framer-motion` is installed and ready for layout animations, transitions, and spring physics.

2. **Existing Filtering Pipeline in `Dashboard.jsx`**:
   `resources/js/Pages/Dashboard.jsx` lines 94-98:
   ```javascript
   // Filters state
   const [search, setSearch] = useState('');
   const [categoryFilter, setCategoryFilter] = useState('all');
   const [statusFilter, setStatusFilter] = useState('all');
   const [cycleFilter, setCycleFilter] = useState('all');
   ```
   `Dashboard.jsx` lines 124-146:
   ```javascript
   const filteredSubscriptions = useMemo(() => {
       return subscriptions.filter((sub) => { ... });
   }, [subscriptions, search, categoryFilter, statusFilter, cycleFilter]);
   ```
   There is **no sort state** (`sortField`, `sortOrder`) and no sorting comparator executed on the client.

3. **Desktop Table Headers in `Dashboard.jsx`**:
   `resources/js/Pages/Dashboard.jsx` lines 518-540:
   ```jsx
   <thead className="border-b border-zinc-200/80 bg-zinc-50/75 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
       <tr>
           <th scope="col" className="px-6 py-3.5">Serviço</th>
           <th scope="col" className="px-6 py-3.5">Categoria</th>
           <th scope="col" className="px-6 py-3.5">Ciclo</th>
           <th scope="col" className="px-6 py-3.5">Próxima Cobrança</th>
           <th scope="col" className="px-6 py-3.5">Valor</th>
           <th scope="col" className="px-6 py-3.5">Status</th>
           <th scope="col" className="px-6 py-3.5 text-right">Ações</th>
       </tr>
   </thead>
   ```
   All header cells are plain non-interactive text with no sort triggers, indicators, or accessibility attributes.

4. **Desktop Table Body and Mobile Cards in `Dashboard.jsx`**:
   `Dashboard.jsx` lines 542-551:
   ```jsx
   <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
       {filteredSubscriptions.map((sub) => {
           ...
           return (
               <tr
                   key={sub.id}
                   className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
               >
   ```
   `Dashboard.jsx` lines 663-673:
   ```jsx
   <div className="space-y-3.5 md:hidden">
       {filteredSubscriptions.map((sub) => {
           ...
           return (
               <div
                   key={sub.id}
                   className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900"
               >
   ```
   Both desktop rows and mobile cards mount and unmount abruptly with zero animation or layout reordering.

5. **Subscription Data Structure**:
   `app/Http/Resources/SubscriptionResource.php` lines 36-51 returns:
   - `id`: integer
   - `name`: string
   - `price`: float
   - `currency`: string ('BRL', 'USD', 'EUR')
   - `billing_cycle`: string ('monthly', 'yearly')
   - `category`: string
   - `next_billing_date`: 'YYYY-MM-DD' or null
   - `status`: 'active' or 'paused'
   - `monthly_equivalent_price`: float
   - `yearly_equivalent_price`: float

6. **Icon Components in `Icons.jsx`**:
   `resources/js/Components/Icons.jsx` contains 454 lines of custom SVG icons, but currently lacks `ChevronUpIcon` and `ChevronUpDownIcon`.

---

## 2. Logic Chain

1. **Client-Side Sorting Engine Necessity**:
   - *From Observation 2 & 3*: The dashboard delivers all subscriptions as Inertia page props, but lacks client-side sorting. Without sorting, users cannot quickly view subscriptions by highest cost, nearest billing date, or name.
   - *From Observation 5*: The resource provides `next_billing_date`, `monthly_equivalent_price`, `price`, `name`, `category`, and `status`.
   - *Inference*: Implementing client-side sorting via `sortField` and `sortOrder` in `useMemo` gives instantaneous 0ms sorting response with zero server overhead.
   - *Inference for Stability*: A deterministic secondary tie-breaker (`(a.name).localeCompare(b.name)` then `a.id - b.id`) prevents identical sort keys from swapping randomly during re-renders, guaranteeing smooth animation tracks.

2. **Table Animation Strategy (`layout="position"` vs Default `layout`)**:
   - *From Observation 4*: Desktop table uses HTML `<table>`, `<tbody>`, `<tr>`, and `<td>`.
   - *Browser Mechanics*: HTML tables operate under CSS Table Formatting Context where column widths are shared across rows.
   - *Framer Motion FLIP Mechanics*: Default `layout` applies 2D matrix scale transforms: `translate3d(...) scale(sx, sy)`. On `<tr>` elements, scale transforms distort cell contents, blur borders, and stretch typography.
   - *Inference*: Using `layout="position"` on `motion.tr` instructs Framer Motion to animate ONLY translation coordinates (`translate3d(dx, dy, 0)`) with `scale: 1`. This eliminates all cell warping and border distortion.
   - *`AnimatePresence` Mode*: Setting `mode="popLayout"` on a `<tr>` applies `position: absolute`, detaching it from the table column matrix and collapsing column widths. Therefore, `<tbody>` must use standard `<AnimatePresence initial={false}>` without `mode="popLayout"`.

3. **Mobile Card Animation Strategy (`mode="popLayout"`)**:
   - *From Observation 4*: Mobile cards are standard block-level `<div>` elements inside a vertical container (`space-y-3.5 md:hidden`).
   - *Inference*: Because mobile cards are independent block elements, `<AnimatePresence mode="popLayout" initial={false}>` is fully safe and effective. Exiting cards detach with `position: absolute` while remaining cards immediately spring upward to fill the void using `layout`, eliminating awkward empty gap pauses.

4. **Synchronized UI Controls (Desktop Headers + Mobile Selector)**:
   - *From Observation 3 & 4*: Desktop table headers are hidden on mobile viewports (`hidden md:block`).
   - *Inference*: Adding clickable buttons in desktop `<th>` cells with animated spring-rotating chevron indicators (`0°` to `180°`) delivers intuitive desktop interactions.
   - *Inference*: Adding a `<SelectInput size="sm">` sort selector inside the Search & Filter bar ensures mobile users have full sorting capabilities, perfectly synchronized with desktop state.

---

## 3. Caveats

1. **Multi-Currency Normalization**:
   - Sorting by `price` compares numeric values directly (using `monthly_equivalent_price ?? price`). It does not perform dynamic foreign exchange conversion (e.g., $10 USD is not converted to ~R$ 55 BRL for sorting). This is standard practice in multi-currency dashboards unless live FX rates are shared in props.
2. **Reduced Motion Accessibility**:
   - When a user has `prefers-reduced-motion: reduce` enabled at the OS level, `useReducedMotion()` ensures all transitions resolve with duration 0.
3. **Scope Partitioning**:
   - Modal spring physics is owned by Explorer M2.1.
   - Staggered entrance reveals for metric cards and charts are owned by Explorer M2.2.
   - Financial charts (Donut & Monthly Projections) are owned by Milestone 3.

---

## 4. Conclusion

The layout animation and client-side sorting architecture for Feature F6 is completely formulated and ready for implementation in `resources/js/Pages/Dashboard.jsx` and `resources/js/Components/Icons.jsx`.

Summary of Proposed Implementation:
- **`Icons.jsx`**: Export `ChevronUpIcon` and `ChevronUpDownIcon`.
- **`Dashboard.jsx`**:
  - Add `sortField` (default: `'next_billing_date'`) and `sortOrder` (default: `'asc'`).
  - Upgrade `filteredSubscriptions` to `filteredAndSortedSubscriptions` in `useMemo` with full comparator logic and secondary tie-breakers.
  - Replace desktop `<th>` headers with interactive sort buttons featuring animated spring-rotating chevrons (`rotate: sortOrder === 'asc' ? 0 : 180`).
  - Add mobile sort `<SelectInput size="sm">` in the filter bar.
  - Wrap table rows in `<AnimatePresence initial={false}>` with `<motion.tr layout="position">`.
  - Wrap mobile cards in `<AnimatePresence mode="popLayout" initial={false}>` with `<motion.div layout>`.
  - Ensure zero cell distortion, zero layout shift, and full reduced-motion accessibility.

---

## 5. Verification Method

1. **Build Compilation**:
   ```bash
   docker compose exec -T laravel.test npm run build
   ```
   *Expected Result*: Zero Vite compilation errors, clean bundle creation.

2. **PHPUnit Backend Tests**:
   ```bash
   docker compose exec -T laravel.test php artisan test
   ```
   *Expected Result*: 87/87 tests pass without regression.

3. **Code Style Verification**:
   ```bash
   docker compose exec -T laravel.test ./vendor/bin/pint --test
   ```
   *Expected Result*: Style compliance passes.

4. **Interactive Manual & Visual Inspection**:
   - **Desktop Sort**: Click each column header ("Serviço", "Categoria", "Próxima Cobrança", "Valor", "Status"). Verify rows smoothly glide into place with zero cell distortion or border glitching. Verify chevron rotates 180° when toggling ASC/DESC.
   - **Desktop Filter**: Type in search box or select category/status/cycle. Verify non-matching rows smoothly fade out (0.15s) and remaining rows reposition cleanly.
   - **Mobile Sort**: On mobile viewport (< 768px), change sort selector in filter bar. Verify cards smoothly spring reorder using `mode="popLayout"`.
   - **Status Toggle**: Click status badge button to toggle active/paused. Verify row stays stable or glides smoothly to new sorted position without remounting.
   - **Reduced Motion**: Enable `prefers-reduced-motion` in browser/OS; confirm list updates instantly without animation.

5. **Invalidation Conditions**:
   - Table cells warp horizontally or text stretches during sort (indicates `layout="position"` was mistakenly replaced with `layout`).
   - Table columns collapse to zero width during row exit (indicates `mode="popLayout"` was mistakenly placed on `<tbody>`).
   - Rows swap places unpredictably during filter changes (indicates missing deterministic secondary tie-breaker).
