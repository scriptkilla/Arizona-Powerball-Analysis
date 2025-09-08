import type { Ticket, NumberFrequency, SimulationResult } from '../types';
import {
    MAX_WHITE_BALL,
    MIN_WHITE_BALL,
    MAX_POWERBALL_CURRENT,
    MIN_POWERBALL,
    NUM_WHITE_BALLS,
    PRIZE_TIERS,
    TICKET_COST,
    POWERPLAY_COST,
} from '../constants';

const selectWeightedPowerPlay = (powerPlayFrequency: NumberFrequency[]): number => {
    // A default multiplier if no frequency data is available.
    if (!powerPlayFrequency || powerPlayFrequency.length === 0) {
        return 2;
    }

    const totalCount = powerPlayFrequency.reduce((sum, item) => sum + item.count, 0);
    if (totalCount === 0) return 2;

    let random = Math.random() * totalCount;
    for (const item of powerPlayFrequency) {
        random -= item.count;
        if (random <= 0) {
            return item.number;
        }
    }
    return powerPlayFrequency[0]?.number || 2; // Fallback
};


export const runWinSimulation = (
    userTicket: Ticket,
    numDraws: number,
    withPowerPlay: boolean,
    powerPlayFrequency: NumberFrequency[]
): SimulationResult => {
    const totalSpend = numDraws * (TICKET_COST + (withPowerPlay ? POWERPLAY_COST : 0));
    let totalWinnings = 0;

    const winCounts = PRIZE_TIERS.reduce((acc, tier) => {
        acc[tier.label] = 0;
        return acc;
    }, {} as { [label: string]: number });

    for (let i = 0; i < numDraws; i++) {
        // 1. Generate a random winning draw
        const winningWhiteBalls = new Set<number>();
        while (winningWhiteBalls.size < NUM_WHITE_BALLS) {
            winningWhiteBalls.add(Math.floor(Math.random() * (MAX_WHITE_BALL - MIN_WHITE_BALL + 1)) + MIN_WHITE_BALL);
        }
        const winningPowerball = Math.floor(Math.random() * (MAX_POWERBALL_CURRENT - MIN_POWERBALL + 1)) + MIN_POWERBALL;
        
        // 2. Check for matches
        const matchedWB = userTicket.whiteBalls.filter(num => winningWhiteBalls.has(num)).length;
        const matchedPB = userTicket.powerball === winningPowerball;
        
        // 3. Find the prize tier
        const prizeTier = PRIZE_TIERS.find(tier => tier.matchWB === matchedWB && tier.matchPB === matchedPB);

        if (prizeTier) {
            winCounts[prizeTier.label]++;
            let prizeAmount = prizeTier.prize;

            if (withPowerPlay && prizeTier.powerPlayEnabled) {
                // Special case for 5+0 win
                if (prizeTier.powerPlayPrize) {
                    prizeAmount = prizeTier.powerPlayPrize;
                } else {
                    const multiplier = selectWeightedPowerPlay(powerPlayFrequency);
                    prizeAmount *= multiplier;
                }
            }
            totalWinnings += prizeAmount;
        }
    }

    const netResult = totalWinnings - totalSpend;
    const roi = totalSpend > 0 ? (netResult / totalSpend) * 100 : 0;

    return {
        totalSpend,
        totalWinnings,
        netResult,
        roi,
        winCounts,
        draws: numDraws,
        withPowerPlay,
    };
};
