# Project: Vaultly / AuraSpace Frontend Enhancements

## Architecture
- **Framework**: Laravel 12 (PHP 8.5) running in Docker Sail container (`laravel.test`) with Inertia.js v2 (`@inertiajs/react` 2.3.28), React 18.3.1, Vite 8.3.0, Tailwind CSS v4.
- **Frontend Layer**:
  - `resources/js/Pages/Dashboard.jsx`: Central authenticated dashboard for metrics, financial charts, and subscription management.
  - `resources/js/Layouts/GuestLayout.jsx`: Guest authentication container housing `CosmicShowcase3D.jsx`.
  - `resources/js/Components/Charts/`: Dedicated financial analytics chart components powered by `recharts`.
  - `resources/js/Utils/financialProjections.js`: Pure functional financial calculation engine for category spending breakdown and 6-12 month monthly cash-flow projections.
  - `resources/js/Components/Modal.jsx`: Spring-physics animated modal wrapper powered by `framer-motion` around `@headlessui/react` `<Dialog>`.
  - `resources/js/Components/CosmicShowcase3D.jsx`: 3D celestial showcase powered by `@react-three/fiber` and `@react-three/drei` with Three.js.
  - Global notifications powered by `sonner` Toaster in `resources/js/app.jsx` synchronized with system light/dark theme.
- **Data Flow**:
  - `SubscriptionController@index` -> `SubscriptionResource` -> Inertia `Dashboard` page props (`subscriptions`, `metrics`, `due_soon`, `categories`).
  - Client-side memoized transformations in `useMemo` for zero-latency currency filtering (BRL, USD, EUR), horizon switching (6m/12m), search, and column sorting.
  - CRUD & status toggle mutations via Inertia `router` with Sonner toast feedback and flash prop synchronization.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | NPM & Container Dependency Config | Configure `.npmrc` (`allow-remote=all`, `legacy-peer-deps=true`) and install `recharts`, `sonner`, `framer-motion`, `three@^0.170.0`, `@react-three/fiber@^8.18.0`, `@react-three/drei@^9.120.0` | M1 | survey (DONE) |
| F2 | Global Modern Toast Notification System | Mount Sonner `<Toaster />` in `app.jsx` with emerald/cosmic theme and live MutationObserver theme sync | M1 | survey (DONE) |
| F3 | Subscription Mutation & Toggle Feedback | Wire rich toast feedback for Create, Update, Delete, and Status Toggle (Active <-> Paused) with flash prop handling | M1 | survey (DONE) |
| F4 | Spring Physics Modal Dialogs | Upgrade `resources/js/Components/Modal.jsx` with Framer Motion spring physics (`damping: 26, stiffness: 360`) | M2 | survey (DONE) |
| F5 | Staggered Dashboard Entrance Animations | Staggered entrance reveal for metric cards, charts, and filter controls using Framer Motion containers | M2 | survey (DONE) |
| F6 | Smooth Layout Filter & Sort Animations | Animated subscription filtering and table row sorting using `motion.tr` (`layout="position"`) and mobile `<AnimatePresence mode="popLayout">` | M2 | survey (DONE) |
| F7 | Financial Analytics Calculation Engine | Implement `resources/js/Utils/financialProjections.js` pure functions for category aggregation, multi-currency cash flow, and 6-12m forecasts | M3 | survey |
| F8 | Category Spending Donut Chart | Implement `resources/js/Components/Charts/CategorySpendingDonutChart.jsx` with cosmic palette, center total stat, tooltip, and legend | M3 | survey |
| F9 | Monthly Expenditure Projection Chart | Implement `resources/js/Components/Charts/MonthlyExpenditureProjectionChart.jsx` with Area/Bar projection, currency toggles, active vs paused series | M3 | survey |
| F10 | Financial Analytics Dashboard Section | Implement `resources/js/Components/Charts/FinancialAnalyticsSection.jsx` responsive grid integrated into `Dashboard.jsx` | M3 | survey |
| F11 | React Three Fiber WebGL Canvas Upgrade | Upgrade `resources/js/Components/CosmicShowcase3D.jsx` to R3F `<Canvas>` with 60fps render loop, DPR clamp, and auto-pause | M4 | survey |
| F12 | PBR Lighting & Celestial Materials | Realistic Emerald Planet with `MeshPhysicalMaterial`/`MeshStandardMaterial` and 4-point celestial lighting | M4 | survey |
| F13 | 3D Ring Geometry with Depth Occlusion | 3D equatorial ring with custom `TorusGeometry`/`RingGeometry` and native WebGL depth occlusion | M4 | survey |
| F14 | Volumetric Star Particles System | 3D BufferGeometry volumetric star particles with additive blending and cosmic hues | M4 | survey |
| F15 | Interactive Rotation & Clean Teardown | Smooth pointer tracking with lerp damping, idle rotation, and full memory/geometry/texture disposal on unmount | M4 | survey |
| F16 | Full Suite E2E Acceptance & Quality Verification | Pass 100% of E2E tests, 87/87 PHPUnit tests, Pint style formatting, and production build | M5 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Dependencies & Notification System | F1, F2, F3: Install packages, configure `.npmrc`, mount Sonner Toaster, and wire CRUD/toggle toast feedback | none | DONE |
| M2 | Fluid Interface Animations | F4, F5, F6: Spring-physics modals, staggered dashboard cards/charts entrance, smooth layout filter and sort | M1 | DONE |
| M3 | Financial Analytics Charts | F7, F8, F9, F10: Financial math utility, Donut chart, Area/Bar projection chart, and Dashboard integration | M1 | DONE |
| M4 | Advanced 3D WebGL Cosmic Showcase | F11, F12, F13, F14, F15: React Three Fiber upgrade, PBR lighting/materials, 3D rings, particles, rotation damping, and teardown | M1 | DONE |
| M5 | Final E2E Acceptance & Adversarial Hardening | F16: Execute comprehensive E2E tests across Tiers 1-5, verify PHPUnit tests, Pint, and build | M2, M3, M4 | IN_PROGRESS |

