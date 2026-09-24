import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { useReducedMotion } from 'framer-motion';
import { Link } from '@inertiajs/react';
import { SparkleIcon, CrownIcon } from '@/Components/Icons';

/**
 * Utility to verify WebGL support safely in SSR or client environments.
 */
export function checkWebGLSupport() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return false;
    }
    try {
        const canvas = document.createElement('canvas');
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl2') ||
                canvas.getContext('webgl') ||
                canvas.getContext('experimental-webgl'))
        );
    } catch {
        return false;
    }
}

/**
 * Zero-CLS Fallback container rendered during SSR, context loss, or on unsupported devices.
 */
function CosmicFallback() {
    return (
        <div
            className="absolute inset-0 h-full w-full flex items-center justify-center overflow-hidden pointer-events-none"
            aria-hidden="true"
        >
            {/* Ambient Nebula Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.22),rgba(4,120,87,0.08)_50%,transparent_75%)] animate-pulse duration-3000" />

            {/* CSS Celestial Sphere Simulation */}
            <div className="relative flex items-center justify-center">
                {/* Secondary satellite dot */}
                <div className="absolute -top-16 -right-16 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-300 to-teal-800 shadow-[0_0_15px_rgba(52,211,153,0.5)] opacity-80" />

                {/* Back Ring simulation */}
                <div className="absolute h-36 w-64 rounded-full border-2 border-emerald-400/40 -rotate-12 blur-[0.5px]" />

                {/* Central Planet Disc */}
                <div className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-gradient-to-br from-emerald-200 via-emerald-600 to-teal-950 shadow-[0_0_35px_rgba(16,185,129,0.45),inset_-8px_-8px_16px_rgba(2,44,34,0.9)]" />

                {/* Front Ring simulation */}
                <div className="absolute h-36 w-64 rounded-full border-t-4 border-r-2 border-emerald-300/80 -rotate-12 shadow-[0_0_12px_rgba(110,231,183,0.6)]" />
            </div>

            {/* Ambient Star Sparkles (CSS/SVG) */}
            <div className="absolute top-1/4 left-1/4 h-1.5 w-1.5 rounded-full bg-emerald-200 shadow-[0_0_8px_#a7f3d0] animate-ping" />
            <div className="absolute top-1/3 right-1/4 h-2 w-2 rounded-full bg-white shadow-[0_0_10px_#ffffff] opacity-70" />
            <div className="absolute bottom-1/3 left-1/3 h-1 w-1 rounded-full bg-teal-300 opacity-60" />
        </div>
    );
}

/**
 * SceneLifecycleTeardown
 * Recursively disposes of all geometries, materials, texture maps, and calls gl.dispose() on unmount.
 */
function SceneLifecycleTeardown({ glRef }) {
    const { gl, scene } = useThree();

    useEffect(() => {
        if (glRef) glRef.current = gl;

        return () => {
            // Recursive disposal of all scene elements
            scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((mat) => {
                            if (mat.map && typeof mat.map.dispose === 'function') {
                                mat.map.dispose();
                            }
                            mat.dispose();
                        });
                    } else {
                        if (object.material.map && typeof object.material.map.dispose === 'function') {
                            object.material.map.dispose();
                        }
                        object.material.dispose();
                    }
                }
            });

            scene.clear();

            try {
                if (gl && typeof gl.dispose === 'function') {
                    gl.dispose();
                }
            } catch {
                // Silently ignore context disposal race condition
            }
        };
    }, [gl, scene, glRef]);

    return null;
}

/**
 * 4-Point Celestial Lighting Setup
 * Combines Directional Key, Fill, Rim, Ambient, and Point lights for cinematic depth.
 */
