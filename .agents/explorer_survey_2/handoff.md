# Frontend Architecture & Investigation Report: Subscription Tracker

**Agent**: explorer_survey_2  
**Target Feature**: Subscription Tracker on Dashboard (`/dashboard`)  
**Stack**: React 18.2.0, Inertia v2.0.0, Headless UI 2.0, Tailwind CSS 3.2.1, Laravel 13 / PHP 8.3 via Sail  
**Date**: 2026-09-22T19:24:00Z  

---

## 1. Observation

### 1.1 Existing Dashboard (`resources/js/Pages/Dashboard.jsx`)
- **File location**: `resources/js/Pages/Dashboard.jsx` (107 lines).
- **Current Props**: Receives **no domain props**. It only accesses user data via Inertia's page hook:
  ```jsx
  // Dashboard.jsx:6-7
  export default function Dashboard() {
      const user = usePage().props.auth.user;
  ```
- **Current Visual Structure**:
  - Header (lines 10-26): Title "Dashboard", subtitle "Bem-vindo ao seu centro de comando", and a badge "Sessão Conectada" with an emerald pulsing dot.
  - Welcome Banner Card (lines 33-49): Gradient card (`bg-gradient-to-r from-emerald-900 via-teal-950 to-zinc-900`) with `SparkleIcon` and greeting `"Olá, {user.name}!"`.
  - Quick Stats Grid (lines 52-101): 3 static informational cards:
    1. "Status da Conta": "Ativa & Segura" with `CheckIcon`.
    2. "Paleta Ativa": "Verde Esmeralda" with emerald indicator.
    3. "E-mail Verificado": `{user.email}` with `SparkleIcon`.
- **Conclusion on Dashboard**: It is purely a static template placeholder and is ready to be completely repurposed for the Subscription Tracker without breaking any existing business logic.

---

### 1.2 Layout Architecture (`resources/js/Layouts/AuthenticatedLayout.jsx`)
- **File location**: `resources/js/Layouts/AuthenticatedLayout.jsx` (186 lines).
- **Core Elements**:
  - Top navigation bar (`<nav>` lines 17-172):
    - Brand logo: `AuraSpace` with `<span className="text-emerald-500">Space</span>` (lines 24-26).
    - Desktop nav links: `NavLink` pointing to `route('dashboard')` (lines 31-36).
    - Right-side desktop controls: `<ThemeToggle />` button and user dropdown (`Dropdown` with links to `route('profile.edit')` and `route('logout')`).
    - Mobile hamburger navigation: toggles `showingNavigationDropdown` state, contains `ResponsiveNavLink` items and `<ThemeToggle />`.
  - Optional Header slot (lines 174-180):
    ```jsx
    {header && (
        <header className="border-b border-zinc-200/60 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {header}
            </div>
        </header>
    )}
    ```
  - Main wrapper (lines 182-183): `<main>{children}</main>` with page background `min-h-screen bg-zinc-100/70 transition-colors duration-200 dark:bg-zinc-950`.

---

### 1.3 Existing Component Library (`resources/js/Components/`)
Direct inspection of all components in `resources/js/Components/` reveals:
1. **`Modal.jsx`** (66 lines):
   - Uses `@headlessui/react` v2: `Dialog`, `DialogPanel`, `Transition`, `TransitionChild`.
   - Props: `children`, `show = false`, `maxWidth = '2xl'`, `closeable = true`, `onClose = () => {}`.
   - Panel styling: `rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:mx-auto sm:w-full`.
   - Backdrop: `bg-zinc-950/70 backdrop-blur-sm`.
2. **`PrimaryButton.jsx`** (43 lines):
   - Signature: `({ className = '', disabled, processing = false, children, ...props })`.
   - Built-in loading spinner triggered when `disabled || processing`.
   - Styling: `bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 min-h-[44px] rounded-xl px-5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 active:scale-[0.98]`.
3. **`SecondaryButton.jsx`** (23 lines):
   - Signature: `({ type = 'button', className = '', disabled, children, ...props })`.
   - Styling: `rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 active:scale-[0.98]`.
4. **`DangerButton.jsx`** (21 lines):
   - Signature: `({ className = '', disabled, children, ...props })`.
   - Styling: `rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold uppercase text-white hover:bg-rose-500 active:bg-rose-700`.
5. **`TextInput.jsx`** (73 lines):
   - `forwardRef` input supporting: `icon`, `showPasswordToggle`, `isFocused`.
   - Styling: `rounded-xl border border-zinc-300 bg-white/95 py-2.5 text-sm text-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:text-zinc-100`.
