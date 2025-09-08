import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { AnalysisResults, Ticket } from '../types';
import { MAX_WHITE_BALL, MAX_POWERBALL_CURRENT } from '../constants';

interface ProbabilityStormProps {
    analysisResults: AnalysisResults;
    onClose: () => void;
}

type Particle = {
    id: number;
    type: 'white' | 'powerball';
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    mass: number;
    color: string;
};

type Explosion = {
    x: number;
    y: number;
    radius: number;
    alpha: number;
    color: string;
};

const COUNTDOWN_SECONDS = 60;

const ProbabilityStorm: React.FC<ProbabilityStormProps> = ({ analysisResults, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const explosionsRef = useRef<Explosion[]>([]);
    // Fix: Initialize useRef with null to be compatible with its type.
    const animationFrameId = useRef<number | null>(null);
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const [isFinished, setIsFinished] = useState(false);
    const [winningTicket, setWinningTicket] = useState<Ticket | null>(null);

    const { whiteBallProbMap, powerballProbMap } = useMemo(() => {
        const whiteBallProbMap = new Map(analysisResults.bayesianWhiteBallProbabilities.map(p => [p.number, p.probability]));
        const powerballProbMap = new Map(analysisResults.bayesianPowerballProbabilities.map(p => [p.number, p.probability]));
        return { whiteBallProbMap, powerballProbMap };
    }, [analysisResults]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);
        const { width, height } = canvas;
        const centerX = width / 2 / dpr;
        const centerY = height / 2 / dpr;

        // Initialize particles
        if (particlesRef.current.length === 0) {
            const whiteProbs = Array.from(whiteBallProbMap.values());
            const minWhiteProb = Math.min(...whiteProbs);
            const maxWhiteProb = Math.max(...whiteProbs);
            
            const powerballProbs = Array.from(powerballProbMap.values());
            const minPbProb = Math.min(...powerballProbs);
            const maxPbProb = Math.max(...powerballProbs);

            for (let i = 1; i <= MAX_WHITE_BALL; i++) {
                const prob = whiteBallProbMap.get(i) || 0;
                const mass = 0.1 + ((prob - minWhiteProb) / (maxWhiteProb - minWhiteProb)) * 0.9;
                particlesRef.current.push({
                    id: i, type: 'white',
                    x: Math.random() * width / dpr, y: Math.random() * height / dpr,
                    vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
                    radius: 4, mass, color: 'rgba(255, 255, 255, 0.8)'
                });
            }
            for (let i = 1; i <= MAX_POWERBALL_CURRENT; i++) {
                const prob = powerballProbMap.get(i) || 0;
                const mass = 0.1 + ((prob - minPbProb) / (maxPbProb - minPbProb)) * 0.9;
                particlesRef.current.push({
                    id: i, type: 'powerball',
                    x: Math.random() * width / dpr, y: Math.random() * height / dpr,
                    vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
                    radius: 5, mass, color: 'rgba(239, 68, 68, 0.9)' // red-500
                });
            }
        }

        const countdownInterval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    setIsFinished(true);
                    
                    const finalWb = analysisResults.bayesianWhiteBallProbabilities.slice(0, 5).map(p => p.number);
                    const finalPb = analysisResults.bayesianPowerballProbabilities[0].number;
                    const ticket = { whiteBalls: finalWb, powerball: finalPb };
                    setWinningTicket(ticket);
                    
                    const winningParticles = particlesRef.current.filter(p => 
                        (p.type === 'white' && finalWb.includes(p.id)) || (p.type === 'powerball' && p.id === finalPb)
                    );

                    winningParticles.forEach(p => {
                        explosionsRef.current.push({ x: p.x, y: p.y, radius: 10, alpha: 1, color: p.type === 'white' ? '#fde047' : '#fda4af' });
                    });
                    
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            
            // Draw Starfield
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            if (!isFinished) {
                 const timeFactor = 1 + 2 * ( (COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS);
                 particlesRef.current.forEach(p => {
                    const dx = centerX - p.x;
                    const dy = centerY - p.y;
                    const distSq = dx * dx + dy * dy;
                    const dist = Math.sqrt(distSq);
                    
                    const force = (p.mass * timeFactor) / (distSq * 0.01 + 1);
                    p.vx += (dx / dist) * force * 0.05;
                    p.vy += (dy / dist) * force * 0.05;

                    p.vx *= 0.98; // Damping
                    p.vy *= 0.98;
                    
                    p.x += p.vx;
                    p.y += p.vy;

                    if (p.x < p.radius || p.x > width / dpr - p.radius) p.vx *= -1;
                    if (p.y < p.radius || p.y > height / dpr - p.radius) p.vy *= -1;

                    const closeness = 1 - Math.min(1, dist / (Math.min(width, height) / 2 / dpr));
                    const glow = closeness * 15;
                    
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.shadowBlur = glow;
                    ctx.shadowColor = p.color;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                });
            }

            explosionsRef.current.forEach((exp, index) => {
                exp.radius += 2;
                exp.alpha -= 0.02;
                if (exp.alpha <= 0) {
                    explosionsRef.current.splice(index, 1);
                } else {
                    ctx.beginPath();
                    ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${exp.color === '#fde047' ? '253, 224, 71' : '253, 164, 175'}, ${exp.alpha})`;
                    ctx.fill();
                }
            });

            // UI on top
            ctx.textAlign = 'center';
            if (!isFinished) {
                 ctx.font = 'bold 48px sans-serif';
                 ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                 ctx.fillText(countdown.toString(), centerX, 60);
            } else {
                ctx.font = 'bold 32px sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillText('Predicted Winning Numbers:', centerX, 60);
                
                if (winningTicket) {
                    const ballSize = 25;
                    const spacing = 10;
                    const totalWidth = 5 * (ballSize * 2) + 4 * spacing + spacing * 2 + (ballSize * 2);
                    let currentX = centerX - totalWidth / 2 + ballSize;

                    winningTicket.whiteBalls.forEach(num => {
                        ctx.beginPath();
                        ctx.arc(currentX, 120, ballSize, 0, Math.PI * 2);
                        ctx.fillStyle = 'white';
                        ctx.fill();

                        ctx.fillStyle = 'black';
                        ctx.font = 'bold 24px sans-serif';
                        ctx.fillText(num.toString(), currentX, 128);
                        currentX += (ballSize * 2) + spacing;
                    });
                    
                    currentX += spacing;

                    ctx.beginPath();
                    ctx.arc(currentX, 120, ballSize, 0, Math.PI * 2);
                    ctx.fillStyle = '#ef4444';
                    ctx.fill();
                    
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 24px sans-serif';
                    ctx.fillText(winningTicket.powerball.toString(), currentX, 128);
                }
            }

            animationFrameId.current = requestAnimationFrame(animate);
        };
        
        animate();

        return () => {
            clearInterval(countdownInterval);
            if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [countdown, isFinished, winningTicket, whiteBallProbMap, powerballProbMap]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"></canvas>
            <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-full z-10">
                Close
            </button>
        </div>
    );
};

export default ProbabilityStorm;
