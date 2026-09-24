# Technical Architecture & Design: Sonner Notification System for Vaultly / AuraSpace

**Milestone**: M1: Dependencies, Environment & Notification System  
**Role**: Explorer M1.2  
**Date**: 2026-09-23  
**Status**: Completed  
**Target Repository**: `z:\home\guilhherme\projetos\meu-app-react`

---

## 1. Executive Summary

This document defines the comprehensive architecture and implementation blueprint for integrating the **Sonner** notification system into Vaultly / AuraSpace (Requirement R2 / Feature F2 & F3).

Key architectural outcomes:
1. **Dynamic Theme Synchronization via MutationObserver**: Standard Sonner `theme="system"` fails in class-based dark mode setups (`darkMode: 'class'`). We design `ToastContainer.jsx` with an active `MutationObserver` targeting the `class` attribute of `document.documentElement`, synchronizing Sonner's internal CSS variables and active toasts seamlessly with in-app theme switches (`ThemeToggle.jsx`), cross-tab storage updates, and OS transitions.
2. **Emerald Cosmic Design System Integration**: We specify custom cosmic emerald styling using Tailwind CSS and the project's existing design tokens (`#10b981`, `boxShadow.emerald-glow`, `rounded-2xl`, glassmorphic backdrops `bg-white/95` and `bg-zinc-900/95`). Default Sonner icons are replaced via `<Toaster icons={{ ... }} />` using custom SVG components from `resources/js/Components/Icons.jsx`.
3. **Mounting Strategy for 100% Inertia Navigation Persistence**: By mounting `<ToastContainer />` directly inside `setup({ el, App, props })` in `resources/js/app.jsx` as a sibling to `<App {...props} />` inside `root.render()`, the notification container is instantiated exactly once at the application root. Active notifications persist across client-side Inertia page navigations without unmounting, timer interruption, or layout re-renders.
4. **Dual-Layer Feedback & Collision Deduplication**: All subscription mutations (create, update, delete, status toggle) are wired with rich client-side toast notifications (`notifySubscriptionMutation`). A global Inertia `router.on('success')` listener catches server-side session flash messages while a timestamped deduplication engine (`isRecentClientToast()`) prevents dual-notification clutter. The legacy static green alert banner in `Dashboard.jsx:214-225` is retired to prevent layout shifts.

---

## 2. Dynamic Theme Architecture & MutationObserver Specification

### 2.1 The Class-Based Dark Mode Challenge
Vaultly / AuraSpace utilizes Tailwind CSS class-based dark mode (`darkMode: 'class'` in `tailwind.config.js:6`).
- Dark mode is represented by the presence of `.dark` on `document.documentElement` (`<html class="dark">`).
- The application includes an inline Anti-FOUC script in `resources/views/app.blade.php:14-28` that parses `localStorage.getItem('theme')` and OS media query before DOM rendering.
- `ThemeToggle.jsx` allows manual user switching by toggling `.dark` on `document.documentElement`, setting `colorScheme = 'dark' | 'light'`, and triggering smooth transitions (via `theme-transitioning` and optional `document.startViewTransition`).

If `<Toaster />` relies on `theme="system"`, Sonner only queries `window.matchMedia('(prefers-color-scheme: dark)')`. If a user with a light OS preference selects dark mode in Vaultly, Sonner renders light-themed toasts over dark-themed UI components, causing high-contrast visual glitches.

### 2.2 MutationObserver Lifecycle & Implementation
To guarantee instantaneous synchronization without polling or event emitter overhead, `ToastContainer.jsx` establishes an active `MutationObserver` on `document.documentElement`:

