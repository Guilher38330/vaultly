import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { EyeIcon, EyeOffIcon } from '@/Components/Icons';

export default forwardRef(function TextInput(
    {
        type = 'text',
        className = '',
        isFocused = false,
        icon = null,
        showPasswordToggle = false,
        ...props
    },
    ref,
) {
    const localRef = useRef(null);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    useImperativeHandle(ref, () => Object.assign(localRef.current || {}, {
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    const actualType =
        type === 'password' && showPasswordToggle
            ? isPasswordVisible
                ? 'text'
                : 'password'
            : type;

    return (
        <div className="relative w-full">
            {icon && (
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-zinc-400 dark:text-zinc-500">
                    {icon}
                </div>
            )}

            <input
                {...props}
                type={actualType}
                className={
                    `block w-full rounded-xl border border-zinc-300 bg-white/95 py-2.5 text-base sm:text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 transition-all duration-200 hover:border-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/25 ${
                        icon ? 'ps-10' : 'ps-3.5'
                    } ${showPasswordToggle && type === 'password' ? 'pe-11' : 'pe-3.5'} ` +
                    className
                }
                ref={localRef}
            />

            {showPasswordToggle && type === 'password' && (
                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    aria-label={isPasswordVisible ? 'Ocultar senha' : 'Exibir senha'}
                    className="absolute inset-y-0 end-0 flex items-center justify-center w-11 text-zinc-400 transition-colors hover:text-zinc-600 focus:outline-none dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                    {isPasswordVisible ? (
                        <EyeOffIcon className="h-5 w-5" />
                    ) : (
                        <EyeIcon className="h-5 w-5" />
                    )}
                </button>
            )}
        </div>
    );
});
