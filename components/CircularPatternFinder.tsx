import React, { useState, useMemo } from 'react';
import type { PairFrequencyData, NumberFrequency } from '../types';
import { ChainIcon } from './icons';

interface CircularPatternFinderProps {
    pairFrequencyData: PairFrequencyData;
    whiteBallFrequency: NumberFrequency[];
    maxWhiteBall: number;
}

const VIEWBOX_SIZE = 450;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = VIEWBOX_SIZE / 2 - 30;

const CircularPatternFinder: React.FC<CircularPatternFinderProps> = ({ pairFrequencyData, whiteBallFrequency, maxWhiteBall }) => {
    const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

    const numberPositions = useMemo(() => {
        const positions = new Map<number, { x: number; y: number }>();
        for (let i = 1; i <= maxWhiteBall; i++) {
            // Subtract 1 from 'i' and 'maxWhiteBall' for zero-based angle calculation
            // Add PI/2 to start '1' at the top of the circle
            const angle = ((i - 1) / maxWhiteBall) * 2 * Math.PI - Math.PI / 2;
            const x = CENTER + RADIUS * Math.cos(angle);
            const y = CENTER + RADIUS * Math.sin(angle);
            positions.set(i, { x, y });
        }
        return positions;
    }, [maxWhiteBall]);
    
    const frequencyMap = useMemo(() => {
        return new Map(whiteBallFrequency.map(item => [item.number, item.count]));
    }, [whiteBallFrequency]);

    const handleNumberClick = (num: number) => {
        setSelectedNumber(prev => (prev === num ? null : num));
    };

    const partners = selectedNumber ? pairFrequencyData[selectedNumber] || [] : [];
    const maxPartnerCount = partners.length > 0 ? Math.max(...partners.map(p => p.count)) : 1;

    const partnerSet = new Set(partners.map(p => p.partner));

    return (
        <div className="w-full h-full flex items-center justify-center relative min-h-[350px]">
            <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="w-full h-full max-w-md max-h-md">
                <defs>
                    <radialGradient id="glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" style={{stopColor: 'rgba(255,255,255,0.2)', stopOpacity: 1}} />
                        <stop offset="100%" style={{stopColor: 'rgba(255,255,255,0)', stopOpacity: 0}} />
                    </radialGradient>
                </defs>

                {/* Connection Lines */}
                <g>
                    {selectedNumber && partners.slice(0, 10).map(({ partner, count }) => {
                        const pos = numberPositions.get(partner);
                        if (!pos) return null;
                        const strokeWidth = 0.5 + (count / maxPartnerCount) * 4;
                        return (
                            <line
                                key={partner}
                                x1={CENTER}
                                y1={CENTER}
                                x2={pos.x}
                                y2={pos.y}
                                stroke="url(#glow)"
                                strokeWidth={strokeWidth}
                                className="transition-all duration-500"
                                style={{ stroke: 'rgba(236, 201, 75, 0.7)' }}
                            />
                        );
                    })}
                </g>

                {/* Number Nodes */}
                {Array.from({ length: maxWhiteBall }, (_, i) => i + 1).map(num => {
                    const pos = numberPositions.get(num)!;
                    const isPartner = partnerSet.has(num);
                    const isSelected = selectedNumber === num;
                    const baseRadius = 5;
                    const radius = isSelected ? 15 : (isPartner ? 10 : baseRadius);
                    const opacity = selectedNumber && !isPartner && !isSelected ? 0.3 : 1;
                    
                    return (
                         <g 
                            key={num}
                            transform={`translate(${pos.x}, ${pos.y})`}
                            onClick={() => handleNumberClick(num)}
                            className="cursor-pointer group"
                         >
                            <circle
                                r={radius + 5}
                                fill="transparent"
                            />
                            <circle
                                r={radius}
                                fill={isPartner ? 'rgb(236, 201, 75)' : 'rgb(45, 55, 72)'}
                                stroke={isSelected ? 'rgb(236, 201, 75)' : 'rgb(100, 116, 139)'}
                                strokeWidth="2"
                                style={{ transition: 'all 0.3s ease', opacity }}
                            />
                            <text
                                textAnchor="middle"
                                dy=".3em"
                                fill={isPartner ? 'black' : 'white'}
                                className="font-bold text-xs pointer-events-none transition-opacity duration-300"
                                style={{ opacity }}
                            >
                                {num}
                            </text>
                            <title>Number {num} (drawn {frequencyMap.get(num) || 0} times)</title>
                        </g>
                    );
                })}

                 {/* Center Display */}
                 <g onClick={() => handleNumberClick(selectedNumber!)}>
                    {selectedNumber ? (
                        <>
                           <circle cx={CENTER} cy={CENTER} r="50" fill="rgb(26, 32, 44)" stroke="rgb(236, 201, 75)" strokeWidth="3" />
                           <text x={CENTER} y={CENTER} textAnchor="middle" dy=".3em" fill="rgb(236, 201, 75)" className="text-5xl font-bold cursor-pointer">
                                {selectedNumber}
                            </text>
                        </>
                    ) : (
                         <text x={CENTER} y={CENTER} textAnchor="middle" dy=".3em" fill="rgb(100, 116, 139)" className="text-lg font-semibold pointer-events-none">
                            Select a number
                        </text>
                    )}
                 </g>
            </svg>
            
            {/* Info Panel */}
            <div className={`absolute top-0 right-0 m-2 p-3 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg w-48 transition-opacity duration-500 ${selectedNumber ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 {selectedNumber && (
                    <>
                        <h4 className="text-base font-bold text-highlight flex items-center mb-2">
                           <ChainIcon className="w-5 h-5 mr-2"/> Top Pairs for {selectedNumber}
                        </h4>
                        <ul className="space-y-1 text-sm h-[200px] overflow-y-auto pr-2">
                           {partners.slice(0, 10).map(({ partner, count}) => (
                                <li key={partner} className="flex justify-between items-center">
                                    <span className="font-semibold text-text-primary">{partner}</span>
                                    <span className="text-xs text-text-secondary">{count} times</span>
                                </li>
                           ))}
                           {partners.length === 0 && <li className="text-text-secondary italic text-xs">No significant pair data found.</li>}
                        </ul>
                    </>
                )}
            </div>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg">
                <p className="text-xs text-text-secondary">Click any number to see its most frequent partners.</p>
            </div>
        </div>
    );
};

export default CircularPatternFinder;