```jsx
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';

export default function ToastContainer() {
    // 1. Initial State: Read DOM immediately (safe after Anti-FOUC script)
    const [theme, setTheme] = useState(() => {
        if (typeof document !== 'undefined') {
            return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        }
        return 'dark'; // Fallback for cosmic aesthetic
    });

    useEffect(() => {
        const root = document.documentElement;

        const updateTheme = () => {
            const isDark = root.classList.contains('dark');
            setTheme(isDark ? 'dark' : 'light');
        };

        // Ensure state aligns with DOM on mount
        updateTheme();

        // 2. Observe class modifications on <html>
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateTheme();
                    break;
                }
            }
        });

        observer.observe(root, {
            attributes: true,
            attributeFilter: ['class'],
        });

        // 3. Fallback OS media query listener when no user preference is stored
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = () => {
            if (!localStorage.getItem('theme')) {
                updateTheme();
            }
        };
        mediaQuery.addEventListener('change', handleMediaChange);

        // 4. Clean teardown on unmount
        return () => {
            observer.disconnect();
            mediaQuery.removeEventListener('change', handleMediaChange);
        };
    }, []);

    // ... Toaster rendering
}
```

### 2.3 Edge Case & Transition Handling
1. **View Transitions API**: When `ThemeToggle.jsx` invokes `document.startViewTransition`, the DOM snapshot captures the current state, adds `.dark`, and cross-fades. The `MutationObserver` fires synchronously when `.dark` is added, enabling Sonner's internal CSS variables (`--normal-bg`, `--normal-border`, `--normal-text`) to participate in the native cross-fade transition.
2. **Cross-Tab Synchronization**: When `ThemeToggle.jsx` responds to the `window.storage` event from another browser tab, it mutates `document.documentElement.classList`. The `MutationObserver` detects this immediately and updates active toasts without requiring page reloads.
3. **Reduced Motion**: If `prefers-reduced-motion: reduce` is active, transitions are disabled via CSS rules in `resources/css/app.css:107-117`, and Sonner applies instant visual changes.

---

## 3. Styling, Positioning & Emerald Cosmic Aesthetic

### 3.1 Design Language Alignment
The Vaultly / AuraSpace visual identity is defined by:
- **Font**: Figtree (`font-sans`, Bunny Fonts).
- **Surfaces**: Glassmorphic backdrops (`backdrop-blur-md`) with high opacity (`bg-white/95` in light mode, `bg-zinc-900/95` in dark mode).
- **Borders & Radii**: Smooth `rounded-2xl` containers (16px) with soft borders (`border-zinc-200/80` dark:`border-zinc-800/80`).
- **Cosmic Emerald Glow**: Primary accent `#10b981` (`emerald-500` / `cosmic-500`), paired with deep halos (`shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]`).

### 3.2 Positioning Strategy
- **Desktop (>= 640px)**: `position="top-right"`.
  - Toasts appear in the top-right quadrant, vertically offset (`offset="16px"`, `gap={12}`).
  - This avoids occluding central financial metrics, charts, and table rows while remaining clearly visible above the dashboard canvas.
- **Mobile (< 640px)**: Sonner automatically adapts to `top-center` full-width margin layouts (`mobileOffset={{ top: '12px', right: '12px', left: '12px', bottom: '12px' }}`).
- **Stacking Behavior**: `visibleToasts={4}`, `expand={false}`. When multiple actions occur sequentially, toasts stack gracefully into a card deck that expands on hover.

### 3.3 Custom Class Names Architecture (`toastOptions.classNames`)
Sonner provides fine-grained class mapping via `toastOptions.classNames`. Rather than relying on generic richColors defaults, we apply custom utility classes that blend with the AuraSpace design system:

```javascript
toastOptions={{
    style: {
        fontFamily: 'Figtree, sans-serif',
    },
    classNames: {
        toast: 'group flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 font-sans pointer-events-auto',
        title: 'text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100',
        description: 'text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed',
        closeButton: 'opacity-0 group-hover:opacity-100 transition-opacity duration-200 !border-zinc-200 dark:!border-zinc-700 !bg-zinc-100/90 dark:!bg-zinc-800/90 !text-zinc-500 dark:!text-zinc-400 hover:!text-zinc-800 dark:hover:!text-zinc-200',
        actionButton: '!bg-emerald-500 hover:!bg-emerald-600 !text-white text-xs font-semibold rounded-xl px-3 py-1.5 shadow-sm transition-colors',
        cancelButton: '!bg-zinc-100 hover:!bg-zinc-200 dark:!bg-zinc-800 dark:hover:!bg-zinc-700 !text-zinc-700 dark:!text-zinc-300 text-xs font-medium rounded-xl px-3 py-1.5 transition-colors',
        // Variant Accents
        default: 'border-zinc-200/80 bg-white/95 text-zinc-900 shadow-zinc-900/10 dark:border-zinc-800/80 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-black/50',
        success: 'border-emerald-500/30 bg-white/95 text-zinc-900 shadow-emerald-500/10 dark:border-emerald-500/40 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]',
        error: 'border-rose-500/30 bg-white/95 text-zinc-900 shadow-rose-500/10 dark:border-rose-500/40 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-[0_0_25px_-5px_rgba(244,63,94,0.25)]',
        info: 'border-sky-500/30 bg-white/95 text-zinc-900 shadow-sky-500/10 dark:border-sky-500/40 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-[0_0_25px_-5px_rgba(14,165,233,0.25)]',
        warning: 'border-amber-500/30 bg-white/95 text-zinc-900 shadow-amber-500/10 dark:border-amber-500/40 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-[0_0_25px_-5px_rgba(245,158,11,0.25)]',
    },
}}
```

### 3.4 Custom SVG Icon Badges (`icons` Prop)
Instead of third-party icon libraries, we integrate icons directly from `resources/js/Components/Icons.jsx`. Each icon is encased in a styled pill container matching the variant color:

```jsx
icons={{
    success: (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/20 dark:text-emerald-400">
            <CheckIcon className="h-4 w-4 stroke-[2.5]" />
        </span>
    ),
    error: (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 shadow-sm dark:border-rose-400/20 dark:bg-rose-500/20 dark:text-rose-400">
            <AlertIcon className="h-4 w-4 stroke-[2]" />
        </span>
    ),
    info: (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-600 shadow-sm dark:border-sky-400/20 dark:bg-sky-500/20 dark:text-sky-400">
            <AlertIcon className="h-4 w-4 stroke-[2]" />
        </span>
    ),
    warning: (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/20 dark:text-amber-400">
            <AlertIcon className="h-4 w-4 stroke-[2]" />
        </span>
    ),
    loading: (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center text-emerald-500">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
        </span>
    ),
}}
```

---

## 4. Mounting Strategy & Inertia Lifecycle Persistence

### 4.1 Comparison of Mounting Locations

| Mounting Strategy | Lifetime & Persistence | Single-Instance Guarantee | Page Context & Flash Handling | Verdict |
|---|---|---|---|---|
| **A. `resources/js/app.jsx` (`setup` callback)** | **Permanent**: Persists throughout the entire session. Survives page transitions, redirects, and auth layout switches. | **Guaranteed 100%**: Mounted exactly once on `root.render()`. Zero duplicate containers. | Can listen to global `router.on('success')` and dispatch toasts anywhere in the app. | **RECOMMENDED & ARCHITECTURALLY SUPERIOR** |
| **B. Inside Layouts (`AuthenticatedLayout`, `GuestLayout`)** | **Broken**: Unmounts whenever user navigates between guest and authenticated routes or switches layouts. | **High Risk**: If mounted in multiple layouts, transitions cause race conditions or duplicate instances. | Can access `usePage().props.flash` directly, but loses toasts on redirect across layouts. | **REJECTED** |
| **C. Inside Page Components (`Dashboard.jsx`, etc.)** | **Fragmented**: Unmounts on every navigation between pages. | **Unacceptable**: Leads to code duplication and missing toasts on non-dashboard pages. | Direct prop access, but toasts are destroyed immediately upon navigation. | **REJECTED** |