6. **`InputLabel.jsx`** (19 lines):
   - Styling: `text-sm font-medium text-zinc-700 dark:text-zinc-300`. Accepts `value` prop or `children`.
7. **`InputError.jsx`** (14 lines):
   - Renders `AlertIcon` with text in `text-rose-500 dark:text-rose-400 text-xs font-medium`.
8. **`Dropdown.jsx`** (108 lines):
   - Context-based dropdown with `Dropdown.Trigger`, `Dropdown.Content`, `Dropdown.Link`.
9. **`Checkbox.jsx`** (13 lines):
   - Styling: `rounded-md border-zinc-300 text-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:checked:bg-emerald-600`.
10. **`Icons.jsx`** (245 lines):
    - Contains pure SVG inline components: `EmailIcon`, `LockIcon`, `UserIcon`, `EyeIcon`, `EyeOffIcon`, `SparkleIcon`, `CrownIcon`, `AlertIcon`, `CheckIcon`, `SunIcon`, `MoonIcon`, `ArrowLeftIcon`, `ShieldCheckIcon`.
11. **`ThemeToggle.jsx`** (159 lines):
    - Complete, robust theme switcher managing `localStorage`, system preferences, `MutationObserver`, and View Transitions.

---

### 1.4 Dependencies & Tooling (`package.json`, `tailwind.config.js`, `vite.config.js`)
- **`package.json`**:
  - `react`: `^18.2.0`, `react-dom`: `^18.2.0`
  - `@inertiajs/react`: `^2.0.0` (Inertia v2)
  - `@headlessui/react`: `^2.0.0`
  - `tailwindcss`: `^3.2.1`, `@tailwindcss/forms`: `^0.5.3`
  - `tightenco/ziggy`: `^2.0` (declared in `composer.json`, with `@routes` directive in `app.blade.php`, providing global `route()` helper)
  - **No external icon packages**: `lucide-react` or `@heroicons/react` are **not installed**. All existing icons are standard inline SVGs in `Components/Icons.jsx`.
- **`tailwind.config.js`**:
  - `darkMode: 'class'`
  - Custom color palette: `cosmic` (shades 50 through 950, emerald green tones).
  - Custom shadows: `emerald-glow`, `emerald-glow-lg`.
  - Custom keyframes/animations: `cardEntrance`, `slideInLeft`, `slideInRight`, `floatPlanet`, `twinkleStar`, `ringGlow`.
- **`resources/css/app.css`**:
  - Direct `@tailwind base; @tailwind components; @tailwind utilities;`.
  - Custom smooth scrollbars with emerald thumb hover.
  - Native `::view-transition` and `.theme-transitioning` classes.
- **Build verification**:
  - Executed: `wsl bash -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail npm run build"`
  - Result: **Passed** with 0 errors in 883ms (`✓ built in 883ms`).

---

## 2. Logic Chain

1. **Alignment with User Requirements (ORIGINAL_REQUEST.md)**:
   - The user requests replacing the default dashboard with the Subscription Tracker (`/dashboard`).
   - The frontend requirements in section 4 of `ORIGINAL_REQUEST.md` mandate:
     1. `CategoryBadge.jsx` with deterministic color hash.
     2. `SubscriptionModal.jsx` using `useForm` for CSRF protection, supporting category suggestions (`<datalist>`) and multi-currency.
     3. `DeleteSubscriptionModal.jsx` for safe deletion.
     4. Transformed `Dashboard.jsx`: Due soon banner (<= 7 days), metric cards (BRL, USD, EUR totals, active/paused counts), search, filter by category/status/cycle, responsive table + mobile touch cards, quick-toggle status action.

2. **Reusability & Component Synergy**:
   - The project already has established UI components (`Modal`, `PrimaryButton`, `SecondaryButton`, `DangerButton`, `TextInput`, `InputLabel`, `InputError`).
   - `SubscriptionModal` and `DeleteSubscriptionModal` should wrap the existing `Modal.jsx` rather than creating custom modal implementations.
   - All form actions should utilize `useForm` from `@inertiajs/react` because:
     - It integrates CSRF token handling seamlessly.
     - It handles server validation error mapping directly to `errors.field` consumed by `InputError`.
     - It tracks `processing` state for button spinner feedback.

3. **Color Hashing Algorithm for `CategoryBadge.jsx`**:
   - Must be purely deterministic (same category name string always yields the identical color).
   - Needs a curated list of Tailwind color configurations that support both light and dark modes (emerald, sky, violet, amber, rose, indigo, teal, cyan, fuchsia, orange).
   - Simple string character code hashing `(hash << 5) - hash + charCode` modulo array length produces stable, well-distributed badges.

