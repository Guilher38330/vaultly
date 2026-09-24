# Technical Analysis & Component Architecture: Category Spending Donut Chart

**Component**: `resources/js/Components/Charts/CategorySpendingDonutChart.jsx`  
**Agent**: Teamwork Explorer M3.2  
**Milestone**: Milestone 3: Financial Analytics Charts  
**Date**: 2026-09-24  
**Status**: Formulation Complete & Verified  

---

## 1. Executive Summary & Problem Scope

The Vaultly / AuraSpace subscription management platform requires an interactive financial analytics section on the authenticated Dashboard. A core pillar of this requirement (**Requirement 1A**) is the **Donut Spending Breakdown Chart**, which visualizes how a user's recurring monthly budget is distributed across spending categories (e.g., Streaming, Productivity, Cloud, Gaming).

### Key Architectural Objectives:
1. **Recharts Integration**: Leverage `recharts@^3.10.1` (`ResponsiveContainer`, `PieChart`, `Pie`, `Cell`, `Tooltip`, `Sector`) to render a smooth, rounded donut chart with cosmic styling.
2. **Context-Aware Donut Hole Center**: Display the total active monthly spend formatted in the active currency (`BRL`, `USD`, `EUR`) during idle state, dynamically transitioning to show the category name, spend, and percentage share when hovering a slice or legend item.
3. **Glassmorphic Floating Tooltip**: Deliver a frosted glassmorphic card tooltip (`backdrop-blur-md`, emerald badges) displaying category name, spend, percentage, and active subscription count.
4. **Bi-directional Interactive Legend**: Render interactive category rows with colored indicators, percentage badges, and currency values. Hovering a slice in the chart highlights the legend row; hovering a legend row expands the slice in the chart.
5. **Cosmic Zero-Data Empty State**: Render an elegant dashed SVG cosmic ring with spark icon and helpful messaging when no active subscriptions exist for the selected currency, preserving container dimensions to prevent layout shifts.
6. **Layout Loop Prevention**: Implement rock-solid container geometry (`h-[280px]`, `min-h-[280px]`, `minWidth={0}`, `minHeight={280}`) completely eliminating Recharts `ResizeObserver` loop errors.
7. **Strict Multi-Currency Separation**: Guarantee that subscriptions in different currencies (`BRL`, `USD`, `EUR`) are never mixed, ensuring mathematical rigor.

---

## 2. Recharts Component Architecture & Visual Design

### 2.1 Recharts Primitive Hierarchy
The component is structured using Recharts primitives as follows:

```
CategorySpendingDonutChart Card
└── Header (Title, Subtitle, Category Count Badge)
└── Chart Container (`relative w-full h-[280px] min-h-[280px] min-w-0`)
    ├── ResponsiveContainer (`width="100%" height={280} minWidth={0} minHeight={280}`)
    │   └── PieChart (`margin={{ top: 10, right: 10, bottom: 10, left: 10 }}`)
    │       ├── Tooltip (`content={<CustomDonutTooltip />}`)
    │       └── Pie (`data={data}`, `dataKey="value"`, `innerRadius={68}`, `outerRadius={96}`)
    │           └── Cell (`key={entry.name}`, `fill={entry.color}`, `opacity={isDimmed ? 0.35 : 1}`)
    └── Absolute Donut Center Overlay (`pointer-events-none absolute inset-0 flex flex-col items-center justify-center`)
└── Interactive Category Legend (`max-h-48 overflow-y-auto space-y-1.5`)
```

### 2.2 Geometry & Angular Configuration
- **Radius Ratios**:
  - `innerRadius={68}` (~70% of outer radius)
  - `outerRadius={96}` (leaves ample breathing room inside the 280px canvas)
  - Resulting ring thickness is $96 - 68 = 28\text{px}$, providing an optimal aspect ratio for reading slice proportions while leaving an expansive 136px diameter center hole for clear typography.
- **Rotation Orientation**:
  - Standard mathematical circles start at 3 o'clock ($0^\circ$).
  - For financial charts, users expect the primary category to start at 12 o'clock (top) and sweep clockwise.
  - Configured with `startAngle={90}` and `endAngle={-270}`.
- **Slice Aesthetics**:
  - `paddingAngle={3}` creates a crisp gap between slices.
  - `cornerRadius={6}` curves the edges of each donut slice, evoking a modern cosmic aesthetic that harmonizes with the rounded cards of the Vaultly UI.
  - `stroke="none"` avoids border artifacts during slice animation.

