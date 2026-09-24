import { forwardRef, Fragment, useState, useEffect, useRef } from 'react';
import {
    Combobox,
    ComboboxInput as HeadlessComboboxInput,
    ComboboxButton,
    ComboboxOptions,
    ComboboxOption,
    Transition,
} from '@headlessui/react';

export default forwardRef(function ComboboxInput(
    {
        className = '',
        isFocused = false,
        icon = null,
        hasError = false,
        error = null,
        size = 'md',
        options = [],
        value,
        onChange,
        placeholder = '',
        id,
        name,
        required,
        ...rest
    },
    ref
) {
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);
    const isInvalid = Boolean(hasError || error);

    useEffect(() => {
        if (isFocused) {
            inputRef.current?.focus();
        }
    }, [isFocused]);

    const filteredOptions =
        query === ''
            ? options
            : options.filter((option) =>
                  option.toLowerCase().replace(/\s+/g, '').includes(query.toLowerCase().replace(/\s+/g, ''))
              );

    const sizeClasses = {
        sm: 'py-1.5 text-xs rounded-lg',
        md: 'py-2.5 text-sm rounded-xl',
        lg: 'py-3.5 text-base rounded-2xl',
    }[size] || 'py-2.5 text-sm rounded-xl';

    const paddingLeft = icon
        ? size === 'sm' ? 'ps-9' : size === 'lg' ? 'ps-11' : 'ps-10'
        : size === 'sm' ? 'ps-3' : 'ps-3.5';

    const paddingRight = size === 'sm' ? 'pe-8' : size === 'lg' ? 'pe-11' : 'pe-10';

    const stateClasses = isInvalid
        ? 'border-rose-400 bg-white/95 text-zinc-900 hover:border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 dark:border-rose-600/80 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:border-rose-500 dark:focus:border-rose-400 dark:focus:ring-rose-400/20'
        : 'border-zinc-300/90 bg-white/95 text-zinc-900 hover:border-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20';

    return (
        <Combobox
            value={value ?? ''}
            onChange={(val) => {
                if (onChange) {
                    onChange({ target: { name: name || '', value: val } });
                }
            }}
        >
            <div className={`group/combobox relative w-full ${className}`}>
                {icon && (
                    <div
                        className={`pointer-events-none absolute inset-y-0 start-0 z-10 flex items-center ${
                            size === 'sm' ? 'ps-2.5' : 'ps-3.5'
                        } text-zinc-400 transition-colors duration-200 group-focus-within/combobox:text-emerald-500 dark:text-zinc-500 dark:group-focus-within/combobox:text-emerald-400`}
                    >
                        {icon}
                    </div>
                )}

                <div className="relative w-full">
                    <HeadlessComboboxInput
                        id={id}
                        name={name}
                        required={required}
                        ref={(el) => {
                            inputRef.current = el;
                            if (typeof ref === 'function') ref(el);
                            else if (ref) ref.current = el;
                        }}
                        className={`block w-full border shadow-xs transition-all duration-200 ease-out focus:outline-none ${sizeClasses} ${paddingLeft} ${paddingRight} ${stateClasses}`}
                        placeholder={placeholder}
                        displayValue={(item) => item}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            if (onChange) {
                                onChange(event);
                            }
                        }}
                        {...rest}
                    />
                    
                    <ComboboxButton className={`absolute inset-y-0 end-0 flex items-center ${
                            size === 'sm' ? 'pe-2.5' : 'pe-3.5'
                        } text-zinc-400 transition-colors duration-200 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300`}>
                        <svg
                            className={size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            viewBox="0 0 24 24"
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </ComboboxButton>
                </div>

                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                    afterLeave={() => setQuery('')}
                >
                    <ComboboxOptions className="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-zinc-200/80 bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none dark:border-zinc-700/80 dark:bg-zinc-900 dark:ring-white/5">
                        {query.length > 0 && !filteredOptions.some(opt => opt.toLowerCase() === query.toLowerCase()) && (
                            <ComboboxOption
                                value={query}
                                className={({ active }) =>
                                    `relative cursor-pointer select-none py-2.5 pe-10 ps-3.5 text-sm transition-colors ${
                                        active
                                            ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                                            : 'text-zinc-800 dark:text-zinc-200'
                                    }`
                                }
                            >
                                Criar "{query}"
                            </ComboboxOption>
                        )}

                        {filteredOptions.length === 0 && query !== '' && !query.length > 0 && (
                            <div className="relative cursor-default select-none py-2.5 px-3.5 text-sm text-zinc-500 dark:text-zinc-400">
                                Nenhuma categoria encontrada.
                            </div>
                        )}
                        
                        {filteredOptions.map((option) => (
                            <ComboboxOption
                                key={option}
                                value={option}
                                className={({ active, selected }) =>
                                    `relative cursor-pointer select-none py-2.5 pe-10 ps-3.5 text-sm transition-colors ${
                                        active
                                            ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                                            : selected
                                              ? 'text-emerald-700 dark:text-emerald-400'
                                              : 'text-zinc-800 dark:text-zinc-200'
                                    }`
                                }
                            >
                                {({ selected }) => (
                                    <>
                                        <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                            {option}
                                        </span>

                                        {selected && (
                                            <span className="absolute inset-y-0 end-0 flex items-center pe-3 text-emerald-600 dark:text-emerald-400">
                                                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </span>
                                        )}
                                    </>
                                )}
                            </ComboboxOption>
                        ))}
                    </ComboboxOptions>
                </Transition>
            </div>
        </Combobox>
    );
});
