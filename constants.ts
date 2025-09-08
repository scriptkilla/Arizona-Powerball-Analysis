
import type { PowerballRules, PrizeTier } from './types';

// Historical rule sets, sorted from most recent to oldest.
// This allows the parser to find the correct rules for any given date.
export const POWERBALL_RULE_SETS: PowerballRules[] = [
    { startDate: new Date('2015-10-07T00:00:00Z'), maxWhiteBall: 69, maxPowerball: 26 },
    { startDate: new Date('2012-01-15T00:00:00Z'), maxWhiteBall: 59, maxPowerball: 35 },
    { startDate: new Date('2009-01-04T00:00:00Z'), maxWhiteBall: 59, maxPowerball: 39 },
    { startDate: new Date('2005-08-28T00:00:00Z'), maxWhiteBall: 55, maxPowerball: 42 },
    { startDate: new Date('2002-10-09T00:00:00Z'), maxWhiteBall: 53, maxPowerball: 42 },
    { startDate: new Date('1997-11-05T00:00:00Z'), maxWhiteBall: 49, maxPowerball: 42 },
    // A fallback for any data before the earliest specific date, based on the original Powerball rules.
    { startDate: new Date('1900-01-01T00:00:00Z'), maxWhiteBall: 45, maxPowerball: 45 },
];

// Current rules are the first entry in the sorted list, used for generation and modern analysis.
export const MAX_WHITE_BALL = POWERBALL_RULE_SETS[0].maxWhiteBall;
export const MAX_POWERBALL_CURRENT = POWERBALL_RULE_SETS[0].maxPowerball;

export const MIN_WHITE_BALL = 1;
export const MIN_POWERBALL = 1;

export const NUM_WHITE_BALLS = 5;
export const NUM_TICKETS_TO_GENERATE = 10;
export const NUM_STATS_TO_SHOW = 10;

export const TICKET_COST = 2;
export const POWERPLAY_COST = 1;

// Based on official Powerball prizes. The Jackpot is dynamic and winning it is
// statistically insignificant for this simulation's scope, so it is omitted
// to focus on the tangible secondary prizes.
export const PRIZE_TIERS: readonly PrizeTier[] = [
    { label: '5 White Balls', matchWB: 5, matchPB: false, prize: 1_000_000, powerPlayPrize: 2_000_000, powerPlayEnabled: true },
    { label: '4 + Powerball', matchWB: 4, matchPB: true, prize: 50_000, powerPlayEnabled: true },
    { label: '4 White Balls', matchWB: 4, matchPB: false, prize: 100, powerPlayEnabled: true },
    { label: '3 + Powerball', matchWB: 3, matchPB: true, prize: 100, powerPlayEnabled: true },
    { label: '3 White Balls', matchWB: 3, matchPB: false, prize: 7, powerPlayEnabled: true },
    { label: '2 + Powerball', matchWB: 2, matchPB: true, prize: 7, powerPlayEnabled: true },
    { label: '1 + Powerball', matchWB: 1, matchPB: true, prize: 4, powerPlayEnabled: true },
    { label: 'Powerball Only', matchWB: 0, matchPB: true, prize: 4, powerPlayEnabled: true },
];