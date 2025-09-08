import React, { useState, useMemo, useCallback } from 'react';
import type { AnalysisResults, Ticket } from '../types';
import { MAX_WHITE_BALL, MAX_POWERBALL_CURRENT, NUM_WHITE_BALLS } from '../constants';
import { QuantumTunnelingIcon } from './icons';

interface QuantumTunnelingPredictorProps {
    analysisResults: AnalysisResults;
}

const QuantumTunnelingPredictor: React.FC<QuantumTunnelingPredictorProps> = ({ analysisResults }) => {
    const [tunnelingDepth, setTunnelingDepth] = useState(50);
    const [isTunneling, setIsTunneling] = useState(false);
    const [tunnelPath, setTunnelPath] = useState<number[]>([]);
    const [finalTicket, setFinalTicket] = useState<Ticket | null>(null);

    const { probMap, minProb, maxProb, pbProbMap, minPbProb, maxPbProb } = useMemo(() => {
        const fullProbMap = new Map(analysisResults.bayesianWhiteBallProbabilities.map(p => [p.number, p.probability]));
        const fullPbProbMap = new Map(analysisResults.bayesianPowerballProbabilities.map(p => [p.number, p.probability]));
        
        const fullProbs = Array.from(fullProbMap.values());
        const fullPbProbs = Array.from(fullPbProbMap.values());

        return {
            probMap: fullProbMap,
            minProb: Math.min(...fullProbs),
            maxProb: Math.max(...fullProbs),
            pbProbMap: fullPbProbMap,
            minPbProb: Math.min(...fullPbProbs),
            maxPbProb: Math.max(...fullPbProbs),
        };
    }, [analysisResults]);

    const getCellStyle = useCallback((number: number, type: 'white' | 'powerball') => {
        const map = type === 'white' ? probMap : pbProbMap;
        const min = type === 'white' ? minProb : minPbProb;
        const max = type === 'white' ? maxProb : maxPbProb;
        
        const prob = map.get(number) || 0;
        const factor = max > min ? (prob - min) / (max - min) : 0.5;

        const size = 2 + factor * 2.5; // size in rem
        const color = `hsl(180, ${80 * factor}%, ${30 + 40 * factor}%)`; // Teal gradient
        const opacity = 0.6 + factor * 0.4;
        
        return {
            width: `${size}rem`,
            height: `${size}rem`,
            backgroundColor: color,
            opacity: opacity,
            transition: 'all 0.3s ease-in-out',
        };
    }, [probMap, minProb, maxProb, pbProbMap, minPbProb, maxPbProb]);

    const handleTunnel = () => {
        if (isTunneling) return;
        setIsTunneling(true);
        setFinalTicket(null);
        setTunnelPath([]);

        // Simulation logic
        const weightedNumbers = analysisResults.bayesianWhiteBallProbabilities
            .slice(0, tunnelingDepth) // Consider top N numbers based on depth
            .map(p => ({ number: p.number, weight: p.probability }));
            
        let selectedWhiteBalls = new Set<number>();
        let path: number[] = [];

        const interval = setInterval(() => {
            if (selectedWhiteBalls.size >= NUM_WHITE_BALLS) {
                clearInterval(interval);
                // Select Powerball
                const pbSorted = [...analysisResults.bayesianPowerballProbabilities].sort((a,b) => b.probability - a.probability);
                const powerball = pbSorted[0].number;
                
                setFinalTicket({
                    whiteBalls: Array.from(selectedWhiteBalls).sort((a, b) => a - b),
                    powerball: powerball,
                });
                setTunnelPath(prev => [...prev, powerball + 100]); // Use offset for PB
                setIsTunneling(false);
                return;
            }

            const totalWeight = weightedNumbers.reduce((sum, p) => sum + p.weight, 0);
            let random = Math.random() * totalWeight;
            let chosen = -1;

            for (const item of weightedNumbers) {
                random -= item.weight;
                if (random <= 0) {
                    chosen = item.number;
                    if (!selectedWhiteBalls.has(chosen)) {
                        break;
                    }
                }
            }
             // Fallback if loop finishes
            if (chosen === -1 || selectedWhiteBalls.has(chosen)) {
                chosen = weightedNumbers.find(n => !selectedWhiteBalls.has(n.number))?.number || -1;
            }

            if (chosen !== -1) {
                selectedWhiteBalls.add(chosen);
                setTunnelPath(prev => [...prev, chosen]);
            }
        }, 300);
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg flex flex-col items-center">
            <h3 className="text-lg font-semibold text-text-primary">Quantum Tunneling Predictor</h3>
            <p className="text-xs text-text-secondary mb-4 max-w-lg text-center">
                This simulates finding the path of least resistance through a probability field. Larger, brighter numbers have a higher Bayesian probability.
            </p>

            <div className="w-full max-w-2xl p-4 bg-gray-900 rounded-lg" style={{ perspective: '800px' }}>
                <div className="grid grid-cols-10 gap-2" style={{ transform: 'rotateX(45deg)' }}>
                    {Array.from({ length: MAX_WHITE_BALL }, (_, i) => i + 1).map(num => (
                         <div
                            key={num}
                            className={`flex items-center justify-center rounded-full font-bold text-white transition-all duration-300
                                ${tunnelPath.includes(num) ? 'scale-125 ring-4 ring-yellow-300 shadow-lg shadow-yellow-300/50' : ''}`}
                            style={getCellStyle(num, 'white')}
                        >
                            <span className="text-sm mix-blend-overlay">{num}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full max-w-md flex flex-col items-center gap-4 mt-6 bg-gray-900 p-4 rounded-lg">
                <div className="w-full">
                    <label htmlFor="tunnel-depth" className="block text-sm font-medium text-text-secondary text-center">
                        Tunneling Depth: <span className="font-bold text-highlight">{tunnelingDepth}</span> Most Probable Numbers
                    </label>
                    <input
                        id="tunnel-depth" type="range" min="10" max="69"
                        value={tunnelingDepth}
                        onChange={(e) => setTunnelingDepth(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-highlight mt-2"
                        disabled={isTunneling}
                    />
                </div>
                <button
                    onClick={handleTunnel}
                    disabled={isTunneling}
                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-500 disabled:cursor-wait text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors text-lg"
                >
                    <QuantumTunnelingIcon className={`w-6 h-6 mr-3 ${isTunneling ? 'animate-spin' : ''}`} />
                    {isTunneling ? 'Tunneling...' : 'Charge Tunnel'}
                </button>
            </div>
            
            {finalTicket && (
                <div className="mt-6 w-full max-w-md bg-gray-900 p-4 rounded-lg border-2 border-yellow-300 shadow-lg shadow-yellow-300/20 animate-fade-in">
                    <h4 className="text-center font-semibold text-highlight">Quantum-Derived Ticket:</h4>
                    <div className="flex items-center justify-center gap-3 mt-3">
                        {finalTicket.whiteBalls.map(num => (
                            <div key={num} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold">
                                {num}
                            </div>
                        ))}
                        <div className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center text-lg font-bold">
                            {finalTicket.powerball}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuantumTunnelingPredictor;
