import React, { useState, useCallback, useMemo } from 'react';
import type { Draw, HistoricalAnalysis, Ticket, Strategy, AnalysisResults } from './types';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import TicketGenerator from './components/TicketGenerator';
import GeminiLuckyDip from './components/GeminiLuckyDip';
import DateRangeFilter from './components/DateRangeFilter';
import AdvancedAiInsights from './components/AdvancedAiInsights';
import { performHistoricalAnalysis } from './services/lotteryAnalysis';
import { generateAiTickets, predictNextDrawWithAi } from './services/geminiService';
import { NUM_TICKETS_TO_GENERATE } from './constants';
import { GithubIcon } from './components/icons';
import ProbabilityStorm from './components/ProbabilityStorm';
import NumberDnaStrand from './components/NumberDnaStrand';


function App() {
    const [allDraws, setAllDraws] = useState<Draw[]>([]);
    const [filteredDraws, setFilteredDraws] = useState<Draw[]>([]);
    const [analysis, setAnalysis] = useState<HistoricalAnalysis | null>(null);
    const [error, setError] = useState<string>('');
    const [generatedTickets, setGeneratedTickets] = useState<Ticket[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [showProbabilityStorm, setShowProbabilityStorm] = useState(false);


    const handleDataLoaded = useCallback((data: Draw[]) => {
        setIsLoadingData(true);
        setError('');
        setGeneratedTickets([]); // Clear tickets when new data is loaded.
        
        // Sort by date to ensure consistency
        const sortedData = data.sort((a, b) => a.drawDate.getTime() - b.drawDate.getTime());

        setAllDraws(sortedData);
        setFilteredDraws(sortedData); // Initially, no filter is applied
        
        // Give UI time to update before heavy analysis
        setTimeout(() => {
            if (sortedData.length > 0) {
                try {
                    const analysisResults = performHistoricalAnalysis(sortedData);
                    setAnalysis(analysisResults);
                } catch (e) {
                    setError("Failed to perform historical analysis on the provided data.");
                }
            } else {
                setAnalysis(null);
            }
            setIsLoadingData(false);
        }, 50);
    }, []);

    const handleDateFilter = useCallback((startDate: Date | null, endDate: Date | null) => {
        setIsLoadingData(true);
        setGeneratedTickets([]);
        
        setTimeout(() => {
            if (!startDate && !endDate) {
                setFilteredDraws(allDraws);
                return;
            }

            const newFilteredDraws = allDraws.filter(draw => {
                const drawTime = draw.drawDate.getTime();
                const startOk = startDate ? drawTime >= startDate.getTime() : true;
                const endOk = endDate ? drawTime <= endDate.getTime() : true;
                return startOk && endOk;
            });
            setFilteredDraws(newFilteredDraws);
        }, 50);

    }, [allDraws]);
    
    // Re-run analysis when filtered draws change
    useMemo(() => {
        if (filteredDraws.length > 0) {
            try {
                const analysisResults = performHistoricalAnalysis(filteredDraws);
                setAnalysis(analysisResults);
            } catch (e) {
                setError("Failed to re-run analysis on the filtered date range.");
                setAnalysis(null);
            }
        } else {
             // If filter results in no draws, clear analysis
            if (allDraws.length > 0) setAnalysis(performHistoricalAnalysis([]));
        }
        setIsLoadingData(false);
    }, [filteredDraws, allDraws.length]);


    const handleGenerateTickets = useCallback(async (strategy: Strategy, options: { trendDraws: number }) => {
        if (!analysis?.post2015) {
            setError("Analysis data is not available. Please load a data file first.");
            return;
        }
        
        setIsGenerating(true);
        setGeneratedTickets([]);
        setError('');
        
        try {
            if (strategy === 'aiBlackBox') {
                const tickets = await generateAiTickets(analysis.post2015, NUM_TICKETS_TO_GENERATE);
                setGeneratedTickets(tickets);
            } else if (strategy === 'aiPrediction') {
                const ticket = await predictNextDrawWithAi(analysis.post2015);
                setGeneratedTickets([ticket]);
            }
            else {
                // For non-AI strategies, generate them locally
                const tickets: Ticket[] = [];
                const { generateRecommendations } = await import('./services/lotteryAnalysis');
                for (let i = 0; i < NUM_TICKETS_TO_GENERATE; i++) {
                    const ticket = generateRecommendations(strategy, analysis.post2015, filteredDraws, options);
                    tickets.push(ticket);
                }
                setGeneratedTickets(tickets);
            }
        } catch (e) {
            if (e instanceof Error) {
                setError(`Ticket Generation Failed: ${e.message}`);
            } else {
                setError('An unknown error occurred during ticket generation.');
            }
        } finally {
            setIsGenerating(false);
        }

    }, [analysis, filteredDraws]);

    const activeAnalysis: AnalysisResults | null = analysis?.post2015 || analysis?.allTime;
    
    const exampleDraw: Draw = {
        drawDate: new Date(),
        numbers: [5, 12, 33, 46, 61],
        powerball: 22,
    };

    return (
        <div className="bg-primary min-h-screen text-text-primary p-4 lg:p-6 font-sans">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-highlight">Powerball Pro</h1>
                    <p className="text-text-secondary">AI-Powered Lottery Analysis & Strategy Engine</p>
                </div>
                <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-highlight transition-colors">
                    <GithubIcon className="w-8 h-8"/>
                </a>
            </header>
            
            <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <aside className="lg:col-span-3 space-y-6">
                    <FileUpload onDataLoaded={handleDataLoaded} setError={setError} />
                    {allDraws.length > 0 && <DateRangeFilter onFilter={handleDateFilter} originalDraws={allDraws} />}
                    {activeAnalysis && (
                        <>
                            <TicketGenerator 
                                analysisResults={activeAnalysis}
                                onGenerate={handleGenerateTickets}
                                generatedTickets={generatedTickets}
                                isGenerating={isGenerating}
                            />
                            <GeminiLuckyDip analysisResults={activeAnalysis} />
                             <div className="bg-secondary p-4 rounded-lg shadow-md">
                                 <button onClick={() => setShowProbabilityStorm(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md">
                                    Launch Probability Storm
                                </button>
                             </div>
                        </>
                    )}
                </aside>

                <div className="lg:col-span-9">
                    {error && (
                        <div className="bg-red-900 border border-red-500 text-red-200 p-3 rounded-lg mb-4 text-sm" role="alert">
                            <p className="font-bold">Error:</p>
                            <pre className="whitespace-pre-wrap font-mono text-xs">{error}</pre>
                        </div>
                    )}

                    {isLoadingData && (
                        <div className="flex justify-center items-center h-96 bg-secondary rounded-lg">
                            <div className="w-16 h-16 border-4 border-t-transparent border-highlight rounded-full animate-spin"></div>
                            <p className="ml-4 text-xl">Analyzing Data...</p>
                        </div>
                    )}

                    {!isLoadingData && activeAnalysis && <Dashboard analysisResults={activeAnalysis} draws={filteredDraws} />}
                    
                    {!isLoadingData && allDraws.length === 0 && (
                        <div className="flex flex-col justify-center items-center h-96 bg-secondary rounded-lg text-center p-4">
                            <h2 className="text-2xl font-semibold mb-2">Welcome to Powerball Pro</h2>
                            <p className="text-text-secondary max-w-md">
                                To get started, please upload a CSV file with historical Powerball draw data.
                                The analyzer will automatically detect the format and generate a full suite of statistical insights.
                            </p>
                            <div className="mt-6 p-4 border border-dashed border-gray-600 rounded-lg">
                               <p className="font-semibold text-text-primary">Example Draw:</p>
                               <NumberDnaStrand draws={[exampleDraw]} />
                            </div>
                        </div>
                    )}
                    
                     {!isLoadingData && allDraws.length > 0 && !activeAnalysis && (
                        <div className="flex justify-center items-center h-96 bg-secondary rounded-lg">
                             <p className="text-xl text-text-secondary">No draw data in the selected date range.</p>
                        </div>
                    )}
                    
                    {!isLoadingData && activeAnalysis && (
                        <AdvancedAiInsights analysisResults={activeAnalysis}/>
                    )}
                </div>
            </main>
            {showProbabilityStorm && activeAnalysis && (
                <ProbabilityStorm 
                    analysisResults={activeAnalysis}
                    onClose={() => setShowProbabilityStorm(false)}
                />
            )}
        </div>
    );
}

export default App;