### 4.2 Deep Dive: Inertia React Reconciliation Lifecycle
Inertia.js v2 (`@inertiajs/react`) initializes the single-page application using `createInertiaApp` in `resources/js/app.jsx`.

```javascript
createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <>
                <App {...props} />
                <ToastContainer />
            </>
        );
    },
    progress: {
        color: '#10b981',
    },
});
```

#### Why This Guarantees Persistence:
1. When `createInertiaApp` initializes, `setup({ el, App, props })` is called exactly **once** upon initial page load.
2. During client-side navigation (`router.visit()`, `<Link>`, form submissions), Inertia's internal router replaces the active page component inside `<App {...props} />`. The React root (`root.render`) is **not** re-executed, and the root element `el` (`<div id="app">`) is **not** replaced.
3. Because `<ToastContainer />` is a direct sibling of `<App {...props} />`, React's virtual DOM reconciliation skips re-mounting `<ToastContainer />`.
4. Result: A toast triggered on `/dashboard` (e.g., right before redirecting to `/profile`) will stay pinned in the viewport across the URL change, uninterrupted, running its full 4-second animation countdown.

#### Stacking Context & Fixed Positioning:
In `resources/views/app.blade.php:36-38`:
```html
<body class="font-sans antialiased bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
    @inertia
</body>
```
The `#app` container has no CSS `transform`, `filter`, or `perspective` applied. Therefore, Sonner's internal `position: fixed` attaches directly to the viewport coordinate system with `z-index: 9999`, preventing any clipping by parent overflow containers.

---

## 5. Flash Data Synchronization & Client Notification Bridge

### 5.1 Backend Gap Resolution in `HandleInertiaRequests.php`
Currently, `app/Http/Middleware/HandleInertiaRequests.php:30-38` does not expose session flash data:
```php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => [
            'user' => $request->user(),
        ],
    ];
}
```
Controllers call `->with('success', '...')` (e.g. `SubscriptionController.php:85, 95, 107, 119`), but because `flash` is not shared in `share()`, `page.props.flash` is `undefined`.

**Required change in `HandleInertiaRequests.php`**:
```php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => [
            'user' => $request->user(),
        ],
        'flash' => [
            'success' => fn () => $request->session()->get('success'),
            'error' => fn () => $request->session()->get('error'),
            'info' => fn () => $request->session()->get('info'),
        ],
    ];
}
```

### 5.2 Notification Interface Contract: `resources/js/Utils/toastNotifications.js`
As mandated by `PROJECT.md` line 63, all client-side subscription mutations should route through a unified helper function:

```javascript
import { toast } from 'sonner';

/**
 * Timestamp of the most recent client-initiated toast notification.
 * Used to suppress redundant generic session flash messages.
 */
let lastClientToastTimestamp = 0;

export function isRecentClientToast(thresholdMs = 1500) {
    return Date.now() - lastClientToastTimestamp < thresholdMs;
}

/**
 * Dispatch contextual Sonner toast notifications for subscription lifecycle mutations.
 *
 * @param {'created' | 'updated' | 'deleted' | 'status_toggled'} action
 * @param {string} subscriptionName
 * @param {'active' | 'paused'} [status]
 */
export function notifySubscriptionMutation(action, subscriptionName, status) {
    lastClientToastTimestamp = Date.now();
    const safeName = subscriptionName || 'Assinatura';

    switch (action) {
        case 'created':
            toast.success('Assinatura cadastrada!', {
                description: `"${safeName}" foi adicionada com sucesso ao seu rastreador.`,
            });
            break;

        case 'updated':
            toast.success('Assinatura atualizada!', {
                description: `As alterações em "${safeName}" foram salvas com sucesso.`,
            });
            break;

        case 'deleted':
            toast.success('Assinatura removida', {
                description: `"${safeName}" foi excluída do seu rastreador.`,
            });
            break;

        case 'status_toggled':
            if (status === 'paused') {
                toast.info('Assinatura pausada', {
                    description: `"${safeName}" foi pausada e desconsiderada das projeções mensais.`,
                });
            } else {
                toast.success('Assinatura reativada!', {
                    description: `"${safeName}" está ativa e inclusa novamente nos cálculos financeiros.`,
                });
            }
            break;

        default:
            toast.success('Operação concluída com sucesso!');
    }
}
```

