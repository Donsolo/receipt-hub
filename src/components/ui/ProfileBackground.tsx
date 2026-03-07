"use client";

import React, { useRef, useEffect } from 'react';

// ----------------------------------------------------------------------
// TYPES & PHYSICS CONSTANTS
// ----------------------------------------------------------------------

type Particle = {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    vx: number;
    vy: number;
    radius: number;
    alpha: number;
    color: string;
    targetX: number | null;
    targetY: number | null;
};

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export default function ProfileBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Dark Mode Palette
    const darkColors = {
        bg: '#171717', // Neutral-900 (Dashboard BG)
        node: '#2563EB', // Blue-600
        particleFast: '#6366F1', // Indigo-500
        particleSlow: '#3B82F6', // Blue-500
        ring: '#6366F1', // Indigo-500
        checkmark: '#3B82F6', // Blue-500
        glow: 'rgba(59, 130, 246, 0.4)', // Blue-500 glow
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const colors = darkColors;
        const PARTICLE_COUNT = typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : 80;

        let animationFrameId: number;
        let width = 0;
        let height = 0;

        let particles: Particle[] = [];
        let identityNode = { x: 0, y: 0, radius: 12, glowRadius: 0 };

        // Orchestration State (5s cycle)
        // 0-1s: Particles converge towards Identity Node (starts immediately)
        // 1-3s: Verification Ring expands & Node pulses
        // 3-4s: Particles disperse back to ambient
        // 4-5s: Ambient drift
        let cycleTimer = 0;
        const CYCLE_DURATION = 5000;

        // --------------------------------------------------------------------------
        // INITIALIZATION
        // --------------------------------------------------------------------------

        const init = () => {
            width = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
            height = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
            ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
            const cssWidth = canvas.offsetWidth;
            const cssHeight = canvas.offsetHeight;

            // Positioning: Center-Right. (Adjusted for mobile)
            identityNode = {
                x: window.innerWidth < 768 ? cssWidth * 0.8 : cssWidth * 0.75,
                y: window.innerWidth < 768 ? cssHeight * 0.35 : cssHeight * 0.5,
                radius: window.innerWidth < 768 ? 10 : 14,
                glowRadius: 0
            };

            particles = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const isFast = Math.random() > 0.7;
                particles.push({
                    x: Math.random() * cssWidth,
                    y: Math.random() * cssHeight,
                    baseX: Math.random() * cssWidth,
                    baseY: Math.random() * cssHeight,
                    vx: (Math.random() - 0.5) * (isFast ? 0.8 : 0.3),
                    vy: (Math.random() - 0.5) * (isFast ? 0.8 : 0.3),
                    radius: Math.random() * 1.5 + 0.5,
                    alpha: Math.random() * 0.5 + 0.1,
                    color: isFast ? colors.particleFast : colors.particleSlow,
                    targetX: null,
                    targetY: null,
                });
            }
        };

        // --------------------------------------------------------------------------
        // RENDER LOOP
        // --------------------------------------------------------------------------

        let lastTime = performance.now();

        const render = (time: number) => {
            const dt = time - lastTime;
            lastTime = time;
            cycleTimer = (cycleTimer + dt) % CYCLE_DURATION;

            const cssWidth = canvas.offsetWidth;
            const cssHeight = canvas.offsetHeight;

            // Clear Background
            ctx.clearRect(0, 0, cssWidth, cssHeight);

            // Determine Cycle Phase
            const isConverging = cycleTimer < 1000;
            const isVerifying = cycleTimer >= 1000 && cycleTimer < 3000; // Ring + Checkmark
            const isDispersing = cycleTimer >= 3000 && cycleTimer < 4000;
            const isAmbient = cycleTimer >= 4000;

            // 1. Update & Draw Ambient Particles
            particles.forEach((p) => {

                if (isConverging) {
                    // Pull towards Node (leaving a small gap)
                    const dx = identityNode.x - p.x;
                    const dy = identityNode.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const targetRadius = identityNode.radius * 2 + Math.random() * 40; // Form a halo

                    if (dist > targetRadius) {
                        p.vx += (dx / dist) * 0.15;
                        p.vy += (dy / dist) * 0.15;
                    }
                    // Add friction
                    p.vx *= 0.92;
                    p.vy *= 0.92;

                } else if (isDispersing) {
                    // Push away from Node gently if they are close
                    const dx = p.x - identityNode.x;
                    const dy = p.y - identityNode.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 250) {
                        p.vx += (dx / dist) * 0.06;
                        p.vy += (dy / dist) * 0.06;
                    }
                    // Restore to ambient speed
                    p.x += p.vx;
                    p.y += p.vy;

                } else {
                    // Ambient Drift
                    p.x += p.vx;
                    p.y += p.vy;

                    // Wrap around
                    if (p.x < 0) p.x = cssWidth;
                    if (p.x > cssWidth) p.x = 0;
                    if (p.y < 0) p.y = cssHeight;
                    if (p.y > cssHeight) p.y = 0;
                }

                // Draw Particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.fill();
            });

            // 1.5 Draw Fancy Network Lines
            ctx.lineWidth = window.devicePixelRatio > 1 ? 0.5 : 1;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 15000) { // Math.sqrt(15000) ~= 122px
                        const dist = Math.sqrt(distSq);
                        const alpha = (1 - dist / 122) * 0.3 * particles[i].alpha;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
                        ctx.stroke();
                    }
                }
            }

            // 2. Center Text Calm Area Masking (Dim connections in the center)
            const centerMaskRadius = window.innerWidth < 768 ? 120 : 250;
            const centerX = cssWidth * 0.5; // Always center of screen

            // 3. Draw Identity Node
            ctx.globalAlpha = 1;

            // Verification Effects (Ring and Glow)
            let ringRadius = 0;
            let ringAlpha = 0;
            let showCheckmark = false;

            if (isVerifying) {
                const verifyProgress = (cycleTimer - 1000) / 2000; // 0 to 1 over 2s

                // Ring Expansion (0-1s)
                if (verifyProgress < 0.5) {
                    const ringProg = verifyProgress * 2; // scale to 0-1
                    ringRadius = identityNode.radius + (ringProg * 60); // expand outward
                    ringAlpha = 1 - Math.pow(ringProg, 2); // fade out
                }

                // Node Pulse & Glow
                identityNode.glowRadius = Math.sin(verifyProgress * Math.PI) * 15;

                // Checkmark timing
                if (verifyProgress > 0.1 && verifyProgress < 0.9) {
                    showCheckmark = true;
                }
            } else {
                identityNode.glowRadius = 0;
            }

            // Draw Node Glow
            if (identityNode.glowRadius > 0) {
                const gradient = ctx.createRadialGradient(
                    identityNode.x, identityNode.y, identityNode.radius,
                    identityNode.x, identityNode.y, identityNode.radius + identityNode.glowRadius + 10
                );
                gradient.addColorStop(0, colors.glow);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');

                ctx.beginPath();
                ctx.arc(identityNode.x, identityNode.y, identityNode.radius + identityNode.glowRadius + 10, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            // Draw Verification Ring
            if (ringRadius > 0 && ringAlpha > 0) {
                ctx.beginPath();
                ctx.arc(identityNode.x, identityNode.y, ringRadius, 0, Math.PI * 2);
                ctx.strokeStyle = colors.ring;
                ctx.lineWidth = 2;
                ctx.globalAlpha = ringAlpha;
                ctx.stroke();
            }

            // Draw Core Identity Node
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(identityNode.x, identityNode.y, identityNode.radius, 0, Math.PI * 2);
            ctx.fillStyle = showCheckmark ? colors.checkmark : colors.node;
            ctx.fill();

            // Draw Checkmark
            if (showCheckmark) {
                const verifyProgress = (cycleTimer - 1000) / 2000;
                // Fade in early, out late
                let checkAlpha = 1;
                if (verifyProgress < 0.2) checkAlpha = (verifyProgress - 0.1) * 10;
                if (verifyProgress > 0.8) checkAlpha = 1 - ((verifyProgress - 0.8) * 10);

                ctx.globalAlpha = Math.max(0, Math.min(1, checkAlpha));

                ctx.beginPath();
                // Simple Path2D Checkmark centered on node
                ctx.moveTo(identityNode.x - 4, identityNode.y);
                ctx.lineTo(identityNode.x - 1, identityNode.y + 4);
                ctx.lineTo(identityNode.x + 5, identityNode.y - 3);

                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        init();
        const handleResize = () => init();
        window.addEventListener('resize', handleResize);

        lastTime = performance.now();
        render(lastTime);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0 block bg-[#020617]"
            style={{ opacity: 1 }}
        />
    );
}
