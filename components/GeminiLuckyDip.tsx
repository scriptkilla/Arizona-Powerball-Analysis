import React, { useState, useMemo, ChangeEvent } from 'react';
import type { AnalysisResults, Ticket, AITicketAnalysis } from '../types';
import { BeakerIcon, CheckCircleIcon, XCircleIcon, LightbulbIcon, StarIcon } from './icons';
import { analyzeTicketWithAi } from '../services/geminiService';
import { MAX_WHITE_BALL, MIN_WHITE_BALL, MAX_POWERBALL_CURRENT, MIN_POWERBALL, NUM_WHITE_BALLS } from '../constants';

interface AITicketAnalyzerProps {
    analysisResults: AnalysisResults | null;
}

const AITicketAnalyzer: React.FC<AITicketAnalyzerProps> = ({ analysisResults }) => {
    const [whiteBalls, setWhiteBalls] = useState<Array<string>>(Array(NUM_WHITE_BALLS).fill(''));
    const [powerball, setPowerball] = useState<string>('');
    const [analysis, setAnalysis] = useState<AITicketAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState('');

    const handleWhiteBallChange = (index: number, value: string) => {
        const newWhiteBalls = [...whiteBalls];
        newWhiteBalls[index] = value;
        setWhiteBalls(newWhiteBalls);
        setAnalysis(null);
        setError('');
    };
    
    const handlePowerballChange = (value: string) => {
        setPowerball(value);
        setAnalysis(null);
        setError('');
    };

    const validation = useMemo(() => {
        const errors: string[] = [];
        const wbNumbers = whiteBalls.map(v => parseInt(v, 10)).filter(n => !isNaN(n));
        const pbNumber = parseInt(powerball, 10);

        if (whiteBalls.some(wb => wb === '')) errors.push('Enter all 5 white balls.');
        if (powerball === '') errors.push('Enter a Powerball.');
        
        if (wbNumbers.length !== NUM_WHITE_BALLS || isNaN(pbNumber)) {
             return { isValid: false, errors };
        }

        const wbSet = new Set<number>();
        for (const num of wbNumbers) {
            if (num < MIN_WHITE_BALL || num > MAX_WHITE_BALL) {
                errors.push(`White balls must be between ${MIN_WHITE_BALL} and ${MAX_WHITE_BALL}.`);
                break;
            }
            if (wbSet.has(num)) {
                errors.push('White ball numbers must be unique.');
                break;
            }
            wbSet.add(num);
        }

        if (!isNaN(pbNumber) && (pbNumber < MIN_POWERBALL || pbNumber > MAX_POWERBALL_CURRENT)) {
            errors.push(`Powerball must be between ${MIN_POWERBALL} and ${MAX_POWERBALL_CURRENT}.`);
        }

        return { isValid: errors.length === 0, errors };
    }, [whiteBalls, powerball]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validation.isValid || !analysisResults) return;

        setIsAnalyzing(true);
        setError('');
        setAnalysis(null);

        const ticket: Ticket = {
            whiteBalls: whiteBalls.map(v => parseInt(v, 10)).sort((a,b) => a-b),
            powerball: parseInt(powerball, 10),
        };

        try {
            const result = await analyzeTicketWithAi(ticket, analysisResults);
            setAnalysis(result);
        } catch (e) {
             if (e instanceof Error) {
                setError(`AI Analysis Failed: ${e.message}`);
            } else {
                 setError('An unknown error occurred during AI analysis.');
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!analysisResults) return null;

    return (
        <div className="bg-secondary p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3 text-text-primary">AI Ticket Analyzer</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">White Balls</label>
                    <div className="grid grid-cols-5 gap-2">
                        {whiteBalls.map((val, i) => (
                            <input
                                key={i}
                                type="number"
                                value={val}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => handleWhiteBallChange(i, e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-center text-text-primary focus:ring-accent focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder={'#'}
                                min={MIN_WHITE_BALL}
                                max={MAX_WHITE_BALL}
                                aria-label={`White ball ${i + 1}`}
                            />
                        ))}
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Powerball</label>
                    <input
                        type="number"
                        value={powerball}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handlePowerballChange(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-center text-text-primary focus:ring-accent focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="PB"
                        min={MIN_POWERBALL}
                        max={MAX_POWERBALL_CURRENT}
                        aria-label="Powerball"
                    />
                </div>
                
                {!validation.isValid && validation.errors.length > 0 && (
                     <div className="text-xs text-red-400 pt-1">
                        {validation.errors[0]}
                    </div>
                )}
                
                <button 
                    type="submit" 
                    disabled={!validation.isValid || isAnalyzing}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors">
                    <BeakerIcon className={`w-5 h-5 mr-2 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                    {isAnalyzing ? 'AI is Analyzing...' : 'Analyze Ticket'}
                </button>
            </form>

            {error && (
                <div className="mt-4 text-sm bg-red-900 border border-red-500 text-red-200 p-3 rounded-lg">
                    {error}
                </div>
            )}
            
            {analysis && (
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-4 animate-fade-in">
                    <h3 className="text-lg font-semibold text-text-primary text-center">AI Analysis Results</h3>
                    
                    <div className="bg-gray-800 p-4 rounded-lg text-center">
                        <p className="text-sm text-text-secondary mb-2">Statistical Alignment Score</p>
                        <div className="flex items-center justify-center space-x-1">
                            {[...Array(10)].map((_, i) => (
                                <StarIcon key={i} className={`w-7 h-7 transition-colors duration-300 ${i < analysis.luckScore ? 'text-highlight' : 'text-gray-600'}`} />
                            ))}
                        </div>
                        <p className="text-3xl font-bold text-highlight mt-1">{analysis.luckScore}<span className="text-lg text-text-secondary">/10</span></p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-800 p-3 rounded-lg">
                            <h4 className="flex items-center text-md font-semibold text-green-400 mb-2">
                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                                Strengths
                            </h4>
                            <ul className="space-y-2 text-sm text-text-primary list-disc list-inside">
                                {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                         <div className="bg-gray-800 p-3 rounded-lg">
                            <h4 className="flex items-center text-md font-semibold text-red-400 mb-2">
                                <XCircleIcon className="w-5 h-5 mr-2" />
                                Weaknesses
                            </h4>
                            <ul className="space-y-2 text-sm text-text-primary list-disc list-inside">
                                {analysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                        </div>
                    </div>
                    
                     <div className="bg-gray-800 p-3 rounded-lg">
                        <h4 className="flex items-center text-md font-semibold text-blue-400 mb-2">
                            <LightbulbIcon className="w-5 h-5 mr-2" />
                            Overall Verdict
                        </h4>
                        <p className="text-sm text-text-secondary italic">
                           {analysis.overallVerdict}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AITicketAnalyzer;