### 5.3 Deduplication of Dual-Layer Notifications
When an Inertia mutation finishes:
1. The client-side callback (`onSuccess`) executes, triggering `notifySubscriptionMutation(action, name)`.
2. Concurrently, the Laravel redirect arrives with `session()->get('success')` in `event.detail.page.props.flash`.
3. If both were handled naively, two toasts would pop up simultaneously: one rich client toast and one generic backend toast ("Assinatura criada com sucesso.").

**Solution**:
In `ToastContainer.jsx`, we listen to `router.on('success')` but guard against recent client toasts:
```javascript
useEffect(() => {
    const removeListener = router.on('success', (event) => {
        // Suppress generic backend message if a rich client notification was just fired
        if (isRecentClientToast(1500)) {
            return;
        }

        const flash = event.detail.page?.props?.flash;
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
        if (flash?.info) {
            toast.info(flash.info);
        }
    });

    return () => {
        removeListener();
    };
}, []);
```
This ensures:
- Specialized subscription CRUD actions display detailed messages with entity names.
- Non-CRUD redirects (profile updates, password resets, backend authentication messages) are seamlessly caught and displayed as toasts.
- Zero dual-toast collisions.

### 5.4 Removal of Legacy Static Alert Banner in `Dashboard.jsx`
In `resources/js/Pages/Dashboard.jsx:214-225`:
```jsx
{/* Flash Success Notification */}
{flash?.success && (
    <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-50/90 p-4 text-emerald-800 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300">
        <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-emerald-500/20 p-1 text-emerald-600 dark:text-emerald-400">
                <CheckIcon className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium">
                {flash.success}
            </span>
        </div>
    </div>
)}
```
**Action**: Delete lines 213-225. Because Sonner toasts float smoothly in the top-right viewport, removing this inline element prevents vertical layout shifts on the dashboard metrics and table when mutations complete.

---

## 6. Complete Production-Ready Code Blueprint

