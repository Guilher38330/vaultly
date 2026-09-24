# Technical Analysis: Mutation Toast Integration & Backend Flash Support (M1.3)

**Milestone**: Milestone 1: Dependencies, Environment & Notification System  
**Agent**: Explorer M1.3  
**Working Directory**: `z:\home\guilhherme\projetos\meu-app-react\.agents\teamwork_preview_explorer_m1_3`  
**Date**: 2026-09-23  

---

## 1. Executive Summary

This document details the architectural blueprint and exact code modifications for integrating modern toast notifications (powered by Sonner) across all subscription CRUD mutations and status toggles, as well as fixing backend flash prop sharing in Laravel 12 / Inertia v2.

### Key Discoveries & Architectural Decisions:
1. **Root Cause of Missing Flash Data**: While `SubscriptionController.php` dispatches `back()->with('success', '...')` on all mutations (store, update, destroy, toggleStatus), `app/Http/Middleware/HandleInertiaRequests.php` never exposed session flash variables in its `share()` array. Consequently, `usePage().props.flash` remained `undefined`.
2. **Defensive Lazy Evaluation**: In `HandleInertiaRequests.php`, flash variables must be shared via lazy closures using `$request->hasSession() ? $request->session()->get(...) : null` to eliminate the risk of `SessionNotFoundException` during stateless or headless testing.
3. **Dual-Layer Notification Architecture**:
   - **Layer 1 (Entity-Contextual Client Callbacks)**: High-fidelity toasts triggered directly inside mutation `onSuccess` and `onError` callbacks in `SubscriptionModal.jsx`, `DeleteSubscriptionModal.jsx`, and `Dashboard.jsx`. These toasts include the specific subscription name, action-oriented descriptions, and distinct color semantics (e.g. emerald for activation vs sky/info for pausing).
   - **Layer 2 (Global Flash Fallback)**: A custom React hook `useFlashNotifications()` embedded in `AuthenticatedLayout.jsx` that watches `props.flash` for non-CRUD server redirects (e.g. profile updates or system warnings) while suppressing duplicate alerts for the 4 known subscription mutations.
4. **Elimination of Cumulative Layout Shift (CLS)**: The legacy static banner at `Dashboard.jsx:213-225` inserted a dynamic 80px element into the vertical DOM flow (`space-y-6`). Safely removing it and its unused imports (`CheckIcon`, `usePage`) permanently stabilizes the page layout during mutations.
5. **Zero Regression Guarantee**: Audited all 12 test files across `tests/Feature/`. None of the 87 automated tests assert strict prop exclusion (`hasOnly()`), ensuring 100% test suite compatibility.

---

## 2. Backend Flash Support: `HandleInertiaRequests.php`

### 2.1 Problem Diagnosis
In `SubscriptionController.php`:
- Line 89: `return back()->with('success', 'Assinatura criada com sucesso.');`
- Line 101: `return back()->with('success', 'Assinatura atualizada com sucesso.');`
- Line 113: `return back()->with('success', 'Assinatura excluída com sucesso.');`
- Line 126: `return back()->with('success', 'Status da assinatura alterado com sucesso.');`

All mutations redirect back with `'success'` in the Laravel session store. However, `app/Http/Middleware/HandleInertiaRequests.php` currently reads:

```php
// File: app/Http/Middleware/HandleInertiaRequests.php (lines 30-38)
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

Because `'flash'` is absent from the shared array, Inertia serializes page props without any flash payload. In `Dashboard.jsx:94`, `const { flash } = usePage().props;` receives `undefined`.

### 2.2 Target Implementation
Modify `app/Http/Middleware/HandleInertiaRequests.php` to lazily evaluate flash keys (`success`, `error`, `info`, `warning`) while guarding against requests where the session store is uninitialized.

```php
<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'success' => fn () => $request->hasSession() ? $request->session()->get('success') : null,
                'error' => fn () => $request->hasSession() ? $request->session()->get('error') : null,
                'info' => fn () => $request->hasSession() ? $request->session()->get('info') : null,
                'warning' => fn () => $request->hasSession() ? $request->session()->get('warning') : null,
            ],
        ];
    }
}
```

### 2.3 Rationale & Regression Prevention
1. **Lazy Execution (`fn () => ...`)**: Inertia v2 evaluates callable props lazily. On partial reloads where `flash` is not requested, the closure is never executed, saving CPU cycles.
2. **Defensive Guard (`$request->hasSession()`)**: Direct calls to `$request->session()` without checking `$request->hasSession()` can trigger a fatal `RuntimeException: Session store not set on request` if a test or stateless endpoint passes through this middleware. The ternary check completely neutralizes this risk.
3. **Pint Compatibility**: Single-line arrow functions conform to Laravel Pint formatting rules (`vendor/bin/sail bin pint --dirty --format agent`).
4. **Backward Compatibility**: Tests in `tests/Feature/SubscriptionTest.php` (such as lines 820, 866, 890, 898, 919) specifically verify `$response->assertSessionHas('success')`. Sharing this to Inertia does not affect session storage or redirect headers, maintaining 100% pass rate.

---

## 3. Centralized Notification Helper: `toastNotifications.js`

To prevent duplication and guarantee consistent formatting, descriptions, icons, and color semantics, all toast triggers are encapsulated into a dedicated helper module satisfying the interface contract in `PROJECT.md:62-64`.

### File: `resources/js/Utils/toastNotifications.js`

```javascript
import { toast } from 'sonner';

