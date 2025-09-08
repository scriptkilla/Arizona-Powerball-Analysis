import React, { useState, useEffect } from 'react';
import type { AnalysisResults, AdvancedAIInsight } from '../types';
import { generateAdvancedInsights } from '../services/geminiService';
import { SparklesIcon, TrendingUpIcon, MagnifyingGlassCircleIcon, CubeIcon } from './icons';

interface AdvancedAiInsightsProps {
    analysisResults: AnalysisResults;
}

const InsightIcon: React.FC<{ category: AdvancedAIInsight['category'] }> = ({ category }) => {
    switch (category) {
        case 'trend':
            return <TrendingUpIcon className="w-6 h-6 text-teal-400 flex-shrink-0" />;
        case 'bias':
            return <MagnifyingGlassCircleIcon className="w-6 h-6 text-purple-400 flex-shrink-0" />;
        case 'prediction':
            return <CubeIcon className="w-6 h-6 text-yellow-400 flex-shrink-0" />;
        default:
            return <SparklesIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />;
    }
};

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center mb-2">
                    <div className="w-6 h-6 bg-gray-700 rounded-full mr-3"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-3 bg-gray-700 rounded w-full"></div>
                    <div className="h-3 bg-gray-700 rounded w-5/6"></div>
                </div>
            </div>
        ))}
    </div>
);


const AdvancedAiInsights: React.FC<AdvancedAiInsightsProps> = ({ analysisResults }) => {
    const [insights, setInsights] = useState<AdvancedAIInsight[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!analysisResults) return;

        const fetchInsights = async () => {
            setIsLoading(true);
            setError('');
            setInsights([]);
            try {
                const result = await generateAdvancedInsights(analysisResults);
                setInsights(result);
            } catch (e) {
                if (e instanceof Error) {
                    setError(`AI Insights Failed: ${e.message}`);
                } else {
                    setError('An unknown error occurred while generating AI insights.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchInsights();
    }, [analysisResults]);

    return (
        <div className="bg-secondary p-4 rounded-lg shadow-md mt-8">
            <h2 className="text-xl font-semibold mb-3 text-text-primary flex items-center">
                <SparklesIcon className="w-6 h-6 mr-2 text-highlight" />
                Advanced AI Insights
            </h2>
            
            {isLoading && <LoadingSkeleton />}

            {error && (
                <div className="text-sm bg-red-900 border border-red-500 text-red-200 p-3 rounded-lg">
                    {error}
                </div>
            )}

            {!isLoading && !error && insights.length > 0 && (
                <div className="space-y-4">
                    {insights.map((insight, index) => (
                        <div key={index} className="bg-gray-800 p-3 rounded-lg shadow-inner">
                            <div className="flex items-start text-md font-semibold text-text-primary mb-2">
                                <InsightIcon category={insight.category} />
                                <h3 className="ml-3 leading-tight">{insight.title}</h3>
                            </div>
                            <p className="text-sm text-text-secondary">
                                {insight.description}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdvancedAiInsights;
