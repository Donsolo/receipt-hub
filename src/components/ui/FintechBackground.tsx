"use client";

import React, { useEffect, useRef } from 'react';

const DARK_COLORS = {
    bg: '#020617',
    grid: 'rgba(0, 229, 255, 0.15)',
    line: 'rgba(0, 229, 255, 0.3)',
    p1: '#00E5FF',
    p2: '#2979FF',
    p3: '#7C4DFF',
    p4: '#00B0FF',
    receipt: '#00E5FF',
    glow: 'rgba(0, 229, 255, 0.9)',
    mask0: 'rgba(2, 6, 23, 0)',
    mask1: 'rgba(2, 6, 23, 0.3)'
};

export default function FintechBackground({ isDashboard = false }: { isDashboard?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mounted, setMounted] = React.useState(false);
    const activeColors = DARK_COLORS;
    const activeColorsArray = [activeColors.p1, activeColors.p2, activeColors.p3, activeColors.p4];

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let receipts: ReceiptOutline[] = [];

        let currentParticleCount = 40;
        let connectionMaxDist = 200; // Increased distance

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            alpha: number;

            constructor(w: number, h: number, colors: string[]) {
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.vx = (Math.random() - 0.5) * 0.4; // Slightly faster
                this.vy = (Math.random() - 0.5) * 0.4;
                this.size = Math.random() * 2 + 1;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.alpha = Math.random() * 0.6 + 0.3; // More opaque
            }

            update(w: number, h: number) {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > w) this.vx *= -1;
                if (this.y < 0 || this.y > h) this.vy *= -1;
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.globalAlpha = Math.min(1, this.alpha * 1.5);
                ctx.fill();
            }
        }

        class ReceiptOutline {
            x: number;
            y: number;
            w: number;
            h: number;
            alpha: number;
            fadeSpeed: number;
            rotation: number;
            rotationSpeed: number;

            constructor(canvasW: number, canvasH: number) {
                this.x = Math.random() * canvasW;
                this.y = Math.random() * canvasH;
                this.w = 50 + Math.random() * 50;
                this.h = 70 + Math.random() * 50;
                this.alpha = 0;
                this.fadeSpeed = 0.001 + Math.random() * 0.002;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.001;
            }

            update() {
                this.alpha += this.fadeSpeed;
                this.rotation += this.rotationSpeed;
                if (this.alpha > 0.2 || this.alpha < 0) this.fadeSpeed *= -1;
            }

            draw(ctx: CanvasRenderingContext2D, receiptColor: string) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.strokeStyle = receiptColor;
                ctx.globalAlpha = Math.max(0, this.alpha);
                ctx.lineWidth = 1;
                ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);

                ctx.beginPath();
                ctx.moveTo(-this.w / 2 + 12, -this.h / 2 + 15);
                ctx.lineTo(this.w / 2 - 12, -this.h / 2 + 15);
                ctx.moveTo(-this.w / 2 + 12, -this.h / 2 + 25);
                ctx.lineTo(this.w / 2 - 25, -this.h / 2 + 25);
                ctx.stroke();
                ctx.restore();
            }
        }

        const easeInOutCubic = (x: number): number => {
            return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        };

        class StreamParticle {
            startX: number;
            startY: number;
            targetX: number;
            targetY: number;
            controlX: number;
            controlY: number;
            color: string;
            size: number;
            delay: number;

            constructor(sx: number, sy: number, tx: number, ty: number, w: number, h: number, colors: string[]) {
                this.startX = sx;
                this.startY = sy;
                this.targetX = tx;
                this.targetY = ty;
                const midX = (sx + tx) / 2;
                const midY = (sy + ty) / 2;
                this.controlX = midX + (Math.random() - 0.5) * w * 0.4;
                this.controlY = midY - h * 0.2 + (Math.random() - 0.5) * h * 0.4;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.size = Math.random() * 2 + 1;
                this.delay = Math.random() * 0.4; // 0 to 0.4 stagger
            }

            draw(ctx: CanvasRenderingContext2D, progress: number) {
                let p = (progress - this.delay) / (1 - this.delay);
                if (p < 0 || p > 1) return;

                p = easeInOutCubic(p);

                const x = Math.pow(1 - p, 2) * this.startX + 2 * (1 - p) * p * this.controlX + Math.pow(p, 2) * this.targetX;
                const y = Math.pow(1 - p, 2) * this.startY + 2 * (1 - p) * p * this.controlY + Math.pow(p, 2) * this.targetY;

                const alpha = Math.sin(p * Math.PI) * 0.8;

                if (alpha > 0.05) {
                    ctx.beginPath();
                    ctx.arc(x, y, this.size, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    ctx.globalAlpha = Math.min(1, alpha * 1.8);
                    ctx.fill();

                    // Add subtle glow to intense particles
                    if (this.size > 2) {
                        ctx.shadowColor = this.color;
                        ctx.shadowBlur = 12;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }
                }
            }
        }

        let streamParticles: StreamParticle[] = [];
        let currentCycle = -1;

        const getPositions = (w: number, h: number) => {
            const isMobile = w < 768;
            if (isDashboard) {
                return {
                    receiptX: isMobile ? w * 0.25 : w * 0.2,
                    receiptY: h * 0.5,
                    dataX: isMobile ? w * 0.75 : w * 0.8,
                    dataY: h * 0.5
                };
            }
            return {
                receiptX: isMobile ? w * 0.25 : w * 0.2,
                receiptY: isMobile ? h * 0.8 : h * 0.85,
                dataX: isMobile ? w * 0.75 : w * 0.8,
                dataY: isMobile ? h * 0.8 : h * 0.85
            };
        };

        const populateStream = (w: number, h: number) => {
            streamParticles = [];

            const { receiptX, receiptY, dataX, dataY } = getPositions(w, h);

            const targets: { x: number, y: number }[] = [];

            // Bar chart formation points
            for (let i = 0; i < 3; i++) {
                targets.push({ x: dataX - 40 + i * 30, y: dataY + 30 });
                targets.push({ x: dataX - 40 + i * 30, y: dataY - 10 - i * 15 });
            }
            // Line chart formation points
            targets.push({ x: dataX - 50, y: dataY + 80 });
            targets.push({ x: dataX - 20, y: dataY + 50 });
            targets.push({ x: dataX + 20, y: dataY + 90 });
            targets.push({ x: dataX + 50, y: dataY + 40 });

            // Random grid points
            for (let i = 0; i < 30; i++) {
                targets.push({
                    x: dataX + (Math.random() - 0.5) * 120,
                    y: dataY + (Math.random() - 0.5) * 120
                });
            }

            const isMobile = w < 768;
            const streamCount = isMobile ? 30 : 70;

            for (let i = 0; i < streamCount; i++) {
                const sx = receiptX + (Math.random() - 0.5) * 60;
                const sy = receiptY + (Math.random() - 0.5) * 100;
                const target = targets[i % targets.length];
                const tx = target.x + (Math.random() - 0.5) * 8;
                const ty = target.y + (Math.random() - 0.5) * 8;
                streamParticles.push(new StreamParticle(sx, sy, tx, ty, w, h, activeColorsArray));
            }
        };

        const init = () => {
            const parent = canvas.parentElement;
            const w = canvas.width = parent ? parent.clientWidth : window.innerWidth;
            const h = canvas.height = parent ? parent.clientHeight : window.innerHeight;

            const isMobile = w < 768;
            currentParticleCount = isMobile ? 20 : 40;
            connectionMaxDist = isMobile ? 120 : 200;

            particles = Array.from({ length: currentParticleCount }, () => new Particle(w, h, activeColorsArray));
            receipts = Array.from({ length: 6 }, () => new ReceiptOutline(w, h));
            currentCycle = -1; // Force repopulation on resize
        };

        const drawGrid = (w: number, h: number, gridColor: string) => {
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            const step = 80;

            for (let x = 0; x < w; x += step) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 0; y < h; y += step) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
        };

        const render = () => {
            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);

            drawGrid(w, h, activeColors.grid);

            ctx.globalCompositeOperation = 'lighter';

            // Ambient connections
            ctx.lineWidth = 1;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const p1 = particles[i];
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionMaxDist) {
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = p1.color;
                        ctx.globalAlpha = Math.min(1, (1 - dist / connectionMaxDist) * 0.75); // Vivid connections
                        ctx.stroke();
                    }
                }
            }

            // Ambient particles
            particles.forEach(p => {
                p.update(w, h);
                p.draw(ctx);
            });

            // Ambient floating receipts
            receipts.forEach(r => {
                r.update();
                r.draw(ctx, activeColors.receipt);
            });

            // --- DATA STREAM SEQUENCE ---
            const cycleDuration = 12000;
            const t = performance.now() % cycleDuration;
            const cycle = Math.floor(performance.now() / cycleDuration);

            if (cycle !== currentCycle) {
                currentCycle = cycle;
                populateStream(w, h);
            }

            const { receiptX, receiptY, dataX, dataY } = getPositions(w, h);

            // Phase 1: Receipt Appearance & Dissolve (0 - 1200ms)
            if (t > 0 && t < 1200) {
                let rAlpha = 0;
                if (t < 800) rAlpha = t / 800;
                else rAlpha = 1 - (t - 800) / 400;

                if (rAlpha > 0) {
                    ctx.save();
                    ctx.translate(receiptX, receiptY);
                    const isMobile = w < 768;
                    const scaleFactor = isMobile ? 0.75 : 1.3;
                    ctx.scale(scaleFactor, scaleFactor); // Bigger on desktop, scaled down on mobile
                    ctx.strokeStyle = activeColors.p4; // Lighter color
                    ctx.globalAlpha = rAlpha * 0.9; // Brighter
                    ctx.lineWidth = 2.5; // Thicker
                    ctx.shadowColor = activeColors.glow;
                    ctx.shadowBlur = 15;

                    ctx.strokeRect(-30, -50, 60, 100);
                    ctx.beginPath();
                    ctx.moveTo(-20, -35); ctx.lineTo(20, -35);
                    ctx.moveTo(-20, -20); ctx.lineTo(10, -20);
                    ctx.moveTo(-20, -5); ctx.lineTo(20, -5);
                    ctx.stroke();

                    ctx.restore();
                }
            }

            // Phase 2: Particle Flow (800 - 2000ms)
            // Progress goes from 0 to 1 over 1200ms
            if (t > 800 && t < 2200) {
                let progress = (t - 800) / 1200;
                if (progress > 1) progress = 1;
                streamParticles.forEach(sp => sp.draw(ctx, progress));
            }

            // Phase 3 & 4: Data Shapes Formation & Fade (2000 - 4500ms)
            if (t > 2000 && t < 4500) {
                let sAlpha = 1;
                if (t < 2500) sAlpha = Math.min(1, (t - 2000) / 500); // Fade in
                if (t > 3500) sAlpha = Math.max(0, 1 - (t - 3500) / 1000); // Fade out

                if (sAlpha > 0) {
                    ctx.save();
                    ctx.translate(dataX, dataY);
                    const isMobile = w < 768;
                    const scaleFactor = isMobile ? 0.70 : 1.3;
                    ctx.scale(scaleFactor, scaleFactor); // Bigger on desktop, smaller on mobile
                    ctx.strokeStyle = activeColors.p2; // Lighter color
                    ctx.globalAlpha = sAlpha * 0.95; // Brighter
                    ctx.lineWidth = 3; // Thicker
                    ctx.shadowColor = activeColors.glow;
                    ctx.shadowBlur = 18;

                    // Bar chart
                    const bars = [30, 50, 25];
                    bars.forEach((barH, i) => {
                        ctx.strokeRect(-50 + i * 25, 20 - barH, 12, barH);
                    });

                    // Line chart
                    ctx.beginPath();
                    ctx.moveTo(-50, 70);
                    ctx.lineTo(-20, 50);
                    ctx.lineTo(20, 80);
                    ctx.lineTo(50, 30);
                    ctx.stroke();

                    // Grid card / Data Panel
                    ctx.globalAlpha = sAlpha * 0.7; // Brighter
                    ctx.lineWidth = 2; // Thicker
                    ctx.strokeRect(10, -40, 50, 40);
                    ctx.beginPath();
                    ctx.moveTo(10, -25); ctx.lineTo(60, -25);
                    ctx.moveTo(10, -10); ctx.lineTo(60, -10);
                    ctx.moveTo(25, -40); ctx.lineTo(25, 0);
                    ctx.moveTo(40, -40); ctx.lineTo(40, 0);
                    ctx.stroke();

                    ctx.restore();
                }
            }

            // Center Clear Mask migrated to native CSS wrapper below for var() support

            animationFrameId = requestAnimationFrame(render);
        };

        // Modified handleResize logic from the provided snippet
        let timeoutId: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const parent = canvas.parentElement;
                if (!parent) return;

                const dpr = window.devicePixelRatio || 1;
                canvas.width = parent.clientWidth * dpr;
                canvas.height = parent.clientHeight * dpr;
                canvas.style.width = `${parent.clientWidth}px`;
                canvas.style.height = `${parent.clientHeight}px`;

                const ctx = canvas.getContext('2d');
                if (ctx) ctx.scale(dpr, dpr);

                // Re-initialize particles and stream on resize
                init();
            }, 100);
        };

        window.addEventListener('resize', handleResize);
        init();
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId); // Clear timeout on unmount
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isDashboard, mounted]); // Removed theme dependency

    if (!mounted) return <div className="absolute inset-0 z-0 pointer-events-none" />;

    return (
        <div
            className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden block bg-[#020617]"
            aria-hidden="true"
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full block dark:brightness-[2.5] dark:contrast-[1.5] brightness-110 contrast-110"
            />
            {/* Native CSS Radial Gradient Mask for seamless theme switching */}
            {!isDashboard && (
                <div
                    className="absolute inset-0 transition-colors duration-300"
                    style={{ background: `radial-gradient(circle at center, ${activeColors.mask0} 0%, ${activeColors.mask1} 70%)` }}
                />
            )}
        </div>
    );
}