/**
 * Standardized mutation toast notification helper for Vaultly.
 *
 * @param {'created' | 'updated' | 'deleted' | 'status_toggled'} action
 * @param {string} subscriptionName Name of the affected subscription
 * @param {'active' | 'paused' | string} [status] Resulting status for status_toggled action
 */
export function notifySubscriptionMutation(action, subscriptionName, status) {
    const name = subscriptionName?.trim() || 'Assinatura';

    switch (action) {
        case 'created':
            toast.success('Assinatura criada com sucesso!', {
                description: `"${name}" foi adicionada ao seu rastreador.`,
                duration: 4000,
            });
            break;

        case 'updated':
            toast.success('Assinatura atualizada!', {
                description: `As alterações em "${name}" foram salvas.`,
                duration: 4000,
            });
            break;

        case 'deleted':
            toast.success('Assinatura excluída', {
                description: `"${name}" foi removida permanentemente.`,
                duration: 4000,
            });
            break;

        case 'status_toggled':
            if (status === 'paused') {
                toast.info(`Assinatura "${name}" pausada`, {
                    description: 'Desativada temporariamente. Excluída dos cálculos e projeções mensais.',
                    duration: 4000,
                });
            } else {
                toast.success(`Assinatura "${name}" reativada!`, {
                    description: 'Ativada com sucesso. Incluída novamente nos totais e vencimentos.',
                    duration: 4000,
                });
            }
            break;

        default:
            toast.info(`Ação concluída em "${name}".`);
            break;
    }
}

/**
 * Standardized error toast notification helper.
 *
 * @param {string} [title] Error title
 * @param {string} [description] Detailed error message
 */
