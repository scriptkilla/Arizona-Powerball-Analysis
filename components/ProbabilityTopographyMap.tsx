import React, { useMemo } from 'react';

interface BayesianItem {
    number: number;
    probability: number;
}

interface ProbabilityTopographyMapProps {
    items: BayesianItem[];
    maxBallNumber: number;
    title: string;
}

const ProbabilityTopographyMap: React.FC<ProbabilityTopographyMapProps> = ({ items, maxBallNumber, title }) => {
    const probabilityMap = useMemo(() => new Map(items.map(item => [item.number, item.probability])), [items]);
    
    // FIX: handle case where items can be empty.
    const probabilities = items.length > 0 ? items.map(item => item.probability) : [0];
    const minProb = Math.min(...probabilities);
    const maxProb = Math.max(...probabilities);

    const coldColor = { r: 49, g: 46, b: 129 }; // indigo-900
    const hotColor = { r: 253, g: 224, b: 71 }; // yellow-300

    const lerpColor = (factor: number) => {
        const f = Math.max(0, Math.min(1, factor));
        const r = Math.round(coldColor.r + f * (hotColor.r - coldColor.r));
        const g = Math.round(coldColor.g + f * (hotColor.g - coldColor.g));
        const b = Math.round(coldColor.b + f * (hotColor.b - coldColor.b));
        return `rgb(${r}, ${g}, ${b})`;
    };

    const getCellStyle = (number: number) => {
        const prob = probabilityMap.get(number) ?? 0;
        const factor = maxProb > minProb ? (prob - minProb) / (maxProb - minProb) : 0.5;
        const color = lerpColor(factor);
        
        const shadowOpacity = 0.4 + factor * 0.5;
        const shadowY = 6 - factor * 5;
        
        return {
            backgroundColor: color,
            boxShadow: `0px ${shadowY}px 12px -2px rgba(0,0,0,${shadowOpacity})`,
            transform: `translateZ(${factor * 20}px) translateY(-${factor * 4}px)`,
        };
    };
    
    const numCols = Math.ceil(Math.sqrt(maxBallNumber) * 1.5);

    return (
        <div className="w-full flex flex-col items-center">
            <div className="w-full p-4" style={{ perspective: '1000px' }}>
                 <div 
                    className="grid gap-2 transition-transform duration-500"
                    style={{ 
                        gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
                        transform: 'rotateX(55deg) rotateZ(0deg) scale(0.9)',
                    }}
                >
                    {Array.from({ length: maxBallNumber }, (_, i) => i + 1).map(number => (
                        <div key={number} className="group relative">
                            <div
                                className="aspect-square flex items-center justify-center rounded-md text-white font-bold text-sm transition-all duration-300"
                                style={getCellStyle(number)}
                            >
                                {number}
                            </div>
                             <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 flex flex-col items-center">
                                <div className="px-2 py-1 bg-gray-900 text-text-primary text-xs rounded-md shadow-lg" style={{ transform: 'rotateX(-55deg)' }}>
                                    <strong>#{number}</strong>: {( (probabilityMap.get(number) ?? 0) * 100).toFixed(3)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5">
                    <span className="text-xs text-text-secondary flex items-center">Low Prob.</span>
                    <div className="w-24 h-2.5 rounded-full" style={{ background: `linear-gradient(to right, ${lerpColor(0)}, ${lerpColor(0.5)}, ${lerpColor(1)})` }}></div>
                    <span className="text-xs text-text-secondary flex items-center">High Prob.</span>
            </div>
        </div>
    );
};

export default ProbabilityTopographyMap;
