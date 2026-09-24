export default function InputLabel({
    value,
    className = '',
    required = false,
    optional = false,
    hint = null,
    children,
    ...props
}) {
    // Check if value already has an asterisk at the end
    const rawText = value ? String(value) : '';
    const hasTrailingAsterisk = rawText.trim().endsWith('*');
    const displayText = hasTrailingAsterisk
        ? rawText.replace(/\s*\*$/, '')
        : (value || children);

    const isRequired = required || hasTrailingAsterisk;

    return (
        <label
            {...props}
            className={
                `flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300 tracking-tight select-none ` +
                className
            }
        >
            <span className="inline-flex items-center">
                {displayText}
                {isRequired && (
                    <span
                        className="ms-1 text-xs font-bold text-rose-500"
                        title="Campo obrigatório"
                        aria-hidden="true"
                    >
                        *
                    </span>
                )}
            </span>

            {optional && !isRequired && (
                <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
                    (opcional)
                </span>
            )}

            {hint && (
                <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
                    {hint}
                </span>
            )}
        </label>
    );
}
