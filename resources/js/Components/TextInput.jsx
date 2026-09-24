import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { EyeIcon, EyeOffIcon } from '@/Components/Icons';

export default forwardRef(function TextInput(
    {
        type = 'text',
        className = '',
        isFocused = false,
        icon = null,
        endIcon = null,
        showPasswordToggle = false,
        hasError = false,
        error = null,
        size = 'md',
        ...props
    },
    ref,
) {
    const localRef = useRef(null);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const isInvalid = Boolean(hasError || error);

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

    // Size variants
    const sizeClasses = {
        sm: 'py-1.5 text-xs rounded-lg',
        md: 'py-2.5 text-sm rounded-xl',
        lg: 'py-3.5 text-base rounded-2xl',
    }[size] || 'py-2.5 text-sm rounded-xl';

    const paddingLeft = icon
        ? size === 'sm' ? 'ps-9' : size === 'lg' ? 'ps-11' : 'ps-10'
        : size === 'sm' ? 'ps-3' : 'ps-3.5';

    const hasRightElement = Boolean(endIcon || (showPasswordToggle && type === 'password'));
    const paddingRight = hasRightElement
        ? size === 'sm' ? 'pe-9' : size === 'lg' ? 'pe-12' : 'pe-11'
        : size === 'sm' ? 'pe-3' : 'pe-3.5';

    // State styling
    const stateClasses = isInvalid
        ? 'border-rose-400 bg-white/95 text-zinc-900 placeholder:text-zinc-400 hover:border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 dark:border-rose-600/80 dark:bg-zinc-900/90 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-rose-500 dark:focus:border-rose-400 dark:focus:ring-rose-400/20'
        : 'border-zinc-300/90 bg-white/95 text-zinc-900 placeholder:text-zinc-400 hover:border-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20';

    return (
        <div className="group/input relative w-full">
            {icon && (
                <div
                    className={`pointer-events-none absolute inset-y-0 start-0 flex items-center ${
                        size === 'sm' ? 'ps-2.5' : 'ps-3.5'
                    } text-zinc-400 transition-colors duration-200 group-focus-within/input:text-emerald-500 dark:text-zinc-500 dark:group-focus-within/input:text-emerald-400`}
                >
                    {icon}
                </div>
            )}

            <input
                {...props}
                type={actualType}
                className={
                    `block w-full border shadow-xs transition-all duration-200 ease-out focus:outline-none ${sizeClasses} ${paddingLeft} ${paddingRight} ${stateClasses} ` +
                    className
                }
                ref={localRef}
            />

            {/* End Icon or Password Visibility Toggle */}
            {showPasswordToggle && type === 'password' ? (
                <div className="absolute inset-y-0 end-0 flex items-center pe-2">
                    <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        aria-label={isPasswordVisible ? 'Ocultar senha' : 'Exibir senha'}
                        className="flex items-center justify-center rounded-lg p-1.5 text-zinc-400 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-600 active:scale-90 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    >
                        {isPasswordVisible ? (
                            <EyeOffIcon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
                        ) : (
                            <EyeIcon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
                        )}
                    </button>
                </div>
            ) : endIcon ? (
                <div
                    className={`pointer-events-none absolute inset-y-0 end-0 flex items-center ${
                        size === 'sm' ? 'pe-2.5' : 'pe-3.5'
                    } text-zinc-400 transition-colors duration-200 group-focus-within/input:text-emerald-500 dark:text-zinc-500 dark:group-focus-within/input:text-emerald-400`}
                >
                    {endIcon}
                </div>
            ) : null}
        </div>
    );
});