## Interface Contracts
### `resources/js/Utils/financialProjections.js`
- `calculateCategoryBreakdown(subscriptions: Array, currency: string): { data: Array<{ name: string, value: number, percentage: number, color: string }>, totalMonthly: number }`
- `calculateMonthlyProjections(subscriptions: Array, currency: string, monthsCount: number): Array<{ month: string, active: number, paused: number, total: number }>`
- `COSMIC_PALETTE: { [category: string]: string, default: string[] }`

### `resources/js/Components/Charts/CategorySpendingDonutChart.jsx`
- Props: `{ subscriptions: Array, selectedCurrency: string }`

### `resources/js/Components/Charts/MonthlyExpenditureProjectionChart.jsx`
- Props: `{ subscriptions: Array, selectedCurrency: string, onCurrencyChange?: (c: string) => void }`

### `resources/js/Components/Charts/FinancialAnalyticsSection.jsx`
- Props: `{ subscriptions: Array, defaultCurrency?: string }`

### Toast Feedback Notification Helpers (Implemented in M1)
- Function: `notifySubscriptionMutation(action: 'created'|'updated'|'deleted'|'status_toggled', subscriptionName: string, status?: string)`

## Code Layout
- `resources/js/Components/Charts/`:
  - `CategorySpendingDonutChart.jsx`
  - `MonthlyExpenditureProjectionChart.jsx`
  - `FinancialAnalyticsSection.jsx`
- `resources/js/Utils/`:
  - `financialProjections.js`
  - `toastNotifications.js` (Created in M1)
- `resources/js/Components/`:
  - `Modal.jsx` (enhanced with spring physics in M2)
  - `ToastContainer.jsx` (Created in M1)
  - `CosmicShowcase3D.jsx` (upgraded to React Three Fiber in M4)
  - `SubscriptionModal.jsx`, `DeleteSubscriptionModal.jsx` (toast notifications wired in M1)
- `resources/js/Pages/`:
  - `Dashboard.jsx` (status toggle toast wired in M1; spring modals & layout animations wired in M2; financial charts in M3)
- `resources/js/`:
  - `app.jsx` (Sonner `<Toaster />` mounted in M1)
- `.npmrc`: npm package resolution flags configured in M1
