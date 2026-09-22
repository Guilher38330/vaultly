import { AlertIcon } from '@/Components/Icons';

export default function InputError({ message, className = '', ...props }) {
    return message ? (
        <p
            {...props}
            className={`flex items-center gap-1.5 text-xs font-medium text-rose-500 dark:text-rose-400 ${className}`}
        >
            <AlertIcon className="h-3.5 w-3.5 shrink-0" />
            <span>{message}</span>
        </p>
    ) : null;
}