4. **Security & Anti-Leak Frontend Discipline**:
   - **Anti-IDOR**: The frontend invokes parameterized routes `route('subscriptions.update', subscription.id)` and `route('subscriptions.destroy', subscription.id)`. The server enforces `SubscriptionPolicy`.
   - **Anti-XSS**: React automatically escapes text node expressions. Inputs will not allow HTML injections, and notes will be rendered safely without `dangerouslySetInnerHTML`.
   - **Anti-Data Leak**: `Dashboard.jsx` will expect props formatted strictly by `SubscriptionResource`, avoiding exposure of unnecessary user or system fields.

5. **Icon Strategy**:
   - Since no icon package is installed in `package.json`, we should add standard, lightweight SVG icons directly to `resources/js/Components/Icons.jsx`: `PlusIcon`, `TrashIcon`, `PencilIcon`, `CalendarIcon`, `TagIcon`, `CurrencyDollarIcon`, `FilterIcon`, `SearchIcon`, `PlayIcon`, `PauseIcon`, `BellAlertIcon`.

---

## 3. Caveats

1. **Backend Dependency**:
   - The frontend relies on `SubscriptionController@index` passing:
     - `subscriptions`: Array of subscription resources.
     - `metrics`: `{ totals: { BRL: number, USD: number, EUR: number }, active_count: number, paused_count: number, monthly_projected_brl: number }`.
     - `due_soon`: Array or count of subscriptions due within 7 days.
     - `categories`: Array of distinct category strings used for datalist suggestions.
   - If the backend implementation uses slightly different prop naming (e.g. `items` vs `subscriptions`), the frontend contract must match.
2. **Date Parsing across Timezones**:
   - `next_billing_date` is formatted as `YYYY-MM-DD`. When calculating days remaining in the browser (`next_billing_date`), timezone offset should be normalized (using date strings `YYYY-MM-DD` split or UTC comparison) to avoid being off by 1 day near midnight.
3. **No External Icon Library**:
   - Do not attempt `import { Plus } from 'lucide-react'` as it is not installed. Use the project's native SVG icons in `Icons.jsx`.

---

## 4. Conclusion & Detailed Frontend Blueprint

### 4.1 Component 1: `resources/js/Components/CategoryBadge.jsx` (New)
- **Role**: Renders category badge with deterministic styling.
- **Implementation**:
  ```jsx
  const PALETTES = [
      { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/60', dot: 'bg-emerald-500' },
      { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800/60', dot: 'bg-sky-500' },
      { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800/60', dot: 'bg-violet-500' },
      { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800/60', dot: 'bg-amber-500' },
      { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800/60', dot: 'bg-rose-500' },
      { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800/60', dot: 'bg-indigo-500' },
      { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800/60', dot: 'bg-teal-500' },
      { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800/60', dot: 'bg-cyan-500' },
      { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-200 dark:border-fuchsia-800/60', dot: 'bg-fuchsia-500' },
      { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800/60', dot: 'bg-orange-500' },
  ];

  export default function CategoryBadge({ category, className = '' }) {
      const name = category || 'Geral';
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
          hash = (hash << 5) - hash + name.charCodeAt(i);
          hash |= 0;
      }
      const palette = PALETTES[Math.abs(hash) % PALETTES.length];

      return (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${palette.bg} ${palette.text} ${palette.border} ${className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
              <span>{name}</span>
          </span>
      );
  }
  ```

---

### 4.2 Component 2: `resources/js/Components/SubscriptionModal.jsx` (New)
- **Role**: Handles both creating new subscriptions and editing existing ones.
- **Props**:
  - `show`: boolean
  - `onClose`: function
  - `subscription`: object or null (if null -> Create mode; if provided -> Edit mode)
  - `categorySuggestions`: array of strings for `<datalist id="category-options">`
- **Fields Managed with `useForm`**:
  - `name`: string (e.g. "Netflix", "AWS")
  - `price`: string/number (e.g. "55.90")
  - `currency`: 'BRL' | 'USD' | 'EUR' (default 'BRL')
  - `billing_cycle`: 'monthly' | 'yearly' (default 'monthly')
  - `category`: string (with `<input list="category-options" .../>`)
  - `next_billing_date`: YYYY-MM-DD
  - `status`: 'active' | 'paused' (default 'active')
  - `notes`: string (optional, textarea)
- **Submission Action**:
  - If editing: `put(route('subscriptions.update', subscription.id), { onSuccess: () => onClose() })`
  - If creating: `post(route('subscriptions.store'), { onSuccess: () => onClose() })`
