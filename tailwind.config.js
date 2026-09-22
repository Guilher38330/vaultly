import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                cosmic: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                    950: '#022c22',
                },
            },
            boxShadow: {
                'emerald-glow': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
                'emerald-glow-lg': '0 0 45px -10px rgba(16, 185, 129, 0.45)',
            },
            keyframes: {
                floatPlanet: {
                    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                    '50%': { transform: 'translateY(-12px) rotate(1.5deg)' },
                },
                floatPlanetSlow: {
                    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                    '50%': { transform: 'translateY(-8px) rotate(-1deg)' },
                },
                twinkleStar: {
                    '0%, 100%': { opacity: '0.3', transform: 'scale(0.85)' },
                    '50%': {
                        opacity: '1',
                        transform: 'scale(1.2)',
                        filter: 'drop-shadow(0 0 6px rgba(110, 231, 183, 0.9))',
                    },
                },
                ringGlow: {
                    '0%, 100%': {
                        opacity: '0.7',
                        filter: 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.4))',
                    },
                    '50%': {
                        opacity: '1',
                        filter: 'drop-shadow(0 0 16px rgba(52, 211, 153, 0.85))',
                    },
                },
                cardEntrance: {
                    from: {
                        opacity: '0',
                        transform: 'translateY(14px) scale(0.99)',
                    },
                    to: {
                        opacity: '1',
                        transform: 'translateY(0) scale(1)',
                    },
                },
                slideInLeft: {
                    from: {
                        opacity: '0',
                        transform: 'translateX(-32px)',
                    },
                    to: {
                        opacity: '1',
                        transform: 'translateX(0)',
                    },
                },
                slideInRight: {
                    from: {
                        opacity: '0',
                        transform: 'translateX(32px)',
                    },
                    to: {
                        opacity: '1',
                        transform: 'translateX(0)',
                    },
                },
            },
            animation: {
                'float-planet': 'floatPlanet 7s ease-in-out infinite',
                'float-planet-slow': 'floatPlanetSlow 9s ease-in-out infinite',
                twinkle: 'twinkleStar 3.5s ease-in-out infinite',
                'ring-glow': 'ringGlow 4s ease-in-out infinite',
                'card-entrance':
                    'cardEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-in-left':
                    'slideInLeft 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-in-right':
                    'slideInRight 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            },
        },
    },

    plugins: [forms],
};