function CelestialLighting() {
    return (
        <>
            {/* 1. Dark Emerald Cosmic Ambient */}
            <ambientLight intensity={0.35} color="#022c22" />

            {/* 2. Key Directional Light (Cool White Stellar Core) */}
            <directionalLight
                position={[-6, 5, 5]}
                intensity={2.4}
                color="#f0fdf4"
            />

            {/* 3. Fill Light (Soft Cyan Cosmic Bounce) */}
            <directionalLight
                position={[5, -2, 3]}
                intensity={0.8}
                color="#38bdf8"
            />

            {/* 4. Rim Light (Cosmic Emerald Edge Separation) */}
            <directionalLight
                position={[3, 4, -5]}
                intensity={1.6}
                color="#10b981"
            />

            {/* 5. Brand Emerald Point Light for localized radiance */}
            <pointLight
                position={[-4, 2, -2]}
                intensity={2.0}
                color="#10b981"
                distance={16}
            />
        </>
    );
}

/**
 * Atmospheric Fresnel Limb Glow Shader Layer
 */
function AtmosphericGlow() {
    const uniforms = useMemo(
        () => ({
            uColor: { value: new THREE.Color('#34d399') },
            uPower: { value: 3.2 },
            uIntensity: { value: 0.9 },
        }),
        []
    );

    return (
        <mesh scale={[1.045, 1.045, 1.045]}>
            <sphereGeometry args={[1.0, 64, 64]} />
            <shaderMaterial
                vertexShader={`
                    varying vec3 vNormal;
                    varying vec3 vViewPosition;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        vViewPosition = -mvPosition.xyz;
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `}
                fragmentShader={`
                    varying vec3 vNormal;
                    varying vec3 vViewPosition;
                    uniform vec3 uColor;
                    uniform float uPower;
                    uniform float uIntensity;
                    void main() {
                        vec3 normal = normalize(vNormal);
                        vec3 viewDir = normalize(vViewPosition);
                        float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), uPower);
                        gl_FragColor = vec4(uColor, fresnel * uIntensity);
                    }
                `}
                uniforms={uniforms}
                transparent={true}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.FrontSide}
            />
        </mesh>
    );
}

/**
 * Orbiting Moon with realistic depth and specular highlights
 */
function OrbitingMoon({ shouldReduceMotion }) {
    const moonRef = useRef();

    useFrame((state) => {
        if (!moonRef.current || shouldReduceMotion) return;
        const time = state.clock.elapsedTime;
        moonRef.current.position.x = Math.cos(time * 0.7) * 2.85;
        moonRef.current.position.z = Math.sin(time * 0.7) * 2.85;
        moonRef.current.position.y = Math.sin(time * 0.49) * 0.55;
    });

    return (
        <mesh ref={moonRef} position={[2.85, 0, 0]}>
            <sphereGeometry args={[0.18, 32, 32]} />
            <meshStandardMaterial
                color="#d1fae5"
                emissive="#10b981"
                emissiveIntensity={0.15}
                roughness={0.35}
                metalness={0.15}
            />
        </mesh>
    );
}

/**
 * Distant Secondary Planet in Upper-Right Quadrant
 */
function DistantCelestialPlanet() {
    return (
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <group position={[3.2, 1.9, -2.5]}>
                <mesh>
                    <sphereGeometry args={[0.38, 32, 32]} />
                    <meshStandardMaterial
                        color="#0d9488"
                        emissive="#042f2e"
                        emissiveIntensity={0.2}
                        roughness={0.32}
                        metalness={0.22}
                    />
                </mesh>
                <mesh rotation={[-0.35, 0, 0]}>
                    <ringGeometry args={[0.5, 0.75, 32]} />
                    <meshStandardMaterial
                        color="#38bdf8"
                        emissive="#0284c7"
                        emissiveIntensity={0.3}
                        transparent={true}
                        opacity={0.7}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            </group>
        </Float>
    );
}

/**
 * Central Emerald Planetary System with PBR Materials & 3D Depth Rings
 */
