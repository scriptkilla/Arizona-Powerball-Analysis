import React, { useState, useEffect } from 'react';
import type { AnalysisResults } from '../types';
import { LightbulbIcon } from './icons';
import { askEmber, isEmberConfigured, EmberNotConfiguredError } from '../services/emberService';

interface AskEmberProps {
    analysisResults: AnalysisResults | null;
}

const SUGGESTIONS = [
    'What numbers are hot lately?',
    'What are my odds on this ticket?',
    'Which numbers are most overdue?',
];

const AskEmber: React.FC<AskEmberProps> = ({ analysisResults }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [error, setError] = useState('');
    const [configured, setConfigured] = useState<boolean | null>(null);

    useEffect(() => {
        let cancelled = false;
        isEmberConfigured().then((ok) => {
            if (!cancelled) setConfigured(ok);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleAsk = async (q: string) => {
        const trimmed = q.trim();
        if (!trimmed || !analysisResults) return;

        setIsAsking(true);
        setError('');
        setAnswer('');

        try {
            const result = await askEmber(trimmed, analysisResults);
            setAnswer(result);
        } catch (e) {
            if (e instanceof EmberNotConfiguredError) {
                setConfigured(false);
                setError(e.message);
            } else if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setIsAsking(false);
        }
    };

    if (!analysisResults) return null;

    return (
        <div className="bg-secondary p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-1 text-text-primary">Ask Ember</h2>
            <p className="text-xs text-text-secondary mb-3">
                Ask your draw history in plain English — powered by Muse Ember.
            </p>

            {configured === false && (
                <div className="mb-3 text-sm bg-gray-800 border border-gray-600 text-text-secondary p-3 rounded-lg">
                    Ember answers unlock once the hackathon credits land — add{' '}
                    <code className="text-highlight">META_MODEL_API_KEY</code> in the Vercel
                    dashboard and they switch on automatically. Everything else in the app
                    already works.
                </div>
            )}

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleAsk(question);
                }}
                className="space-y-3"
            >
                <input
                    type="text"
                    value={question}
                    onChange={(e) => {
                        setQuestion(e.target.value);
                        setError('');
                    }}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-text-primary focus:ring-accent focus:border-accent"
                    placeholder="Ask about hot numbers, odds, or a pick…"
                    aria-label="Ask Ember a question"
                />

                <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                        <button
                            key={s}
                            type="button"
                            disabled={isAsking}
                            onClick={() => {
                                setQuestion(s);
                                handleAsk(s);
                            }}
                            className="text-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-text-primary px-2 py-1 rounded-full transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={!question.trim() || isAsking}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
                >
                    <LightbulbIcon className={`w-5 h-5 mr-2 ${isAsking ? 'animate-pulse' : ''}`} />
                    {isAsking ? 'Ember is thinking…' : 'Ask Ember'}
                </button>
            </form>

            {error && (
                <div className="mt-4 text-sm bg-red-900 border border-red-500 text-red-200 p-3 rounded-lg">
                    {error}
                </div>
            )}

            {answer && (
                <div className="mt-4 pt-4 border-t border-gray-700 animate-fade-in">
                    <h3 className="flex items-center text-md font-semibold text-highlight mb-2">
                        <LightbulbIcon className="w-5 h-5 mr-2" />
                        Ember says
                    </h3>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{answer}</p>
                </div>
            )}
        </div>
    );
};

export default AskEmber;
