# Technical Analysis: Fluid Layout Animations for Subscription Filtering and Sorting (Milestone 2 - R3 / F6)

**Explorer**: M2.3  
**Date**: 2026-09-23  
**Target Component**: `resources/js/Pages/Dashboard.jsx`  
**Related Components**: `resources/js/Components/Icons.jsx`, `resources/js/Components/SelectInput.jsx`  
**Dependencies**: `framer-motion@^13.4.2`, React 18.2.0, Inertia.js v2  

---

## 1. Executive Summary

This technical report delivers an architectural formulation and implementation blueprint for **Feature F6: Smooth Layout Filter & Sort Animations** on the Vaultly / AuraSpace subscription tracker dashboard.

Key Architectural Findings:
1. **HTML Table Cell Distortion Solved**: Standard Framer Motion `layout` computes FLIP transitions using 2D scaling transforms (`translate3d(...) scale(sx, sy)`). On HTML table rows (`<tr>`), scale transforms distort internal `<td>` cell geometry, blur borders, and stretch typography. Furthermore, applying `mode="popLayout"` on a `<tr>` sets `position: absolute`, detaching the row from table formatting context and causing column collapse and vertical jumping. The robust solution is using **`motion.tr` with `layout="position"`** inside a standard **`<AnimatePresence initial={false}>`**. This restricts FLIP calculations exclusively to vertical/horizontal translation coordinates, bypassing scale distortion while maintaining native table cell structure.
2. **Mobile Card Fluidity with `popLayout`**: Mobile cards (`md:hidden`) are standard block-level `<div>` containers. Unlike table rows, mobile cards thrive with **`<AnimatePresence mode="popLayout" initial={false}>`** and **`layout`**. When a card is dismissed or filtered out, `popLayout` lifts it out of document flow while remaining cards immediately spring upward to fill the void with damped harmonic physics (`stiffness: 320, damping: 26, mass: 0.8`).
3. **Client-Side Sorting Engine**: The application currently has multi-attribute filtering in a `useMemo` hook, but zero frontend sorting (relying solely on the server's initial `next_billing_date` query order). We formulate a zero-latency client-side sorting engine with `sortField` and `sortOrder`, multi-attribute comparison (`next_billing_date`, `price`, `name`, `category`, `status`), null-safe date handling, normalized monthly equivalent pricing, and deterministic secondary tie-breaking (`name` then `id`) to ensure animation stability.
4. **Synchronized Desktop & Mobile UI Controls**: Desktop table headers feature accessible button triggers with animated spring-rotating chevron indicators (`0°` to `180°`), while the filter bar integrates a compact `<SelectInput size="sm">` mobile sort selector that remains bi-directionally synchronized with desktop state.

---

## 2. Current Codebase Inspection

### 2.1 State & Filtering in `Dashboard.jsx`
Inspecting `resources/js/Pages/Dashboard.jsx` (lines 94-146):
```javascript
// Filters state
const [search, setSearch] = useState('');
const [categoryFilter, setCategoryFilter] = useState('all');
const [statusFilter, setStatusFilter] = useState('all');
const [cycleFilter, setCycleFilter] = useState('all');
```
The `filteredSubscriptions` memo (lines 124-146) filters subscriptions by `search` (name, notes, category), `categoryFilter`, `statusFilter`, and `cycleFilter`. However:
- There is **no sorting state** (`sortField` or `sortOrder`).
- Clicking table headers does nothing because table headers are plain non-interactive `<th>` elements (lines 518-540).
- When a user filters by typing in the search box or selecting a category, table rows and mobile cards mount/unmount abruptly with zero animation, causing jarring visual popping.

### 2.2 Table DOM Structure in `Dashboard.jsx`
Lines 514-660 render the desktop table:
```jsx
<div className="hidden overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:block">
    <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
            <thead className="...">
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
            <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
                {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                        ...
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
</div>
```

### 2.3 Mobile Cards Structure in `Dashboard.jsx`
Lines 663-772 render the mobile list:
```jsx
<div className="space-y-3.5 md:hidden">
    {filteredSubscriptions.map((sub) => (
        <div key={sub.id} className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm ...">
            ...
        </div>
    ))}
</div>
```

---

## 3. Client-Side Sorting Engine Architecture

### 3.1 State Model
In `Dashboard.jsx`, introduce two dedicated state variables:
```javascript
const [sortField, setSortField] = useState('next_billing_date');
const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
```
Defaulting to `next_billing_date` in `'asc'` matches the backend's initial Eloquent ordering (`orderBy('next_billing_date')`), ensuring zero initial layout jump on first mount.

### 3.2 Comparison Logic per Field

| Sort Field | Comparison Target | Handling Strategy |
|---|---|---|
| `next_billing_date` | `sub.next_billing_date` ('YYYY-MM-DD' or null) | Chronological string comparison. In `'asc'`, null or empty dates are safely pushed to the end. In `'desc'`, latest dates appear first. |
| `price` | `sub.monthly_equivalent_price ?? sub.price` | Numerical comparison. Comparing `monthly_equivalent_price` normalizes yearly vs monthly plans for a fair financial comparison (e.g. R$ 120/yr is R$ 10/mo). If null/zero, falls back to `price`. |
| `name` | `sub.name` (string) | Case-insensitive locale comparison using `localeCompare(..., 'pt-BR', { sensitivity: 'base' })`. |
| `category` | `sub.category` (string) | Case-insensitive locale comparison using `localeCompare(..., 'pt-BR', { sensitivity: 'base' })`. |
| `status` | `sub.status` ('active' \| 'paused') | Alphabetical locale comparison: `'active'` naturally precedes `'paused'` in `'asc'`, prioritizing active subscriptions. In `'desc'`, paused subscriptions precede active ones. |

### 3.3 Deterministic Secondary Tie-Breaker
**Critical Principle for Animation Stability**: If two items share identical sort keys (e.g., two streaming subscriptions in category 'Entretenimento', or two subscriptions renewing on '2026-10-01'), an unstable sort can cause elements to randomly swap positions when React re-renders.
To guarantee mathematical determinism:
```javascript
// Secondary tie-breaker: Name, then unique Database ID
const tieBreaker = (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
return tieBreaker !== 0 ? tieBreaker : a.id - b.id;
```

### 3.4 The Unified Memoized Pipeline
Combine filtering and sorting in a single `useMemo` hook:
```javascript
const filteredAndSortedSubscriptions = useMemo(() => {
    // 1. Filter phase
    const list = subscriptions.filter((sub) => {
        if (search.trim()) {
            const query = search.toLowerCase().trim();
            const nameMatch = sub.name?.toLowerCase().includes(query);
            const notesMatch = sub.notes?.toLowerCase().includes(query);
            const catMatch = sub.category?.toLowerCase().includes(query);
            if (!nameMatch && !notesMatch && !catMatch) return false;
        }
        if (categoryFilter !== 'all' && sub.category !== categoryFilter) return false;
        if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
        if (cycleFilter !== 'all' && sub.billing_cycle !== cycleFilter) return false;
        return true;
    });

    // 2. Sort phase (shallow copy to avoid mutating source array)
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
}, [subscriptions, search, categoryFilter, statusFilter, cycleFilter, sortField, sortOrder]);
```

### 3.5 Resetting and Filter Count Synchronization
Update `isFiltered` and `clearAllFilters` to account for non-default sorting:
```javascript
const isFiltered =
    search.trim() !== '' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    cycleFilter !== 'all' ||
    sortField !== 'next_billing_date' ||
    sortOrder !== 'asc';

const clearAllFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setCycleFilter('all');
    setSortField('next_billing_date');
    setSortOrder('asc');
};
```

---

## 4. Desktop Table Header Sorting & Animated Chevron

### 4.1 Header Interaction Model
When a user clicks a table column header:
1. If the clicked column is already the active `sortField`, toggle `sortOrder` between `'asc'` and `'desc'`.
2. If a different column is clicked, set `sortField` to the new column and default `sortOrder` to `'asc'`.

```javascript
const handleSort = (field) => {
    if (sortField === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
        setSortField(field);
        setSortOrder('asc');
    }
};
```

### 4.2 Animated Rotating Chevron Indicator
Instead of swapping distinct up and down SVG icons (which can produce abrupt flashes), use a single `ChevronUpIcon` wrapped in a Framer Motion `motion.span` that smoothly rotates **0° (Ascending)** to **180° (Descending)**:

```jsx
<motion.span
    initial={false}
    animate={{ rotate: sortOrder === 'asc' ? 0 : 180 }}
    transition={
        shouldReduceMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 500, damping: 28 }
    }
    className="inline-flex text-emerald-600 dark:text-emerald-400"
>
    <ChevronUpIcon className="h-3.5 w-3.5 stroke-[2.5]" />
</motion.span>
```

When a column is inactive, render a subtle neutral `ChevronUpDownIcon` with `opacity-0 group-hover:opacity-70 transition-opacity`. This provides clean visual affordance without visual noise.

### 4.3 Table Column Width Budgeting (Eliminating Horizontal Twitch)
To prevent table columns from twitching horizontally when rows with different content lengths enter or exit, define explicit percentage widths on `<th>` elements:
- **Serviço**: `w-[26%]`
- **Categoria**: `w-[14%]`
- **Ciclo**: `w-[12%]`
- **Próxima Cobrança**: `w-[16%]`
- **Valor**: `w-[14%]`
- **Status**: `w-[10%]`
- **Ações**: `w-[8%] text-right`
Total: 100%.

---

## 5. Mobile Sort Selector Integration

### 5.1 Placement & Responsive Synchronization
On mobile viewports (`< 768px`), table headers are hidden (`hidden md:block`). To give mobile users full control over sorting, introduce a sort selector inside the Search & Multi-Filter bar.

Using the existing `SelectInput` component:
```jsx
<div className="w-auto min-w-[155px]">
    <SelectInput
        size="sm"
        value={`${sortField}:${sortOrder}`}
        onChange={(e) => {
            const [field, order] = e.target.value.split(':');
            setSortField(field);
            setSortOrder(order);
        }}
        className="text-xs font-medium"
        aria-label="Ordenar assinaturas"
    >
        <option value="next_billing_date:asc">Vencimento (Mais próximo)</option>
        <option value="next_billing_date:desc">Vencimento (Mais distante)</option>
        <option value="price:asc">Valor (Menor → Maior)</option>
        <option value="price:desc">Valor (Maior → Menor)</option>
        <option value="name:asc">Nome (A → Z)</option>
        <option value="name:desc">Nome (Z → A)</option>
        <option value="category:asc">Categoria (A → Z)</option>
        <option value="status:asc">Status (Ativas primeiro)</option>
        <option value="status:desc">Status (Pausadas primeiro)</option>
    </SelectInput>
</div>
```

### 5.2 Seamless State Synchronization
Because both desktop table headers and the mobile selector read from and write to the same `sortField` and `sortOrder` state, any change made on mobile is immediately reflected if the viewport is resized to desktop, and vice-versa.

---

## 6. HTML Table Animation Strategy (`motion.tr` + `layout="position"`)

### 6.1 The Technical Root Cause of Table Warping
Under the W3C CSS Table Formatting Context:
- A table row (`<tr>`) does not possess its own independent geometric bounding box; its cells (`<td>`) are strictly bound to column boundaries established by the entire table.
- Standard Framer Motion `layout` animates position and dimensions using 2D matrix scale transforms:
  $$\text{transform} = \text{translate3d}(dx, dy, 0) \times \text{scale}(s_x, s_y)$$
- Applying scale transforms to a `<tr>` results in:
  1. Horizontal distortion of text and badges inside `<td>` cells.
  2. Border misalignment and flickering between cells.
  3. Cell content bleeding across column borders during the transition.
- Furthermore, Framer Motion's `AnimatePresence mode="popLayout"` applies `position: absolute` inline to exiting elements. In a `<tbody>`, `position: absolute` rips the `<tr>` out of table layout flow, instantly collapsing all columns to zero width and creating an ugly vertical jump for adjacent rows.

### 6.2 The Solution: `layout="position"` with Standard `AnimatePresence`
1. **`layout="position"`**: Instructs Framer Motion to record bounding boxes via FLIP, but **constrain scales to $s_x = 1, s_y = 1$**. The resulting CSS transform is strictly:
   $$\text{transform} = \text{translate3d}(dx, dy, 0)$$
   Each row glides vertically up or down directly into its sorted index with zero cell distortion or border warping!
2. **`<AnimatePresence initial={false}>` (Default Mode)**:
   Do NOT use `mode="popLayout"` on `<tbody>`. Leaving `mode` in default ensures that exiting rows retain `display: table-row` in the normal flow while fading out (`opacity: 0, duration: 0.15s`). Once faded out, the row unmounts and remaining rows glide upward smoothly via `layout="position"`.
3. **`initial={false}`**:
   Prevents unnecessary FLIP animations when the page first loads or rehydrates, ensuring an instant, stable initial render.

```jsx
<tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
    <AnimatePresence initial={false}>
        {filteredAndSortedSubscriptions.map((sub) => {
            const isActive = sub.status === 'active';
            const isToggling = togglingId === sub.id;

            return (
                <motion.tr
                    key={sub.id}
                    layout="position"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    transition={
                        shouldReduceMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }
                    }
                    className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                >
                    {/* td cells */}
                </motion.tr>
            );
        })}
    </AnimatePresence>
</tbody>
```

---

## 7. Mobile Card Animation Strategy (`motion.div` + `mode="popLayout"`)

### 7.1 Why `mode="popLayout"` Works Beautifully on Mobile Cards
Mobile cards are individual block-level `<div>` elements inside a vertical flex/stack container (`<div className="space-y-3.5 md:hidden">`).
Because they are standard CSS block elements:
- When a card is dismissed, filtered out, or toggled, `mode="popLayout"` immediately applies `position: absolute` to the exiting card.
- This instantaneously removes the card from layout flow, allowing all cards below it to immediately begin their smooth upward spring transition via `layout`.
- Meanwhile, the exiting card fades and scales down gracefully (`initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}`).
- The resulting user experience feels native, snappy, and responsive, with zero empty gap delays.

```jsx
<div className="space-y-3.5 md:hidden">
    <AnimatePresence mode="popLayout" initial={false}>
        {filteredAndSortedSubscriptions.map((sub) => {
            const isActive = sub.status === 'active';
            const isToggling = togglingId === sub.id;

            return (
                <motion.div
                    key={sub.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={
                        shouldReduceMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 320, damping: 26, mass: 0.8 }
                    }
                    className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900"
                >
                    {/* card content */}
                </motion.div>
            );
        })}
    </AnimatePresence>
</div>
```

---

## 8. Eliminating Layout Shift, Cell Warping & Edge Cases

### 8.1 Filtered Empty State Transitions
When filtering yields zero matches (`filteredAndSortedSubscriptions.length === 0`), the table or card list is replaced with the empty state banner.
To prevent an abrupt flash:
```jsx
<motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="rounded-2xl border border-zinc-200/80 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900"
>
    ...
</motion.div>
```

### 8.2 In-Place Status Toggling (`handleToggleStatus`)
When a user clicks the status badge button to pause or reactivate a subscription:
- If sorting by `status`, the toggled row smoothly slides to its new position among active or paused subscriptions.
- If sorting by `price` or `next_billing_date`, the row remains stationary while its internal status badge pulse indicator transitions cleanly without remounting the row.

### 8.3 Accessibility & Reduced Motion
Incorporate Framer Motion's `useReducedMotion()` hook:
```javascript
const shouldReduceMotion = useReducedMotion();
const transition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 350, damping: 30, mass: 0.8 };
```
When `prefers-reduced-motion: reduce` is enabled in system accessibility settings, all layout animations resolve instantly with zero motion discomfort.

---

## 9. Required Icon Suite Additions (`Icons.jsx`)

To support table header sorting with animated indicators, add the following two lightweight SVG icon components to `resources/js/Components/Icons.jsx`:

```jsx
export function ChevronUpIcon({ className = 'w-4 h-4', ...props }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            {...props}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
    );
}

export function ChevronUpDownIcon({ className = 'w-4 h-4', ...props }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.75"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
            />
        </svg>
    );
}
```

---

## 10. Verification & Test Plan

1. **Build Validation**:
   Run `docker compose exec -T laravel.test npm run build` to ensure Vite bundles without errors, broken JSX tags, or missing Framer Motion imports.
2. **Table Layout Integrity**:
   - Check desktop view with 10+ subscriptions. Click "Valor", "Serviço", "Próxima Cobrança", "Categoria", and "Status".
   - Confirm table rows smoothly glide vertically to their new sorted positions without horizontal cell width changes, text clipping, or border glitches.
   - Confirm active column chevron rotates 180° when flipping from ASC to DESC.
3. **Filter Transitions**:
   - Type queries into the search bar. Observe matching rows staying smoothly in place while non-matching rows fade out cleanly.
   - Clear search: observe hidden rows glide back into position with zero layout jerk.
4. **Mobile Responsiveness**:
   - On a mobile viewport (< 768px), change the sort dropdown in the filter bar.
   - Verify cards smoothly reorder using spring physics with `mode="popLayout"`.
5. **Accessibility**:
   - Verify keyboard tab navigation lands on table header sort buttons with visible focus rings.
   - Screen readers receive descriptive `aria-label` announcements for active sort state.
   - Emulate `prefers-reduced-motion: reduce`: confirm transitions resolve immediately without motion.
6. **Zero Backend Regression**:
   Run `docker compose exec -T laravel.test php artisan test` to verify all 87 tests continue passing.