### 6.1 `resources/js/Components/ToastContainer.jsx`
```jsx
import { Toaster, toast } from 'sonner';
import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { CheckIcon, AlertIcon } from '@/Components/Icons';
import { isRecentClientToast } from '@/Utils/toastNotifications';

export default function ToastContainer() {
    const [theme, setTheme] = useState(() => {
        if (typeof document !== 'undefined') {
            return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        }
        return 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;

        const updateTheme = () => {
            const isDark = root.classList.contains('dark');
            setTheme(isDark ? 'dark' : 'light');
        };

        updateTheme();

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateTheme();
                    break;
                }
            }
        });

        observer.observe(root, {
            attributes: true,
            attributeFilter: ['class'],
        });

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = () => {
            if (!localStorage.getItem('theme')) {
                updateTheme();
            }
        };
        mediaQuery.addEventListener('change', handleMediaChange);

        // Global flash listener for server redirects
        const removeRouterListener = router.on('success', (event) => {
            if (isRecentClientToast(1500)) {
                return;
            }

            const flash = event.detail.page?.props?.flash;
            if (flash?.success) {
                toast.success(flash.success);
            }
            if (flash?.error) {
                toast.error(flash.error);
            }
            if (flash?.info) {
                toast.info(flash.info);
            }
        });

        return () => {
            observer.disconnect();
            mediaQuery.removeEventListener('change', handleMediaChange);
            removeRouterListener();
        };
    }, []);

    return (
        <Toaster
            theme={theme}
            position="top-right"
            expand={false}
            richColors={false}
            closeButton={true}
            gap={12}
            visibleToasts={4}
            duration={4000}
            toastOptions={{
                style: {
                    fontFamily: 'Figtree, sans-serif',
                },
                classNames: {
                    toast: 'group flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 font-sans pointer-events-auto',
                    title: 'text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100',
                    description: 'text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed',
                    closeButton: 'opacity-0 group-hover:opacity-100 transition-opacity duration-200 !border-zinc-200 dark:!border-zinc-700 !bg-zinc-100/90 dark:!bg-zinc-800/90 !text-zinc-500 dark:!text-zinc-400 hover:!text-zinc-800 dark:hover:!text-zinc-200',
                    actionButton: '!bg-emerald-500 hover:!bg-emerald-600 !text-white text-xs font-semibold rounded-xl px-3 py-1.5 shadow-sm transition-colors',
                    cancelButton: '!bg-zinc-100 hover:!bg-zinc-200 dark:!bg-zinc-800 dark:hover:!bg-zinc-700 !text-zinc-700 dark:!text-zinc-300 text-xs font-medium rounded-xl px-3 py-1.5 transition-colors',
                    default: 'border-zinc-200/80 bg-white/95 text-zinc-900 shadow-zinc-900/10 dark:border-zinc-800/80 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-black/50',
                    success: 'border-emerald-500/30 bg-white/95 text-zinc-900 shadow-emerald-500/10 dark:border-emerald-500/40 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]',
                    error: 'border-rose-500/30 bg-white/95 text-zinc-900 shadow-rose-500/10 dark:border-rose-500/40 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-[0_0_25px_-5px_rgba(244,63,94,0.25)]',
                    info: 'border-sky-500/30 bg-white/95 text-zinc-900 shadow-sky-500/10 dark:border-sky-500/40 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-[0_0_25px_-5px_rgba(14,165,233,0.25)]',
                    warning: 'border-amber-500/30 bg-white/95 text-zinc-900 shadow-amber-500/10 dark:border-amber-500/40 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-[0_0_25px_-5px_rgba(245,158,11,0.25)]',
                },
            }}
            icons={{
                success: (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <CheckIcon className="h-4 w-4 stroke-[2.5]" />
                    </span>
                ),
                error: (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 shadow-sm dark:border-rose-400/20 dark:bg-rose-500/20 dark:text-rose-400">
                        <AlertIcon className="h-4 w-4 stroke-[2]" />
                    </span>
                ),
                info: (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-600 shadow-sm dark:border-sky-400/20 dark:bg-sky-500/20 dark:text-sky-400">
                        <AlertIcon className="h-4 w-4 stroke-[2]" />
                    </span>
                ),
                warning: (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/20 dark:text-amber-400">
                        <AlertIcon className="h-4 w-4 stroke-[2]" />
                    </span>
                ),
                loading: (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-emerald-500">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    </span>
                ),
            }}
        />
    );
}
```

### 6.2 `resources/js/app.jsx` Diff
```diff
--- a/resources/js/app.jsx
+++ b/resources/js/app.jsx
@@ -4,6 +4,7 @@ import './bootstrap';
 import { createInertiaApp } from '@inertiajs/react';
 import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
 import { createRoot } from 'react-dom/client';
+import ToastContainer from './Components/ToastContainer';
 
 const appName = import.meta.env.VITE_APP_NAME || 'Vaultly';
 
@@ -17,7 +18,12 @@ createInertiaApp({
     setup({ el, App, props }) {
         const root = createRoot(el);
 
-        root.render(<App {...props} />);
+        root.render(
+            <>
+                <App {...props} />
+                <ToastContainer />
+            </>
+        );
     },
     progress: {
         color: '#10b981',
```

