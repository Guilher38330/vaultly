export default function Checkbox({
    className = '',
    label = null,
    description = null,
    id,
    ...props
}) {
    const inputElement = (
        <input
            {...props}
            id={id}
            type="checkbox"
            className={
                'h-4.5 w-4.5 rounded-md border-zinc-300/90 bg-white text-emerald-600 shadow-xs transition-all duration-150 ease-out hover:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:ring-offset-0 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:text-emerald-500 dark:checked:bg-emerald-500 dark:hover:border-emerald-500/60 ' +
                className
            }
        />
    );

    if (!label && !description) {
        return inputElement;
    }

    return (
        <label
            htmlFor={id}
            className="group/check inline-flex cursor-pointer items-start gap-2.5 select-none"
        >
            <div className="pt-0.5">{inputElement}</div>
            <div className="flex flex-col">
                {label && (
                    <span className="text-sm font-medium text-zinc-700 transition-colors group-hover/check:text-zinc-900 dark:text-zinc-300 dark:group-hover/check:text-zinc-100">
                        {label}
                    </span>
                )}
                {description && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {description}
                    </span>
                )}
            </div>
        </label>
    );
}