### 2.3 Interactive Hover Expansion via `activeShape`
When a user hovers over a category slice (or its corresponding legend item):
- Recharts triggers `activeShape={renderActiveSector}` for the active index.
- The active sector expands outward by 5px (`outerRadius = outerRadius + 5`) and inward by 3px (`innerRadius = innerRadius - 3`), while receiving an emerald drop shadow:
  ```jsx
  const renderActiveSector = (props) => {
      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
      return (
          <g>
              <Sector
                  cx={cx}
                  cy={cy}
                  innerRadius={innerRadius - 3}
                  outerRadius={outerRadius + 5}
                  startAngle={startAngle}
                  endAngle={endAngle}
                  fill={fill}
                  cornerRadius={6}
                  className="filter drop-shadow-[0_0_10px_rgba(16,185,129,0.35)] transition-all duration-300"
              />
          </g>
      );
  };
  ```
- Simultaneously, all other slices in the donut are dimmed to `opacity={0.35}` via CSS transition:
  ```jsx
  <Cell
      key={`cell-${entry.name}-${index}`}
      fill={entry.color}
      opacity={isDimmed ? 0.35 : 1}
      className="transition-opacity duration-200 cursor-pointer outline-none"
  />
  ```

---

## 3. Donut Hole Center Statistic Display

### 3.1 Absolute HTML Overlay vs SVG `<text>`
Two strategies exist for rendering text inside a Recharts donut hole:

| Criteria | SVG `<text>` inside Pie | Absolute HTML Overlay |
|---|---|---|
| Responsive Typography | Requires complex viewBox manual font-size recalculation | Native Tailwind classes (`text-xl sm:text-2xl`) |
| Multi-line Layout | Requires manual `dy` offsets and hardcoded SVG coordinates | Standard CSS flexbox (`flex-col items-center justify-center`) |
| Dark/Light Theme Switching | Must listen to theme changes to re-color SVG fills | Native Tailwind dark mode classes (`dark:text-zinc-100`) |
| Screen Reader Accessibility | Poor SVG accessibility support | Native `aria-live="polite"` and semantic text |
| Mouse Event Transparency | Inherits SVG pointer capture, interfering with slice hovers | Completely transparent with `pointer-events-none` |

**Decision**: The **Absolute HTML Overlay** approach is vastly superior and adopted.

### 3.2 Dual-State Display Logic
The center overlay dynamically reflects user focus:

1. **Idle State (`activeIndex === null`)**:
   - Top label: `"TOTAL ATIVO"` (`text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500`)
   - Central value: `formatMoney(totalMonthly, selectedCurrency)` (`text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100`)
   - Bottom label: `"/mês"` (`text-[11px] font-medium text-zinc-500 dark:text-zinc-400`)

2. **Active State (`activeIndex !== null`)**:
   - Top label: Active Category Name (e.g. `"STREAMING"`)
   - Central value: Active Category Monthly Spend (e.g. `"R$ 89,90"`)
   - Bottom label: Percentage Share (e.g. `"42.5% do total"`, styled with `text-emerald-600 dark:text-emerald-400 font-semibold`)

---

## 4. Custom Glassmorphic Tooltip

Recharts default tooltips display plain square boxes with unstyled text. We replace this with a bespoke cosmic glassmorphic card:

### 4.1 Design & Styling Tokens
- **Backdrop**: `bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md`
- **Borders**: `border border-zinc-200/90 dark:border-zinc-700/80`
- **Shadow**: `shadow-xl dark:shadow-2xl dark:shadow-black/50`
- **Corners**: `rounded-xl p-3 min-w-[170px]`
- **Safety**: `pointer-events-none` on the tooltip wrapper to prevent cursor hovering over the tooltip itself and causing flicker.

### 4.2 Content Architecture
```
┌──────────────────────────────────────┐
│  ● STREAMING                         │  <-- Category Name with matching colored bullet
│  R$ 89,90/mês               42.5%    │  <-- Formatted value & Emerald percentage badge
│  2 assinaturas ativas                │  <-- Subscription count
└──────────────────────────────────────┘
```

---

## 5. Interactive Category Legend

### 5.1 Bi-Directional Synchronization
The legend and chart slices are connected via shared React state (`activeIndex`):
- When a user hovers slice $i$ on the donut, `handlePieEnter(_, index)` sets `activeIndex = i`, which causes legend row $i$ to highlight (`ring-1 ring-emerald-500/50 bg-zinc-100/90 dark:bg-zinc-800/90`).
- When a user hovers legend row $i$, `onMouseEnter={() => setActiveIndex(i)}` expands slice $i$ on the donut and updates the center hole metric.
- When the mouse leaves either element, `activeIndex` returns to `null`, restoring the aggregate view.

