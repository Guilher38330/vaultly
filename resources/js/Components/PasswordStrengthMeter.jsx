import React, { useMemo } from 'react';
import { CheckIcon, ShieldCheckIcon } from '@/Components/Icons';

export default function PasswordStrengthMeter({ password = '', className = '' }) {
    const rules = useMemo(() => {
        const pwd = password || '';
        return [
            {
                id: 'length',
                label: '8+ caracteres',
                met: pwd.length >= 8,
            },
            {
                id: 'uppercase',
                label: 'Letra maiúscula (A-Z)',
                met: /[A-Z]/.test(pwd),
            },
            {
                id: 'lowercase',
                label: 'Letra minúscula (a-z)',
                met: /[a-z]/.test(pwd),
            },
            {
                id: 'number',
                label: 'Número (0-9)',
                met: /[0-9]/.test(pwd),
            },
            {
                id: 'special',
                label: 'Símbolo especial (!@#$)',
                met: /[^A-Za-z0-9]/.test(pwd),
            },
        ];
    }, [password]);

    const strength = useMemo(() => {
        if (!password) {
            return { score: 0, label: '', color: 'bg-zinc-200 dark:bg-zinc-800', textColor: 'text-zinc-400' };
        }

        const metCount = rules.filter((r) => r.met).length;

        if (metCount <= 1) {
            return {
                score: 1,
                label: 'Muito fraca',
                color: 'bg-rose-500',
                textColor: 'text-rose-500 dark:text-rose-400',
            };
        }
        if (metCount === 2) {
            return {
                score: 2,
                label: 'Fraca',
                color: 'bg-rose-400',
                textColor: 'text-rose-400 dark:text-rose-300',
            };
        }
        if (metCount === 3) {
            return {
                score: 3,
                label: 'Média',
                color: 'bg-amber-500',
                textColor: 'text-amber-500 dark:text-amber-400',
            };
        }
        if (metCount === 4) {
            return {
                score: 4,
                label: 'Boa',
                color: 'bg-teal-500',
                textColor: 'text-teal-500 dark:text-teal-400',
            };
        }
        return {
            score: 5,
            label: 'Excelente & Segura',
            color: 'bg-emerald-500',
            textColor: 'text-emerald-500 dark:text-emerald-400',
        };
    }, [password, rules]);

    if (!password) {
        return null;
    }

    return (
        <div className={`mt-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 transition-all duration-300 dark:border-zinc-800/80 dark:bg-zinc-900/60 ${className}`}>
            {/* Header with strength label */}
            <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-600 dark:text-zinc-400">
                    Força da senha:
                </span>
                <span className={`font-semibold tracking-wide transition-colors duration-200 ${strength.textColor}`}>
                    {strength.label}
                </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="mt-2 grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((step) => (
                    <div
                        key={step}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            step <= strength.score
                                ? strength.color
                                : 'bg-zinc-200 dark:bg-zinc-800'
                        }`}
                    />
                ))}
            </div>

            {/* Checklist of Requirements */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                {rules.map((rule) => (
                    <div
                        key={rule.id}
                        className={`flex items-center gap-1.5 text-[11px] transition-all duration-200 ${
                            rule.met
                                ? 'text-emerald-600 font-medium dark:text-emerald-400'
                                : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                    >
                        <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                                rule.met
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400'
                                    : 'bg-zinc-200/80 text-transparent dark:bg-zinc-800'
                            }`}
                        >
                            <CheckIcon className="h-2.5 w-2.5" />
                        </span>
                        <span>{rule.label}</span>
                    </div>
                ))}
            </div>

            {/* All requirements met badge */}
            {strength.score === 5 && (
                <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheckIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Excelente! Senha altamente protegida.</span>
                </div>
            )}
        </div>
    );
}