function EmeraldPlanetarySystem({ interactionRef, shouldReduceMotion }) {
    const masterGroupRef = useRef();
    const planetMeshRef = useRef();
    const currentPointerRef = useRef({ x: 0, y: 0 });

    useFrame((_, delta) => {
        const p = interactionRef.current;
        const clampedDelta = Math.min(delta, 0.1);

        // Exponential lerp damping for pointer tracking (lambda = 6)
        const dampFactor = 1 - Math.exp(-6 * clampedDelta);
        currentPointerRef.current.x += (p.targetPointerX - currentPointerRef.current.x) * dampFactor;
        currentPointerRef.current.y += (p.targetPointerY - currentPointerRef.current.y) * dampFactor;

        // Interactive physics with momentum decay & idle orbit recovery
        if (!p.isDragging) {
            if (shouldReduceMotion) {
                p.velX = 0;
                p.velY = 0;
            } else {
                const decayFactor = 1 - Math.exp(-3 * clampedDelta);
                // Steady idle rotation target (~0.25 rad/s)
                const targetIdleVelY = 0.25 * clampedDelta;

                p.velX += (0 - p.velX) * decayFactor;
                p.velY += (targetIdleVelY - p.velY) * decayFactor;

                p.rotY += p.velY;
                p.rotX += p.velX;

                // Restrict pitch to +/- 0.55 rad to prevent flipping
                p.rotX = Math.max(-0.55, Math.min(0.55, p.rotX));
            }
        }

        // Apply orientation to group with ~18 deg axial tilt (0.32 pitch, 0.25 roll)
        if (masterGroupRef.current) {
            masterGroupRef.current.rotation.y = p.rotY + currentPointerRef.current.x * 0.18;
            masterGroupRef.current.rotation.x = 0.32 + p.rotX + currentPointerRef.current.y * 0.12;
            masterGroupRef.current.rotation.z = 0.25;
        }

        // Subtle internal spin on planet's own axis
        if (planetMeshRef.current && !shouldReduceMotion) {
            planetMeshRef.current.rotation.y += clampedDelta * 0.15;
        }
    });

    return (
        <group ref={masterGroupRef}>
            {/* Central Emerald Planet with PBR Materials */}
            <mesh ref={planetMeshRef} castShadow receiveShadow>
                <sphereGeometry args={[1.0, 64, 64]} />
                <meshPhysicalMaterial
                    color="#059669"
                    emissive="#064e3b"
                    emissiveIntensity={0.25}
                    roughness={0.22}
                    metalness={0.18}
                    clearcoat={0.65}
                    clearcoatRoughness={0.15}
                    sheen={1.0}
                    sheenColor="#6ee7b7"
                    sheenRoughness={0.25}
                />
            </mesh>

            {/* Atmospheric Rim / Fresnel Glow Layer */}
            <AtmosphericGlow />

            {/* 3D Equatorial Rings with Native Depth Buffer Occlusion */}
            <group rotation={[-Math.PI / 2, 0, 0]}>
                {/* Main Planetary Ring Disc */}
                <mesh>
                    <ringGeometry args={[1.45, 2.45, 64]} />
                    <meshStandardMaterial
                        color="#34d399"
                        emissive="#10b981"
                        emissiveIntensity={0.35}
                        roughness={0.25}
                        metalness={0.15}
                        transparent={true}
                        opacity={0.85}
                        side={THREE.DoubleSide}
                        depthWrite={true}
                    />
                </mesh>

                {/* Secondary Inner Accent Ring */}
                <mesh>
                    <ringGeometry args={[1.25, 1.38, 64]} />
                    <meshStandardMaterial
                        color="#a7f3d0"
                        emissive="#34d399"
                        emissiveIntensity={0.5}
                        roughness={0.3}
                        metalness={0.1}
                        transparent={true}
                        opacity={0.65}
                        side={THREE.DoubleSide}
                        depthWrite={true}
                    />
                </mesh>
            </group>
        </group>
    );
}

/**
 * Volumetric Star Particle System
 * Dual-region volume (near-orbit halo + deep celestial shell) with 1,200 points.
 */
