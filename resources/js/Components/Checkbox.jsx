export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'h-4 w-4 rounded-md border-zinc-300 text-emerald-600 shadow-sm transition duration-150 focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-0 dark:border-zinc-700 dark:bg-zinc-900 dark:checked:bg-emerald-600 dark:focus:ring-emerald-500/40 ' +
                className
            }
        />
    );
}
