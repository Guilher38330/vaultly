import React from 'react';
import { SparkleIcon, CrownIcon } from '@/Components/Icons';
import { Link } from '@inertiajs/react';

export default function CosmicShowcasePanel({
    badgeText = 'PORTAL CÓSMICO',
    welcomeTitle = 'Hello!',
    welcomeSubtitle = 'HAVE A GOOD DAY',
    description = 'Explore um universo de possibilidades em nossa plataforma segura e moderna.',
}) {
    return (
        <div className="relative flex h-full min-h-[220px] sm:min-h-[320px] lg:min-h-[500px] xl:min-h-[540px] w-full flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-950 to-zinc-950 p-4 sm:p-7 lg:p-8 xl:p-10 text-white shadow-2xl transition-all duration-500 dark:from-emerald-950 dark:via-zinc-950 dark:to-black">
            {/* Background SVG Cosmic Papercut Layers */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <svg
                    className="absolute inset-0 h-full w-full"
                    viewBox="0 0 500 700"
                    preserveAspectRatio="xMidYMid slice"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        {/* Papercut Layer Gradients */}
                        <linearGradient id="layerGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#064e3b" stopOpacity="0.85" />
                            <stop offset="100%" stopColor="#022c22" stopOpacity="0.95" />
                        </linearGradient>
                        <linearGradient id="layerGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#047857" stopOpacity="0.75" />
                            <stop offset="100%" stopColor="#064e3b" stopOpacity="0.85" />
                        </linearGradient>
                        <linearGradient id="layerGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#059669" stopOpacity="0.55" />
                            <stop offset="100%" stopColor="#047857" stopOpacity="0.7" />
                        </linearGradient>
                        <linearGradient id="layerGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#059669" stopOpacity="0.5" />
                        </linearGradient>

                        {/* Planet Gradients */}
                        <radialGradient id="centralPlanetGrad" cx="35%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#d1fae5" />
                            <stop offset="25%" stopColor="#6ee7b7" />
                            <stop offset="60%" stopColor="#059669" />
                            <stop offset="100%" stopColor="#022c22" />
                        </radialGradient>
                        <radialGradient id="topPlanetGrad" cx="30%" cy="30%" r="70%">
                            <stop offset="0%" stopColor="#6ee7b7" />
                            <stop offset="50%" stopColor="#0d9488" />
                            <stop offset="100%" stopColor="#042f2e" />
                        </radialGradient>
                        <radialGradient id="moonGrad" cx="30%" cy="30%" r="70%">
                            <stop offset="0%" stopColor="#d1fae5" />
                            <stop offset="70%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#064e3b" />
                        </radialGradient>
                        <radialGradient id="planetGlowHalo" cx="40%" cy="40%" r="60%">
                            <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.4" />
                            <stop offset="70%" stopColor="#10b981" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#047857" stopOpacity="0" />
                        </radialGradient>
                        <linearGradient id="planetRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                            <stop offset="35%" stopColor="#a7f3d0" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
                        </linearGradient>

                        {/* Ring Gradient */}
                        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.95" />
                            <stop offset="50%" stopColor="#34d399" stopOpacity="0.85" />
                            <stop offset="100%" stopColor="#059669" stopOpacity="0.35" />
                        </linearGradient>

                        {/* Shadows for Papercut Cutout Depth */}
                        <filter id="paperShadow1" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#01140e" floodOpacity="0.65" />
                        </filter>
                        <filter id="paperShadow2" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#01140e" floodOpacity="0.55" />
                        </filter>
                        <filter id="paperShadow3" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#01140e" floodOpacity="0.45" />
                        </filter>

                        {/* Glow Filter with Cross-Browser feMerge */}
                        <filter id="emeraldGlow" x="-40%" y="-40%" width="180%" height="180%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Deep Space Background / Nebula Dust */}
                    <rect width="500" height="700" fill="#01140e" opacity="0.95" />

                    {/* Concentric Organic Papercut Layers (Outer to Inner Portal) */}
                    {/* Layer 1: Outermost portal frame */}
                    <path
                        d="M0,0 L500,0 L500,700 L0,700 Z M40,80 C120,60 180,95 250,75 C340,50 420,90 450,160 C480,240 455,340 465,430 C475,530 435,620 360,650 C280,680 180,640 110,620 C45,600 25,510 28,420 C30,320 20,220 30,150 C33,120 35,95 40,80 Z"
                        fill="url(#layerGrad1)"
                        fillRule="evenodd"
                        filter="url(#paperShadow1)"
                    />

                    {/* Layer 2: Middle Organic Contour */}
                    <path
                        d="M0,0 L500,0 L500,700 L0,700 Z M75,120 C150,105 210,135 280,118 C360,98 400,150 425,210 C450,280 425,370 435,450 C445,530 385,595 320,615 C250,635 170,600 120,575 C65,550 55,470 60,395 C65,300 55,210 65,160 Z"
                        fill="url(#layerGrad2)"
                        fillRule="evenodd"
                        filter="url(#paperShadow2)"
                    />

                    {/* Layer 3: Inner Organic Contour */}
                    <path
                        d="M0,0 L500,0 L500,700 L0,700 Z M110,165 C175,150 230,175 295,160 C360,145 385,195 400,250 C415,310 395,390 400,460 C405,520 350,565 295,580 C235,595 170,565 135,540 C95,510 90,445 95,375 C100,295 90,225 100,185 Z"
                        fill="url(#layerGrad3)"
                        fillRule="evenodd"
                        filter="url(#paperShadow3)"
                    />

                    {/* Layer 4: Deepest Portal Halo */}
                    <path
                        d="M0,0 L500,0 L500,700 L0,700 Z M140,205 C200,195 250,215 310,200 C365,188 375,235 385,280 C395,335 375,400 378,460 C380,510 330,540 280,550 C230,560 180,535 155,510 C125,480 125,420 130,360 C135,290 125,235 140,205 Z"
                        fill="url(#layerGrad4)"
                        fillRule="evenodd"
                    />

                    {/* Twinkling Stars (Inside the celestial opening) */}
                    {/* Star 1 - Top Right */}
                    <g className="animate-twinkle" style={{ transformOrigin: '360px 220px', animationDelay: '0s' }}>
                        <path
                            d="M360 210 L363 218 L371 220 L363 222 L360 230 L357 222 L349 220 L357 218 Z"
                            fill="#a7f3d0"
                        />
                    </g>
                    {/* Star 2 - Top Left */}
                    <g className="animate-twinkle" style={{ transformOrigin: '180px 190px', animationDelay: '1.2s' }}>
                        <path
                            d="M180 183 L182 188 L188 190 L182 192 L180 197 L178 192 L172 190 L178 188 Z"
                            fill="#6ee7b7"
                        />
                    </g>
                    {/* Star 3 - Mid Right */}
                    <g className="animate-twinkle" style={{ transformOrigin: '385px 380px', animationDelay: '2.1s' }}>
                        <path
                            d="M385 374 L387 378 L392 380 L387 382 L385 386 L383 382 L378 380 L383 378 Z"
                            fill="#ecfdf5"
                        />
                    </g>
                    {/* Star 4 - Bottom Left */}
                    <g className="animate-twinkle" style={{ transformOrigin: '175px 480px', animationDelay: '0.8s' }}>
                        <path
                            d="M175 473 L177 478 L183 480 L177 482 L175 487 L173 482 L167 480 L173 478 Z"
                            fill="#a7f3d0"
                        />
                    </g>
                    {/* Star 5 - Near Center Planet */}
                    <g className="animate-twinkle" style={{ transformOrigin: '210px 285px', animationDelay: '1.7s' }}>
                        <circle cx="210" cy="285" r="2.5" fill="#d1fae5" />
                    </g>
                    {/* Stardust Dust Points */}
                    <circle cx="330" cy="460" r="1.5" fill="#6ee7b7" opacity="0.6" />
                    <circle cx="160" cy="340" r="1.5" fill="#a7f3d0" opacity="0.5" />
                    <circle cx="340" cy="280" r="2" fill="#34d399" opacity="0.7" />
                    <circle cx="270" cy="210" r="1.5" fill="#ecfdf5" opacity="0.8" />
                    <circle cx="230" cy="495" r="1.8" fill="#a7f3d0" opacity="0.6" />

                    {/* Secondary Tilted Upper Planet (with slow float animation) */}
                    <g className="animate-float-planet-slow" style={{ transformOrigin: '340px 180px' }}>
                        {/* Secondary Planet Back Ring */}
                        <ellipse
                            cx="340"
                            cy="180"
                            rx="40"
                            ry="11"
                            transform="rotate(-22 340 180)"
                            fill="none"
                            stroke="#34d399"
                            strokeWidth="2.5"
                            opacity="0.4"
                        />
                        {/* Secondary Planet Body */}
                        <circle
                            cx="340"
                            cy="180"
                            r="24"
                            fill="url(#topPlanetGrad)"
                            filter="drop-shadow(0 4px 10px rgba(4, 47, 46, 0.6))"
                        />
                        {/* Secondary Planet Front Ring - Mathematically aligned to back ellipse */}
                        <path
                            d="M 300 180 A 40 11 0 0 0 380 180"
                            transform="rotate(-22 340 180)"
                            fill="none"
                            stroke="#6ee7b7"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            opacity="0.9"
                        />
                    </g>

                    {/* Small Orbiting Moon */}
                    <g className="animate-float-planet" style={{ transformOrigin: '155px 390px', animationDelay: '1s' }}>
                        <circle
                            cx="155"
                            cy="390"
                            r="12"
                            fill="url(#moonGrad)"
                            filter="drop-shadow(0 3px 8px rgba(6, 78, 59, 0.7))"
                        />
                        {/* Moon highlight */}
                        <circle cx="152" cy="387" r="3.5" fill="#ffffff" opacity="0.4" />
                    </g>

                    {/* Tiny distant moon */}
                    <circle
                        cx="370"
                        cy="430"
                        r="6"
                        fill="#6ee7b7"
                        opacity="0.8"
                        filter="drop-shadow(0 2px 5px rgba(2, 44, 34, 0.6))"
                    />

                    {/* Central Majestic Planet (With Luminous Dual Rings) */}
                    <g className="animate-float-planet" style={{ transformOrigin: '260px 360px' }}>
                        {/* Central Planet Atmospheric Halo */}
                        <circle
                            cx="260"
                            cy="360"
                            r="76"
                            fill="url(#planetGlowHalo)"
                        />

                        {/* Back Section of Outer Glowing Ring */}
                        <ellipse
                            cx="260"
                            cy="360"
                            rx="125"
                            ry="32"
                            transform="rotate(-16 260 360)"
                            fill="none"
                            stroke="url(#ringGrad)"
                            strokeWidth="4"
                            filter="url(#emeraldGlow)"
                            className="animate-ring-glow"
                            opacity="0.6"
                        />
                        {/* Back Section of Inner Thin Ring */}
                        <ellipse
                            cx="260"
                            cy="360"
                            rx="105"
                            ry="26"
                            transform="rotate(-16 260 360)"
                            fill="none"
                            stroke="#a7f3d0"
                            strokeWidth="1.5"
                            strokeDasharray="8 6"
                            opacity="0.6"
                        />

                        {/* Central Planet Sphere */}
                        <circle
                            cx="260"
                            cy="360"
                            r="68"
                            fill="url(#centralPlanetGrad)"
                            filter="drop-shadow(0 12px 35px rgba(2, 44, 34, 0.8))"
                        />

                        {/* Luminous Atmospheric Rim Gradient on Planet Sphere */}
                        <circle
                            cx="260"
                            cy="360"
                            r="67"
                            fill="none"
                            stroke="url(#planetRimGrad)"
                            strokeWidth="2.5"
                            opacity="0.9"
                        />

                        {/* Planet Spherical Atmosphere & Surface Detail */}
                        <path
                            d="M200 335 C230 315 285 320 320 345 C295 385 240 395 200 375 Z"
                            fill="#059669"
                            opacity="0.25"
                        />
                        <ellipse
                            cx="235"
                            cy="330"
                            rx="22"
                            ry="12"
                            fill="#ffffff"
                            opacity="0.2"
                            transform="rotate(-20 235 330)"
                        />

                        {/* Front Section of Inner Ring (passes across planet) - Mathematically aligned */}
                        <path
                            d="M 155 360 A 105 26 0 0 0 365 360"
                            transform="rotate(-16 260 360)"
                            fill="none"
                            stroke="#d1fae5"
                            strokeWidth="2"
                            strokeLinecap="round"
                            opacity="0.9"
                        />

                        {/* Front Section of Outer Glowing Ring (passes across planet) - Mathematically aligned */}
                        <path
                            d="M 135 360 A 125 32 0 0 0 385 360"
                            transform="rotate(-16 260 360)"
                            fill="none"
                            stroke="url(#ringGrad)"
                            strokeWidth="5"
                            strokeLinecap="round"
                            filter="url(#emeraldGlow)"
                            className="animate-ring-glow"
                        />
                    </g>
                </svg>

                {/* Subtle Ambient Vignette & Text Scrim */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950/85 via-emerald-950/40 to-transparent" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(52,211,153,0.12),transparent_65%)]" />
            </div>

            {/* Top Bar: Brand Badge & Return Home */}
            <div className="relative z-10 flex items-center justify-between">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2.5 rounded-full border border-emerald-400/30 bg-emerald-950/60 px-4 py-1.5 text-xs font-semibold tracking-wider text-emerald-300 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-emerald-300 hover:bg-emerald-900/60 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                >
                    <CrownIcon className="h-4 w-4 text-emerald-400" />
                    <span>{badgeText}</span>
                </Link>

                <div className="flex items-center gap-1 text-emerald-400/70">
                    <SparkleIcon className="h-4 w-4 animate-pulse" />
                    <span className="text-[11px] font-medium uppercase tracking-widest">Aura Green</span>
                </div>
            </div>

            {/* Bottom Content: Integrated Typography from Reference */}
            <div className="relative z-10 mt-auto pt-6 sm:pt-10 lg:pt-16">
                <div className="max-w-md space-y-1.5 sm:space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/90 sm:text-sm">
                        {welcomeTitle}
                    </p>
                    <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-5xl">
                        <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent">
                            {welcomeSubtitle}
                        </span>
                    </h1>
                    <p className="text-xs leading-relaxed text-emerald-100/75 sm:text-sm lg:text-base line-clamp-2 sm:line-clamp-none">
                        {description}
                    </p>
                </div>

                {/* Decorative Pill Badges */}
                <div className="mt-3 sm:mt-6 flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 text-[10px] sm:text-xs font-medium text-emerald-200/80">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-900/40 px-2.5 py-0.5 sm:px-3 sm:py-1 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Sistema Seguro
                    </span>
                    <span className="inline-flex items-center rounded-lg border border-emerald-500/20 bg-emerald-900/40 px-2.5 py-0.5 sm:px-3 sm:py-1 backdrop-blur-sm">
                        Criptografia Ponta a Ponta
                    </span>
                    <span className="hidden sm:inline-flex items-center rounded-lg border border-emerald-500/20 bg-emerald-900/40 px-2.5 py-0.5 sm:px-3 sm:py-1 backdrop-blur-sm">
                        24/7 Ativo
                    </span>
                </div>
            </div>
        </div>
    );
}
