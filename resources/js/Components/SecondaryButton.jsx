export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    processing = false,
    size = 'md',
    icon = null,
    iconPosition = 'start',
    children,
    ...props
}) {
    const isBusy = disabled || processing;

    // Size variants
    const sizeClasses = {
        sm: 'min-h-[36px] px-3.5 py-1.5 text-xs rounded-lg gap-1.5',
        md: 'min-h-[42px] px-4.5 py-2.5 text-sm rounded-xl gap-2',
        lg: 'min-h-[48px] px-6 py-3 text-base rounded-2xl gap-2.5',
    }[size] || 'min-h-[42px] px-4.5 py-2.5 text-sm rounded-xl gap-2';

    return (
        <button
            {...props}
            type={type}
            disabled={isBusy}
            className={
                `relative inline-flex items-center justify-center font-semibold text-zinc-700 dark:text-zinc-200 ` +
                `border border-zinc-200/90 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm ` +
                `hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 ` +
                `shadow-xs hover:shadow-sm active:scale-[0.98] ` +
                `transition-all duration-150 ease-out focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ` +
                `disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none ` +
                `${sizeClasses} ${className}`
            }
        >
            {isBusy ? (
                <svg
                    className="h-4 w-4 shrink-0 animate-spin text-zinc-500 dark:text-zinc-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            ) : (
                icon && iconPosition === 'start' && (
                    <span className="shrink-0">{icon}</span>
                )
            )}

            <span>{children}</span>

            {!isBusy && icon && iconPosition === 'end' && (
                <span className="shrink-0">{icon}</span>
            )}
        </button>
    );
}
