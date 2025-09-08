import React, { useState, useEffect, useRef, useMemo, MouseEvent } from 'react';
import type { AnalysisResults } from '../types';
import { PlayIcon, PauseIcon, ArrowPathIcon } from './icons';

interface TesseractExplorerProps {
    analysisResults: AnalysisResults;
}

// --- Type Definitions ---
interface Node {
    id: number;
    x: number; y: number; z: number;
    vx: number; vy: number; vz: number;
    radius: number;
    color: string;
}

interface Link {
    source: number;
    target: number;
    strength: number;
}

interface Point3D { x: number; y: number; z: number; }
interface Point2D { x: number; y: number; }

// --- Constants ---
const VIEW_SIZE = 800;
const CENTER = VIEW_SIZE / 2;
const BASE_FOCAL_LENGTH = 400;

// --- Component ---
const TesseractExplorer: React.FC<TesseractExplorerProps> = ({ analysisResults }) => {
    const { whiteBallFrequency, overdueWhiteBalls, bayesianWhiteBallProbabilities, pairFrequencyData } = analysisResults;
    
    const [sliderValue, setSliderValue] = useState(0.5);
    const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
    const [hoveredNumber, setHoveredNumber] = useState<number | null>(null);
    const [renderTick, setRenderTick] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [zoom, setZoom] = useState(1);

    const nodesRef = useRef<Node[]>([]);
    const linksRef = useRef<Link[]>([]);
    const animationFrameId = useRef<number | null>(null);
    const rotationRef = useRef({ x: 0, y: 0 });
    const lastMousePosRef = useRef({ x: 0, y: 0 });

    // --- 3D Projection Helper ---
    const project = (p3d: Point3D): Point2D => {
        const focalLength = BASE_FOCAL_LENGTH * zoom;
        const scale = focalLength / (focalLength + p3d.z);
        return {
            x: p3d.x * scale + CENTER,
            y: p3d.y * scale + CENTER,
        };
    };

    const dataMaps = useMemo(() => {
        const freqMap = new Map(whiteBallFrequency.map(item => [item.number, item.count]));
        const overdueMap = new Map(overdueWhiteBalls.map(item => [item.number, item.drawsSince]));
        const bayesianMap = new Map(bayesianWhiteBallProbabilities.map(item => [item.number, item.probability]));
        
        const freqValues = Array.from(freqMap.values());
        const overdueValues = Array.from(overdueMap.values());
        const bayesianValues = Array.from(bayesianMap.values());
        
        const minFreq = Math.min(...freqValues);
        const maxFreq = Math.max(...freqValues);
        const minOverdue = Math.min(...overdueValues);
        const maxOverdue = Math.max(...overdueValues);
        const minBayesian = Math.min(...bayesianValues);
        const maxBayesian = Math.max(...bayesianValues);
        
        const partnersMap = new Map<number, Set<number>>();
        for (const numStr in pairFrequencyData) {
            const num = parseInt(numStr, 10);
            if (!partnersMap.has(num)) partnersMap.set(num, new Set());
            pairFrequencyData[num].forEach(p => partnersMap.get(num)!.add(p.partner));
        }

        return {
            freq: { map: freqMap, min: minFreq, max: maxFreq },
            overdue: { map: overdueMap, min: minOverdue, max: maxOverdue },
            bayesian: { map: bayesianMap, min: minBayesian, max: maxBayesian },
            partnersMap
        };
    }, [whiteBallFrequency, overdueWhiteBalls, bayesianWhiteBallProbabilities, pairFrequencyData]);


    useEffect(() => {
        // Initialize Nodes
        nodesRef.current = Array.from({ length: 69 }, (_, i) => i + 1).map(num => {
            const prob = dataMaps.bayesian.map.get(num) || 0;
            const radiusScale = (prob - dataMaps.bayesian.min) / (dataMaps.bayesian.max - dataMaps.bayesian.min);
            
            return {
                id: num,
                x: (Math.random() - 0.5) * VIEW_SIZE,
                y: (Math.random() - 0.5) * VIEW_SIZE,
                z: (Math.random() - 0.5) * VIEW_SIZE,
                vx: 0, vy: 0, vz: 0,
                radius: 6 + radiusScale * 12,
                color: 'white',
            };
        });
        
        // Initialize Links
        const pairs: Link[] = [];
        for (const sourceStr in pairFrequencyData) {
            const source = parseInt(sourceStr, 10);
            for (const { partner: target, count } of pairFrequencyData[source]) {
                if (source < target) {
                    pairs.push({ source, target, strength: count });
                }
            }
        }
        const maxStrength = Math.max(...pairs.map(p => p.strength), 1);
        linksRef.current = pairs.map(p => ({ ...p, strength: p.strength / maxStrength }));

        // Animation Loop
        const simulate = () => {
            if (!isPaused) {
                if (!isDragging) {
                    rotationRef.current.y += 0.002;
                    rotationRef.current.x += 0.001;
                }

                const nodes = nodesRef.current;
                const nodeMap = new Map(nodes.map(n => [n.id, n]));
                
                const freqWeight = 1 - sliderValue;
                const overdueWeight = sliderValue;

                for (const node of nodes) {
                    // Strategic Axis Force
                    const freq = dataMaps.freq.map.get(node.id) || 0;
                    const overdue = dataMaps.overdue.map.get(node.id) || 0;

                    const freqScale = (freq - dataMaps.freq.min) / (dataMaps.freq.max - dataMaps.freq.min) || 0;
                    const overdueScale = (overdue - dataMaps.overdue.min) / (dataMaps.overdue.max - dataMaps.overdue.min) || 0;

                    const targetZ = 200 * (freqScale * freqWeight - overdueScale * overdueWeight);
                    node.vz += (targetZ - node.z) * 0.001;
                    
                    // Centering force
                    node.vx -= node.x * 0.0001;
                    node.vy -= node.y * 0.0001;
                    node.vz -= node.z * 0.0001;

                    // Repulsion force
                    for (const other of nodes) {
                        if (node.id === other.id) continue;
                        const dx = other.x - node.x;
                        const dy = other.y - node.y;
                        const dz = other.z - node.z;
                        const distSq = dx * dx + dy * dy + dz * dz;
                        if (distSq < 15000) {
                            const dist = Math.sqrt(distSq) || 1;
                            const force = -150 / distSq;
                            node.vx += (dx / dist) * force;
                            node.vy += (dy / dist) * force;
                            node.vz += (dz / dist) * force;
                        }
                    }
                }
                
                // Link force
                for (const link of linksRef.current) {
                    const source = nodeMap.get(link.source);
                    const target = nodeMap.get(link.target);
                    if (!source || !target) continue;
                    const dx = target.x - source.x; const dy = target.y - source.y; const dz = target.z - source.z;
                    const force = 0.01 * link.strength;
                    source.vx += dx * force; source.vy += dy * force; source.vz += dz * force;
                    target.vx -= dx * force; target.vy -= dy * force; target.vz -= dz * force;
                }

                // Update positions
                const damping = 0.9;
                for (const node of nodes) {
                    node.vx *= damping; node.vy *= damping; node.vz *= damping;
                    node.x += node.vx; node.y += node.vy; node.z += node.vz;
                }
            }
            setRenderTick(t => t + 1);
            animationFrameId.current = requestAnimationFrame(simulate);
        };
        
        animationFrameId.current = requestAnimationFrame(simulate);
        
        return () => {
            if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [dataMaps]); // Only re-initialize if data fundamentally changes
    
    // --- Interaction Handlers ---
    const handleMouseDown = (e: MouseEvent) => {
        setIsDragging(true);
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMousePosRef.current.x;
        const dy = e.clientY - lastMousePosRef.current.y;
        rotationRef.current.y += dx * 0.005;
        rotationRef.current.x -= dy * 0.005;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(z => Math.max(0.5, Math.min(3, z - e.deltaY * 0.001)));
    };
    const resetView = () => {
        rotationRef.current = { x: 0, y: 0 };
        setZoom(1);
    };

    // --- Render Logic ---
    const selectedPartners = selectedNumber ? dataMaps.partnersMap.get(selectedNumber) : null;
    const { cosX, sinX, cosY, sinY } = {
        cosX: Math.cos(rotationRef.current.x), sinX: Math.sin(rotationRef.current.x),
        cosY: Math.cos(rotationRef.current.y), sinY: Math.sin(rotationRef.current.y),
    };

    const renderedNodes = nodesRef.current.map(node => {
        let y1 = node.y * cosX - node.z * sinX;
        let z1 = node.y * sinX + node.z * cosX;
        let x1 = node.x * cosY - z1 * sinY;
        let z2 = node.x * sinY + z1 * cosY;

        const p2d = project({ x: x1, y: y1, z: z2 });
        const focalLength = BASE_FOCAL_LENGTH * zoom;
        const scale = focalLength / (focalLength + z2);
        
        const isSelected = selectedNumber === node.id;
        const isPartner = selectedPartners?.has(node.id);
        const isHovered = hoveredNumber === node.id;
        const opacity = selectedNumber ? (isSelected || isPartner ? 1 : 0.2) : 0.9;
        const color = isSelected ? '#f59e0b' : isPartner ? '#22c55e' : `hsl(210, 100%, ${60 + z2 / 5}%)`;
        
        return { ...node, p2d, scale, opacity, color, isHovered };
    }).sort((a,b) => a.z - b.z);

    const renderedLinks = linksRef.current.map((link, i) => {
        const source = renderedNodes.find(n => n.id === link.source);
        const target = renderedNodes.find(n => n.id === link.target);
        if (!source || !target) return null;

        const isSelectedLink = selectedNumber && (link.source === selectedNumber || link.target === selectedNumber);
        const opacity = selectedNumber ? (isSelectedLink ? 0.8 : 0.05) : 0.1;

        return { key: i, source, target, opacity };
    }).filter(Boolean) as {key: number, source: any, target: any, opacity: number}[];

    // Tesseract structure
    const cube = (s: number) => [
        [-s,-s,-s], [s,-s,-s], [s,s,-s], [-s,s,-s],
        [-s,-s,s], [s,-s,s], [s,s,s], [-s,s,s]
    ];
    const vertices = [...cube(120), ...cube(240)];
    const edges = [
        ...[0,1,2,3,0,4,5,1,5,6,2,6,7,3,7,4].map((v,i,a) => i%2===0 ? [a[i],a[i+1]] : null),
        ...[8,9,10,11,8,12,13,9,13,14,10,14,15,11,15,12].map((v,i,a) => i%2===0 ? [a[i],a[i+1]] : null),
        ...[0,8, 1,9, 2,10, 3,11].map((v,i,a) => i%2===0 ? [a[i],a[i+1]] : null)
    ].filter(Boolean) as [number, number][];

    return (
        <div className="bg-gray-800 p-4 rounded-lg flex flex-col items-center">
            <h3 className="text-lg font-semibold text-text-primary">Tesseract Explorer</h3>
            <p className="text-xs text-text-secondary mb-2 max-w-lg text-center">
                Drag to rotate, scroll to zoom. Move the slider to shift between statistical dimensions. Click a number to isolate its network.
            </p>
            <div
                className="relative w-full max-w-3xl aspect-square cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onWheel={handleWheel}
            >
                <svg viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}>
                    {/* Tesseract Structure */}
                    <g>
                        {edges.map(([i, j], idx) => {
                            let p1 = vertices[i]; let p2 = vertices[j];
                            let y1 = p1[1] * cosX - p1[2] * sinX, z1 = p1[1] * sinX + p1[2] * cosX;
                            let x1 = p1[0] * cosY - z1 * sinY, z2 = p1[0] * sinY + z1 * cosY;
                            const proj1 = project({ x: x1, y: y1, z: z2 });

                            let y2 = p2[1] * cosX - p2[2] * sinX, z3 = p2[1] * sinX + p2[2] * cosX;
                            let x2 = p2[0] * cosY - z3 * sinY, z4 = p2[0] * sinY + z3 * cosY;
                            const proj2 = project({ x: x2, y: y2, z: z4 });

                            return <line key={idx} x1={proj1.x} y1={proj1.y} x2={proj2.x} y2={proj2.y} className="stroke-gray-600" strokeWidth="1" />
                        })}
                    </g>
                    {/* Links */}
                    <g>
                        {renderedLinks.map(link => (
                            <line key={link.key} x1={link.source.p2d.x} y1={link.source.p2d.y} x2={link.target.p2d.x} y2={link.target.p2d.y} stroke="white" strokeOpacity={link.opacity} strokeWidth="1" />
                        ))}
                    </g>
                    {/* Nodes */}
                    <g>
                        {renderedNodes.map(node => (
                            <g key={node.id} transform={`translate(${node.p2d.x}, ${node.p2d.y})`}
                               onClick={() => setSelectedNumber(prev => prev === node.id ? null : node.id)}
                               onMouseEnter={() => setHoveredNumber(node.id)}
                               onMouseLeave={() => setHoveredNumber(null)} >
                                <circle r={node.radius * node.scale * (node.isHovered ? 1.2 : 1)} fill={node.color} opacity={node.opacity} className="transition-all duration-150" />
                                <text fill={node.color === '#f59e0b' ? 'black' : 'white'} textAnchor="middle" dy=".3em"
                                      fontSize={node.radius * node.scale * (node.isHovered ? 0.8 : 0.7)} fontWeight="bold" opacity={node.opacity} className="pointer-events-none transition-all duration-150">
                                    {node.id}
                                </text>
                            </g>
                        ))}
                    </g>
                </svg>
            </div>
            <div className="w-full max-w-xl flex flex-col items-center gap-4 mt-4 bg-gray-900 p-3 rounded-lg">
                <div className="w-full flex items-center gap-4">
                    <span className="text-sm font-semibold text-blue-400">Overdue</span>
                    <input
                        type="range" min="0" max="1" step="0.01" value={sliderValue}
                        onChange={(e) => setSliderValue(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-highlight"
                    />
                    <span className="text-sm font-semibold text-red-400">Frequency</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsPaused(!isPaused)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-text-primary transition-colors">
                        {isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
                    </button>
                    <button onClick={resetView} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-text-primary transition-colors">
                        <ArrowPathIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TesseractExplorer;