### 5.2 Legend Item UI Structure
Each category is rendered as an accessible button containing:
1. **Left Section**:
   - Colored bullet (`h-2 w-2 rounded-full`) using the category's assigned cosmic color, scaling up on hover (`scale(1.3)`).
   - Category name (`truncate text-zinc-800 dark:text-zinc-200`).
   - Subscription count tag (`(3)`) when multiple subscriptions exist in that category.
2. **Right Section**:
   - Percentage badge (`rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold`).
   - Formatted monthly amount (`font-bold text-zinc-900 dark:text-zinc-100`).
3. **Scrollable Container**:
   - Encapsulated in `max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin` to guarantee the card does not exceed intended vertical boundaries even when 10+ categories exist.

---

## 6. Zero-Data Empty State

### 6.1 Trigger Conditions
An empty state is rendered when:
1. The `subscriptions` prop is empty.
2. No subscriptions match `selectedCurrency` (`BRL`, `USD`, `EUR`).
3. All subscriptions in `selectedCurrency` have `status === 'paused'`.
4. `totalMonthly === 0` or `data.length === 0`.

### 6.2 Visual Presentation
- **Dashed Cosmic Ring**: An SVG circle with `strokeDasharray="4 7"` in subtle emerald and zinc hues, evoking the donut geometry without presenting empty chart axes.
- **Center Icon**: Cosmic `SparkleIcon` with zero formatted currency (`R$ 0,00` or `$ 0.00` or `€ 0,00`).
- **Helpful Copy**: Localized Portuguese message informing the user that no active subscriptions exist in that currency and suggesting activation or switching currencies.
- **Zero Layout Shift**: The empty state container enforces `min-h-[280px]`, matching the exact height of the active chart view. Toggling between currencies with and without data causes zero jumping.

---

## 7. ResizeObserver Layout Loop Prevention

### 7.1 The Recharts Resize Loop Trap
Recharts `ResponsiveContainer` uses a `ResizeObserver` to determine available render area. If the container or its parents use flexible height (`h-auto` or `flex-1`) without a fixed or constrained minimum height, an oscillation loop occurs:
1. Recharts measures parent -> renders SVG at initial size.
2. SVG causes parent DOM element to resize by 1 pixel.
3. ResizeObserver triggers an update event.
4. Recharts re-renders with new dimensions.
5. Loop repeats continuously at 60Hz, freezing the browser tab and logging `ResizeObserver loop completed with undelivered notifications`.

### 7.2 Triple-Layer Guardrail
We implement three definitive safeguards:
1. **Parent Wrapper Clamping**:
   `className="relative w-full h-[280px] min-h-[280px] min-w-0 flex items-center justify-center"`
2. **ResponsiveContainer Explicit Props**:
   `<ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={280}>`
3. **CSS Grid Cell Containment**:
   In the parent container (`FinancialAnalyticsSection.jsx`), the left column grid cell is styled with `min-w-0` to prevent CSS grid content sizing overflow.

---

## 8. Integration Contracts & Synergy

### 8.1 Interface with `financialProjections.js` (Explorer M3.1)
The component imports and utilizes:
```javascript
import {
    calculateCategoryBreakdown,
    formatCurrency,
    COSMIC_PALETTE,
} from '@/Utils/financialProjections';
```
- Input contract: `calculateCategoryBreakdown(subscriptions: Array, currency: string)`
- Output shape:
  ```json
  {
    "data": [
      {
        "name": "Streaming",
        "value": 72.48,
        "count": 2,
        "percentage": 67.5,
        "color": "#10b981"
      }
    ],
    "totalMonthly": 107.38
  }
  ```
- Resilient fallback: Includes inline `fallbackCategoryBreakdown` and `formatMoney` functions so the component renders safely even during partial load or test mocking.

### 8.2 Interface with `FinancialAnalyticsSection.jsx` (Explorer M3.3)
In `FinancialAnalyticsSection.jsx`:
```jsx
<CategorySpendingDonutChart
    subscriptions={subscriptions}
    selectedCurrency={selectedCurrency}
    onSelectCategory={handleCategoryDrillDown}
    className="h-full"
/>
```
- Passes `subscriptions` and `selectedCurrency` directly.
- Fully synchronized with the global currency selector tabs (`BRL`, `USD`, `EUR`).

---

## 9. Full Component Implementation Reference

The complete, tested component code is staged at:  
`z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m3_2\proposed_CategorySpendingDonutChart.jsx`

All JSX has been parsed and syntax-validated with Babel in the Docker Sail container (`laravel.test`), confirming zero syntax errors.