function VolumetricStarfield({ count = 1200, shouldReduceMotion = false }) {
    const pointsRef = useRef();

    // 1. Generate position and vertex color buffers
    const [positions, colors] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);

        const palette = [
            new THREE.Color('#f0fdf4'), // 35% Pure starlight
            new THREE.Color('#a7f3d0'), // 25% Mint
            new THREE.Color('#34d399'), // 15% Emerald
            new THREE.Color('#2dd4bf'), // 10% Teal
            new THREE.Color('#38bdf8'), // 10% Cyan
            new THREE.Color('#c084fc'), // 5%  Violet
        ];

        for (let i = 0; i < count; i++) {
            let x, y, z;
            if (i < 400) {
                // Near-orbit halo around planet & rings (r in [2.4, 6.5])
                const r = 2.4 + Math.random() * 4.1;
                const theta = Math.random() * Math.PI * 2;
                x = Math.cos(theta) * r;
                z = Math.sin(theta) * r;
                y = (Math.random() - 0.5) * 2.2;
            } else {
                // Deep celestial spherical shell (r in [6.5, 20.0])
                const r = 6.5 + Math.pow(Math.random(), 1.4) * 13.5;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                x = r * Math.sin(phi) * Math.cos(theta);
                y = r * Math.sin(phi) * Math.sin(theta);
                z = r * Math.cos(phi);
            }

            pos[i * 3] = x;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = z;

            const rand = Math.random();
            let c;
            if (rand < 0.35) c = palette[0];
            else if (rand < 0.60) c = palette[1];
            else if (rand < 0.75) c = palette[2];
            else if (rand < 0.85) c = palette[3];
            else if (rand < 0.95) c = palette[4];
            else c = palette[5];

            col[i * 3] = c.r;
            col[i * 3 + 1] = c.g;
            col[i * 3 + 2] = c.b;
        }

        return [pos, col];
    }, [count]);

    // 2. Soft circular alpha starlight texture
    const starTexture = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);

        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        return tex;
    }, []);

    // 3. BufferGeometry
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return geo;
    }, [positions, colors]);

    useEffect(() => {
        return () => {
            geometry.dispose();
            if (starTexture) starTexture.dispose();
        };
    }, [geometry, starTexture]);

    // 4. Continuous axial drift and precession
    useFrame((state, delta) => {
        if (!pointsRef.current || shouldReduceMotion) return;
        pointsRef.current.rotation.y += delta * 0.022;
        pointsRef.current.rotation.x += delta * 0.007;
        const t = state.clock.elapsedTime;
        pointsRef.current.position.y = Math.sin(t * 0.4) * 0.08;
    });

    return (
        <points ref={pointsRef} geometry={geometry}>
            <pointsMaterial
                size={0.065}
                map={starTexture}
                sizeAttenuation={true}
                vertexColors={true}
                transparent={true}
                opacity={0.85}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
}

/**
 * Unified R3F Cosmic Scene
 */
function CosmicScene({ interactionRef, shouldReduceMotion, glRef }) {
    return (
        <>
            <SceneLifecycleTeardown glRef={glRef} />
            <CelestialLighting />
            <EmeraldPlanetarySystem
                interactionRef={interactionRef}
                shouldReduceMotion={shouldReduceMotion}
            />
            <OrbitingMoon shouldReduceMotion={shouldReduceMotion} />
            <DistantCelestialPlanet />
            <VolumetricStarfield shouldReduceMotion={shouldReduceMotion} />
        </>
    );
}

/**
 * CosmicShowcase3D Component
 * Upgraded to full React Three Fiber production 3D scene with PBR lighting,
 * 3D ring depth occlusion, volumetric starfield, and exponential pointer damping.
 */
