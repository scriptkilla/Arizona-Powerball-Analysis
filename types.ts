export interface Draw {
    drawDate: Date;
    numbers: number[];
    powerball: number;
    powerPlay?: number;
}

export type NumberFrequency = { number: number; count: number };
export type NumberOverdue = { number: number; drawsSince: number };
export type NumberPair = { pair: [number, number]; count: number };
export type NumberGroupTrend = { group: string; count: number };
export type NumberStreak = { number: number; streak: number; lastSeen: Date | null };
export type PairFrequencyData = { [key: number]: { partner: number; count: number }[] };

export interface AnalysisResults {
    totalDraws: number;
    whiteBallFrequency: NumberFrequency[];
    powerballFrequency: NumberFrequency[];
    hottestWhiteBalls: NumberFrequency[];
    coldestWhiteBalls: NumberFrequency[];
    hottestPowerballs: NumberFrequency[];
    coldestPowerballs: NumberFrequency[];
    overdueWhiteBalls: NumberOverdue[];
    overduePowerballs: NumberOverdue[];
    commonPairs: NumberPair[];
    powerPlayFrequency: NumberFrequency[];
    trendAnalysis: {
        last10Draws: Draw[];
        numberGroups: NumberGroupTrend[];
        sumTrend: 'High' | 'Low' | 'Balanced';
    };
    hottestWhiteBallStreaks: NumberStreak[];
    coldestWhiteBallStreaks: NumberStreak[];
    hottestPowerballStreaks: NumberStreak[];
    coldestPowerballStreaks: NumberStreak[];
    sumDistribution: { sum: number; count: number }[];
    deltaDistribution: { delta: number; count: number }[];
    oddEvenRatioDistribution: { ratio: string; count: number }[];
    pairFrequencyData: PairFrequencyData;
    sumHistory: { drawDate: Date; sum: number }[];
    groupDistributionHistory: { drawDate: Date; low: number; mid: number; high: number }[];
    bayesianWhiteBallProbabilities: { number: number; probability: number }[];
    bayesianPowerballProbabilities: { number: number; probability: number }[];
}

export type Strategy = 'balanced' | 'overdue' | 'trending' | 'pairs' | 'random' | 'aiBlackBox' | 'aiPrediction';

export interface Ticket {
    whiteBalls: number[];
    powerball: number;
    powerPlay?: number;
    probabilityInsight?: string;
    reasoning?: string | string[];
    confidenceScore?: number;
    historicalWinChance?: number;
}

export interface AITicketAnalysis {
    strengths: string[];
    weaknesses: string[];
    overallVerdict: string;
    luckScore: number;
}

export interface AdvancedAIInsight {
    title: string;
    description: string;
    category: 'trend' | 'bias' | 'prediction';
}

export type CsvRow = {
    [key: string]: string;
};

export interface PowerballRules {
    startDate: Date;
    maxWhiteBall: number;
    maxPowerball: number;
}

export type AnalysisPeriod = 'allTime' | 'post2015' | 'pre2015';

export type HistoricalAnalysis = Record<AnalysisPeriod, AnalysisResults | null>;

export interface PrizeTier {
    label: string;
    matchWB: number;
    matchPB: boolean;
    prize: number;
    powerPlayPrize?: number;
    powerPlayEnabled: boolean;
}

export interface SimulationResult {
    totalSpend: number;
    totalWinnings: number;
    netResult: number;
    roi: number;
    winCounts: { [label: string]: number };
    draws: number;
    withPowerPlay: boolean;
}