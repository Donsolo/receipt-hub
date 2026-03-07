"use client";

import React, { useEffect, useRef } from 'react';

const DARK_COLORS = {
    bg: '#020617',
    grid: 'rgba(37, 99, 235, 0.12)',
    line: 'rgba(37, 99, 235, 0.2)',
    p1: '#2563EB', // Blue 600
    p2: '#3B82F6', // Blue 500
    p3: '#6366F1', // Indigo 500
    glow: 'rgba(59, 130, 246, 0.6)',
    packet: '#6366F1',
    mask0: 'rgba(2, 6, 23, 0)',
    mask1: 'rgba(2, 6, 23, 0.4)',
};

export default function MessagesBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mounted, setMounted] = React.useState(false);
    const activeColors = DARK_COLORS;
    const activeColorsArray = [activeColors.p1, activeColors.p2, activeColors.p3];

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
        let nodes: Node[] = [];
        let packets: MessagePacket[] = [];
        let bubbles: MessageBubble[] = [];
        let frameCount = 0;

        class Node {
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
                this.vx = (Math.random() - 0.5) * 0.15;
                this.vy = (Math.random() - 0.5) * 0.15;
                this.size = Math.random() * 2 + 2;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.alpha = Math.random() * 0.4 + 0.2;
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
                ctx.globalAlpha = this.alpha;
                ctx.fill();

                if (this.size > 3) {
                    ctx.shadowColor = this.color;
                    ctx.shadowBlur = 8;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }

        const easeInOutCubic = (x: number): number => {
            return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        };

        class MessagePacket {
            startX: number;
            startY: number;
            targetNode: Node;
            controlX: number;
            controlY: number;
            progress: number = 0;
            speed: number = 0.012; // ~1 second @ 60fps
            color: string;
            active: boolean = true;

            constructor(sx: number, sy: number, target: Node, w: number, h: number, color: string) {
                this.startX = sx;
                this.startY = sy;
                this.targetNode = target;

                const midX = (sx + target.x) / 2;
                const midY = (sy + target.y) / 2;
                this.controlX = midX + (Math.random() - 0.5) * w * 0.3;
                this.controlY = midY - h * 0.2 + (Math.random() - 0.5) * h * 0.2;
                this.color = color;
            }

            update() {
                this.progress += this.speed;
                if (this.progress >= 1) {
                    this.active = false;
                    // Trigger bubble formation at destination
                    bubbles.push(new MessageBubble(this.targetNode.x, this.targetNode.y, this.color));
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                const p = easeInOutCubic(this.progress);
                const x = Math.pow(1 - p, 2) * this.startX + 2 * (1 - p) * p * this.controlX + Math.pow(p, 2) * this.targetNode.x;
                const y = Math.pow(1 - p, 2) * this.startY + 2 * (1 - p) * p * this.controlY + Math.pow(p, 2) * this.targetNode.y;

                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.globalAlpha = Math.sin(p * Math.PI) * 0.8;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        class MessageBubble {
            x: number;
            y: number;
            color: string;
            progress: number = 0;
            phase: 'forming' | 'dissolving' = 'forming';
            active: boolean = true;

            constructor(x: number, y: number, color: string) {
                this.x = x;
                this.y = y;
                this.color = color;
            }

            update() {
                if (this.phase === 'forming') {
                    this.progress += 0.014; // ~1.2 seconds
                    if (this.progress >= 1) {
                        this.progress = 1;
                        this.phase = 'dissolving';
                    }
                } else {
                    this.progress -= 0.02; // ~0.8 seconds
                    if (this.progress <= 0) {
                        this.active = false;
                    }
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                const alpha = this.phase === 'forming' ? this.progress : this.progress;
                const scale = 0.5 + (this.phase === 'forming' ? easeInOutCubic(this.progress) * 0.5 : 0.5 + (1 - this.progress) * 0.2);

                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.scale(scale, scale);

                // Draw rounded bubble outline
                const w = 40;
                const h = 30;
                const r = 8;

                ctx.beginPath();
                ctx.moveTo(-w / 2 + r, -h / 2);
                ctx.lineTo(w / 2 - r, -h / 2);
                ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
                ctx.lineTo(w / 2, h / 2 - r);
                ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
                ctx.lineTo(-w / 2 + r + 8, h / 2);
                ctx.lineTo(-w / 2 + 2, h / 2 + 6);
                ctx.lineTo(-w / 2 + r, h / 2 - 2);
                ctx.lineTo(-w / 2 + r, -h / 2 + r);
                ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

                ctx.strokeStyle = this.color;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = alpha * 0.4;
                ctx.stroke();

                // Draw subtle lock icon outline
                if (alpha > 0.5) {
                    ctx.beginPath();
                    ctx.rect(-6, -2, 12, 10);
                    ctx.moveTo(-4, -2);
                    ctx.arc(0, -2, 4, Math.PI, 0);
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = (alpha - 0.5) * 0.6;
                    ctx.stroke();
                }

                ctx.restore();
            }
        }

        const init = () => {
            const parent = canvas.parentElement;
            const w = canvas.width = parent ? parent.clientWidth : window.innerWidth;
            const h = canvas.height = parent ? parent.clientHeight : window.innerHeight;

            const isMobile = w < 768;
            const nodeCount = isMobile ? 25 : 45;
            nodes = Array.from({ length: nodeCount }, () => new Node(w, h, activeColorsArray));
            packets = [];
            bubbles = [];
        };

        const drawGrid = (w: number, h: number) => {
            ctx.strokeStyle = activeColors.grid;
            ctx.lineWidth = 1;
            const step = 90;
            for (let x = 0; x < w; x += step) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let y = 0; y < h; y += step) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }
        };

        const render = () => {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            drawGrid(w, h);

            ctx.globalCompositeOperation = 'lighter';

            // Draw connections sparingly
            ctx.lineWidth = 1;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const n1 = nodes[i];
                    const n2 = nodes[j];
                    const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(n1.x, n1.y);
                        ctx.lineTo(n2.x, n2.y);
                        ctx.strokeStyle = n1.color;
                        ctx.globalAlpha = (1 - dist / 150) * 0.2;
                        ctx.stroke();
                    }
                }
            }

            nodes.forEach(n => {
                n.update(w, h);
                n.draw(ctx);
            });

            // Trigger message events every 12s loop (approximated by frame count or performance.now)
            // Stagger multiple events
            if (frameCount % 180 === 0 && nodes.length > 2) {
                // Pick random nodes near edges
                const source = nodes[Math.floor(Math.random() * nodes.length)];
                const target = nodes[Math.floor(Math.random() * nodes.length)];

                if (source !== target && (source.x < w * 0.3 || source.x > w * 0.7)) {
                    packets.push(new MessagePacket(source.x, source.y, target, w, h, source.color));
                }
            }

            packets.forEach(p => {
                p.update();
                p.draw(ctx);
            });
            packets = packets.filter(p => p.active);

            bubbles.forEach(b => {
                b.update();
                b.draw(ctx);
            });
            bubbles = bubbles.filter(b => b.active);

            // Center Clear Mask
            const centerX = w / 2;
            const centerY = h / 2;
            ctx.globalCompositeOperation = 'destination-out';
            const radialGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(w, h) * 0.45);
            radialGrad.addColorStop(0, 'rgba(0,0,0,0.8)');
            radialGrad.addColorStop(0.6, 'rgba(0,0,0,0.2)');
            radialGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = radialGrad;
            ctx.fillRect(0, 0, w, h);

            frameCount++;
            animationFrameId = requestAnimationFrame(render);
        };

        const handleResize = () => init();
        window.addEventListener('resize', handleResize);
        init();
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [mounted]);

    if (!mounted) return <div className="absolute inset-0 z-0 pointer-events-none" />;

    return (
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden block bg-[#020617]">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
            <div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, ${activeColors.mask0} 0%, ${activeColors.mask1} 70%)` }} />
        </div>
    );
}
