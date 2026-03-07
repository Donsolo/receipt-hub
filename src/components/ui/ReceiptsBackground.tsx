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
    mask1: 'rgba(2, 6, 23, 0.3)',
    scanLine: '#00E5FF',
    scanGlow: 'rgba(59,130,246,0.4)'
};

export default function ReceiptsBackground() {
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
        let connectionMaxDist = 200;

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
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = (Math.random() - 0.5) * 0.4;
                this.size = Math.random() * 2 + 1;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.alpha = Math.random() * 0.6 + 0.3;
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
                ctx.globalAlpha = Math.max(0, this.alpha * 0.3); // Keep ambient receipts very faint
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
                this.delay = Math.random() * 0.4;
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
            return {
                receiptX: isMobile ? w * 0.25 : w * 0.25,
                receiptY: isMobile ? h * 0.8 : h * 0.85,
                dataX: isMobile ? w * 0.75 : w * 0.75,
                dataY: isMobile ? h * 0.8 : h * 0.85
            };
        };

        const populateStream = (w: number, h: number) => {
            streamParticles = [];

            const { receiptX, receiptY, dataX, dataY } = getPositions(w, h);
            const targets: { x: number, y: number }[] = [];

            // Structured Receipt Cards Grid Pattern
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 3; col++) {
                    const cardX = dataX - 60 + col * 60;
                    const cardY = dataY - 40 + row * 80;

                    targets.push({ x: cardX, y: cardY });

                    // Add some points within the card for structure
                    for (let i = 0; i < 5; i++) {
                        targets.push({
                            x: cardX + (Math.random() - 0.5) * 40,
                            y: cardY + (Math.random() - 0.5) * 60
                        });
                    }
                }
            }

            // Scatter some ambient grid points
            for (let i = 0; i < 20; i++) {
                targets.push({
                    x: dataX + (Math.random() - 0.5) * 150,
                    y: dataY + (Math.random() - 0.5) * 150
                });
            }

            const isMobile = w < 768;
            const streamCount = isMobile ? 60 : 120; // Need more particles for cards

            for (let i = 0; i < streamCount; i++) {
                const sx = receiptX + (Math.random() - 0.5) * 80;
                const sy = receiptY + (Math.random() - 0.5) * 120;
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
                        ctx.globalAlpha = Math.min(1, (1 - dist / connectionMaxDist) * 0.5); // Fainter ambient connections
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

            // --- RECEIPTS PROCESSING SEQUENCE ---
            const cycleDuration = 15000;
            const t = performance.now() % cycleDuration;
            const cycle = Math.floor(performance.now() / cycleDuration);

            if (cycle !== currentCycle) {
                currentCycle = cycle;
                populateStream(w, h);
            }

            const { receiptX, receiptY, dataX, dataY } = getPositions(w, h);
            const isMobile = w < 768;
            const scaleFactor = isMobile ? 0.75 : 1.3;

            // Phase 1: Receipt Drift & Scan (0 - 4000ms)
            if (t > 0 && t < 4000) {
                let rAlpha = 0;
                if (t < 1000) rAlpha = t / 1000;
                else if (t < 3500) rAlpha = 1;
                else rAlpha = 1 - (t - 3500) / 500;

                if (rAlpha > 0) {
                    ctx.save();

                    // Simulate drift in from top-left slightly
                    const driftOffset = (1 - (t / 4000)) * -30;
                    ctx.translate(receiptX + driftOffset, receiptY + driftOffset);
                    ctx.scale(scaleFactor, scaleFactor);

                    // Receipt Base
                    ctx.strokeStyle = activeColors.p2;
                    ctx.globalAlpha = rAlpha * 0.8;
                    ctx.lineWidth = 2.5;
                    ctx.shadowColor = activeColors.glow;
                    ctx.shadowBlur = 10;

                    ctx.strokeRect(-40, -60, 80, 120);

                    // Mock text lines
                    ctx.beginPath();
                    // Header
                    ctx.moveTo(-25, -45); ctx.lineTo(25, -45);
                    ctx.moveTo(-25, -35); ctx.lineTo(10, -35);
                    // Items
                    ctx.moveTo(-30, -10); ctx.lineTo(-5, -10);
                    ctx.moveTo(15, -10); ctx.lineTo(30, -10);
                    ctx.moveTo(-30, 0); ctx.lineTo(0, 0);
                    ctx.moveTo(20, 0); ctx.lineTo(30, 0);
                    ctx.moveTo(-30, 10); ctx.lineTo(-10, 10);
                    ctx.moveTo(10, 10); ctx.lineTo(30, 10);
                    // Total
                    ctx.moveTo(-10, 35); ctx.lineTo(30, 35);
                    ctx.stroke();

                    // Subtle Horizontal OCR Scan Shimmer (1500ms to 2300ms)
                    if (t > 1500 && t < 2300) {
                        const scanProgress = (t - 1500) / 800; // 0 to 1 over 0.8s
                        const scanX = -50 + (scanProgress * 100); // Shimmer moves Left to Right across receipt

                        // Opacity fades smoothly at start and end of the sweep
                        const scanAlpha = Math.sin(scanProgress * Math.PI);

                        if (scanAlpha > 0.05) {
                            ctx.globalAlpha = scanAlpha;

                            // Create a thin horizontal gradient overlay moving left to right
                            // gradient is transparent -> blue glow -> transparent
                            const gradient = ctx.createLinearGradient(scanX - 15, 0, scanX + 15, 0);
                            gradient.addColorStop(0, 'rgba(0,0,0,0)');
                            gradient.addColorStop(0.5, activeColors.scanGlow);
                            gradient.addColorStop(1, 'rgba(0,0,0,0)');

                            ctx.fillStyle = gradient;
                            ctx.fillRect(scanX - 15, -60, 30, 120); // Sweep exactly across the receipt's height
                        }
                    }

                    ctx.restore();
                }
            }

            // Phase 2: Particle Dissolve & Flow (4000 - 7000ms)
            if (t > 4000 && t < 7000) {
                let progress = (t - 4000) / 3000;
                if (progress > 1) progress = 1;
                streamParticles.forEach(sp => sp.draw(ctx, progress));
            }

            // Phase 3 & 4: Data Card Formation & Fade (7000 - 15000ms)
            if (t > 7000 && t < 15000) {
                let sAlpha = 1;
                if (t < 8500) sAlpha = Math.min(1, (t - 7000) / 1500); // Fade in
                if (t > 11000) sAlpha = Math.max(0, 1 - (t - 11000) / 4000); // Super slow elegant fade out over 4 seconds

                if (sAlpha > 0) {
                    ctx.save();
                    ctx.translate(dataX, dataY);

                    const cardScale = isMobile ? 0.70 : 1.1;
                    ctx.scale(cardScale, cardScale);

                    ctx.strokeStyle = activeColors.p1;
                    ctx.globalAlpha = sAlpha * 0.9;
                    ctx.lineWidth = 2;
                    ctx.shadowColor = activeColors.glow;
                    ctx.shadowBlur = 12;

                    // Draw Structured Grid Cards
                    for (let row = 0; row < 2; row++) {
                        for (let col = 0; col < 3; col++) {
                            const cx = -60 + col * 60;
                            const cy = -40 + row * 80;

                            // Glowing Card Border
                            ctx.strokeRect(cx - 20, cy - 30, 40, 60);

                            // Mock structured data lines inside card
                            ctx.beginPath();
                            ctx.moveTo(cx - 15, cy - 20); ctx.lineTo(cx + 15, cy - 20);
                            ctx.moveTo(cx - 15, cy - 10); ctx.lineTo(cx + 5, cy - 10);

                            // Mock receipt icon
                            ctx.strokeRect(cx - 15, cy + 5, 10, 15);
                            ctx.stroke();

                            // Intense glow at center of card
                            if (t < 9500) {
                                ctx.beginPath();
                                ctx.arc(cx, cy, 3, 0, Math.PI * 2);
                                ctx.fillStyle = activeColors.p4;
                                ctx.globalAlpha = sAlpha * (1 - (t - 7000) / 2500);
                                ctx.fill();
                            }
                        }
                    }

                    ctx.restore();
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        const handleResize = () => {
            init();
        };

        window.addEventListener('resize', handleResize);
        init();
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [mounted]);

    if (!mounted) return <div className="absolute inset-0 z-0 pointer-events-none" />;

    return (
        <div
            className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden block bg-[#020617]"
        >
            <canvas
                ref={canvasRef}
                className="block w-full h-full"
                style={{ opacity: 0.9 }}
            />

            {/* Extended Gradient Masking to blend smoothly into background */}
            <div
                className="absolute inset-x-0 bottom-0 h-40 pointer-events-none transition-colors duration-300"
                style={{ background: `linear-gradient(to top, center, ${activeColors.bg}, ${activeColors.mask0})` }}
            />
        </div>
    );
}