- **Design Tokens**:
  - Uses `Modal`, `InputLabel`, `TextInput`, `InputError`, `SecondaryButton`, `PrimaryButton`.
  - Re-populates form data whenever `subscription` prop changes via `useEffect` and `reset`.

---

### 4.3 Component 3: `resources/js/Components/DeleteSubscriptionModal.jsx` (New)
- **Role**: Safe deletion confirmation dialog.
- **Props**:
  - `show`: boolean
  - `onClose`: function
  - `subscription`: object to be deleted
- **Submission Action**:
  - `delete(route('subscriptions.destroy', subscription.id), { preserveScroll: true, onSuccess: () => onClose() })`
- **Design Tokens**:
  - Displays subscription name, formatted price, and warning message.
  - SecondaryButton ("Cancelar") and DangerButton ("Confirmar Exclusão").

---

### 4.4 Icons to add in `resources/js/Components/Icons.jsx`
Append the following clean SVG icons:
- `PlusIcon`
- `TrashIcon`
- `PencilIcon`
- `CalendarIcon`
- `TagIcon`
- `CurrencyDollarIcon`
- `FilterIcon`
- `SearchIcon`
- `PlayIcon`
- `PauseIcon`
- `BellAlertIcon`

---

### 4.5 Transformed `resources/js/Pages/Dashboard.jsx` (Modified)
- **Props Contract**:
  ```jsx
  export default function Dashboard({
      subscriptions = [],
      metrics = {
          totals: { BRL: 0, USD: 0, EUR: 0 },
          active_count: 0,
          paused_count: 0,
      },
      due_soon = [],
      categories = [],
  })
  ```
- **Sections**:
  1. **Top Header Slot**:
     - Title: "Rastreador de Assinaturas"
     - Subtitle: "Gerencie seus gastos recorrentes e próximas faturas."
     - Action: "Nova Assinatura" button (opens `SubscriptionModal`).
  2. **Due Soon Alert Banner (if `due_soon.length > 0`)**:
     - Visual: Ambient amber/rose gradient border, `BellAlertIcon`, list of bills due in <= 7 days with countdown badge ("Vence hoje", "Vence em 2 dias", etc.).
  3. **Financial Metric Cards Grid**:
     - Card 1: Total BRL (`R$ ${metrics.totals.BRL.toFixed(2)} / mês`)
     - Card 2: Total USD (`$ ${metrics.totals.USD.toFixed(2)} / mo`)
     - Card 3: Total EUR (`€ ${metrics.totals.EUR.toFixed(2)} / mo`)
     - Card 4: Assinaturas Ativas & Pausadas (counts + status pill)
  4. **Filter & Search Bar**:
     - Search input with `SearchIcon`
     - Category filter select
     - Status filter (Todos / Ativas / Pausadas)
     - Billing cycle filter (Todos / Mensal / Anual)
  5. **Data Presentation**:
     - **Desktop Table** (`hidden md:block`):
       - Columns: Assinatura (Nome + Notas), Categoria (`CategoryBadge`), Ciclo & Valor, Próxima Cobrança, Status (Interactive Switch/Badge), Ações (Editar, Excluir).
     - **Mobile Cards** (`md:hidden space-y-3`):
       - Card per subscription with clear typography, quick-toggle status button, and touch-friendly Edit/Delete actions.
  6. **Interactive Modals**:
     - `<SubscriptionModal />` (for create & edit)
     - `<DeleteSubscriptionModal />` (for delete confirmation)
  7. **Status Quick-Toggle**:
     - `router.patch(route('subscriptions.toggle-status', sub.id), {}, { preserveScroll: true })`.

---

## 5. Verification Method

### 5.1 Static Verification & Linting
Verify all files conform to JSX syntax and Tailwind classes:
- Check that all components import correctly without circular references.
- Verify `route()` calls map to Ziggy routes declared in `routes/web.php`.

### 5.2 Build Verification
Run Vite production build inside Sail:
```bash
wsl bash -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail npm run build"
```
**Success condition**: Output displays `✓ built in ...ms` and `public/build/manifest.json` updated with no unresolved modules or JSX errors.

### 5.3 Automated Feature & Security Tests
Run the feature test suite:
```bash
wsl bash -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail test --filter=SubscriptionTest"
```
**Success condition**: All tests pass cleanly, covering Anti-IDOR, Anti-XSS, Proportional calculations, and status toggles.

### 5.4 Invalidation Conditions
- If `package.json` is modified to install conflicting UI frameworks.
- If backend `SubscriptionResource` changes prop names without matching the frontend contract.
- If dark mode classes are hardcoded without `dark:` prefix.
