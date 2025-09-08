import React, { useMemo, useState, useRef, useCallback } from 'react';
import type { Draw } from '../types';
import { MAX_WHITE_BALL } from '../constants';

interface FlowStateRiverMapProps {
    draws: Draw[];
}

interface TooltipData {
    x: number;
    y: number;
    date: string;
    topNumbers: { number: number; count: number }[];
}

type ProcessedDraw = {
    date: Date;
    frequencies: Map<number, number>;
};

const ROLLING_WINDOW_SIZE = 50;
const SVG_HEIGHT = 700;
const PIXELS_PER_DRAW = 5;
const MARGIN = { top: 20, right: 20, bottom: 40, left: 40 };
const CHART_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

const scale = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
    if (inMax - inMin === 0) return (outMin + outMax) / 2;
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

const FlowStateRiverMap: React.FC<FlowStateRiverMapProps> = ({ draws }) => {
    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const processedData = useMemo<ProcessedDraw[]>(() => {
        if (draws.length < ROLLING_WINDOW_SIZE) return [];

        const data: ProcessedDraw[] = [];
        for (let i = ROLLING_WINDOW_SIZE; i < draws.length; i++) {
            const windowSlice = draws.slice(i - ROLLING_WINDOW_SIZE, i);
            const frequencies = new Map<number, number>();
            for (const draw of windowSlice) {
                for (const num of draw.numbers) {
                    frequencies.set(num, (frequencies.get(num) || 0) + 1);
                }
            }
            data.push({ date: draws[i].drawDate, frequencies });
        }
        return data;
    }, [draws]);

    const maxFrequency = useMemo(() => {
        if (processedData.length === 0) return 1;
        let max = 0;
        processedData.forEach(d => {
            d.frequencies.forEach(count => {
                if (count > max) max = count;
            });
        });
        return max || 1;
    }, [processedData]);

    const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current || processedData.length === 0) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        
        const index = Math.floor(x / PIXELS_PER_DRAW);
        if (index < 0 || index >= processedData.length) {
            setTooltipData(null);
            return;
        }

        const dataPoint = processedData[index];
        const topNumbers = Array.from(dataPoint.frequencies.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([number, count]) => ({ number, count }));
            
        setTooltipData({
            x: (index * PIXELS_PER_DRAW) + (PIXELS_PER_DRAW / 2),
            y: event.clientY - rect.top,
            date: dataPoint.date.toLocaleDateString(),
            topNumbers,
        });
    }, [processedData]);

    const handleMouseLeave = useCallback(() => {
        setTooltipData(null);
    }, []);
    
    const svgWidth = processedData.length * PIXELS_PER_DRAW;

    if (draws.length < ROLLING_WINDOW_SIZE) {
        return (
            <div className="bg-gray-800 p-4 rounded-lg text-text-secondary">
                Not enough draw data to render the River Map. A minimum of {ROLLING_WINDOW_SIZE} draws in the selected range is required.
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-text-primary">Flow State River Map</h3>
            <p className="text-xs text-text-secondary mb-4">
                Scroll horizontally to travel through time. Wider, brighter streams indicate a number was 'hot' (frequently drawn) during that period.
            </p>
            <div className="w-full overflow-x-auto bg-gray-900 rounded-md p-2 relative" style={{ scrollbarColor: '#4a5568 #2d3748' }}>
                <svg
                    ref={svgRef}
                    width={svgWidth + MARGIN.left + MARGIN.right}
                    height={SVG_HEIGHT}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
                        {/* River Streams */}
                        {Array.from({ length: MAX_WHITE_BALL }, (_, i) => i + 1).map(num => {
                            let pathD = '';
                            for (let i = 0; i < processedData.length; i++) {
                                const y = scale(num, 1, MAX_WHITE_BALL, 0, CHART_HEIGHT);
                                const x = i * PIXELS_PER_DRAW;
                                if (i === 0) pathD += `M ${x} ${y}`;
                                else pathD += ` L ${x} ${y}`;
                            }
                            // This path is a straight line, but its stroke will be a gradient giving the river effect
                            return (
                                <path key={num} d={pathD} fill="none" stroke={`url(#gradient-${num})`} strokeWidth="10" strokeLinecap="round" />
                            );
                        })}

                        {/* Gradients definitions */}
                        <defs>
                            {Array.from({ length: MAX_WHITE_BALL }, (_, i) => i + 1).map(num => (
                                <linearGradient key={num} id={`gradient-${num}`} x1="0" x2="1" y1="0" y2="0">
                                    {processedData.map((d, index) => {
                                        const count = d.frequencies.get(num) || 0;
                                        const hotness = scale(count, 0, maxFrequency, 0, 1);
                                        const color = `hsl(48, ${100 * hotness}%, ${20 + 60 * hotness}%)`;
                                        const opacity = 0.1 + hotness * 0.9;
                                        return <stop key={index} offset={`${(index / processedData.length) * 100}%`} stopColor={color} stopOpacity={opacity} />;
                                    })}
                                </linearGradient>
                            ))}
                        </defs>
                        
                        {/* Y-Axis Labels */}
                        {Array.from({ length: Math.floor(MAX_WHITE_BALL / 10) + 1 }, (_, i) => {
                            const num = i * 10 || 1;
                            const y = scale(num, 1, MAX_WHITE_BALL, 0, CHART_HEIGHT);
                            return (
                                <text key={num} x={-10} y={y} dy=".3em" textAnchor="end" className="text-xs fill-text-secondary">
                                    {num}
                                </text>
                            );
                        })}

                        {/* X-Axis Labels / Ticks */}
                        {processedData.map((d, i) => {
                            if (i % 100 === 0) {
                                return (
                                    <g key={i} transform={`translate(${i * PIXELS_PER_DRAW}, ${CHART_HEIGHT})`}>
                                        <line y2="5" className="stroke-gray-600" />
                                        <text y="20" textAnchor="middle" className="text-xs fill-text-secondary">
                                            {d.date.getFullYear()}
                                        </text>
                                    </g>
                                );
                            }
                            return null;
                        })}
                        
                        {/* Tooltip Scrubber Line */}
                        {tooltipData && (
                            <line
                                x1={tooltipData.x} y1="0"
                                x2={tooltipData.x} y2={CHART_HEIGHT}
                                className="stroke-highlight"
                                strokeWidth="1.5"
                                strokeDasharray="4 4"
                                pointerEvents="none"
                            />
                        )}
                    </g>
                </svg>

                 {/* Tooltip Box */}
                 {tooltipData && (
                    <div className="absolute bg-gray-900/80 backdrop-blur-sm text-text-primary p-2 rounded-md text-xs shadow-lg pointer-events-none"
                         style={{
                             left: `${tooltipData.x + MARGIN.left + 15}px`,
                             top: `${tooltipData.y}px`,
                             transform: `translateY(-50%)`,
                             border: '1px solid #ecc94b'
                         }}
                    >
                        <p className="font-bold text-highlight">{tooltipData.date}</p>
                        <p className="mt-1 text-text-secondary">Hottest Numbers:</p>
                        <ul>
                            {tooltipData.topNumbers.map(item => (
                                <li key={item.number}>
                                    <span className="font-semibold">{item.number}</span>: {item.count} times
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 w-max mx-auto">
                <span className="text-xs text-text-secondary">Cold</span>
                <div className="w-24 h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, hsl(48, 0%, 20%), hsl(48, 50%, 55%), hsl(48, 100%, 80%))' }}></div>
                <span className="text-xs text-text-secondary">Hot</span>
            </div>
        </div>
    );
};

export default FlowStateRiverMap;