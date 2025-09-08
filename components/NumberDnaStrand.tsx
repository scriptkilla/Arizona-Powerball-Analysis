import React, { useState, useMemo } from 'react';
import type { Draw } from '../types';
import { MAX_WHITE_BALL } from '../constants';

// --- Type Definitions ---
type ColorMode = 'sum' | 'oddEven' | 'lowMidHigh';

interface ProcessedDraw {
    original: Draw;
    sum: number;
    oddEvenRatio: string;
    lowMidHighRatio: string;
    color: string;
    tooltip: string;
}

// --- Color & Calculation Constants ---
const ODD_EVEN_COLORS: { [key: string]: string } = {
    '5O/0E': '#ef4444', '0O/5E': '#ef4444',
    '4O/1E': '#f97316', '1O/4E': '#f97316',
    '3O/2E': '#84cc16', '2O/3E': '#84cc16',
};

const LMH_COLORS: { [key: string]: string } = {
    dominantLow: '#3b82f6',
    dominantMid: '#ec4899',
    dominantHigh: '#eab308',
    balanced: '#a855f7',
};

// --- Helper Functions ---
const getDrawProperties = (draw: Draw) => {
    const sum = draw.numbers.reduce((a, b) => a + b, 0);
    const oddCount = draw.numbers.filter(n => n % 2 !== 0).length;
    const oddEvenRatio = `${oddCount}O/${5 - oddCount}E`;

    const lowMax = Math.floor(MAX_WHITE_BALL / 3); // e.g., 1-23
    const midMax = Math.floor(MAX_WHITE_BALL * 2 / 3); // e.g., 24-46
    let low = 0, mid = 0, high = 0;
    draw.numbers.forEach(n => {
        if (n <= lowMax) low++;
        else if (n <= midMax) mid++;
        else high++;
    });
    const lowMidHighRatio = `${low}L-${mid}M-${high}H`;

    return { sum, oddEvenRatio, lowMidHighRatio, low, mid, high };
};

