export default function PrimaryButton({
    className = '',
    disabled,
    processing = false,
    children,
    ...props
}) {
    const isBusy = disabled || processing;
    return (
        <button
            {...props}
            disabled={isBusy}
            className={
                `relative inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-5 py-2.5 sm:py-3 text-center text-sm font-semibold tracking-wide text-white shadow-md shadow-emerald-600/20 transition-all duration-200 hover:from-emerald-500 hover:to-teal-500 hover:shadow-lg hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 dark:focus:ring-offset-zinc-900 ${className}`
            }
        >
            {isBusy && (
                <svg
                    className="-ms-1 me-2 h-4 w-4 animate-spin text-white"
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
            )}
            {children}
        </button>
    );
}
