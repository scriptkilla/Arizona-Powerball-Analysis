import type { Draw, AnalysisResults, Strategy, NumberFrequency, NumberOverdue, NumberPair, Ticket, HistoricalAnalysis, NumberStreak, PairFrequencyData } from '../types';
import { MIN_WHITE_BALL, MIN_POWERBALL, NUM_WHITE_BALLS, NUM_STATS_TO_SHOW, POWERBALL_RULE_SETS } from '../constants';

const RULE_CHANGE_DATE_2015 = new Date('2015-10-07T00:00:00Z');

const getNumberMap = (min: number, max: number): Map<number, number> => {
    const map = new Map<number, number>();
    for (let i = min; i <= max; i++) {
        map.set(i, 0);
    }
    return map;
};

const toSortedArray = (map: Map<number, number>, keyName: 'count' | 'drawsSince'): any[] => {
    return Array.from(map.entries())
        .map(([number, value]) => ({ number, [keyName]: value }))
        .sort((a, b) => b[keyName] - a[keyName]);
};

const analyzePeriod = (
    draws: Draw[],
    maxWhiteBall: number,
    maxPowerball: number
): AnalysisResults | null => {
    if (draws.length === 0) {
        return null;
    }
    const totalDraws = draws.length;

    // Sort draws by date, most recent first
    const sortedDraws = [...draws].sort((a, b) => b.drawDate.getTime() - a.drawDate.getTime());

    // Frequency Analysis
    const whiteBallFreqMap = getNumberMap(MIN_WHITE_BALL, maxWhiteBall);
    const allPowerballsInData = new Set(sortedDraws.map(d => d.powerball));
    const powerballFreqMap = new Map<number, number>();
    allPowerballsInData.forEach(pb => powerballFreqMap.set(pb, 0));
    const powerPlayFreqMap = new Map<number, number>();

    const sumMap = new Map<number, number>();
    const oddEvenMap = new Map<string, number>();
    const deltaMap = new Map<number, number>();
    
    // Data for Timeline charts
    const sumHistory: { drawDate: Date; sum: number }[] = [];
    const groupDistributionHistory: { drawDate: Date; low: number; mid: number; high: number }[] = [];
    const lowMax = Math.floor(maxWhiteBall / 3);
    const midMax = Math.floor(maxWhiteBall * 2 / 3);


    for (const draw of sortedDraws) {
        draw.numbers.forEach(num => {
            if (whiteBallFreqMap.has(num)) {
                whiteBallFreqMap.set(num, (whiteBallFreqMap.get(num) || 0) + 1);
            }
        });
        if (powerballFreqMap.has(draw.powerball)) {
            powerballFreqMap.set(draw.powerball, (powerballFreqMap.get(draw.powerball) || 0) + 1);
        }
        if (draw.powerPlay) {
            powerPlayFreqMap.set(draw.powerPlay, (powerPlayFreqMap.get(draw.powerPlay) || 0) + 1);
        }

        const sum = draw.numbers.reduce((a, b) => a + b, 0);
        sumMap.set(sum, (sumMap.get(sum) || 0) + 1);
        sumHistory.unshift({ drawDate: draw.drawDate, sum });

        const oddCount = draw.numbers.filter(n => n % 2 !== 0).length;
        const evenCount = NUM_WHITE_BALLS - oddCount;
        const ratioKey = `${oddCount}O/${evenCount}E`;
        oddEvenMap.set(ratioKey, (oddEvenMap.get(ratioKey) || 0) + 1);
        
        let low = 0, mid = 0, high = 0;
        draw.numbers.forEach(n => {
            if (n <= lowMax) low++;
            else if (n <= midMax) mid++;
            else high++;
        });
        groupDistributionHistory.unshift({ drawDate: draw.drawDate, low, mid, high });
        
        // Delta Analysis
        for (let i = 0; i < draw.numbers.length - 1; i++) {
            const delta = draw.numbers[i + 1] - draw.numbers[i];
            deltaMap.set(delta, (deltaMap.get(delta) || 0) + 1);
        }
    }
    const whiteBallFrequency = toSortedArray(whiteBallFreqMap, 'count') as NumberFrequency[];
    const powerballFrequency = toSortedArray(powerballFreqMap, 'count') as NumberFrequency[];
    const powerPlayFrequency = toSortedArray(powerPlayFreqMap, 'count')
        .sort((a, b) => a.number - b.number) as NumberFrequency[];

    // Overdue Analysis
    const whiteBallOverdueMap = new Map<number, number>();
    const powerballOverdueMap = new Map<number, number>();
    for(let i = MIN_WHITE_BALL; i <= maxWhiteBall; i++) {
        const lastSeenIndex = sortedDraws.findIndex(d => d.numbers.includes(i));
        whiteBallOverdueMap.set(i, lastSeenIndex === -1 ? totalDraws : lastSeenIndex);
    }
    for(let i = MIN_POWERBALL; i <= maxPowerball; i++) {
        const lastSeenIndex = sortedDraws.findIndex(d => d.powerball === i);
        powerballOverdueMap.set(i, lastSeenIndex === -1 ? totalDraws : lastSeenIndex);
    }
    const overdueWhiteBalls = toSortedArray(whiteBallOverdueMap, 'drawsSince') as NumberOverdue[];
    const overduePowerballs = toSortedArray(powerballOverdueMap, 'drawsSince') as NumberOverdue[];

    // Pair Analysis
    const pairMap = new Map<string, number>();
    for (const draw of sortedDraws) {
        for (let i = 0; i < draw.numbers.length; i++) {
            for (let j = i + 1; j < draw.numbers.length; j++) {
                const pair = [draw.numbers[i], draw.numbers[j]].sort((a, b) => a-b);
                const key = pair.join(',');
                pairMap.set(key, (pairMap.get(key) || 0) + 1);
            }
        }
    }
    const commonPairs = Array.from(pairMap.entries())
        .map(([key, count]) => ({ pair: key.split(',').map(Number) as [number, number], count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, NUM_STATS_TO_SHOW);
    
    const pairFrequencyData: PairFrequencyData = {};
    for (const [key, count] of pairMap.entries()) {
        const [num1, num2] = key.split(',').map(Number);
        if (!pairFrequencyData[num1]) pairFrequencyData[num1] = [];
        if (!pairFrequencyData[num2]) pairFrequencyData[num2] = [];
        pairFrequencyData[num1].push({ partner: num2, count });
        pairFrequencyData[num2].push({ partner: num1, count });
    }
    for (const num in pairFrequencyData) {
        pairFrequencyData[num].sort((a, b) => b.count - a.count);
    }


    // Sum and Odd/Even Distribution
    const sumDistribution = Array.from(sumMap.entries())
        .map(([sum, count]) => ({ sum, count }))
        .sort((a, b) => b.count - a.count);
    const deltaDistribution = Array.from(deltaMap.entries())
        .map(([delta, count]) => ({ delta, count }))
        .sort((a, b) => b.count - a.count);
    const oddEvenRatioDistribution = Array.from(oddEvenMap.entries())
        .map(([ratio, count]) => ({ ratio, count }))
        .sort((a, b) => b.count - a.count);

    // Trend Analysis (last 10 draws)
    const last10Draws = sortedDraws.slice(0, 10);
    const numberGroups = [{group: '1-20', count: 0}, {group: '21-40', count: 0}, {group: `41-${maxWhiteBall}`, count: 0}];
    let sumTotal = 0;
    for (const draw of last10Draws) {
        sumTotal += draw.numbers.reduce((a,b) => a+b, 0);
        draw.numbers.forEach(n => {
            if (n <= 20) numberGroups[0].count++;
            else if (n <= 40) numberGroups[1].count++;
            else numberGroups[2].count++;
        });
    }
    const avgSum = sumTotal / last10Draws.length;
    const midPoint = (maxWhiteBall * NUM_WHITE_BALLS) / 2; // Approximate midpoint for sum
    const sumTrend = avgSum > (midPoint + 15) ? 'High' : avgSum < (midPoint - 15) ? 'Low' : 'Balanced';

    // Streak Analysis
    const calcHottestStreaks = (isPowerball: boolean): NumberStreak[] => {
        const maxNum = isPowerball ? maxPowerball : maxWhiteBall;
        const streaks: NumberStreak[] = [];
        for (let i = MIN_POWERBALL; i <= maxNum; i++) {
            let currentStreak = 0;
            for (let j = 0; j < sortedDraws.length; j++) {
                const drawnNumbers = isPowerball ? [sortedDraws[j].powerball] : sortedDraws[j].numbers;
                if (drawnNumbers.includes(i)) {
                    currentStreak++;
                } else {
                    break;
                }
            }
            if (currentStreak > 0) {
                streaks.push({
                    number: i,
                    streak: currentStreak,
                    lastSeen: sortedDraws[0].drawDate
                });
            }
        }
        return streaks.sort((a, b) => b.streak - a.streak).slice(0, 5);
    };

    const calcColdestStreaks = (overdueItems: NumberOverdue[]): NumberStreak[] => {
        return overdueItems.slice(0, 5).map(item => {
            const lastSeenIndex = item.drawsSince < totalDraws ? item.drawsSince : -1;
            return {
                number: item.number,
                streak: item.drawsSince,
                lastSeen: lastSeenIndex !== -1 ? sortedDraws[lastSeenIndex].drawDate : null,
            };
        });
    };
    
    // Bayesian Probability Engine
    const RECENT_DRAW_COUNT = Math.min(100, totalDraws);
    const PRIOR_WEIGHT = 0.4; // Weight for long-term data
    const RECENT_WEIGHT = 0.6; // Weight for recent data
    const recentDraws = sortedDraws.slice(0, RECENT_DRAW_COUNT);

    const calculateBayesianProbs = (isPowerball: boolean) => {
        const fullFreqMap = isPowerball ? powerballFreqMap : whiteBallFreqMap;
        const maxNum = isPowerball ? maxPowerball : maxWhiteBall;
        const numSlots = isPowerball ? 1 : NUM_WHITE_BALLS;
        
        const recentFreqMap = new Map<number, number>();
        for (const draw of recentDraws) {
            const nums = isPowerball ? [draw.powerball] : draw.numbers;
            for (const num of nums) {
                recentFreqMap.set(num, (recentFreqMap.get(num) || 0) + 1);
            }
        }

        const probabilities = [];
        for (let i = 1; i <= maxNum; i++) {
            const longTermCount = fullFreqMap.get(i) || 0;
            const recentCount = recentFreqMap.get(i) || 0;

            const pLongTerm = totalDraws > 0 ? longTermCount / (totalDraws * numSlots) : 0;
            const pRecent = RECENT_DRAW_COUNT > 0 ? recentCount / (RECENT_DRAW_COUNT * numSlots) : 0;
            
            // Weighted average to combine prior and recent evidence
            const probability = (pLongTerm * PRIOR_WEIGHT) + (pRecent * RECENT_WEIGHT);
            probabilities.push({ number: i, probability });
        }
        
        return probabilities.sort((a, b) => b.probability - a.probability);
    };

    const bayesianWhiteBallProbabilities = calculateBayesianProbs(false);
    const bayesianPowerballProbabilities = calculateBayesianProbs(true);


    return {
        totalDraws,
        whiteBallFrequency,
        powerballFrequency,
        powerPlayFrequency,
        hottestWhiteBalls: whiteBallFrequency.slice(0, NUM_STATS_TO_SHOW),
        coldestWhiteBalls: whiteBallFrequency.slice(-NUM_STATS_TO_SHOW).reverse(),
        hottestPowerballs: powerballFrequency.filter(p => p.number <= maxPowerball).slice(0, 5),
        coldestPowerballs: powerballFrequency.filter(p => p.number <= maxPowerball).sort((a, b) => a.count - b.count).slice(0, 5),
        overdueWhiteBalls,
        overduePowerballs,
        commonPairs,
        pairFrequencyData,
        trendAnalysis: { last10Draws, numberGroups, sumTrend },
        hottestWhiteBallStreaks: calcHottestStreaks(false),
        coldestWhiteBallStreaks: calcColdestStreaks(overdueWhiteBalls),
        hottestPowerballStreaks: calcHottestStreaks(true),
        coldestPowerballStreaks: calcColdestStreaks(overduePowerballs),
        sumDistribution,
        deltaDistribution,
        oddEvenRatioDistribution,
        sumHistory,
        groupDistributionHistory,
        bayesianWhiteBallProbabilities,
        bayesianPowerballProbabilities,
    };
};

export const performHistoricalAnalysis = (draws: Draw[]): HistoricalAnalysis => {
    const post2015Draws = draws.filter(d => d.drawDate >= RULE_CHANGE_DATE_2015);
    const pre2015Draws = draws.filter(d => d.drawDate < RULE_CHANGE_DATE_2015);

    const rulesPost2015 = POWERBALL_RULE_SETS[0]; // 69/26
    const rulesPre2015 = POWERBALL_RULE_SETS[1]; // 59/35

    const allTimeResults = analyzePeriod(draws, rulesPost2015.maxWhiteBall, rulesPost2015.maxPowerball);
    const post2015Results = analyzePeriod(post2015Draws, rulesPost2015.maxWhiteBall, rulesPost2015.maxPowerball);
    const pre2015Results = analyzePeriod(pre2015Draws, rulesPre2015.maxWhiteBall, rulesPre2015.maxPowerball);

    return {
        allTime: allTimeResults,
        post2015: post2015Results,
        pre2015: pre2015Results,
    };
};


const getRandomNumbers = <T,>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

const selectWeightedPowerPlay = (powerPlayFrequency: NumberFrequency[]): number | undefined => {
    if (!powerPlayFrequency || powerPlayFrequency.length === 0) {
        return undefined;
    }

    const totalCount = powerPlayFrequency.reduce((sum, item) => sum + item.count, 0);
    if (totalCount === 0) return undefined;

    let random = Math.random() * totalCount;
    for (const item of powerPlayFrequency) {
        random -= item.count;
        if (random <= 0) {
            return item.number;
        }
    }
    return powerPlayFrequency[0]?.number; // Fallback
};

const generateRandomTicket = (maxWhite: number, maxPb: number, powerPlayFrequency?: NumberFrequency[]): Ticket => {
    const whiteBalls = new Set<number>();
    while(whiteBalls.size < NUM_WHITE_BALLS) {
        whiteBalls.add(Math.floor(Math.random() * (maxWhite - MIN_WHITE_BALL + 1)) + MIN_WHITE_BALL);
    }
    const powerball = Math.floor(Math.random() * (maxPb - MIN_POWERBALL + 1)) + MIN_POWERBALL;
    const powerPlay = powerPlayFrequency ? selectWeightedPowerPlay(powerPlayFrequency) : undefined;
    return { whiteBalls: Array.from(whiteBalls).sort((a,b)=> a-b), powerball, powerPlay };
};

const generateInsight = (ticket: Ticket, results: AnalysisResults): { insight: string; chance: number | null } => {
    // Focus on Odd/Even analysis for the primary insight
    if (results.oddEvenRatioDistribution.length > 0) {
        const oddCount = ticket.whiteBalls.filter(n => n % 2 !== 0).length;
        const ratioKey = `${oddCount}O/${NUM_WHITE_BALLS - oddCount}E`;
        const ratioInfo = results.oddEvenRatioDistribution.find(r => r.ratio === ratioKey);

        if (ratioInfo) {
            const percentage = (ratioInfo.count / results.totalDraws) * 100;
            const insightText = `An Odd/Even split of ${ratioKey.replace('/', ':')} has occurred in ${percentage.toFixed(1)}% of historical wins.`;
            return { insight: insightText, chance: percentage };
        }
    }

    // Fallback if Odd/Even insight isn't available for some reason
    const ticketSum = ticket.whiteBalls.reduce((a, b) => a + b, 0);
    const rank = results.sumDistribution.findIndex(s => s.sum === ticketSum);
    if (rank !== -1) {
        const percentile = ((rank + 1) / results.sumDistribution.length) * 100;
        if (percentile <= 25) {
             const insightText = `This combo's sum is in the top ${Math.ceil(percentile)}% of most common winning sums.`;
             return { insight: insightText, chance: null }; // No direct chance % for sum
        }
    }

    return { insight: "A unique combination with interesting potential.", chance: null }; // Generic fallback
};


export const generateRecommendations = (
    strategy: Strategy, 
    results: AnalysisResults, 
    allDraws: Draw[], 
    options?: { trendDraws?: number }
): Ticket => {
    const numbers = new Set<number>();
    let powerball: number | undefined;

    const { maxWhiteBall, maxPowerball } = POWERBALL_RULE_SETS[0];

    if (strategy === 'random') {
        return generateRandomTicket(maxWhiteBall, maxPowerball, results.powerPlayFrequency);
    }

    const allWhiteBalls = results.whiteBallFrequency.map(f => f.number);
    const allPowerballs = results.powerballFrequency.map(f => f.number).filter(n => n >= MIN_POWERBALL && n <= maxPowerball);
    const hotWhite = results.hottestWhiteBalls.map(n => n.number);
    const coldWhite = results.coldestWhiteBalls.map(n => n.number);
    const overdueWhite = results.overdueWhiteBalls.map(n => n.number);

    switch (strategy) {
        case 'balanced':
            getRandomNumbers(hotWhite, 2).forEach(n => numbers.add(n));
            getRandomNumbers(coldWhite, 1).forEach(n => numbers.add(n));
            getRandomNumbers(overdueWhite, 2).forEach(n => numbers.add(n));
            powerball = getRandomNumbers(results.hottestPowerballs, 1)[0]?.number;
            break;
        case 'overdue':
            overdueWhite.slice(0, 5).forEach(n => numbers.add(n));
            powerball = results.overduePowerballs[0]?.number;
            break;
        case 'trending': {
            const trendDrawsCount = options?.trendDraws ?? 10;
            // FIX: Corrected a typo from `a.date` to `a.drawDate` to match the Draw type.
            const sortedDraws = [...allDraws].sort((a, b) => b.drawDate.getTime() - a.drawDate.getTime());
            const recentDraws = sortedDraws.slice(0, trendDrawsCount);

            const numberGroups = [{group: '1-20', count: 0}, {group: '21-40', count: 0}, {group: `41-${maxWhiteBall}`, count: 0}];
            for (const draw of recentDraws) {
                draw.numbers.forEach(n => {
                    if (n <= 20) numberGroups[0].count++;
                    else if (n <= 40) numberGroups[1].count++;
                    else numberGroups[2].count++;
                });
            }

            const trendingGroups = numberGroups.sort((a,b) => b.count - a.count);
            const primaryGroup = trendingGroups[0].group;
            const secondaryGroup = trendingGroups[1].group;
            
            const [g1Min, g1Max] = primaryGroup.split('-').map(Number);
            const [g2Min, g2Max] = secondaryGroup.split('-').map(Number);

            const primaryNumbers = allWhiteBalls.filter(n => n >= g1Min && n <= g1Max);
            const secondaryNumbers = allWhiteBalls.filter(n => n >= g2Min && n <= g2Max);
            
            getRandomNumbers(primaryNumbers, 3).forEach(n => numbers.add(n));
            getRandomNumbers(secondaryNumbers, 2).forEach(n => numbers.add(n));
            powerball = getRandomNumbers(results.hottestPowerballs, 1)[0]?.number;
            break;
        }
        case 'pairs':
            if (results.commonPairs.length > 0) {
                const mainPair = results.commonPairs[0].pair;
                numbers.add(mainPair[0]);
                numbers.add(mainPair[1]);
            }
            break;
        default:
             // Fallback for any unhandled cases to random
            return generateRandomTicket(maxWhiteBall, maxPowerball, results.powerPlayFrequency);
    }
    
    // Fill remaining numbers randomly if needed, avoiding duplicates
    while (numbers.size < NUM_WHITE_BALLS) {
        const randomNum = getRandomNumbers(allWhiteBalls, 1)[0];
        if (randomNum !== undefined) {
             numbers.add(randomNum);
        }
    }

    if (powerball === undefined || powerball > maxPowerball) {
        powerball = getRandomNumbers(allPowerballs, 1)[0];
    }
    
    // Fallback if powerball is still not set
    if (powerball === undefined) {
        powerball = Math.floor(Math.random() * (maxPowerball - MIN_POWERBALL + 1)) + MIN_POWERBALL;
    }

    const finalTicket: Ticket = {
        whiteBalls: Array.from(numbers).slice(0, NUM_WHITE_BALLS).sort((a,b)=>a-b),
        powerball,
        powerPlay: selectWeightedPowerPlay(results.powerPlayFrequency),
    };

    const { insight, chance } = generateInsight(finalTicket, results);
    finalTicket.probabilityInsight = insight;
    finalTicket.historicalWinChance = chance ?? undefined;

    return finalTicket;
};