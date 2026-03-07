"use client";

import React, { useEffect, useRef } from 'react';

const DARK_COLORS = {
    bg: '#020617',
    grid: 'rgba(37, 99, 235, 0.15)', // Blue 600
    line: 'rgba(37, 99, 235, 0.3)',
    p1: '#2563EB', // Blue 600
    p2: '#3B82F6', // Blue 500
    p3: '#6366F1', // Indigo 500
    glow: 'rgba(59, 130, 246, 0.9)', // Blue 500 glow
    halo: 'rgba(59, 130, 246, 0.35)', // Halos
    mask0: 'rgba(2, 6, 23, 0)',
    mask1: 'rgba(2, 6, 23, 0.5)',
};

export default function ConnectionsBackground() {
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
        let pulses: DataPulse[] = [];
        let halos: TrustHalo[] = [];
        let previousConnections = new Set<string>();
        let isFirstFrame = true;

        let currentParticleCount = 45;
        let connectionMaxDist = 180;

        // V-Formation State
        let currentVFormationCycle = -1;
        let vNodes: Node[] = [];
        let vPhase: 'idle' | 'forming' | 'holding' | 'dissolving' = 'idle';
        let vPhaseStartTime = 0;

        // Physics Warmup State
        let frameCount = 0;

        let nextNodeId = 0;
        class Node {
            id: number;
            x: number;
            y: number;
            baseVx: number;
            baseVy: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            alpha: number;
            clusterTargetX: number | null = null;
            clusterTargetY: number | null = null;

            constructor(w: number, h: number, colors: string[]) {
                this.id = nextNodeId++;
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                // Very slow drift
                this.baseVx = (Math.random() - 0.5) * 0.2;
                this.baseVy = (Math.random() - 0.5) * 0.2;
                this.vx = this.baseVx;
                this.vy = this.baseVy;
                this.size = Math.random() * 2.5 + 1.5; // Slightly larger for "businesses"
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.alpha = Math.random() * 0.5 + 0.3;
            }

            update(w: number, h: number, isClustering: boolean) {
                if (isClustering && this.clusterTargetX !== null && this.clusterTargetY !== null) {
                    // Gravitate toward cluster center
                    const dx = this.clusterTargetX - this.x;
                    const dy = this.clusterTargetY - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 10) {
                        this.vx = this.baseVx + (dx / dist) * 0.5;
                        this.vy = this.baseVy + (dy / dist) * 0.5;
                    } else {
                        // Slow down when near target
                        this.vx *= 0.9;
                        this.vy *= 0.9;
                    }
                } else {
                    // Return to normal drift gradually
                    this.vx += (this.baseVx - this.vx) * 0.05;
                    this.vy += (this.baseVy - this.vy) * 0.05;
                }

                this.x += this.vx;
                this.y += this.vy;

                // Bounce off edges smoothly
                if (this.x < 0 || this.x > w) {
                    this.vx *= -1;
                    this.baseVx *= -1;
                    this.x = Math.max(0, Math.min(this.x, w));
                }
                if (this.y < 0 || this.y > h) {
                    this.vy *= -1;
                    this.baseVy *= -1;
                    this.y = Math.max(0, Math.min(this.y, h));
                }
            }

            draw(ctx: CanvasRenderingContext2D, isVGlow: boolean = false) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;

                // If it's part of an active V-Formation glow, override opacity and color
                if (isVGlow) {
                    ctx.fillStyle = '#3B82F6';
                    ctx.globalAlpha = 1;
                    ctx.shadowColor = ctx.fillStyle;
                    ctx.shadowBlur = 15;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                } else {
                    ctx.globalAlpha = this.alpha;
                    ctx.fill();

                    // Active business node glow
                    if (this.size > 3) {
                        ctx.shadowColor = this.color;
                        ctx.shadowBlur = 10;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }
                }
            }
        }

        class DataPulse {
            source: Node;
            target: Node;
            progress: number;
            speed: number;
            color: string;
            active: boolean;

            constructor(source: Node, target: Node, color: string) {
                this.source = source;
                this.target = target;
                this.progress = 0;
                this.speed = 0.01 + Math.random() * 0.015; // Fast data transfer
                this.color = color;
                this.active = true;
            }

            update() {
                this.progress += this.speed;
                if (this.progress >= 1) {
                    this.active = false;
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                if (!this.active) return;

                const x = this.source.x + (this.target.x - this.source.x) * this.progress;
                const y = this.source.y + (this.target.y - this.source.y) * this.progress;

                // Fade in at start, fade out at end
                const alpha = Math.sin(this.progress * Math.PI);

                if (alpha > 0.05) {
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fillStyle = '#FFFFFF'; // Bright white core for data
                    ctx.globalAlpha = alpha;
                    ctx.shadowColor = this.color;
                    ctx.shadowBlur = 8;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }

        class TrustHalo {
            node: Node;
            color: string;
            progress: number;
            speed: number;
            active: boolean;

            constructor(node: Node, color: string) {
                this.node = node;
                this.color = color;
                this.progress = 0;
                // Slower duration: ~6.6s at 60fps means 400 frames
                this.speed = 1 / 400;
                this.active = true;
            }

            update() {
                this.progress += this.speed;
                if (this.progress >= 1) {
                    this.active = false;
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                if (!this.active) return;

                // Radius expands via ease-out: base size + up to 45px
                const easeOut = 1 - Math.pow(1 - this.progress, 3);
                const currentRadius = this.node.size + (45 * easeOut);

                // Opacity fades from 0.8 to 0
                const currentOpacity = Math.max(0, 0.8 * (1 - this.progress));

                ctx.beginPath();
                ctx.arc(this.node.x, this.node.y, currentRadius, 0, Math.PI * 2);

                // Circular ring per design spec
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2; // Slightly thicker for visibility
                ctx.globalAlpha = currentOpacity;

                // Optional: add a tiny glow to the halo itself
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 4;
                ctx.stroke();

                // Reset context
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
        }

        const init = () => {
            const parent = canvas.parentElement;
            const w = canvas.width = parent ? parent.clientWidth : window.innerWidth;
            const h = canvas.height = parent ? parent.clientHeight : window.innerHeight;

            const isMobile = w < 768;
            currentParticleCount = isMobile ? 30 : 50;
            connectionMaxDist = isMobile ? 120 : 180;

            nodes = Array.from({ length: currentParticleCount }, () => new Node(w, h, activeColorsArray));
            pulses = [];
            halos = [];
            previousConnections.clear();
            isFirstFrame = true;
            frameCount = 0; // Reset warmup throttle
        };

        const drawGridContext = (w: number, h: number) => {
            ctx.strokeStyle = activeColors.grid;
            ctx.lineWidth = 1;
            const step = 100;

            ctx.beginPath();
            for (let x = 0; x < w; x += step) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
            }
            for (let y = 0; y < h; y += step) {
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
            }
            ctx.stroke();
        };

        let currentClusterCycle = -1;
        let clusterGroup: Node[] = [];

        const render = () => {
            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);
            drawGridContext(w, h);

            ctx.globalCompositeOperation = 'lighter';

            const cycleDuration = 15000; // 15 seconds
            const t = performance.now() % cycleDuration;
            const cycle = Math.floor(performance.now() / cycleDuration);

            // Trigger a new clustering event every 15s cycle
            // Phase 1: 0s - 3s (Attraction)
            // Phase 2: 3s - 15s (Drift)
            const isClustering = t < 3000;

            if (cycle !== currentClusterCycle) {
                currentClusterCycle = cycle;

                // Reset old cluster targets
                nodes.forEach(n => {
                    n.clusterTargetX = null;
                    n.clusterTargetY = null;
                });

                // Pick a new cluster center (avoiding true center of screen to keep hero text clear)
                const isLeft = Math.random() > 0.5;
                const clusterX = isLeft ? w * 0.2 + Math.random() * (w * 0.15) : w * 0.65 + Math.random() * (w * 0.15);
                const clusterY = h * 0.2 + Math.random() * (h * 0.6);

                // Select 3 to 5 nodes closest to the new cluster center
                nodes.sort((a, b) => {
                    const distA = Math.hypot(a.x - clusterX, a.y - clusterY);
                    const distB = Math.hypot(b.x - clusterX, b.y - clusterY);
                    return distA - distB;
                });

                const clusterSize = 3 + Math.floor(Math.random() * 3);
                clusterGroup = nodes.slice(0, clusterSize);

                clusterGroup.forEach(n => {
                    n.clusterTargetX = clusterX;
                    n.clusterTargetY = clusterY;
                });
            }

            // --- V-FORMATION LOGIC ---
            const vCycleDuration = 25000; // Trigger every 25s
            const vT = performance.now() % vCycleDuration;
            const vCycle = Math.floor(performance.now() / vCycleDuration);
            const now = performance.now();

            if (vCycle !== currentVFormationCycle) {
                currentVFormationCycle = vCycle;
                vPhase = 'forming';
                vPhaseStartTime = now;

                // Select 9 random nodes to form the V (1 vertex, 4 left arm, 4 right arm)
                vNodes = [...nodes].sort(() => Math.random() - 0.5).slice(0, 9);

                // Calculate anchor point for the V (slightly off-center to feel organic)
                const anchorX = w * 0.5 + (Math.random() - 0.5) * 100;
                const anchorY = h * 0.65; // Lower middle

                // Arm vectors
                const armLength = Math.min(w * 0.3, h * 0.4);
                const leftDx = -armLength / 4;
                const rightDx = armLength / 4;
                const dy = -armLength / 4;

                // Assign targets to the 9 nodes
                vNodes.forEach((n, i) => {
                    if (i === 0) {
                        // Vertex
                        n.clusterTargetX = anchorX;
                        n.clusterTargetY = anchorY;
                    } else if (i <= 4) {
                        // Left arm
                        const ratio = i / 4.5;
                        // Add some jitter so it's not perfectly straight
                        const jitterX = (Math.random() - 0.5) * 20;
                        const jitterY = (Math.random() - 0.5) * 20;
                        n.clusterTargetX = anchorX + (leftDx * ratio * 4) + jitterX;
                        n.clusterTargetY = anchorY + (dy * ratio * 4) + jitterY;
                    } else {
                        // Right arm
                        const ratio = (i - 4) / 4.5;
                        const jitterX = (Math.random() - 0.5) * 20;
                        const jitterY = (Math.random() - 0.5) * 20;
                        n.clusterTargetX = anchorX + (rightDx * ratio * 4) + jitterX;
                        n.clusterTargetY = anchorY + (dy * ratio * 4) + jitterY;
                    }
                });
            }

            // State machine for V Phase
            const timeInPhase = now - vPhaseStartTime;
            if (vPhase === 'forming') {
                if (timeInPhase > 3000) {
                    vPhase = 'holding';
                    vPhaseStartTime = now;
                    // Trigger custom data pulses down the V arms upon entering Hold phase
                    if (vNodes.length === 9) {
                        const vertex = vNodes[0];
                        // Pulse left arm
                        pulses.push(new DataPulse(vertex, vNodes[4], vertex.color));
                        // Pulse right arm
                        pulses.push(new DataPulse(vertex, vNodes[8], vertex.color));
                    }
                }
            } else if (vPhase === 'holding') {
                if (timeInPhase > 2000) {
                    vPhase = 'dissolving';
                    vPhaseStartTime = now;
                    // Release nodes
                    vNodes.forEach(n => {
                        n.clusterTargetX = null;
                        n.clusterTargetY = null;
                    });
                }
            } else if (vPhase === 'dissolving') {
                if (timeInPhase > 2000) {
                    vPhase = 'idle';
                }
            }
            // --- END V-FORMATION LOGIC ---

            // Draw Connections
            ctx.lineWidth = 1;
            const connectedPairs: { n1: Node, n2: Node, dist: number }[] = [];
            const currentConnections = new Set<string>();

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const p1 = nodes[i];
                    const p2 = nodes[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionMaxDist) {
                        connectedPairs.push({ n1: p1, n2: p2, dist });

                        const pairId = p1.id < p2.id ? `${p1.id}-${p2.id}` : `${p2.id}-${p1.id}`;
                        currentConnections.add(pairId);

                        // New connection formed -> emit Trust Halo
                        if (!isFirstFrame && !previousConnections.has(pairId)) {
                            // Only 30% of ALL new connections generate a halo to prevent visual stacking
                            // Suppress completely during the first 3 seconds (180 frames) to let random start clusters settle
                            if (frameCount > 180 && Math.random() < 0.3) {
                                // Determine which node in the pair receives the halo (randomized for organic feel)
                                const targetNode = Math.random() > 0.5 ? p1 : p2;
                                halos.push(new TrustHalo(targetNode, activeColors.halo));
                            }
                        } else {
                            // Occasionally pulse organic halos on existing connections
                            const ambientRate = w < 768 ? 0.000005 : 0.000015; // Extremely rare on mobile
                            // Suppress ambient bursts during warmup as well
                            if (frameCount > 60 && Math.random() < ambientRate) {
                                const targetNode = Math.random() > 0.5 ? p1 : p2;
                                halos.push(new TrustHalo(targetNode, activeColors.halo));
                            }
                        }

                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = p1.color;
                        ctx.globalAlpha = Math.min(1, (1 - dist / connectionMaxDist) * 0.6);

                        // Increase strength if both are in a cluster
                        if (isClustering && clusterGroup.includes(p1) && clusterGroup.includes(p2)) {
                            ctx.globalAlpha = Math.min(1, (1 - dist / connectionMaxDist) * 0.9);
                            ctx.lineWidth = 1.5;
                        } else {
                            ctx.lineWidth = 1;
                        }

                        ctx.stroke();
                    }
                }
            }

            // Spawn random Data Pulses along active connections
            if (Math.random() < 0.1 && connectedPairs.length > 0) { // 10% chance per frame
                const randomPair = connectedPairs[Math.floor(Math.random() * connectedPairs.length)];
                // Pulse from n1 to n2 or n2 to n1
                if (Math.random() > 0.5) {
                    pulses.push(new DataPulse(randomPair.n1, randomPair.n2, randomPair.n1.color));
                } else {
                    pulses.push(new DataPulse(randomPair.n2, randomPair.n1, randomPair.n2.color));
                }
            }

            // Limit max pulses to avoid clutter
            if (pulses.length > 15) {
                pulses = pulses.filter(p => p.active).slice(0, 15);
            }

            // Update & Draw Pulses
            pulses.forEach((p, index) => {
                p.update();
                p.draw(ctx);
            });
            // Cleanup inactive pulses
            pulses = pulses.filter(p => p.active);

            // Update & Draw Halos
            halos.forEach(h => {
                h.update();
                h.draw(ctx);
            });
            halos = halos.filter(h => h.active);

            // Update & Draw Nodes
            nodes.forEach(n => {
                // Determine what kind of attraction force this node is currently under
                const isClusteringMode = isClustering && clusterGroup.includes(n);
                const isVMode = (vPhase === 'forming' || vPhase === 'holding') && vNodes.includes(n);
                const isVHolding = vPhase === 'holding' && vNodes.includes(n);

                // Pass the correct attraction flag to the update physics logic. 
                // We reuse `clusterTargetX/Y` inside the Node class for both regular clusters and V-formation targets.
                n.update(w, h, isClusteringMode || isVMode);
                n.draw(ctx, isVHolding);
            });

            // Sync state for next frame
            previousConnections = currentConnections;
            isFirstFrame = false;
            frameCount++;

            // Center calming mask (keep text area clean)
            const centerX = w / 2;
            const centerY = h / 2;
            ctx.globalCompositeOperation = 'destination-out';
            const radialGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(w, h) * 0.4);
            radialGrad.addColorStop(0, 'rgba(0,0,0,0.8)'); // 80% opacity mask in dead center
            radialGrad.addColorStop(0.5, 'rgba(0,0,0,0.4)');
            radialGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = radialGrad;
            ctx.fillRect(0, 0, w, h);

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

            {/* Top and Bottom Gradient Masking */}
            <div
                className="absolute inset-x-0 bottom-0 h-40 pointer-events-none transition-colors duration-300"
                style={{ background: `linear-gradient(to top, ${activeColors.bg}, ${activeColors.mask0})` }}
            />
            <div
                className="absolute inset-x-0 top-0 h-32 pointer-events-none transition-colors duration-300"
                style={{ background: `linear-gradient(to bottom, ${activeColors.mask1}, ${activeColors.mask0})` }}
            />
        </div>
    );
}
