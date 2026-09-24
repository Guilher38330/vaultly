import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
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
        if (typeof document === 'undefined') {
            return;
        }

        const root = document.documentElement;

        const updateTheme = () => {
            const isDark = root.classList.contains('dark');
            setTheme(isDark ? 'dark' : 'light');
        };

        // Align theme on mount
        updateTheme();

        // 1. Observe class mutations on <html>
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

        // 2. Fallback OS media query listener when user hasn't set explicit theme in localStorage
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = () => {
            if (!localStorage.getItem('theme')) {
                updateTheme();
            }
        };
        mediaQuery.addEventListener('change', handleMediaChange);

        // 3. Global Inertia router listener for backend session flash data
        const removeRouterListener = router.on('success', (event) => {
            // Suppress generic backend message if client-side notification recently dispatched
            if (isRecentClientToast(1500)) {
                return;
            }

            const flash = event.detail?.page?.props?.flash;
            if (flash?.success) {
                toast.success(flash.success);
            }
            if (flash?.error) {
                toast.error(flash.error);
            }
            if (flash?.info) {
                toast.info(flash.info);
            }
            if (flash?.warning) {
                toast.warning(flash.warning);
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
                    closeButton:
                        'opacity-0 group-hover:opacity-100 transition-opacity duration-200 !border-zinc-200 dark:!border-zinc-700 !bg-zinc-100/90 dark:!bg-zinc-800/90 !text-zinc-500 dark:!text-zinc-400 hover:!text-zinc-800 dark:hover:!text-zinc-200',
                    actionButton:
                        '!bg-emerald-500 hover:!bg-emerald-600 !text-white text-xs font-semibold rounded-xl px-3 py-1.5 shadow-sm transition-colors',
                    cancelButton:
                        '!bg-zinc-100 hover:!bg-zinc-200 dark:!bg-zinc-800 dark:hover:!bg-zinc-700 !text-zinc-700 dark:!text-zinc-300 text-xs font-medium rounded-xl px-3 py-1.5 transition-colors',
                    default:
                        'border-zinc-200/80 bg-white/95 text-zinc-900 shadow-zinc-900/10 dark:border-zinc-800/80 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-black/50',
                    success:
                        'border-emerald-500/30 bg-white/95 text-zinc-900 shadow-emerald-500/10 dark:border-emerald-500/40 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]',
                    error:
                        'border-rose-500/30 bg-white/95 text-zinc-900 shadow-rose-500/10 dark:border-rose-500/40 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-[0_0_25px_-5px_rgba(244,63,94,0.25)]',
                    info:
                        'border-sky-500/30 bg-white/95 text-zinc-900 shadow-sky-500/10 dark:border-sky-500/40 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-[0_0_25px_-5px_rgba(14,165,233,0.25)]',
                    warning:
                        'border-amber-500/30 bg-white/95 text-zinc-900 shadow-amber-500/10 dark:border-amber-500/40 dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-[0_0_25px_-5px_rgba(245,158,11,0.25)]',
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
