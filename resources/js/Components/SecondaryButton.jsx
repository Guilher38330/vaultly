export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-zinc-700 shadow-sm transition duration-150 ease-in-out hover:bg-zinc-50 hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/80 dark:hover:border-zinc-600 dark:focus:ring-offset-zinc-900 ${
                    disabled && 'opacity-30'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
