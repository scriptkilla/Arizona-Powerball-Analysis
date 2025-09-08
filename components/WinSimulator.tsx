import React, { useState, useMemo, ChangeEvent } from 'react';
import type { AnalysisResults, Ticket, SimulationResult } from '../types';
import { CalculatorIcon } from './icons';
import { runWinSimulation } from '../services/simulationService';
import { MAX_WHITE_BALL, MIN_WHITE_BALL, MAX_POWERBALL_CURRENT, MIN_POWERBALL, NUM_WHITE_BALLS } from '../constants';

interface WinSimulatorProps {
    analysisResults: AnalysisResults;
}

const WinSimulator: React.FC<WinSimulatorProps> = ({ analysisResults }) => {
    const [whiteBalls, setWhiteBalls] = useState<Array<string>>(Array(NUM_WHITE_BALLS).fill(''));
    const [powerball, setPowerball] = useState<string>('');
    const [numDraws, setNumDraws] = useState<number>(10000);
    const [withPowerPlay, setWithPowerPlay] = useState<boolean>(false);
    const [results, setResults] = useState<SimulationResult | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    
    const handleWhiteBallChange = (index: number, value: string) => {
        const newWhiteBalls = [...whiteBalls];
        newWhiteBalls[index] = value;
        setWhiteBalls(newWhiteBalls);
        setResults(null);
    };

    const validation = useMemo(() => {
        const errors: string[] = [];
        const wbNumbers = whiteBalls.map(v => parseInt(v, 10)).filter(n => !isNaN(n));
        const pbNumber = parseInt(powerball, 10);

        if (whiteBalls.some(wb => wb === '')) errors.push('Enter all 5 white balls.');
        if (powerball === '') errors.push('Enter a Powerball.');
        
        if (wbNumbers.length !== NUM_WHITE_BALLS || isNaN(pbNumber)) {
             return { isValid: false, errors, ticket: null };
        }

        const wbSet = new Set<number>();
        for (const num of wbNumbers) {
            if (num < MIN_WHITE_BALL || num > MAX_WHITE_BALL) {
                errors.push(`WBs must be ${MIN_WHITE_BALL}-${MAX_WHITE_BALL}.`);
                break;
            }
            if (wbSet.has(num)) {
                errors.push('White balls must be unique.');
                break;
            }
            wbSet.add(num);
        }

        if (pbNumber < MIN_POWERBALL || pbNumber > MAX_POWERBALL_CURRENT) {
            errors.push(`PB must be ${MIN_POWERBALL}-${MAX_POWERBALL_CURRENT}.`);
        }
        
        const ticket: Ticket = {
            whiteBalls: wbNumbers.sort((a, b) => a - b),
            powerball: pbNumber,
        };

        return { isValid: errors.length === 0, errors, ticket };
    }, [whiteBalls, powerball]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validation.isValid || !validation.ticket) return;

        setIsSimulating(true);
        setResults(null);

        // Use a timeout to allow the UI to update to the "simulating" state
        // before starting the potentially blocking calculation.
        setTimeout(() => {
            const simResults = runWinSimulation(
                validation.ticket!,
                numDraws,
                withPowerPlay,
                analysisResults.powerPlayFrequency
            );
            setResults(simResults);
            setIsSimulating(false);
        }, 50);
    };

    const getYearsFromDraws = (draws: number) => {
        const drawsPerWeek = 2; // Approximate
        const weeks = draws / drawsPerWeek;
        const years = weeks / 52;
        return years.toFixed(1);
    };

    const ResultDisplay: React.FC<{ res: SimulationResult }> = ({ res }) => (
        <div className="mt-4 pt-4 border-t border-gray-700 space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-text-primary text-center">Simulation Results</h3>
            <div className="text-center bg-gray-800 p-3 rounded-lg">
                 <p className="text-sm text-text-secondary">
                    Playing these numbers for <strong>{res.draws.toLocaleString()}</strong> draws is like playing twice a week for over <strong>{getYearsFromDraws(res.draws)}</strong> years.
                </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-800 p-2 rounded-lg">
                    <p className="text-xs text-text-secondary">Total Spend</p>
                    <p className="text-xl font-bold text-text-primary">${res.totalSpend.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800 p-2 rounded-lg">
                    <p className="text-xs text-text-secondary">Total Winnings</p>
                    <p className="text-xl font-bold text-highlight">${res.totalWinnings.toLocaleString()}</p>
                </div>
            </div>
             <div className={`p-3 rounded-lg text-center ${res.netResult >= 0 ? 'bg-green-900' : 'bg-red-900'}`}>
                <p className="text-sm font-semibold">{res.netResult >= 0 ? 'Net Profit' : 'Net Loss'}</p>
                <p className={`text-2xl font-bold ${res.netResult >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {res.netResult < 0 ? '-' : ''}${Math.abs(res.netResult).toLocaleString()}
                </p>
                <p className={`text-xs font-mono ${res.netResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                   ROI: {res.roi.toFixed(2)}%
                </p>
            </div>
            <div>
                <h4 className="font-semibold text-text-primary mb-2 text-center">Prize Breakdown</h4>
                <ul className="space-y-1 text-sm bg-gray-800 p-3 rounded-lg">
                    {Object.entries(res.winCounts).filter(([, count]) => count > 0).length > 0 ? (
                        Object.entries(res.winCounts)
                        .filter(([, count]) => count > 0)
                        .sort(([, a], [, b]) => b - a)
                        .map(([label, count]) => (
                             <li key={label} className="flex justify-between">
                                <span className="text-text-secondary">{label}:</span>
                                <span className="font-semibold text-text-primary">{count.toLocaleString()} times</span>
                            </li>
                        ))
                    ) : (
                         <li className="text-center text-text-secondary italic">No wins in this simulation.</li>
                    )}
                </ul>
            </div>
        </div>
    );

    return (
        <div className="bg-secondary p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3 text-text-primary flex items-center">
                <CalculatorIcon className="w-6 h-6 mr-2 text-green-400"/>
                Win Simulator
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Your Numbers</label>
                    <div className="grid grid-cols-6 gap-2">
                        {whiteBalls.map((val, i) => (
                            <input
                                key={i} type="number" value={val}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => handleWhiteBallChange(i, e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-center text-text-primary focus:ring-accent focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="#" min={MIN_WHITE_BALL} max={MAX_WHITE_BALL} aria-label={`White ball ${i + 1}`}
                            />
                        ))}
                         <input
                            type="number" value={powerball}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => { setPowerball(e.target.value); setResults(null); }}
                            className="w-full bg-red-800 border border-red-600 rounded-md p-2 text-center text-white placeholder-red-300 focus:ring-accent focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="PB" min={MIN_POWERBALL} max={MAX_POWERBALL_CURRENT} aria-label="Powerball"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="num-draws" className="block text-sm font-medium text-text-secondary mb-1">Number of Draws</label>
                    <select id="num-draws" value={numDraws} onChange={e => setNumDraws(Number(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent">
                        <option value="1000">1,000 Draws (~10 years)</option>
                        <option value="10000">10,000 Draws (~96 years)</option>
                        <option value="100000">100,000 Draws (~960 years)</option>
                        <option value="1000000">1,000,000 Draws (~9,600 years)</option>
                    </select>
                </div>
                 <div className="flex items-center">
                    <input id="powerplay-check" type="checkbox" checked={withPowerPlay} onChange={e => setWithPowerPlay(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-accent focus:ring-accent"/>
                    <label htmlFor="powerplay-check" className="ml-2 block text-sm text-text-primary">
                        Add Power Play (+$1 per ticket)
                    </label>
                </div>

                {!validation.isValid && validation.errors.length > 0 && (
                     <div className="text-xs text-red-400 pt-1">
                        {validation.errors[0]}
                    </div>
                )}

                <button type="submit" disabled={!validation.isValid || isSimulating}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors">
                    {isSimulating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                            Simulating...
                        </>
                    ) : 'Run Simulation' }
                </button>
            </form>
            {results && <ResultDisplay res={results} />}
        </div>
    );
};

export default WinSimulator;
