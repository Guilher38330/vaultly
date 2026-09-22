import React from 'react';

const PALETTES = [
    {
        name: 'emerald',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800/60',
        dot: 'bg-emerald-500',
    },
    {
        name: 'sky',
        bg: 'bg-sky-50 dark:bg-sky-950/40',
        text: 'text-sky-700 dark:text-sky-300',
        border: 'border-sky-200 dark:border-sky-800/60',
        dot: 'bg-sky-500',
    },
    {
        name: 'violet',
        bg: 'bg-violet-50 dark:bg-violet-950/40',
        text: 'text-violet-700 dark:text-violet-300',
        border: 'border-violet-200 dark:border-violet-800/60',
        dot: 'bg-violet-500',
    },
    {
        name: 'amber',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800/60',
        dot: 'bg-amber-500',
    },
    {
        name: 'rose',
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800/60',
        dot: 'bg-rose-500',
    },
    {
        name: 'indigo',
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        text: 'text-indigo-700 dark:text-indigo-300',
        border: 'border-indigo-200 dark:border-indigo-800/60',
        dot: 'bg-indigo-500',
    },
    {
        name: 'teal',
        bg: 'bg-teal-50 dark:bg-teal-950/40',
        text: 'text-teal-700 dark:text-teal-300',
        border: 'border-teal-200 dark:border-teal-800/60',
        dot: 'bg-teal-500',
    },
    {
        name: 'cyan',
        bg: 'bg-cyan-50 dark:bg-cyan-950/40',
        text: 'text-cyan-700 dark:text-cyan-300',
        border: 'border-cyan-200 dark:border-cyan-800/60',
        dot: 'bg-cyan-500',
    },
    {
        name: 'fuchsia',
        bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
        text: 'text-fuchsia-700 dark:text-fuchsia-300',
        border: 'border-fuchsia-200 dark:border-fuchsia-800/60',
        dot: 'bg-fuchsia-500',
    },
    {
        name: 'orange',
        bg: 'bg-orange-50 dark:bg-orange-950/40',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-200 dark:border-orange-800/60',
        dot: 'bg-orange-500',
    },
];

function stringHash(str) {
    let hash = 0;
    const cleanStr = String(str).toLowerCase().trim();
    for (let i = 0; i < cleanStr.length; i++) {
        hash = (hash << 5) - hash + cleanStr.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

export default function CategoryBadge({ category, className = '' }) {
    const name = category?.trim() || 'Geral';
    const palette = PALETTES[stringHash(name) % PALETTES.length];

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide shadow-sm transition-colors ${palette.bg} ${palette.text} ${palette.border} ${className}`}
        >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${palette.dot}`} />
            <span className="truncate">{name}</span>
        </span>
    );
}
