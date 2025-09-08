import React, { useState, useMemo } from 'react';
import type { NumberFrequency } from '../types';
import { FireIcon, SnowflakeIcon } from './icons';

interface FrequencyHeatmapProps {
    items: NumberFrequency[];
    colorHex: string;
    title: string;
}

// Utility to convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
};

// Utility to interpolate between two RGB colors
const lerpColor = (
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number },
    factor: number
): string => {
    const f = Math.max(0, Math.min(1, factor)); // clamp factor
    const r = Math.round(color1.r + f * (color2.r - color1.r));
    const g = Math.round(color1.g + f * (color2.g - color1.g));
    const b = Math.round(color1.b + f * (color2.b - color1.b));
    return `rgb(${r}, ${g}, ${b})`;
};


const FrequencyHeatmap: React.FC<FrequencyHeatmapProps> = ({ items, colorHex, title }) => {
    const [highlightInput, setHighlightInput] = useState('');

    const highlightedNumbers = useMemo(() => {
        const numbers = highlightInput
            .split(/[\s,]+/)
            .map(n => parseInt(n.trim(), 10))
            .filter(n => !isNaN(n) && n > 0);
        return new Set(numbers);
    }, [highlightInput]);
    
    const analysis = useMemo(() => {
        if (items.length === 0) {
            return {
                sortedItems: [],
                minCount: 0,
                maxCount: 1,
                numberMap: new Map<number, number>(),
            };
        }
        
        const sortedItems = [...items].sort((a, b) => a.number - b.number);
        const counts = items.map(item => item.count);
        const minCount = Math.min(...counts);
        const maxCount = Math.max(...counts);
        const numberMap = new Map(items.map(item => [item.number, item.count]));
        
        return { sortedItems, minCount, maxCount, numberMap };
    }, [items]);

    const { sortedItems, minCount, maxCount, numberMap } = analysis;

    const coldColorRgb = { r: 30, g: 41, b: 59 }; // A deep slate, equivalent to tailwind's slate-800
    const hotColorRgb = useMemo(() => hexToRgb(colorHex) || { r: 255, g: 255, b: 255 }, [colorHex]);

    const getBackgroundColor = (number: number) => {
        const count = numberMap.get(number) ?? 0;
        if (maxCount === minCount) {
            return lerpColor(coldColorRgb, hotColorRgb, 0.5); // Mid-color if all counts are same
        }
        const factor = (count - minCount) / (maxCount - minCount);
        return lerpColor(coldColorRgb, hotColorRgb, factor);
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2 pb-3">
                 <input
                    id={`highlight-${title}`}
                    type="text"
                    value={highlightInput}
                    onChange={(e) => setHighlightInput(e.target.value)}
                    placeholder="Highlight balls (e.g., 5 12 43)"
                    className="w-full bg-gray-900 text-text-primary text-sm rounded-md px-3 py-1.5 border border-gray-700 focus:ring-2 focus:ring-highlight focus:outline-none transition-all"
                    aria-label={`Highlight ${title}`}
                />
                 <div className="flex items-center justify-center md:justify-end gap-4 bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5">
                    <span className="text-xs text-text-secondary flex items-center"><SnowflakeIcon className="w-4 h-4 mr-1.5" style={{ color: lerpColor(coldColorRgb, hotColorRgb, 0) }}/> Low Freq.</span>
                    <div className="w-24 h-2.5 rounded-full" style={{ background: `linear-gradient(to right, ${lerpColor(coldColorRgb, hotColorRgb, 0)}, ${lerpColor(coldColorRgb, hotColorRgb, 0.5)}, ${lerpColor(coldColorRgb, hotColorRgb, 1)})` }}></div>
                    <span className="text-xs text-text-secondary flex items-center"><FireIcon className="w-4 h-4 mr-1.5" style={{ color: lerpColor(coldColorRgb, hotColorRgb, 1) }}/> High Freq.</span>
                 </div>
            </div>

            <div 
                className="w-full flex-grow p-2 bg-gray-800/50 rounded-md ring-1 ring-white/10"
                role="figure"
                aria-label={`Frequency heatmap for ${title}`}
            >
                <div className="grid grid-cols-10 gap-1.5 max-h-[240px] overflow-y-auto pr-1">
                    {sortedItems.map(({ number }) => {
                        const isHighlighted = highlightedNumbers.has(number);
                        const count = numberMap.get(number) ?? 0;

                        return (
                             <div 
                                key={number} 
                                className="group relative aspect-square flex items-center justify-center rounded-md transition-all duration-200"
                                style={{ 
                                    backgroundColor: getBackgroundColor(number),
                                    boxShadow: isHighlighted ? `0 0 10px ${colorHex}, 0 0 5px #ffffffaa` : 'none',
                                    transform: isHighlighted ? 'scale(1.1)' : 'scale(1)',
                                    zIndex: isHighlighted ? 10 : 1,
                                }}
                                role="listitem"
                                aria-label={`Number ${number} appeared ${count} times`}
                            >
                                <span className="font-bold text-white text-sm md:text-base mix-blend-luminosity">
                                    {number}
                                </span>
                                 <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 flex flex-col items-center">
                                    <div className="px-2 py-1 bg-gray-900 text-text-primary text-xs rounded-md shadow-lg">
                                        <strong>Number {number}</strong>: {count} draws
                                    </div>
                                    <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900 -mt-px"></div>
                                </div>
                             </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FrequencyHeatmap;
