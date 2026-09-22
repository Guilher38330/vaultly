import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@/Components/Icons';

export default function ThemeToggle({ className = '' }) {
    const [isDark, setIsDark] = useState(() => {
        if (typeof document !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });

    useEffect(() => {
        const updateThemeState = () => {
            const isDarkMode = document.documentElement.classList.contains('dark');
            setIsDark(isDarkMode);
            document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
        };

        // Initial sync in case DOM changed
        updateThemeState();

        // Observe class changes on html (syncs desktop/mobile toggle instances on the same page)
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'class') {
                    updateThemeState();
                }
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        const triggerTransition = (callback) => {
            document.documentElement.classList.add('theme-transitioning');
            if (
                document.startViewTransition &&
                !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ) {
                document.startViewTransition(() => {
                    callback();
                });
            } else {
                callback();
            }
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transitioning');
            }, 450);
        };

        // Sync across browser tabs via storage events
        const handleStorage = (e) => {
            if (e.key === 'theme') {
                triggerTransition(() => {
                    if (e.newValue === 'dark') {
                        document.documentElement.classList.add('dark');
                    } else if (e.newValue === 'light') {
                        document.documentElement.classList.remove('dark');
                    } else {
                        const systemDark = window.matchMedia(
                            '(prefers-color-scheme: dark)',
                        ).matches;
                        document.documentElement.classList.toggle('dark', systemDark);
                    }
                    updateThemeState();
                });
            }
        };

        // Respond to OS system theme changes if user has no stored override
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = (e) => {
            try {
                if (!localStorage.getItem('theme')) {
                    triggerTransition(() => {
                        document.documentElement.classList.toggle('dark', e.matches);
                        updateThemeState();
                    });
                }
            } catch (err) { }
        };

        window.addEventListener('storage', handleStorage);
        mediaQuery.addEventListener('change', handleMediaChange);

        return () => {
            observer.disconnect();
            window.removeEventListener('storage', handleStorage);
            mediaQuery.removeEventListener('change', handleMediaChange);
        };
    }, []);

    const toggleTheme = () => {
        const nextDark = !document.documentElement.classList.contains('dark');

        document.documentElement.classList.add('theme-transitioning');

        const applyThemeChange = () => {
            if (nextDark) {
                document.documentElement.classList.add('dark');
                document.documentElement.style.colorScheme = 'dark';
                try {
                    localStorage.setItem('theme', 'dark');
                } catch (e) { }
            } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.style.colorScheme = 'light';
                try {
                    localStorage.setItem('theme', 'light');
                } catch (e) { }
            }
            setIsDark(nextDark);
        };

        if (
            document.startViewTransition &&
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            document.startViewTransition(() => {
                applyThemeChange();
            });
        } else {
            applyThemeChange();
        }

        setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
        }, 450);
    };

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className={`group relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/90 text-zinc-600 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700 hover:shadow-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300 ${className}`}
        >
            <span className="sr-only">Alternar tema</span>
            <div className="relative h-5 w-5">
                <SunIcon
                    className={`absolute inset-0 h-5 w-5 text-amber-500 transition-all duration-300 ${isDark
                        ? 'rotate-90 scale-0 opacity-0'
                        : 'rotate-0 scale-100 opacity-100'
                        }`}
                />
                <MoonIcon
                    className={`absolute inset-0 h-5 w-5 text-emerald-400 transition-all duration-300 ${isDark
                        ? 'rotate-0 scale-100 opacity-100'
                        : '-rotate-90 scale-0 opacity-0'
                        }`}
                />
            </div>
        </button>
    );
}
