// Frontend service for Ask Ember. Talks only to our own /api/ask-ember
// endpoint — the Meta Model API key never reaches the browser.
import type { AnalysisResults } from '../types';

export class EmberNotConfiguredError extends Error {
    constructor() {
        super(
            "Ember answers aren't switched on yet. Add META_MODEL_API_KEY in the Vercel dashboard to enable them."
        );
        this.name = 'EmberNotConfiguredError';
    }
}

export async function isEmberConfigured(): Promise<boolean> {
    try {
        const res = await fetch('/api/ask-ember', { method: 'GET' });
        if (!res.ok) return false;
        const data = await res.json();
        return data.configured === true;
    } catch {
        return false;
    }
}

// Compact stats summary, same shape the Gemini prompts use, trimmed to keep
// each Ember call small (the $10 hackathon budget goes a long way when the
// prompt stays short).
export function buildStatsSummary(results: AnalysisResults): string {
    const {
        hottestWhiteBalls,
        coldestWhiteBalls,
        overdueWhiteBalls,
        hottestPowerballs,
        overduePowerballs,
        commonPairs,
        oddEvenRatioDistribution,
        sumDistribution,
        powerPlayFrequency,
        totalDraws,
        trendAnalysis,
    } = results;

    const topSums = sumDistribution
        .slice()
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((s) => `${s.sum} (${s.count} draws)`);

    return [
        `Total draws analyzed: ${totalDraws}.`,
        `Hottest white balls: ${hottestWhiteBalls.slice(0, 10).map((i) => i.number).join(', ')}.`,
        `Coldest white balls: ${coldestWhiteBalls.slice(0, 10).map((i) => i.number).join(', ')}.`,
        `Most overdue white balls: ${overdueWhiteBalls.slice(0, 10).map((i) => i.number).join(', ')}.`,
        `Hottest Powerballs: ${hottestPowerballs.slice(0, 5).map((i) => i.number).join(', ')}.`,
        `Most overdue Powerballs: ${overduePowerballs.slice(0, 5).map((i) => i.number).join(', ')}.`,
        `Most common pairs: ${commonPairs.slice(0, 5).map((p) => `[${p.pair.join(', ')}]`).join(', ')}.`,
        `Top odd/even ratios: ${oddEvenRatioDistribution.slice(0, 3).map((r) => `${r.ratio} (${((r.count / totalDraws) * 100).toFixed(1)}%)`).join(', ')}.`,
        `Most common white-ball sums: ${topSums.join(', ')}.`,
        `Power Play frequencies: ${powerPlayFrequency.map((pp) => `${pp.number}x (${((pp.count / totalDraws) * 100).toFixed(1)}%)`).join(', ')}.`,
        `Last 10 draws trend: ${trendAnalysis.numberGroups.map((g) => `${g.group}: ${g.count} hits`).join('; ')}; sum trend ${trendAnalysis.sumTrend}.`,
    ].join('\n');
}

export async function askEmber(question: string, results: AnalysisResults): Promise<string> {
    const res = await fetch('/api/ask-ember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, stats: buildStatsSummary(results) }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 503 || data.error === 'not_configured') {
        throw new EmberNotConfiguredError();
    }
    if (!res.ok || typeof data.answer !== 'string' || !data.answer.trim()) {
        throw new Error(data.message || 'Ember didn\'t answer that one. Try again in a moment.');
    }

    return data.answer.trim();
}