### 6.3 `SubscriptionModal.jsx` Integration Snippet
In `resources/js/Components/SubscriptionModal.jsx`:
```jsx
import { notifySubscriptionMutation } from '@/Utils/toastNotifications';
import { toast } from 'sonner';

// Inside submit handler:
if (isEditing) {
    put(route('subscriptions.update', subscription.id), {
        preserveScroll: true,
        onSuccess: () => {
            notifySubscriptionMutation('updated', data.name);
            onClose();
        },
        onError: () => {
            toast.error('Erro ao atualizar assinatura', {
                description: 'Verifique os dados informados e tente novamente.',
            });
        },
    });
} else {
    post(route('subscriptions.store'), {
        preserveScroll: true,
        onSuccess: () => {
            notifySubscriptionMutation('created', data.name);
            reset();
            onClose();
        },
        onError: () => {
            toast.error('Erro ao cadastrar assinatura', {
                description: 'Verifique os dados informados e tente novamente.',
            });
        },
    });
}
```

### 6.4 `DeleteSubscriptionModal.jsx` Integration Snippet
In `resources/js/Components/DeleteSubscriptionModal.jsx`:
```jsx
import { notifySubscriptionMutation } from '@/Utils/toastNotifications';
import { toast } from 'sonner';

const handleDelete = () => {
    setProcessing(true);
    router.delete(route('subscriptions.destroy', subscription.id), {
        preserveScroll: true,
        onSuccess: () => {
            notifySubscriptionMutation('deleted', subscription.name);
            setProcessing(false);
            onClose();
        },
        onError: () => {
            toast.error('Erro ao excluir assinatura', {
                description: 'Não foi possível remover a assinatura. Tente novamente.',
            });
            setProcessing(false);
        },
    });
};
```

### 6.5 `Dashboard.jsx: handleToggleStatus` Integration Snippet
In `resources/js/Pages/Dashboard.jsx`:
```jsx
import { notifySubscriptionMutation } from '@/Utils/toastNotifications';
import { toast } from 'sonner';

const handleToggleStatus = (sub) => {
    if (togglingId) return;
    setTogglingId(sub.id);
    const targetStatus = sub.status === 'active' ? 'paused' : 'active';

    router.patch(
        route('subscriptions.toggle-status', sub.id),
        {},
        {
            preserveScroll: true,
            onSuccess: () => {
                notifySubscriptionMutation('status_toggled', sub.name, targetStatus);
            },
            onError: () => {
                toast.error('Erro ao alterar status', {
                    description: 'Não foi possível atualizar o status da assinatura.',
                });
            },
            onFinish: () => setTogglingId(null),
        },
    );
};
```

---

## 7. Verification & Hardening Matrix

| Test / Scenario | Target Behavior | Verification Command / Procedure | Pass Criteria |
|---|---|---|---|
| **Build Integrity** | Bundler compiles all assets without unresolved imports or JSX syntax errors | `docker compose exec -T laravel.test npm run build` | Exits with status 0; Vite manifest created |
| **Theme Sync** | Toast theme switches instantly when clicking ThemeToggle | Click theme toggle button while toast is visible | Toast container changes `[data-theme]` from dark to light without page refresh |
| **Cross-Tab Theme Sync** | Storage event synchronizes toast theme | Open two browser tabs; toggle theme in tab A | Tab B toast flips theme immediately via MutationObserver |
| **Navigation Persistence** | Active toasts remain visible when changing routes | Trigger toast on Dashboard, click Profile link | Toast remains visible and finishes countdown on Profile page |
| **Single Container Guarantee** | Exactly one `<section aria-label="Notifications ...">` in DOM | Inspect DOM via DevTools: `document.querySelectorAll('[data-sonner-toaster]').length` | Returns exactly `1` |
| **Mutation Feedback** | Create/Update/Delete/Toggle show rich toasts with name | Submit create form, edit form, delete confirmation, toggle button | Shows custom title and description containing entity name |
| **Flash Deduplication** | Server flash does not trigger duplicate toast | Submit subscription form with controller `->with('success')` | Exactly 1 toast appears; generic redirect message suppressed |
| **Backend Test Suite** | Existing backend PHPUnit tests remain 100% passing | `docker compose exec -T laravel.test php artisan test` | 87/87 tests pass |
| **Pint Style Conformance** | PHP formatting compliant | `docker compose exec -T laravel.test ./vendor/bin/pint --test` | 0 style issues reported |
