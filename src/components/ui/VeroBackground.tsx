"use client";

import React, { useEffect, useRef } from 'react';

export default function VeroBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mounted, setMounted] = React.useState(false);

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
        
        // Colors for AI Command Center
        const colors = {
            core: '#6366f1', // Indigo 500
            coreGlow: 'rgba(99, 102, 241, 0.5)',
            ring1: 'rgba(6, 182, 212, 0.4)', // Cyan
            ring2: 'rgba(168, 85, 247, 0.3)', // Purple
            dataPacket: '#22d3ee', // Cyan 400
            node: '#818cf8', // Indigo 400
            bg: '#020617' // Slate 950
        };

        let nodes: Node[] = [];
        let dataPackets: DataPacket[] = [];
        
        class Node {
            x: number;
            y: number;
            radius: number;
            angle: number;
            speed: number;
            distance: number;
            pulse: number;
            
            constructor(w: number, h: number) {
                this.angle = Math.random() * Math.PI * 2;
                this.distance = 80 + Math.random() * 300;
                this.speed = (Math.random() - 0.5) * 0.0015;
                this.x = w/2 + Math.cos(this.angle) * this.distance;
                this.y = h/2 + Math.sin(this.angle) * this.distance;
                this.radius = 1.5 + Math.random() * 2.5;
                this.pulse = Math.random() * Math.PI * 2;
            }

            update(w: number, h: number, cx: number, cy: number) {
                this.angle += this.speed;
                this.x = cx + Math.cos(this.angle) * this.distance;
                this.y = cy + Math.sin(this.angle) * this.distance;
                this.pulse += 0.05;
            }

            draw(ctx: CanvasRenderingContext2D) {
                const alpha = 0.4 + Math.sin(this.pulse) * 0.6;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = colors.node;
                ctx.globalAlpha = alpha;
                ctx.shadowColor = colors.node;
                ctx.shadowBlur = 12;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        class DataPacket {
            angle: number;
            distance: number;
            speed: number;
            size: number;
            alpha: number;
            
            constructor(distance: number) {
                this.angle = Math.random() * Math.PI * 2;
                this.distance = distance;
                this.speed = 0.008 + Math.random() * 0.015;
                this.size = 2 + Math.random() * 2;
                this.alpha = 0;
            }

            update() {
                this.angle += this.speed;
                this.alpha += 0.02;
                if (this.alpha > 1) this.alpha = 1;
            }

            draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
                const x = cx + Math.cos(this.angle) * this.distance;
                const y = cy + Math.sin(this.angle) * this.distance;
                
                ctx.beginPath();
                ctx.arc(x, y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = colors.dataPacket;
                ctx.globalAlpha = this.alpha * 0.9;
                ctx.shadowColor = colors.dataPacket;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // Tail
                ctx.beginPath();
                ctx.arc(
                    cx + Math.cos(this.angle - this.speed * 8) * this.distance, 
                    cy + Math.sin(this.angle - this.speed * 8) * this.distance, 
                    this.size * 0.6, 0, Math.PI * 2
                );
                ctx.fillStyle = colors.dataPacket;
                ctx.globalAlpha = this.alpha * 0.4;
                ctx.fill();
            }
        }

        const init = () => {
            const parent = canvas.parentElement;
            const w = canvas.width = parent ? parent.clientWidth : window.innerWidth;
            const h = canvas.height = parent ? parent.clientHeight : window.innerHeight;
            
            const isMobile = w < 768;
            const nodeCount = isMobile ? 25 : 50;

            nodes = Array.from({ length: nodeCount }, () => new Node(w, h));
            dataPackets = [
                new DataPacket(120), new DataPacket(120), new DataPacket(120),
                new DataPacket(200), new DataPacket(200),
                new DataPacket(320), new DataPacket(320), new DataPacket(320), new DataPacket(320)
            ];
        };

        const drawRings = (ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) => {
            // Inner ring
            ctx.beginPath();
            ctx.arc(cx, cy, 120, 0, Math.PI * 2);
            ctx.strokeStyle = colors.ring1;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 12]);
            ctx.lineDashOffset = -time * 15;
            ctx.globalAlpha = 0.5;
            ctx.stroke();

            // Middle ring
            ctx.beginPath();
            ctx.arc(cx, cy, 200, 0, Math.PI * 2);
            ctx.strokeStyle = colors.ring2;
            ctx.lineWidth = 2;
            ctx.setLineDash([30, 50]);
            ctx.lineDashOffset = time * 12;
            ctx.globalAlpha = 0.4;
            ctx.stroke();
            
            // Outer ring
            ctx.beginPath();
            ctx.arc(cx, cy, 320, 0, Math.PI * 2);
            ctx.strokeStyle = colors.ring1;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 6]);
            ctx.lineDashOffset = -time * 8;
            ctx.globalAlpha = 0.3;
            ctx.stroke();
            
            ctx.setLineDash([]);
        };

        const render = (time: number) => {
            const w = canvas.width;
            const h = canvas.height;
            const isMobile = w < 768;
            const cx = isMobile ? w * 0.5 : w * 0.75; // Center on mobile, right on desktop
            const cy = isMobile ? h * 0.4 : h * 0.5;
            const t = time * 0.001;

            ctx.clearRect(0, 0, w, h);
            
            // Subtle animated background gradient
            const bgGrad = ctx.createLinearGradient(0, 0, w, h);
            bgGrad.addColorStop(0, '#020617');
            bgGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);

            ctx.globalCompositeOperation = 'lighter';

            // Draw connecting lines from core to nodes
            nodes.forEach(node => {
                node.update(w, h, cx, cy);
                
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(node.x, node.y);
                
                // Add gradient to the lines so they fade from core to node
                const lineGrad = ctx.createLinearGradient(cx, cy, node.x, node.y);
                lineGrad.addColorStop(0, colors.coreGlow);
                lineGrad.addColorStop(1, 'transparent');
                
                ctx.strokeStyle = lineGrad;
                
                // Fade out lines based on distance
                const distRatio = 1 - Math.min(1, node.distance / 500);
                ctx.globalAlpha = distRatio * 0.6;
                ctx.lineWidth = 1;
                ctx.stroke();
                
                node.draw(ctx);
            });

            // Draw rotating data rings
            drawRings(ctx, cx, cy, t);

            // Draw data packets traveling on rings
            dataPackets.forEach(packet => {
                packet.update();
                packet.draw(ctx, cx, cy);
            });

            // Draw Central AI Core
            ctx.globalCompositeOperation = 'source-over';
            
            // Core Outer Glow
            const corePulse = 1 + Math.sin(t * 2) * 0.15;
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90 * corePulse);
            gradient.addColorStop(0, colors.coreGlow);
            gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.1)'); // Cyan tint mid
            gradient.addColorStop(1, 'transparent');
            
            ctx.beginPath();
            ctx.arc(cx, cy, 90 * corePulse, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.globalAlpha = 1;
            ctx.fill();

            ctx.globalCompositeOperation = 'lighter';

            // Core Solid Center
            ctx.beginPath();
            ctx.arc(cx, cy, 25 * corePulse, 0, Math.PI * 2);
            ctx.fillStyle = colors.core;
            ctx.shadowColor = colors.dataPacket;
            ctx.shadowBlur = 25;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Hexagon surrounding core
            ctx.beginPath();
            for(let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 + t * 0.4;
                const x = cx + Math.cos(angle) * 45 * corePulse;
                const y = cy + Math.sin(angle) * 45 * corePulse;
                if(i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = colors.dataPacket;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.2; // Shimmer
            ctx.stroke();

            // Inner Hexagon (rotating opposite)
            ctx.beginPath();
            for(let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 - t * 0.6;
                const x = cx + Math.cos(angle) * 35 * corePulse;
                const y = cy + Math.sin(angle) * 35 * corePulse;
                if(i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = colors.ring2;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.7;
            ctx.stroke();

            animationFrameId = requestAnimationFrame(render);
        };

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
                init();
            }, 100);
        };

        window.addEventListener('resize', handleResize);
        
        // Initial setup
        const canvasEl = canvasRef.current;
        const parent = canvasEl.parentElement;
        const dpr = window.devicePixelRatio || 1;
        if(parent) {
            canvasEl.width = parent.clientWidth * dpr;
            canvasEl.height = parent.clientHeight * dpr;
            canvasEl.style.width = `${parent.clientWidth}px`;
            canvasEl.style.height = `${parent.clientHeight}px`;
            ctx.scale(dpr, dpr);
        }
        
        init();
        animationFrameId = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
            cancelAnimationFrame(animationFrameId);
        };
    }, [mounted]);

    if (!mounted) return <div className="absolute inset-0 z-0 pointer-events-none bg-[#020617]" />;

    return (
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden bg-[#020617]" aria-hidden="true">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block dark:brightness-[1.2] brightness-110" />
            <div className="absolute inset-0 transition-colors duration-300" style={{ background: `linear-gradient(to right, rgba(2, 6, 23, 0.9) 0%, rgba(2, 6, 23, 0.4) 50%, rgba(2, 6, 23, 0.1) 100%)` }} />
        </div>
    );
}