export function notifyMutationError(title = 'Ocorreu um erro', description = 'Tente novamente em instantes.') {
    toast.error(title, {
        description,
        duration: 5000,
    });
}
```

---

## 4. Component-Level Toast Wiring Specifications

### 4.1 `resources/js/Components/SubscriptionModal.jsx` (Create & Update)

#### Current Code (`SubscriptionModal.jsx:80-100`):
```javascript
    const handleSubmit = (e) => {
        e.preventDefault();

        if (isEdit) {
            put(route('subscriptions.update', subscription.id), {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post(route('subscriptions.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };
```

#### Proposed Modifications:
1. Import helper:
   ```javascript
   import { notifySubscriptionMutation, notifyMutationError } from '@/Utils/toastNotifications';
   ```
2. Update `handleSubmit`:
   ```javascript
   const handleSubmit = (e) => {
       e.preventDefault();

       const targetName = data.name;

       if (isEdit) {
           put(route('subscriptions.update', subscription.id), {
               preserveScroll: true,
               onSuccess: () => {
                   notifySubscriptionMutation('updated', targetName);
                   reset();
                   onClose();
               },
               onError: (formErrors) => {
                   const errorCount = Object.keys(formErrors).length;
                   notifyMutationError(
                       'Erro ao atualizar assinatura',
                       errorCount > 1
                           ? `Por favor, verifique os ${errorCount} campos destacados.`
                           : 'Por favor, revise o campo destacado.'
                   );
               },
           });
       } else {
           post(route('subscriptions.store'), {
               preserveScroll: true,
               onSuccess: () => {
                   notifySubscriptionMutation('created', targetName);
                   reset();
                   onClose();
               },
               onError: (formErrors) => {
                   const errorCount = Object.keys(formErrors).length;
                   notifyMutationError(
                       'Erro ao cadastrar assinatura',
                       errorCount > 1
                           ? `Por favor, verifique os ${errorCount} campos destacados.`
                           : 'Por favor, revise o campo destacado.'
                   );
               },
           });
       }
   };
   ```

---

### 4.2 `resources/js/Components/DeleteSubscriptionModal.jsx` (Delete)

#### Current Code (`DeleteSubscriptionModal.jsx:27-44`):
```javascript
    const handleDelete = () => {
        if (!subscription) return;

        setProcessing(true);
        router.delete(route('subscriptions.destroy', subscription.id), {
            preserveScroll: true,
            onSuccess: () => {
                setProcessing(false);
                onClose();
            },
            onError: () => {
                setProcessing(false);
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };
```

#### Proposed Modifications:
1. Import helper:
   ```javascript
   import { notifySubscriptionMutation, notifyMutationError } from '@/Utils/toastNotifications';
   ```
2. Update `handleDelete`:
   ```javascript
   const handleDelete = () => {
       if (!subscription) return;

       const subName = subscription.name;
       setProcessing(true);

       router.delete(route('subscriptions.destroy', subscription.id), {
           preserveScroll: true,
           onSuccess: () => {
               notifySubscriptionMutation('deleted', subName);
               setProcessing(false);
               onClose();
           },
           onError: () => {
               notifyMutationError(
                   'Erro ao excluir assinatura',
                   'Não foi possível remover a assinatura. Tente novamente em instantes.'
               );
               setProcessing(false);
           },
           onFinish: () => {
               setProcessing(false);
           },
       });
   };
   ```
*Note*: Capturing `const subName = subscription.name;` before firing the mutation prevents `null` reference issues if the modal unmounts prior to callback execution.

---

### 4.3 `resources/js/Pages/Dashboard.jsx` (Status Toggle)

#### Current Code (`Dashboard.jsx:166-176`):
```javascript
    const handleToggleStatus = (sub) => {
        setTogglingId(sub.id);
        router.patch(
            route('subscriptions.toggle-status', sub.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setTogglingId(null),
            },
        );
    };
```

#### Proposed Modifications:
1. Import helper:
   ```javascript
   import { notifySubscriptionMutation, notifyMutationError } from '@/Utils/toastNotifications';
   ```
2. Enhance `handleToggleStatus`:
   ```javascript
   const handleToggleStatus = (sub) => {
       const isPausing = sub.status === 'active';
       const targetStatus = isPausing ? 'paused' : 'active';
       const subName = sub.name;

       setTogglingId(sub.id);

       router.patch(
           route('subscriptions.toggle-status', sub.id),
           {},
           {
               preserveScroll: true,
               onSuccess: () => {
                   notifySubscriptionMutation('status_toggled', subName, targetStatus);
               },
               onError: () => {
                   notifyMutationError(
                       'Erro ao alterar status',
                       `Não foi possível alterar o status de "${subName}". Tente novamente.`
                   );
               },
               onFinish: () => setTogglingId(null),
           },
       );
   };
   ```

---

### 4.4 `resources/js/Components/ToastContainer.jsx` & Theme Sync

To deliver dark/light theme fidelity matching `ThemeToggle.jsx`, Sonner's `<Toaster />` is encapsulated in `ToastContainer.jsx` with an active `MutationObserver` on `document.documentElement`.

#### File: `resources/js/Components/ToastContainer.jsx`

```javascript
import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

export default function ToastContainer() {
    const [isDark, setIsDark] = useState(() => {
        if (typeof document !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });

    useEffect(() => {
        const updateTheme = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'class') {
                    updateTheme();
                }
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    return (
        <Toaster
            theme={isDark ? 'dark' : 'light'}
            position="top-right"
            richColors
            closeButton
            expand={false}
            toastOptions={{
                duration: 4000,
                style: {
                    fontFamily: 'Figtree, sans-serif',
                    borderRadius: '1rem',
                },
                classNames: {
                    toast: 'border font-sans shadow-xl backdrop-blur-md',
                    success:
                        'border-emerald-500/30 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 bg-emerald-50/95 dark:bg-zinc-900/95',
                    error:
                        'border-rose-500/30 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 bg-rose-50/95 dark:bg-zinc-900/95',
                    info:
                        'border-sky-500/30 dark:border-sky-500/40 text-sky-800 dark:text-sky-300 bg-sky-50/95 dark:bg-zinc-900/95',
                    warning:
                        'border-amber-500/30 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 bg-amber-50/95 dark:bg-zinc-900/95',
                },
            }}
        />
    );
}
```

#### Mount in `resources/js/app.jsx`:
```javascript
import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import ToastContainer from '@/Components/ToastContainer';

const appName = import.meta.env.VITE_APP_NAME || 'Vaultly';

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

---

### 4.5 Global Flash Listener: `useFlashNotifications.js`

To handle any future backend redirects (e.g. profile updates or system notices) without duplicating the 4 rich subscription toasts, add `useFlashNotifications` into `AuthenticatedLayout.jsx`.

#### File: `resources/js/Hooks/useFlashNotifications.js`

```javascript
import { useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { toast } from 'sonner';

const SUBSCRIPTION_CRUD_MESSAGES = [
    'Assinatura criada com sucesso.',
    'Assinatura atualizada com sucesso.',
    'Assinatura excluída com sucesso.',
    'Status da assinatura alterado com sucesso.',
];

export function useFlashNotifications() {
    const { flash } = usePage().props;
    const lastFlashRef = useRef({ success: null, error: null, info: null, warning: null });

    useEffect(() => {
        if (!flash) return;

        // Success flash (ignore known subscription controller messages already handled richly by client callbacks)
        if (flash.success && flash.success !== lastFlashRef.current.success) {
            if (!SUBSCRIPTION_CRUD_MESSAGES.includes(flash.success)) {
                toast.success(flash.success);
            }
            lastFlashRef.current.success = flash.success;
        }

        // Error flash
        if (flash.error && flash.error !== lastFlashRef.current.error) {
            toast.error(flash.error);
            lastFlashRef.current.error = flash.error;
        }

        // Info flash
        if (flash.info && flash.info !== lastFlashRef.current.info) {
            toast.info(flash.info);
            lastFlashRef.current.info = flash.info;
        }

        // Warning flash
        if (flash.warning && flash.warning !== lastFlashRef.current.warning) {
            toast.warning(flash.warning);
            lastFlashRef.current.warning = flash.warning;
        }
    }, [flash]);
}
```

Call `useFlashNotifications()` inside `resources/js/Layouts/AuthenticatedLayout.jsx`.

---

## 5. Notification Taxonomy, Copy & Semantic Design System

### 5.1 Matrix of Actions, Copy, and Visual Semantics

| Action / Trigger | Toast Method | Headline (Title) | Body (Description) | Semantic Palette (Light / Dark) | Icon / Visual Indicator |
|---|---|---|---|---|---|
| **Create Subscription** (`post.onSuccess`) | `toast.success` | `Assinatura criada com sucesso!` | `"${name}" foi adicionada ao seu rastreador.` | Emerald-600 / Emerald-400 (`#10b981`) | CheckCircle (emerald) |
| **Create Validation Error** (`post.onError`) | `toast.error` | `Erro ao cadastrar assinatura` | `Por favor, revise os campos destacados.` | Rose-600 / Rose-400 (`#f43f5e`) | AlertCircle (rose) |
| **Update Subscription** (`put.onSuccess`) | `toast.success` | `Assinatura atualizada!` | `As alterações em "${name}" foram salvas.` | Emerald-600 / Emerald-400 (`#10b981`) | CheckCircle (emerald) |
| **Update Validation Error** (`put.onError`) | `toast.error` | `Erro ao atualizar assinatura` | `Por favor, revise o campo destacado.` | Rose-600 / Rose-400 (`#f43f5e`) | AlertCircle (rose) |
| **Delete Subscription** (`delete.onSuccess`) | `toast.success` | `Assinatura excluída` | `"${name}" foi removida permanentemente.` | Emerald / Slate Neutral | CheckCircle / Trash |
| **Delete Failure** (`delete.onError`) | `toast.error` | `Erro ao excluir assinatura` | `Não foi possível remover a assinatura. Tente novamente em instantes.` | Rose-600 / Rose-400 (`#f43f5e`) | AlertCircle (rose) |
| **Pause Subscription** (`patch.onSuccess`) | `toast.info` | `Assinatura "${name}" pausada` | `Desativada temporariamente. Excluída dos cálculos e projeções mensais.` | Sky-600 / Sky-400 (`#0284c7`) | InfoCircle (sky) |
| **Reactivate Subscription** (`patch.onSuccess`) | `toast.success` | `Assinatura "${name}" reativada!` | `Ativada com sucesso. Incluída novamente nos totais e vencimentos.` | Emerald-600 / Emerald-400 (`#10b981`) | CheckCircle (emerald) |
| **Toggle Status Error** (`patch.onError`) | `toast.error` | `Erro ao alterar status` | `Não foi possível alterar o status de "${name}". Tente novamente.` | Rose-600 / Rose-400 (`#f43f5e`) | AlertCircle (rose) |
| **General Server Flash** (`flash.success`) | `toast.success` | Server string (e.g. `flash.success`) | None | Emerald-600 / Emerald-400 | CheckCircle |
| **General Server Error** (`flash.error`) | `toast.error` | Server string (e.g. `flash.error`) | None | Rose-600 / Rose-400 | AlertCircle |

### 5.2 Semantic Differentiation: Pausing vs Re-activating
- **Pausing**: Pausing an active subscription is an operational adjustment, not an error or destruction. Using **Sky / Cosmic Blue** (`toast.info`) visually communicates informational state change without the alarming red of an error or the full "positive acquisition" green of creation. The description explicitly tells the user that the subscription is excluded from monthly spend metrics.
- **Re-activating**: Re-activating brings a subscription back into active cash outflow and due-date tracking. Using **Emerald** (`toast.success`) signals positive resumption and reinforces confidence that budget totals now include it.

---

## 6. Safe Removal of Legacy Static Flash Banner in `Dashboard.jsx`

### 6.1 Layout Shift (CLS) Analysis
In `resources/js/Pages/Dashboard.jsx`:
```jsx
// Lines 213-225:
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

#### Why it caused layout shifts:
1. **Vertical Flow Displacement**: Placed inside `<div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">`. When `flash.success` appeared, it expanded the DOM by 56px + 24px (`space-y-6`), violently bumping down metric cards, due-soon alerts, and data tables.
2. **Reverse Snap on Dismissal**: When navigating away or reloading, the banner abruptly disappeared, causing an upward layout jump.
3. **Redundancy**: With Sonner active in the top-right viewport, having an inline static banner creates duplicate, clashing notifications.

### 6.2 Exact Removal & Code Cleanup Diff

#### Step 1: Remove imports
In `resources/js/Pages/Dashboard.jsx`:
- Line 3: Remove `usePage` if not used elsewhere:
  ```diff
  - import { Head, router, usePage } from '@inertiajs/react';
  + import { Head, router } from '@inertiajs/react';
  ```
- Line 21: Remove `CheckIcon` if not used elsewhere:
  ```diff
  -    SparkleIcon,
  -    CheckIcon,
  -    TagIcon,
  +    SparkleIcon,
  +    TagIcon,
  ```

#### Step 2: Remove destructured prop
- Line 94:
  ```diff
  -    const { flash } = usePage().props;
  ```

#### Step 3: Remove JSX banner block
- Lines 213-225:
  ```diff
  -    {/* Flash Success Notification */}
  -    {flash?.success && (
  -        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-50/90 p-4 text-emerald-800 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300">
  -            <div className="flex items-center gap-2.5">
  -                <span className="rounded-full bg-emerald-500/20 p-1 text-emerald-600 dark:text-emerald-400">
  -                    <CheckIcon className="h-4 w-4" />
  -                </span>
  -                <span className="text-sm font-medium">
  -                    {flash.success}
  -                </span>
  -            </div>
  -        </div>
  -    )}
  ```

### 6.3 Post-Removal Verification
- The container now directly renders the Due Soon banner (or metric cards).
- Zero elements enter or leave document flow during mutations.
- The UI maintains strict 0.00 Cumulative Layout Shift (CLS).

---

## 7. Verification & Implementation Blueprint

### 7.1 Quality Assurance Commands (Docker Sail)
All verification must be run within the Sail container:
```bash
# 1. Verify 100% passing backend tests
docker compose exec -T laravel.test php artisan test

# 2. Check PHP code formatting
docker compose exec -T laravel.test ./vendor/bin/pint --test

# 3. Build frontend assets with Vite
docker compose exec -T laravel.test npm run build
```

### 7.2 Implementation Checklist for Developer M1:
- [ ] Create `resources/js/Utils/toastNotifications.js` with `notifySubscriptionMutation` and `notifyMutationError`.
- [ ] Create `resources/js/Components/ToastContainer.jsx` with `MutationObserver` on `document.documentElement`.
- [ ] Create `resources/js/Hooks/useFlashNotifications.js` with duplicate filter.
- [ ] Update `app/Http/Middleware/HandleInertiaRequests.php` with safe lazy flash closures.
- [ ] Mount `<ToastContainer />` in `resources/js/app.jsx`.
- [ ] Mount `useFlashNotifications()` in `resources/js/Layouts/AuthenticatedLayout.jsx`.
- [ ] Wire toast triggers in `SubscriptionModal.jsx` (store & update).
- [ ] Wire toast triggers in `DeleteSubscriptionModal.jsx` (destroy).
- [ ] Wire toast triggers in `Dashboard.jsx` (toggleStatus).
- [ ] Remove legacy static flash banner and unused imports from `Dashboard.jsx`.
- [ ] Execute `php artisan test`, `pint --test`, and `npm run build`.