const getSumColor = (sum: number, minSum: number, maxSum: number): string => {
    if (maxSum === minSum) return 'hsl(200, 80%, 60%)';
    const factor = (sum - minSum) / (maxSum - minSum);
    // Gradient: blue -> yellow -> red
    const hue = 210 - (factor * 210);
    const saturation = 70 + (factor * 20);
    const lightness = 50 + (Math.sin(factor * Math.PI) * 15);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const getLmhColor = (low: number, mid: number, high: number): string => {
    if (low >= 3) return LMH_COLORS.dominantLow;
    if (mid >= 3) return LMH_COLORS.dominantMid;
    if (high >= 3) return LMH_COLORS.dominantHigh;
    return LMH_COLORS.balanced;
};

// --- Component ---
const NumberDnaStrand: React.FC<{ draws: Draw[] }> = ({ draws }) => {
    const [colorMode, setColorMode] = useState<ColorMode>('sum');
    const [filterGene, setFilterGene] = useState<string | null>(null);

    const reversedDraws = useMemo(() => [...draws].reverse(), [draws]);

    const { processedDraws, uniqueGenes, analysis } = useMemo(() => {
        if (reversedDraws.length === 0) {
            return { processedDraws: [], uniqueGenes: new Set<string>(), analysis: {} };
        }

        const sums = reversedDraws.map(d => d.numbers.reduce((a, b) => a + b, 0));
        const minSum = Math.min(...sums);
        const maxSum = Math.max(...sums);

        const geneSet = new Set<string>();

        const data = reversedDraws.map(draw => {
            const props = getDrawProperties(draw);
            let color = '';
            let tooltip = '';
            let gene = '';

            switch (colorMode) {
                case 'sum':
                    color = getSumColor(props.sum, minSum, maxSum);
                    tooltip = `Sum: ${props.sum}`;
                    gene = props.sum < minSum + (maxSum - minSum) / 3 ? 'Low Sum' : props.sum > maxSum - (maxSum - minSum) / 3 ? 'High Sum' : 'Mid Sum';
                    break;
                case 'oddEven':
                    color = ODD_EVEN_COLORS[props.oddEvenRatio] || '#6b7280';
                    tooltip = `Ratio: ${props.oddEvenRatio}`;
                    gene = props.oddEvenRatio;
                    break;
                case 'lowMidHigh':
                    color = getLmhColor(props.low, props.mid, props.high);
                    tooltip = `Distribution: ${props.lowMidHighRatio}`;
                    gene = props.lowMidHighRatio;
                    break;
            }
            geneSet.add(gene);

            return { original: draw, ...props, color, tooltip, gene };
        });

        return {
            processedDraws: data,
            uniqueGenes: geneSet,
            analysis: { minSum, maxSum }
        };
    }, [reversedDraws, colorMode]);
    
    const geneOptions = useMemo(() => Array.from(uniqueGenes).sort(), [uniqueGenes]);
    
    if (draws.length === 0) {
       return <p className="text-text-secondary text-center py-8">No draw data to display in the DNA strand.</p>;
    }
    
    const isSingleDraw = draws.length === 1;

    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            {!isSingleDraw && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 bg-gray-900 rounded-md items-end">
                    <div>
                        <label htmlFor="color-mode" className="block text-sm font-medium text-text-secondary mb-1">Color Code By</label>
                        <select
                            id="color-mode"
                            value={colorMode}
                            onChange={(e) => { setColorMode(e.target.value as ColorMode); setFilterGene(null); }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent"
                        >
                            <option value="sum">White Ball Sum</option>
                            <option value="oddEven">Odd/Even Ratio</option>
                            <option value="lowMidHigh">Low/Mid/High Distribution</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="gene-filter" className="block text-sm font-medium text-text-secondary mb-1">Highlight Gene</label>
                        <select
                            id="gene-filter"
                            value={filterGene || ''}
                            onChange={(e) => setFilterGene(e.target.value || null)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent"
                        >
                            <option value="">Show All</option>
                            {geneOptions.map(gene => <option key={gene} value={gene}>{gene}</option>)}
                        </select>
                    </div>
                     <div className="h-full flex items-center justify-center text-xs text-text-secondary">
                        {colorMode === 'sum' && <span>Low (Blue) to High (Red)</span>}
                        {colorMode === 'oddEven' && <div className="flex gap-2">{Object.entries(ODD_EVEN_COLORS).slice(0,3).map(([key, color]) => <div key={key} className="flex items-center"><span style={{backgroundColor: color}} className="w-3 h-3 rounded-sm mr-1"/> {key.slice(0,5)}</div>)}</div>}
                        {colorMode === 'lowMidHigh' && <div className="flex gap-2">{Object.entries(LMH_COLORS).map(([key, color]) => <div key={key} className="flex items-center"><span style={{backgroundColor: color}} className="w-3 h-3 rounded-sm mr-1"/> {key}</div>)}</div>}
                    </div>
                </div>
            )}

            <div className={`relative ${!isSingleDraw ? 'max-h-[60vh] overflow-y-auto pr-4' : ''}`}>
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 flex justify-between w-full px-2 pointer-events-none">
                    <div className="w-1.5 h-full bg-gray-700 rounded-full opacity-50"></div>
                    <div className="w-1.5 h-full bg-gray-700 rounded-full opacity-50"></div>
                </div>
                <div className="space-y-1 py-2">
                    {processedDraws.map((draw, index) => {
                        const isFilteredOut = filterGene && draw.gene !== filterGene;
                        return (
                             <div 
                                key={draw.original.drawDate.toISOString() + index}
                                className="group relative flex items-center justify-center transition-opacity duration-300"
                                style={{ opacity: isFilteredOut ? 0.2 : 1 }}
                            >
                                <div className="w-full h-0.5" style={{ background: `linear-gradient(to right, transparent, ${draw.color}, transparent)` }}></div>
                                <div className="absolute flex items-center" style={{ width: '90%' }}>
                                     <div className={`flex items-center gap-1.5 ${index % 2 === 0 ? 'ml-auto' : 'mr-auto flex-row-reverse'}`}>
                                        <div className="flex items-center gap-1.5">
                                            {draw.original.numbers.map(n => (
                                                <div key={n} className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold">{n}</div>
                                            ))}
                                             <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{draw.original.powerball}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 flex flex-col items-center">
                                    <div className="px-2 py-1 bg-gray-900 text-text-primary text-xs rounded-md shadow-lg border border-gray-600">
                                        <div className="font-bold">{draw.original.drawDate.toLocaleDateString()}</div>
                                        <div>{draw.tooltip}</div>
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

export default NumberDnaStrand;
