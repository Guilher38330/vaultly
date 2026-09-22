export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            disabled={disabled}
            className={
                `inline-flex items-center justify-center rounded-xl border border-transparent bg-rose-600 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition duration-150 ease-in-out hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 active:bg-rose-700 disabled:opacity-40 dark:focus:ring-offset-zinc-900 ${
                    disabled && 'opacity-30'
                } ` + className
            }
        >
            {children}
        </button>
    );
}
