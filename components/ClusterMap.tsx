import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { PairFrequencyData, NumberFrequency } from '../types';

interface ClusterMapProps {
    pairFrequencyData: PairFrequencyData;
    whiteBallFrequency: NumberFrequency[];
}

interface Node {
    id: number;
    radius: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
}

interface Link {
    source: number;
    target: number;
    strength: number;
}

const VIEWBOX_SIZE = 500;

const ClusterMap: React.FC<ClusterMapProps> = ({ pairFrequencyData, whiteBallFrequency }) => {
    const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
    const nodesRef = useRef<Node[]>([]);
    const linksRef = useRef<Link[]>([]);
    // FIX: Initialize useRef with null to satisfy strict linting rules that may require an argument.
    const animationFrameId = useRef<number | null>(null);
    const [isSimulating, setIsSimulating] = useState(true);
    // This state is just to trigger re-renders from the animation loop
    const [renderTick, setRenderTick] = useState(0);

    const { freqStats, pairStats, partnersMap } = useMemo(() => {
        const freqs = whiteBallFrequency.map(f => f.count);
        // FIX: Handle empty array to prevent error when spreading into Math.min/max.
        const minFreq = freqs.length > 0 ? Math.min(...freqs) : 0;
        const maxFreq = freqs.length > 0 ? Math.max(...freqs) : 1;
        const freqMap = new Map(whiteBallFrequency.map(f => [f.number, f.count]));

        let allPairs: { source: number; target: number; count: number }[] = [];
        const partnersMap = new Map<number, Set<number>>();
        for (const numStr in pairFrequencyData) {
            const num = parseInt(numStr, 10);
            if (!partnersMap.has(num)) partnersMap.set(num, new Set());
            pairFrequencyData[num].forEach(p => {
                if (num < p.partner) {
                    allPairs.push({ source: num, target: p.partner, count: p.count });
                }
                partnersMap.get(num)!.add(p.partner);
            });
        }
        
        const pairCounts = allPairs.map(p => p.count);
        // FIX: Handle empty array to prevent error when spreading into Math.min/max.
        const minPairCount = pairCounts.length > 0 ? Math.min(...pairCounts) : 0;
        const maxPairCount = pairCounts.length > 0 ? Math.max(...pairCounts) : 1;

        return {
            freqStats: { min: minFreq, max: maxFreq, map: freqMap },
            pairStats: { min: minPairCount, max: maxPairCount, all: allPairs },
            partnersMap,
        };
    }, [whiteBallFrequency, pairFrequencyData]);

    useEffect(() => {
        setIsSimulating(true);

        // 1. Initialize Nodes
        nodesRef.current = whiteBallFrequency.map(({ number, count }) => {
            const radiusScale = (freqStats.max > freqStats.min) ? (count - freqStats.min) / (freqStats.max - freqStats.min) : 0.5;
            return {
                id: number,
                radius: 6 + radiusScale * 8,
                x: VIEWBOX_SIZE / 2 + (Math.random() - 0.5) * 100,
                y: VIEWBOX_SIZE / 2 + (Math.random() - 0.5) * 100,
                vx: 0,
                vy: 0,
            };
        });

        // 2. Initialize Links
        linksRef.current = pairStats.all.map(p => {
            const strengthScale = (pairStats.max > pairStats.min) ? (p.count - pairStats.min) / (pairStats.max - pairStats.min) : 0.5;
            return {
                source: p.source,
                target: p.target,
                strength: 0.1 + strengthScale * 0.9,
            };
        });

        // 3. Run Simulation
        let iterations = 150;
        const simulate = () => {
            if (iterations <= 0) {
                setIsSimulating(false);
                return;
            }
            iterations--;

            // Apply forces
            const nodes = nodesRef.current;
            const links = linksRef.current;
            const nodeMap = new Map(nodes.map(n => [n.id, n]));

            // Repulsion force (charge)
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = (500 / (distance * distance));
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;
                    a.vx -= fx; a.vy -= fy;
                    b.vx += fx; b.vy += fy;
                }
            }

            // Attraction force (links)
            for (const link of links) {
                const source = nodeMap.get(link.source);
                const target = nodeMap.get(link.target);
                if (!source || !target) continue;
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = (distance - 100) * 0.005 * link.strength;
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;
                source.vx += fx; source.vy += fy;
                target.vx -= fx; target.vy -= fy;
            }

            // Update positions
            const damping = 0.95;
            for (const node of nodes) {
                // Centering force
                node.vx += (VIEWBOX_SIZE / 2 - node.x) * 0.0005;
                node.vy += (VIEWBOX_SIZE / 2 - node.y) * 0.0005;
                
                node.vx *= damping;
                node.vy *= damping;
                node.x += node.vx;
                node.y += node.vy;

                // Boundary collision
                node.x = Math.max(node.radius, Math.min(VIEWBOX_SIZE - node.radius, node.x));
                node.y = Math.max(node.radius, Math.min(VIEWBOX_SIZE - node.radius, node.y));
            }
            
            if (iterations % 5 === 0) {
                 setRenderTick(t => t + 1);
            }
            animationFrameId.current = requestAnimationFrame(simulate);
        };
        
        animationFrameId.current = requestAnimationFrame(simulate);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [pairFrequencyData, whiteBallFrequency, freqStats, pairStats]);


    if (whiteBallFrequency.length === 0) {
        return <p className="text-text-secondary">No data available for cluster analysis.</p>;
    }
    
    const selectedPartners = selectedNumber ? partnersMap.get(selectedNumber) : null;

    return (
         <div className="w-full h-full flex flex-col items-center justify-center min-h-[400px] relative">
            {isSimulating && <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-text-secondary animate-pulse">Simulating layout...</p>}
            <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="w-full h-full max-w-xl max-h-xl">
                {/* Links */}
                <g>
                    {linksRef.current.map((link, i) => {
                        const sourceNode = nodesRef.current.find(n => n.id === link.source);
                        const targetNode = nodesRef.current.find(n => n.id === link.target);
                        if (!sourceNode || !targetNode) return null;

                        const isSelectedLink = selectedNumber && (link.source === selectedNumber || link.target === selectedNumber);
                        const opacity = selectedNumber ? (isSelectedLink ? 0.8 : 0.05) : 0.2;

                        return (
                            <line
                                key={i}
                                x1={sourceNode.x} y1={sourceNode.y}
                                x2={targetNode.x} y2={targetNode.y}
                                stroke="#a0aec0"
                                strokeWidth={0.5 + link.strength * 2}
                                style={{ transition: 'opacity 0.3s', opacity }}
                            />
                        );
                    })}
                </g>
                {/* Nodes */}
                <g>
                    {nodesRef.current.map(node => {
                        const isSelected = node.id === selectedNumber;
                        const isPartner = selectedPartners?.has(node.id);
                        const opacity = selectedNumber ? (isSelected || isPartner ? 1 : 0.3) : 1;
                        
                        return (
                             <g
                                key={node.id}
                                transform={`translate(${node.x}, ${node.y})`}
                                onClick={() => setSelectedNumber(prev => (prev === node.id ? null : node.id))}
                                className="cursor-pointer group"
                                style={{ transition: 'opacity 0.3s', opacity }}
                             >
                                <circle
                                    r={node.radius}
                                    fill={isSelected ? '#ecc94b' : (isPartner ? '#48bb78' : '#2d3748')}
                                    stroke={isSelected ? '#fff' : '#a0aec0'}
                                    strokeWidth="2"
                                    style={{ transition: 'fill 0.3s' }}
                                />
                                <text
                                    textAnchor="middle" dy=".3em"
                                    fill={isSelected || isPartner ? 'black' : 'white'}
                                    className="font-bold pointer-events-none"
                                    style={{ fontSize: `${Math.max(8, node.radius * 0.8)}px` }}
                                >
                                    {node.id}
                                </text>
                                <title>Number {node.id} (Drawn {freqStats.map.get(node.id)} times)</title>
                            </g>
                        );
                    })}
                </g>
            </svg>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg">
                <p className="text-xs text-text-secondary">Click any number to highlight its connections.</p>
            </div>
        </div>
    );
};

export default ClusterMap;
