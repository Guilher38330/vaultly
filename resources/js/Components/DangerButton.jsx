export default function DangerButton({
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
            disabled={isBusy}
            className={
                `relative inline-flex items-center justify-center font-semibold tracking-wide text-white overflow-hidden ` +
                `bg-gradient-to-r from-rose-600 via-rose-600 to-rose-700 hover:from-rose-500 hover:via-rose-500 hover:to-rose-600 active:from-rose-700 active:to-rose-800 ` +
                `ring-1 ring-inset ring-white/20 ` +
                `shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_14px_rgba(225,29,72,0.25)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.35)] ` +
                `transition-all duration-150 ease-out focus:outline-none focus:ring-4 focus:ring-rose-500/25 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ` +
                `active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none ` +
                `${sizeClasses} ${className}`
            }
        >
            {isBusy ? (
                <svg
                    className="h-4 w-4 shrink-0 animate-spin text-white"
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
