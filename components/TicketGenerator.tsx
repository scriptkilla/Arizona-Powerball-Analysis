import React, { useState } from 'react';
import type { AnalysisResults, Strategy, Ticket } from '../types';
import { MagicWandIcon, DownloadIcon, CubeIcon } from './icons';
import { NUM_TICKETS_TO_GENERATE } from '../constants';

interface TicketGeneratorProps {
    analysisResults: AnalysisResults | null;
    onGenerate: (strategy: Strategy, options: { trendDraws: number }) => void;
    generatedTickets: Ticket[];
    isGenerating: boolean;
}

const TicketDisplay: React.FC<{ ticket: Ticket }> = ({ ticket }) => (
    <div className="bg-gray-800 p-3 rounded-lg shadow-inner space-y-2">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
                {ticket.whiteBalls.map(num => (
                    <div key={num} className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold text-sm">
                        {num}
                    </div>
                ))}
            </div>
            <div className="flex items-center space-x-1">
                <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {ticket.powerball}
                </div>
                {ticket.powerPlay && (
                     <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm" title={`Power Play ${ticket.powerPlay}x`}>
                        {ticket.powerPlay}x
                    </div>
                )}
            </div>
        </div>
        
        {ticket.historicalWinChance !== undefined && (
             <div className="pt-2 border-t border-gray-700 space-y-1">
                <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-text-secondary">Historical Win Profile:</span>
                    <span className="font-bold text-cyan-400">{ticket.historicalWinChance.toFixed(1)}%</span>
                </div>
                 <div className="w-full bg-gray-600 rounded-full h-1.5" title={`This combination's Odd/Even structure has appeared in ${ticket.historicalWinChance.toFixed(1)}% of past winning draws.`}>
                    <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${ticket.historicalWinChance}%` }}></div>
                </div>
                {ticket.probabilityInsight && (
                     <p className="text-xs text-text-secondary italic text-center">
                        {ticket.probabilityInsight}
                    </p>
                )}
            </div>
        )}

        {ticket.confidenceScore !== undefined && (
            <div className="pt-2 border-t border-gray-700 space-y-1">
                <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-text-secondary">AI Confidence:</span>
                    <span className="font-bold text-highlight">{ticket.confidenceScore.toFixed(0)}%</span>
                </div>
                 <div className="w-full bg-gray-600 rounded-full h-1.5">
                    <div className="bg-highlight h-1.5 rounded-full" style={{ width: `${ticket.confidenceScore}%` }}></div>
                </div>
                {ticket.reasoning && (
                    <div className="text-xs text-text-secondary pt-1">
                        <span className="font-semibold">Reasoning:</span>
                        {Array.isArray(ticket.reasoning) ? (
                            <ul className="list-disc list-inside pl-2 italic">
                                {ticket.reasoning.map((reason, i) => (
                                    <li key={i}>{reason}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="italic inline ml-1">{ticket.reasoning}</p>
                        )}
                    </div>
                )}
            </div>
        )}
    </div>
);


const TicketGenerator: React.FC<TicketGeneratorProps> = ({ analysisResults, onGenerate, generatedTickets, isGenerating }) => {
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy>('balanced');
    const [trendDraws, setTrendDraws] = useState<number>(10);
    
    const strategies: { id: Strategy; name: string; description: string }[] = [
        { id: 'aiPrediction', name: 'AI Prediction', description: "Uses a predictive AI model to forecast the single most likely winning combination for the next draw. This strategy analyzes trends and momentum to make a forward-looking recommendation, aiming for the highest probability of success." },
        { id: 'aiBlackBox', name: 'AI Black Box', description: "Leverages a generative AI model to analyze the entire dataset for complex, non-obvious patterns and hidden correlations that simple statistics might miss. Aims to build tickets with the highest statistical alignment to past winning profiles." },
        { id: 'balanced', name: 'Balanced', description: 'A diversified approach that selects numbers from multiple statistical categories: hot (frequent), cold (infrequent), and overdue. This strategy avoids over-reliance on a single pattern and creates a well-rounded ticket.' },
        { id: 'overdue', name: 'Overdue', description: "Based on the principle of mean reversion. This strategy focuses on numbers that have not appeared for the longest period, operating on the theory that they are statistically 'due' for a draw to balance out their frequency." },
        { id: 'trending', name: 'Trending', description: "Capitalizes on short-term momentum by analyzing numbers that have been drawn frequently in the most recent set of draws (configurable by you). This 'hot streak' strategy assumes current trends will continue." },
        { id: 'pairs', name: 'Common Pairs', description: 'Constructs tickets around pairs of white ball numbers that have historically appeared together in the same draw more often than random chance would suggest. It leverages statistical relationships between numbers.' },
        { id: 'random', name: 'Pure Random', description: 'Ignores all historical data and generates numbers with no statistical bias. This strategy mirrors the true random nature of a lottery draw and serves as a baseline for comparison against data-driven methods.' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(selectedStrategy, { trendDraws });
    };

    const handleDownload = () => {
        const pad = (num: number) => num.toString().padStart(2, '0');

        const fileContent = generatedTickets.map(ticket => {
            const whiteBallsStr = ticket.whiteBalls.map(pad).join(', ');
            const powerballStr = pad(ticket.powerball);
            const powerPlayStr = ticket.powerPlay ? ` Power Play: ${ticket.powerPlay}x` : '';
            let insight = ticket.probabilityInsight ? `  (${ticket.probabilityInsight})` : '';
            if (ticket.reasoning) {
                 const reasoningText = Array.isArray(ticket.reasoning)
                    ? ticket.reasoning.join('; ')
                    : ticket.reasoning;
                insight += `  (AI Confidence: ${ticket.confidenceScore?.toFixed(0)}% - ${reasoningText})`
            }
            return `White Balls: ${whiteBallsStr}  Powerball: ${powerballStr}${powerPlayStr}${insight}`;
        }).join('\n');

        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'powerball_tickets.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!analysisResults) {
        return null; // Should not happen due to parent's conditional render, but good practice
    }

    const isAiStrategy = selectedStrategy === 'aiBlackBox' || selectedStrategy === 'aiPrediction';
    const buttonText = isGenerating ? 'Analyzing with AI...' : (
        selectedStrategy === 'aiPrediction' ? 'Predict Next Winning Ticket' : `Generate ${NUM_TICKETS_TO_GENERATE} Tickets`
    );

    return (
        <div className="bg-secondary p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3 text-text-primary">Generate Tickets</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="strategy" className="block text-sm font-medium text-text-secondary mb-1">
                        Select Strategy
                    </label>
                    <select
                        id="strategy"
                        value={selectedStrategy}
                        onChange={(e) => setSelectedStrategy(e.target.value as Strategy)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent"
                    >
                        {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                     <p className="text-xs text-text-secondary mt-2 h-16">{strategies.find(s => s.id === selectedStrategy)?.description}</p>
                </div>

                {selectedStrategy === 'trending' && (
                    <div className="space-y-2 pt-2">
                        <label htmlFor="trend-draws" className="block text-sm font-medium text-text-secondary">
                            Analyze Last <span className="font-bold text-highlight">{trendDraws}</span> Draws
                        </label>
                        <input
                            id="trend-draws"
                            type="range"
                            min="5"
                            max="50"
                            step="1"
                            value={trendDraws}
                            onChange={(e) => setTrendDraws(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-highlight"
                        />
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isGenerating}
                    className="w-full bg-accent hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors !mt-6 disabled:bg-gray-500 disabled:cursor-wait">
                    { isAiStrategy ? <CubeIcon className={`w-5 h-5 mr-2 ${isGenerating ? 'animate-spin' : ''}`} /> : <MagicWandIcon className="w-5 h-5 mr-2" /> }
                    { buttonText }
                </button>
            </form>
            {generatedTickets.length > 0 && (
                 <div className="mt-4 space-y-2">
                    <h3 className="text-lg font-semibold text-text-primary">Your Tickets:</h3>
                    {generatedTickets.map((ticket, index) => (
                        <TicketDisplay key={index} ticket={ticket} />
                    ))}
                     <button 
                        onClick={handleDownload}
                        className="w-full mt-4 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
                    >
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Download Tickets
                    </button>
                </div>
            )}
        </div>
    );
};

export default TicketGenerator;