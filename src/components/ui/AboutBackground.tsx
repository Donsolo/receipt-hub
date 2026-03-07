"use client";

import React, { useRef, useEffect } from 'react';

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    alpha: number;
    receiptPos: { x: number; y: number };
    blockIndex: number;
};

export default function AboutBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Palettes matching exact requirements
    const darkColors = {
        bg: '#020617', // Neutral-950 roughly
        particle: '#2563EB', // Blue-600
        block: '#3B82F6', // Blue-500
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const colors = darkColors;
        let animationFrameId: number;
        let particles: Particle[] = [];
        const PARTICLE_COUNT = 100;
        const CYCLE_DURATION = 20000;
        let width = 0;
        let height = 0;

        // Grid Blocks mapping definition
        interface BlockDef {
            gx: number; // grid perfectly aligned X
            gy: number; // grid perfectly aligned Y
            sx: number; // scattered drifting X
            sy: number; // scattered drifting Y
            w: number;
            h: number;
        }
        let blocks: BlockDef[] = [];

        const init = () => {
            width = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
            height = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
            ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
            const cssW = canvas.offsetWidth;
            const cssH = canvas.offsetHeight;

            // Zones
            const receiptZone = { x: cssW * 0.15, y: cssH * 0.5, w: 100, h: 140 };
            const gridZone = { x: cssW * 0.8, y: cssH * 0.5 };

            if (window.innerWidth < 768) {
                receiptZone.x = cssW * 0.2;
                gridZone.x = cssW * 0.8;
            }

            blocks = [];
            const cols = 4;
            const rows = 3;
            const bW = 45;
            const bH = 30;
            const gX = 15;
            const gY = 15;

            const startX = gridZone.x - (cols * bW + (cols - 1) * gX) / 2 + bW / 2;
            const startY = gridZone.y - (rows * bH + (rows - 1) * gY) / 2 + bH / 2;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    blocks.push({
                        gx: startX + c * (bW + gX),
                        gy: startY + r * (bH + gY),
                        sx: cssW * 0.35 + Math.random() * (cssW * 0.45), // spread widely across middle/right
                        sy: cssH * 0.15 + Math.random() * (cssH * 0.7), // spread across 70% of the vertical height
                        w: bW,
                        h: bH
                    });
                }
            }

            particles = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                // Generate Receipt Pos (on lines of a receipt)
                let rx = receiptZone.x + (Math.random() - 0.5) * receiptZone.w;
                let ry = receiptZone.y + (Math.random() - 0.5) * receiptZone.h;
                if (Math.random() > 0.4) {
                    const lineY = Math.floor(Math.random() * 5) * 20 - 40;
                    ry = receiptZone.y + lineY;
                    rx = receiptZone.x + (Math.random() - 0.5) * receiptZone.w * 0.8;
                }

                particles.push({
                    x: rx,
                    y: ry,
                    vx: 0, vy: 0,
                    radius: Math.random() * 1.5 + 1.5,
                    color: colors.particle,
                    alpha: 0,
                    receiptPos: { x: rx, y: ry },
                    blockIndex: i % blocks.length
                });
            }
        };

        const drawReceiptOutline = (ctx: CanvasRenderingContext2D, alpha: number, x: number, y: number, w: number, h: number) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = colors.block;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
            ctx.stroke();

            // Mock text lines
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const lineY = y - 40 + i * 20;
                ctx.moveTo(x - w * 0.4, lineY);
                ctx.lineTo(x + w * 0.4 - (i % 2 === 0 ? 0 : 20), lineY);
            }
            ctx.stroke();
            ctx.restore();
        };

        let lastTime = performance.now();
        let loopTime = 0;

        const render = (time: number) => {
            const dt = time - lastTime;
            lastTime = time;
            loopTime = (loopTime + dt) % CYCLE_DURATION;

            const cssW = canvas.offsetWidth;
            const cssH = canvas.offsetHeight;

            ctx.clearRect(0, 0, cssW, cssH);

            const rZone = { x: cssW * (window.innerWidth < 768 ? 0.2 : 0.15), y: cssH * 0.5, w: 100, h: 140 };

            // Phasing mapped to user timing layout
            const p1 = loopTime < 1000; // Receipt outline appears
            const p2 = loopTime >= 1000 && loopTime < 1800; // Scan shimmer
            const p3 = loopTime >= 1800 && loopTime < 3000; // Particle dissolve
            const p4 = loopTime >= 3000 && loopTime < 4400; // Data block formation
            const p5 = loopTime >= 4400 && loopTime < 5900; // Grid organization
            const p6 = loopTime >= 5900 && loopTime < 7500; // Fade out
            const p7 = loopTime >= 7500; // Ambient

            // Calculate current positions of blocks (interpolating from scattered to organized)
            const currentBlocks = blocks.map(b => {
                let bx = b.sx;
                let by = b.sy;
                if (p5) {
                    let t = (loopTime - 4400) / 1500;
                    t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // Ease in out quad
                    bx = b.sx + (b.gx - b.sx) * t;
                    by = b.sy + (b.gy - b.sy) * t;
                } else if (p6 || p7) {
                    bx = b.gx;
                    by = b.gy;
                }
                return { ...b, x: bx, y: by };
            });

            // 1. Receipt Outline
            if (p1 || p2 || (p3 && loopTime < 2400)) {
                let alpha = 0;
                if (p1) alpha = loopTime / 1000;
                else if (p2) alpha = 1;
                else alpha = 1 - ((loopTime - 1800) / 600);
                drawReceiptOutline(ctx, alpha * 0.85, rZone.x, rZone.y, rZone.w, rZone.h);
            }

            // 2. Scan Shimmer
            if (p2) {
                const scanProgress = (loopTime - 1000) / 800;
                const scanY = rZone.y - rZone.h / 2 + scanProgress * rZone.h;

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(rZone.x - rZone.w / 2 - 10, scanY);
                ctx.lineTo(rZone.x + rZone.w / 2 + 10, scanY);
                ctx.strokeStyle = colors.particle;
                ctx.lineWidth = 2;
                ctx.shadowColor = colors.particle;
                ctx.shadowBlur = 10;
                ctx.globalAlpha = 0.9;
                ctx.stroke();

                // Trail
                ctx.fillStyle = colors.particle;
                ctx.globalAlpha = 0.15;
                ctx.shadowBlur = 0;
                ctx.fillRect(rZone.x - rZone.w / 2 - 10, scanY - 25, rZone.w + 20, 25);
                ctx.restore();
            }

            // Particle Updates
            particles.forEach((p, i) => {
                const bTarget = currentBlocks[p.blockIndex];

                if (p1 || p2) {
                    p.x = p.receiptPos.x;
                    p.y = p.receiptPos.y;
                    p.vx = (Math.random() - 0.5) * 2;
                    p.vy = (Math.random() - 0.5) * 2;
                    p.alpha = 0;
                } else if (p3) {
                    // Dissolve and fly right
                    const t = (loopTime - 1800) / 1200;
                    if (t < 0.1) p.alpha = t * 10; // pop in
                    else p.alpha = Math.min(1, p.alpha + dt * 0.005);

                    p.vx += 0.3; // slightly slower horizontal push
                    // Increase vertical dispersion so they float all over the hero area
                    p.vy += (p.vy > 0 ? Math.random() * 0.8 : -Math.random() * 0.8) + (Math.random() - 0.5) * 1.5;
                    p.x += p.vx * (dt / 16);
                    p.y += p.vy * (dt / 16);
                    p.vx *= 0.94;
                    p.vy *= 0.94;
                } else if (p4 || p5) {
                    // Seek target block
                    if (p4) {
                        const t = (loopTime - 3000) / 1400;
                        p.alpha = Math.max(0, 1 - t * 1.5); // Fade out as they become blocks
                    } else if (p5) {
                        p.alpha = 0;
                    }

                    const dx = bTarget.x - p.x;
                    const dy = bTarget.y - p.y;
                    p.vx += dx * 0.015;
                    p.vy += dy * 0.015;
                    p.vx *= 0.82;
                    p.vy *= 0.82;
                    p.x += p.vx * (dt / 16);
                    p.y += p.vy * (dt / 16);
                } else if (p6) {
                    // Revive particles as ambient drift when grid fades out
                    p.alpha = Math.min(0.2, p.alpha + dt * 0.0002);
                    p.vx += (Math.random() - 0.5) * 0.5;
                    p.vy += (Math.random() - 0.5) * 0.5;
                    p.x += p.vx * (dt / 16);
                    p.y += p.vy * (dt / 16);
                    p.vx *= 0.96;
                    p.vy *= 0.96;
                } else if (p7) {
                    // Hold ambient drift
                    p.alpha = Math.max(0.1, p.alpha - dt * 0.00005);
                    p.x += p.vx * (dt / 16) + (Math.random() - 0.5) * 0.1;
                    p.y += p.vy * (dt / 16) + (Math.random() - 0.5) * 0.1;
                    p.vx *= 0.98;
                    p.vy *= 0.98;

                    if (p.x > cssW + 10) p.x = -10;
                    if (p.x < -10) p.x = cssW + 10;
                    if (p.y > cssH + 10) p.y = -10;
                    if (p.y < -10) p.y = cssH + 10;
                }

                if (p.alpha > 0) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.alpha;
                    ctx.fill();
                }
            });

            // Draw Rectangular Blocks
            if (p4 || p5 || p6) {
                let blockAlpha = 0;
                if (p4) {
                    const t = (loopTime - 3000) / 1400;
                    blockAlpha = t; // Fade in fully
                } else if (p5) {
                    blockAlpha = 1.0; // Solidify completely
                } else if (p6) {
                    const t = (loopTime - 5900) / 1600;
                    blockAlpha = Math.max(0, 1 - t);
                }

                if (blockAlpha > 0) {
                    currentBlocks.forEach((b, idx) => {
                        ctx.save();
                        // Main block bg
                        ctx.fillStyle = colors.block;
                        ctx.globalAlpha = blockAlpha * 0.25;
                        ctx.beginPath();
                        ctx.roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 4);
                        ctx.fill();

                        // Border outline
                        ctx.globalAlpha = blockAlpha * 0.9;
                        ctx.strokeStyle = colors.block;
                        ctx.lineWidth = 1.5;
                        ctx.stroke();

                        // Internal data lines (horizontal strips)
                        ctx.globalAlpha = blockAlpha * 0.8;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        const innerPad = 8;
                        const lineCount = 3;
                        const lineSpacing = (b.h - innerPad * 2) / (lineCount - 1);
                        for (let j = 0; j < lineCount; j++) {
                            const ly = b.y - b.h / 2 + innerPad + j * lineSpacing;
                            ctx.moveTo(b.x - b.w / 2 + innerPad, ly);
                            const maxW = b.w - innerPad * 2;
                            const staticRandomW = maxW * (0.5 + 0.5 * ((idx * 7 + j * 3) % 10) / 10);
                            ctx.lineTo(b.x - b.w / 2 + innerPad + staticRandomW, ly);
                        }
                        ctx.stroke();
                        ctx.restore();
                    });
                }
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
            className="absolute inset-0 w-full h-full pointer-events-none z-0 bg-[#020617]"
        />
    );
}
