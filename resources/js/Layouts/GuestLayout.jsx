import ApplicationLogo from '@/Components/ApplicationLogo';
import CosmicShowcase3D from '@/Components/CosmicShowcase3D';
import ThemeToggle from '@/Components/ThemeToggle';
import { Link } from '@inertiajs/react';

export default function GuestLayout({
    children,
    badge = 'PORTAL DE ACESSO',
    title = 'HELLO!',
    subtitle = 'HAVE A GOOD DAY',
    description = 'Seja bem-vindo de volta! Acesse sua conta para continuar sua jornada pelo universo digital.',
    showcasePosition = 'left',
}) {
    const isShowcaseRight = showcasePosition === 'right';

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-zinc-100/90 p-2.5 sm:p-5 lg:p-6 transition-colors duration-300 dark:bg-zinc-950">
            {/* Ambient Background Glows */}
            <div className="pointer-events-none absolute -left-48 -top-48 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/15" />
            <div className="pointer-events-none absolute -bottom-48 -right-48 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-500/15" />

            {/* Split Screen Master Card */}
            <div
                key={showcasePosition}
                className="animate-card-entrance relative z-10 grid w-full max-w-5xl xl:max-w-6xl grid-cols-1 overflow-hidden rounded-2xl sm:rounded-[2rem] border border-zinc-200/80 bg-white shadow-2xl shadow-zinc-900/10 transition-colors duration-300 dark:border-zinc-800/80 dark:bg-zinc-900 dark:shadow-black/60 lg:grid-cols-12"
            >
                {/* Cosmic 3D Interactive Visual Showcase */}
                <div
                    className={`order-1 p-2 sm:p-3 lg:col-span-6 lg:p-3 xl:p-4 ${
                        isShowcaseRight
                            ? 'lg:order-2 animate-slide-in-right'
                            : 'lg:order-1 animate-slide-in-left'
                    }`}
                >
                    <CosmicShowcase3D
                        badgeText={badge}
                        welcomeTitle={title}
                        welcomeSubtitle={subtitle}
                        description={description}
                    />
                </div>

                {/* Elevated Auth Form Container */}
                <div
                    className={`order-2 relative flex flex-col justify-between p-4 sm:p-7 lg:col-span-6 lg:p-8 xl:p-10 ${
                        isShowcaseRight
                            ? 'lg:order-1 animate-slide-in-left'
                            : 'lg:order-2 animate-slide-in-right'
                    }`}
                >
                    {/* Decorative Corner Arcs (flips dynamically according to side) */}
                    <div
                        className={`pointer-events-none absolute top-0 h-28 w-28 sm:h-36 sm:w-36 overflow-hidden opacity-25 sm:opacity-100 ${
                            isShowcaseRight ? 'start-0' : 'end-0'
                        }`}
                    >
                        <div
                            className={`absolute -top-16 h-36 w-36 rounded-full border-[14px] border-emerald-500/10 dark:border-emerald-400/15 ${
                                isShowcaseRight ? '-start-16' : '-end-16'
                            }`}
                        />
                        <div
                            className={`absolute -top-10 h-24 w-24 rounded-full border-[6px] border-emerald-400/20 dark:border-emerald-400/20 ${
                                isShowcaseRight ? '-start-10' : '-end-10'
                            }`}
                        />
                        <div
                            className={`absolute top-4 h-2 w-2 rounded-full bg-emerald-400/40 ${
                                isShowcaseRight ? 'start-4' : 'end-4'
                            }`}
                        />
                    </div>

                    {/* Top Header of Right Card: Logo & Theme Toggle */}
                    <div className="relative z-10 mb-4 sm:mb-6 flex items-center justify-between">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 sm:gap-2.5 transition-opacity hover:opacity-80 focus:outline-none"
                        >
                            <ApplicationLogo className="h-7 w-7 sm:h-8 sm:w-8" />
                            <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                                Aura<span className="text-emerald-500">Space</span>
                            </span>
                        </Link>

                        {/* Theme Toggle Button */}
                        <ThemeToggle />
                    </div>

                    {/* Form Center Body */}
                    <div className="relative z-10 my-auto w-full py-1">
                        {children}
                    </div>

                    {/* Bottom Security Note */}
                    <div className="relative z-10 mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-center text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500">
                        <span>Conexão criptografada de alta segurança • TLS 256-bit</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