export default function CosmicShowcase3D({
    badgeText = 'Vaultly Premium Experience',
    badgeHref = '/',
    statusText = 'Aura Green',
    welcomeTitle = 'HELLO!',
    welcomeSubtitle = 'HAVE A GOOD DAY',
    description = 'Seja bem-vindo de volta! Acesse sua conta para continuar sua jornada pelo universo digital.',
    pillTags = ['Sistema Seguro', 'Criptografia Ponta a Ponta', '24/7 Ativo'],
    interactive = true,
    className = '',
    showText = true,
    children,
}) {
    const containerRef = useRef(null);
    const glDomElementRef = useRef(null);
    const glRef = useRef(null);

    const shouldReduceMotion = useReducedMotion();

    // Hydration & WebGL Support State
    const [isMounted, setIsMounted] = useState(false);
    const [hasWebGL, setHasWebGL] = useState(true);
    const [isVisible, setIsVisible] = useState(true);
    const [isContextLost, setIsContextLost] = useState(false);
    const [canvasKey, setCanvasKey] = useState(0);

    // UI Hover / Drag state
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [cardTransform, setCardTransform] = useState('none');

    // Shared mutable interaction ref to avoid React re-renders during 60fps pointer move
    const interactionRef = useRef({
        targetPointerX: 0,
        targetPointerY: 0,
        isDragging: false,
        lastPointerX: 0,
        lastPointerY: 0,
        rotX: 0.15,
        rotY: -0.3,
        velX: 0,
        velY: 0.005,
    });

    // Hydration check
    useEffect(() => {
        setIsMounted(true);
        setHasWebGL(checkWebGLSupport());
    }, []);

    // IntersectionObserver to pause frameloop when off-screen
    useEffect(() => {
        const container = containerRef.current;
        if (!container || typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            {
                root: null,
                rootMargin: '50px',
                threshold: 0.05,
            }
        );

        observer.observe(container);

        return () => {
            observer.disconnect();
        };
    }, []);

    // Card 3D perspective tilt animation loop (disabled on mobile or reduced motion)
    useEffect(() => {
        let animId;
        let currX = 0;
        let currY = 0;

        const updateTilt = () => {
            if (typeof window !== 'undefined' && (window.innerWidth < 640 || shouldReduceMotion)) {
                setCardTransform('none');
            } else {
                const targetX = interactionRef.current.targetPointerX;
                const targetY = interactionRef.current.targetPointerY;
                currX += (targetX - currX) * 0.08;
                currY += (targetY - currY) * 0.08;
                const rotY = (currX * 5).toFixed(2);
                const rotX = (-currY * 5).toFixed(2);
                setCardTransform(`perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`);
            }
            animId = requestAnimationFrame(updateTilt);
        };

        animId = requestAnimationFrame(updateTilt);
        return () => cancelAnimationFrame(animId);
    }, [shouldReduceMotion]);

    // Canvas WebGL Context Loss Handlers
    const handleCanvasCreated = useCallback(({ gl }) => {
        const domElement = gl.domElement;
        glDomElementRef.current = domElement;

        const handleContextLost = (event) => {
            event.preventDefault();
            setIsContextLost(true);
        };

        const handleContextRestored = () => {
            setIsContextLost(false);
            setCanvasKey((prev) => prev + 1);
        };

        domElement.addEventListener('webglcontextlost', handleContextLost, false);
        domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

        domElement._cleanupContextListeners = () => {
            domElement.removeEventListener('webglcontextlost', handleContextLost);
            domElement.removeEventListener('webglcontextrestored', handleContextRestored);
        };
    }, []);

    // Cleanup context listeners on unmount
    useEffect(() => {
        return () => {
            if (glDomElementRef.current && glDomElementRef.current._cleanupContextListeners) {
                glDomElementRef.current._cleanupContextListeners();
            }
        };
    }, []);

    // Pointer Event Handlers with setPointerCapture
    const handlePointerDown = useCallback(
        (e) => {
            if (!interactive) return;
            try {
                if (e.currentTarget && typeof e.currentTarget.setPointerCapture === 'function') {
                    e.currentTarget.setPointerCapture(e.pointerId);
                }
            } catch {
                // Ignore pointer capture errors on unsupported browsers
            }

            const state = interactionRef.current;
            state.isDragging = true;
            state.lastPointerX = e.clientX;
            state.lastPointerY = e.clientY;
            state.velX = 0;
            state.velY = 0;
            setIsDragging(true);
        },
        [interactive]
    );

    const handlePointerMove = useCallback(
        (e) => {
            if (!containerRef.current || !interactive) return;
            const rect = containerRef.current.getBoundingClientRect();
            const clientX = e.clientX;
            const clientY = e.clientY;

            const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
            const ny = ((clientY - rect.top) / rect.height) * 2 - 1;

            const state = interactionRef.current;
            state.targetPointerX = Math.max(-1, Math.min(1, nx));
            state.targetPointerY = Math.max(-1, Math.min(1, ny));

            if (state.isDragging) {
                const dx = clientX - state.lastPointerX;
                const dy = clientY - state.lastPointerY;

                const sensitivity = 0.007;
                state.velY = dx * sensitivity;
                state.velX = dy * sensitivity;
                state.rotY += state.velY;
                state.rotX += state.velX;

                // Pitch clamping (+/- 0.55 rad) to prevent flipping
                state.rotX = Math.max(-0.55, Math.min(0.55, state.rotX));

                state.lastPointerX = clientX;
                state.lastPointerY = clientY;
            }
        },
        [interactive]
    );

    const handlePointerUp = useCallback((e) => {
        try {
            if (e.currentTarget && typeof e.currentTarget.releasePointerCapture === 'function' && e.pointerId) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch {
            // Ignore release pointer capture errors
        }
        interactionRef.current.isDragging = false;
        setIsDragging(false);
    }, []);

    const handlePointerLeave = useCallback(() => {
        if (!interactionRef.current.isDragging) {
            interactionRef.current.targetPointerX = 0;
            interactionRef.current.targetPointerY = 0;
            setIsHovered(false);
        }
    }, []);

    const handlePointerEnter = useCallback(() => {
        setIsHovered(true);
    }, []);

    return (
        <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerEnter={handlePointerEnter}
            style={{
                transform: cardTransform,
                transformStyle: 'preserve-3d',
                cursor: interactive ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
            className={`group relative flex h-full min-h-[460px] sm:min-h-[520px] lg:min-h-[620px] w-full flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-950 to-zinc-950 p-5 sm:p-7 lg:p-9 text-white shadow-2xl transition-transform duration-150 ease-out select-none touch-none ${className}`}
        >
            {/* Deep Space Background / Nebula Aura */}
            <div className="pointer-events-none absolute inset-0 bg-[#01140e] opacity-95" />
            <div className="pointer-events-none absolute -inset-10 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.18),transparent_70%)] blur-2xl" />

            {/* 3D WebGL Canvas Layer with Zero-CLS Fallback */}
            <div className="absolute inset-0 h-full w-full pointer-events-auto">
                {isMounted && hasWebGL && !isContextLost ? (
                    <Canvas
                        key={canvasKey}
                        camera={{
                            fov: 45,
                            near: 0.1,
                            far: 1000,
                            position: [0, 0, 8],
                        }}
                        dpr={[1, 2]}
                        gl={{
                            antialias: true,
                            alpha: true,
                            powerPreference: 'high-performance',
                            preserveDrawingBuffer: false,
                        }}
                        frameloop={isVisible ? 'always' : 'never'}
                        onCreated={handleCanvasCreated}
                        className="h-full w-full"
                    >
                        <CosmicScene
                            interactionRef={interactionRef}
                            shouldReduceMotion={shouldReduceMotion}
                            glRef={glRef}
                        />
                    </Canvas>
                ) : (
                    <CosmicFallback />
                )}
            </div>

            {/* Organic Concentric Papercut Frames (Preserved signature aperture) */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <svg
                    className="absolute inset-0 h-full w-full opacity-80 transition-opacity duration-300 group-hover:opacity-90"
                    viewBox="0 0 500 700"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id="p3dLayer1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#064e3b" stopOpacity="0.88" />
                            <stop offset="100%" stopColor="#022c22" stopOpacity="0.96" />
                        </linearGradient>
                        <linearGradient id="p3dLayer2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#047857" stopOpacity="0.75" />
                            <stop offset="100%" stopColor="#064e3b" stopOpacity="0.85" />
                        </linearGradient>
                        <linearGradient id="p3dLayer3" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#059669" stopOpacity="0.50" />
                            <stop offset="100%" stopColor="#047857" stopOpacity="0.65" />
                        </linearGradient>
                        <filter id="p3dShadow1" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#01140e" floodOpacity="0.7" />
                        </filter>
                        <filter id="p3dShadow2" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#01140e" floodOpacity="0.55" />
                        </filter>
                    </defs>

                    {/* Outer portal frame */}
                    <path
                        d="M0,0 L500,0 L500,700 L0,700 Z M40,80 C120,60 180,95 250,75 C340,50 420,90 450,160 C480,240 455,340 465,430 C475,530 435,620 360,650 C280,680 180,640 110,620 C45,600 25,510 28,420 C30,320 20,220 30,150 C33,120 35,95 40,80 Z"
                        fill="url(#p3dLayer1)"
                        fillRule="evenodd"
                        filter="url(#p3dShadow1)"
                    />
                    {/* Inner organic contour */}
                    <path
                        d="M0,0 L500,0 L500,700 L0,700 Z M75,120 C150,105 210,135 280,118 C360,98 400,150 425,210 C450,280 425,370 435,450 C445,530 385,595 320,615 C250,635 170,600 120,575 C65,550 55,470 60,395 C65,300 55,210 65,160 Z"
                        fill="url(#p3dLayer2)"
                        fillRule="evenodd"
                        filter="url(#p3dShadow2)"
                    />
                </svg>

                {/* Ambient Bottom Scrim for Text Legibility */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-emerald-950/60 to-transparent" />
            </div>

            {/* Top Bar: Brand Badge & Cosmic Status */}
            <div className="relative z-20 flex items-center justify-between" style={{ transform: 'translateZ(35px)' }}>
                <Link
                    href={badgeHref}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/70 px-4 py-1.5 text-xs font-semibold tracking-wider text-emerald-300 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-emerald-300 hover:bg-emerald-900/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                >
                    <CrownIcon className="h-4 w-4 text-emerald-400" />
                    <span>{badgeText}</span>
                </Link>

                <div className="flex items-center gap-1.5 text-emerald-300/80">
                    <SparkleIcon className="h-4 w-4 animate-spin-slow text-emerald-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest">{statusText}</span>
                </div>
            </div>

            {/* Center Hint (Shows subtly when hovering to teach user they can drag) */}
            {interactive && (
                <div
                    className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 z-10 ${
                        isHovered && !isDragging ? 'opacity-40' : 'opacity-0'
                    }`}
                >
                    <span className="rounded-full bg-emerald-950/80 px-3 py-1 text-[11px] font-medium tracking-wide text-emerald-200 border border-emerald-500/30 backdrop-blur-sm shadow-lg">
                        Gire em 3D ✦
                    </span>
                </div>
            )}

            {/* Bottom Content: Interactive 3D Parallax Typography */}
            {showText && (
                <div
                    className="relative z-20 mt-auto pt-8 transition-transform duration-200"
                    style={{ transform: 'translateZ(45px)' }}
                >
                    <div className="max-w-md space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                            {welcomeTitle}
                        </p>
                        <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                            <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent drop-shadow-sm">
                                {welcomeSubtitle}
                            </span>
                        </h1>
                        <p className="text-xs leading-relaxed text-emerald-100/80 sm:text-sm lg:text-base">
                            {description}
                        </p>
                    </div>

                    {/* Interactive Feature Tags */}
                    {pillTags && pillTags.length > 0 && (
                        <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-2">
                            {pillTags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-950/60 px-3 py-1 text-[11px] sm:text-xs font-medium text-emerald-200 shadow-sm backdrop-blur-md transition-colors hover:border-emerald-400/50 hover:bg-emerald-900/60"
                                >
                                    {idx === 0 && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    )}
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {children}
                </div>
            )}
        </div>
    );
}
