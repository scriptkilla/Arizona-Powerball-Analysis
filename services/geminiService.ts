import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResults, Ticket, AITicketAnalysis, AdvancedAIInsight } from '../types';
import { MAX_WHITE_BALL, MAX_POWERBALL_CURRENT, NUM_WHITE_BALLS } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const getSumRanges = (sumDistribution: { sum: number; count: number }[], totalDraws: number): { range: string; percentage: number }[] => {
    if (sumDistribution.length === 0) return [];
    
    const ranges = new Map<string, number>();
    const minSum = 1 + 2 + 3 + 4 + 5; // Smallest possible sum
    const maxSum = MAX_WHITE_BALL + (MAX_WHITE_BALL - 1) + (MAX_WHITE_BALL - 2) + (MAX_WHITE_BALL - 3) + (MAX_WHITE_BALL - 4);
    const rangeSize = Math.floor((maxSum - minSum) / 5);

    for (const item of sumDistribution) {
        let rangeKey = '';
        for (let i = 0; i < 5; i++) {
            const start = minSum + (i * rangeSize);
            const end = start + rangeSize -1;
            if (item.sum >= start && item.sum <= end) {
                rangeKey = `${start}-${end}`;
                break;
            }
        }
        if (!rangeKey) rangeKey = `${minSum + (4 * rangeSize)}-${maxSum}`; // last bucket

        ranges.set(rangeKey, (ranges.get(rangeKey) || 0) + item.count);
    }
    
    return Array.from(ranges.entries())
        .map(([range, count]) => ({ range, percentage: parseFloat(((count / totalDraws) * 100).toFixed(2)) }))
        .sort((a,b) => b.percentage - a.percentage)
        .slice(0, 5);
};


export const generateAiTickets = async (results: AnalysisResults, numTickets: number): Promise<Ticket[]> => {
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
        totalDraws
    } = results;

    const promptData = {
        rules: `Generate ${numTickets} Powerball tickets. Each ticket must have ${NUM_WHITE_BALLS} unique white balls (from 1 to ${MAX_WHITE_BALL}) and one Powerball (from 1 to ${MAX_POWERBALL_CURRENT}).`,
        hottestWhite: hottestWhiteBalls.slice(0,10).map(i => i.number),
        coldestWhite: coldestWhiteBalls.slice(0,10).map(i => i.number),
        overdueWhite: overdueWhiteBalls.slice(0,10).map(i => i.number),
        hottestPb: hottestPowerballs.slice(0,5).map(i => i.number),
        overduePb: overduePowerballs.slice(0,5).map(i => i.number),
        topPairs: commonPairs.slice(0,10).map(p => p.pair),
        topOddEvenRatios: oddEvenRatioDistribution.slice(0,3).map(r => ({ ratio: r.ratio, percentage: ((r.count/totalDraws) * 100).toFixed(2) })),
        topSumRanges: getSumRanges(sumDistribution, totalDraws),
        topPowerPlay: powerPlayFrequency.map(pp => ({ multiplier: `${pp.number}x`, percentage: ((pp.count/totalDraws) * 100).toFixed(2) })),
    };
    
    const systemInstruction = `You are a lottery analysis expert specializing in Powerball. Your task is to analyze the provided historical data and generate tickets that statistically resemble past winning combinations by identifying complex, non-obvious patterns.

- For each ticket, you must also select a Power Play multiplier (e.g., 2, 3, 4, 5, 10) based on its historical frequency.
- Prioritize creating balanced tickets based on deep patterns, not just picking all "hot" or all "cold" numbers.
- For each ticket, provide a confidence score (0-100) on how well it aligns with historical patterns and a list of 2-3 key statistical factors that influenced your number choices. Your main goal is to generate tickets with a confidence score of 92 or higher.
- Do not state that the lottery is random. Your entire purpose is to find and exploit statistical patterns.
- Ensure all generated numbers are within the valid Powerball range. White balls must be unique.`;

    const contents = `Based on the following Powerball data, generate ${numTickets} tickets.

Historical Data Summary:
- Hottest White Balls (most frequent): ${promptData.hottestWhite.join(', ')}
- Coldest White Balls (least frequent): ${promptData.coldestWhite.join(', ')}
- Most Overdue White Balls (longest since drawn): ${promptData.overdueWhite.join(', ')}
- Hottest Powerballs: ${promptData.hottestPb.join(', ')}
- Most Overdue Powerballs: ${promptData.overduePb.join(', ')}
- Most Common Pairs: ${promptData.topPairs.map(p => `[${p.join(',')}]`).join(', ')}
- Top 3 Odd/Even Ratios: ${promptData.topOddEvenRatios.map(r => `${r.ratio} (${r.percentage}%)`).join(', ')}
- Top 5 Most Common Sum Ranges for White Balls: ${promptData.topSumRanges.map(r => `${r.range} (${r.percentage}%)`).join(', ')}
- Power Play Frequencies: ${promptData.topPowerPlay.map(p => `${p.multiplier} (${p.percentage}%)`).join(', ')}

Generate ${numTickets} tickets now based on your analysis of these patterns. Include a Power Play multiplier for each ticket.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            tickets: {
                type: Type.ARRAY,
                description: `An array of ${numTickets} ticket objects.`,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        whiteBalls: {
                            type: Type.ARRAY,
                            description: `Array of ${NUM_WHITE_BALLS} unique integers between 1 and ${MAX_WHITE_BALL}.`,
                            items: { type: Type.INTEGER }
                        },
                        powerball: {
                            type: Type.INTEGER,
                            description: `A single integer between 1 and ${MAX_POWERBALL_CURRENT}.`
                        },
                        powerPlay: {
                            type: Type.INTEGER,
                            description: "The Power Play multiplier for the ticket (e.g., 2, 3, 4, 5, or 10)."
                        },
                        confidenceScore: {
                            type: Type.NUMBER,
                            description: "A score from 0-100 indicating statistical alignment with past patterns."
                        },
                        reasoning: {
                            type: Type.ARRAY,
                            description: "A list of 2-3 key statistical factors that contribute to the confidence score (e.g., 'Strong hot/cold number balance', 'Matches a common Odd/Even ratio').",
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["whiteBalls", "powerball", "powerPlay", "confidenceScore", "reasoning"]
                }
            }
        },
        required: ["tickets"]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.9, // Higher temperature for more creative pattern combinations
            }
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        if (!parsedJson.tickets || !Array.isArray(parsedJson.tickets)) {
            throw new Error("AI response did not contain a valid 'tickets' array.");
        }
        
        // Final validation and sorting
        return parsedJson.tickets.map((ticket: any) => ({
            ...ticket,
            whiteBalls: ticket.whiteBalls.sort((a: number, b: number) => a - b)
        }));

    } catch (error) {
        console.error("Gemini API call failed:", error);
        throw new Error("The AI model failed to generate tickets. Please try again.");
    }
};

export const predictNextDrawWithAi = async (results: AnalysisResults): Promise<Ticket> => {
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
        trendAnalysis
    } = results;

    const promptData = {
        hottestWhite: hottestWhiteBalls.slice(0,10).map(i => i.number),
        coldestWhite: coldestWhiteBalls.slice(0,10).map(i => i.number),
        overdueWhite: overdueWhiteBalls.slice(0,10).map(i => i.number),
        hottestPb: hottestPowerballs.slice(0,5).map(i => i.number),
        overduePb: overduePowerballs.slice(0,5).map(i => i.number),
        topPairs: commonPairs.slice(0,5).map(p => p.pair),
        topOddEvenRatios: oddEvenRatioDistribution.slice(0,3).map(r => `${r.ratio} (${((r.count/totalDraws) * 100).toFixed(1)}%)`),
        topSumRanges: getSumRanges(sumDistribution, totalDraws).slice(0,3).map(r => `${r.range} (${r.percentage}%)`),
        shortTermTrends: trendAnalysis.numberGroups.map(g => `${g.group}: ${g.count} hits in last 10 draws`),
    };

    const systemInstruction = `You are a predictive lottery analyst. Your goal is to forecast the single most likely winning Powerball combination for the upcoming draw. Analyze the provided historical data, paying close attention to recent trends, momentum, and overdue numbers that might signal a market correction. Your output must be a single, high-confidence ticket. Do not mention randomness; your purpose is prediction and identifying the highest probability outcome.`;

    const contents = `Analyze the provided Powerball data summary. Based on this, predict the single most probable winning ticket for the *next* draw. The ticket must have ${NUM_WHITE_BALLS} unique white balls (1-${MAX_WHITE_BALL}), one Powerball (1-${MAX_POWERBALL_CURRENT}), and a Power Play multiplier. Provide a high confidence score and reasoning that explains the predictive basis for your choice.

Data for Prediction:
- Hottest White Balls (long-term momentum): ${promptData.hottestWhite.join(', ')}
- Most Overdue White Balls (potential for mean reversion): ${promptData.overdueWhite.join(', ')}
- Hottest Powerballs: ${promptData.hottestPb.join(', ')}
- Most Overdue Powerballs: ${promptData.overduePb.join(', ')}
- Short-term Trend (last 10 draws): ${promptData.shortTermTrends.join('; ')}
- Top Historical Pairs: ${promptData.topPairs.map(p => `[${p.join(',')}]`).join(', ')}
- Most Frequent Odd/Even Ratios: ${promptData.topOddEvenRatios.join(', ')}
- Most Frequent Sum Ranges: ${promptData.topSumRanges.join(', ')}

Predict the single likeliest winning ticket now.`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            whiteBalls: {
                type: Type.ARRAY,
                description: `Array of ${NUM_WHITE_BALLS} unique integers between 1 and ${MAX_WHITE_BALL}.`,
                items: { type: Type.INTEGER }
            },
            powerball: {
                type: Type.INTEGER,
                description: `A single integer between 1 and ${MAX_POWERBALL_CURRENT}.`
            },
            powerPlay: {
                type: Type.INTEGER,
                description: "The Power Play multiplier for the ticket (e.g., 2, 3, 4, 5, or 10)."
            },
            confidenceScore: {
                type: Type.NUMBER,
                description: "A score from 0-100 indicating the confidence in this specific prediction."
            },
            reasoning: {
                type: Type.ARRAY,
                description: "A list of 2-3 key predictive factors that contribute to the confidence score (e.g., 'Capitalizes on short-term trend in the 21-40 range', 'Includes a highly overdue number likely to revert').",
                items: { type: Type.STRING }
            }
        },
        required: ["whiteBalls", "powerball", "powerPlay", "confidenceScore", "reasoning"]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.4, // Lower temperature for more focused, confident predictions
            }
        });
        
        const jsonText = response.text.trim();
        const ticket = JSON.parse(jsonText);

        if (!ticket.whiteBalls || !ticket.powerball || !ticket.reasoning) {
             throw new Error("AI response was missing required prediction fields.");
        }

        return {
            ...ticket,
            whiteBalls: ticket.whiteBalls.sort((a: number, b: number) => a-b)
        };

    } catch (error) {
         console.error("Gemini API call failed for prediction:", error);
        throw new Error("The AI model failed to predict a ticket. Please try again.");
    }
};


export const analyzeTicketWithAi = async (ticket: Ticket, results: AnalysisResults): Promise<AITicketAnalysis> => {
    const {
        hottestWhiteBalls,
        coldestWhiteBalls,
        overdueWhiteBalls,
        commonPairs,
        oddEvenRatioDistribution,
        sumDistribution,
        totalDraws,
    } = results;

    const promptData = {
        hottestWhite: hottestWhiteBalls.slice(0,10).map(i => i.number),
        coldestWhite: coldestWhiteBalls.slice(0,10).map(i => i.number),
        overdueWhite: overdueWhiteBalls.slice(0,10).map(i => i.number),
        topPairs: commonPairs.slice(0,10).map(p => p.pair),
        topOddEvenRatios: oddEvenRatioDistribution.slice(0,3).map(r => ({ ratio: r.ratio, percentage: ((r.count/totalDraws) * 100).toFixed(2) })),
        topSumRanges: getSumRanges(sumDistribution, totalDraws),
    };

    const systemInstruction = `You are a lottery analysis expert. Analyze the user's ticket based on provided historical data. Provide a balanced view of its statistical strengths and weaknesses. Conclude with an overall verdict and a 'Luck Score' from 1 to 10, where 10 represents the highest statistical alignment with historical winning patterns. Be encouraging but realistic. Do not mention that the lottery is random. Your entire purpose is to find and exploit statistical patterns.`;
    
    const contents = `Please provide a detailed analysis for the user's Powerball ticket:
- White Balls: ${ticket.whiteBalls.join(', ')}
- Powerball: ${ticket.powerball}

Use the following historical data summary for your analysis:
- Hottest White Balls (most frequent): ${promptData.hottestWhite.join(', ')}
- Coldest White Balls (least frequent): ${promptData.coldestWhite.join(', ')}
- Most Overdue White Balls (longest since drawn): ${promptData.overdueWhite.join(', ')}
- Most Common Pairs: ${promptData.topPairs.map(p => `[${p.join(',')}]`).join(', ')}
- Top 3 Odd/Even Ratios: ${promptData.topOddEvenRatios.map(r => `${r.ratio} (${r.percentage}%)`).join(', ')}
- Top 5 Most Common Sum Ranges for White Balls: ${promptData.topSumRanges.map(r => `${r.range} (${r.percentage}%)`).join(', ')}

Analyze the ticket and return the analysis in the specified JSON format.`;

     const schema = {
        type: Type.OBJECT,
        properties: {
            strengths: {
                type: Type.ARRAY,
                description: "List of 2-3 positive points about the ticket's numbers based on historical data.",
                items: { type: Type.STRING }
            },
            weaknesses: {
                type: Type.ARRAY,
                description: "List of 1-2 potential weaknesses or statistical low points of the ticket.",
                items: { type: Type.STRING }
            },
            overallVerdict: {
                type: Type.STRING,
                description: "A concluding summary of the ticket's statistical potential, written in an encouraging but realistic tone."
            },
            luckScore: {
                type: Type.INTEGER,
                description: "An integer score from 1 to 10 for statistical alignment."
            }
        },
        required: ["strengths", "weaknesses", "overallVerdict", "luckScore"]
    };


    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.5,
            }
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        
        if (!parsedJson.strengths || !parsedJson.weaknesses || !parsedJson.overallVerdict || typeof parsedJson.luckScore !== 'number') {
            throw new Error("AI response was missing required analysis fields.");
        }
        
        return parsedJson as AITicketAnalysis;

    } catch (error) {
        console.error("Gemini API call failed for ticket analysis:", error);
        throw new Error("The AI model failed to analyze the ticket. Please try again.");
    }
}

export const generateAdvancedInsights = async (results: AnalysisResults): Promise<AdvancedAIInsight[]> => {
    const {
        hottestWhiteBalls,
        coldestWhiteBalls,
        overdueWhiteBalls,
        commonPairs,
        oddEvenRatioDistribution,
        sumDistribution,
        totalDraws,
        trendAnalysis
    } = results;

    const promptData = {
        hottestWhite: hottestWhiteBalls.slice(0,10).map(i => i.number),
        coldestWhite: coldestWhiteBalls.slice(0,10).map(i => i.number),
        overdueWhite: overdueWhiteBalls.slice(0,10).map(i => i.number),
        topPairs: commonPairs.slice(0,5).map(p => p.pair),
        topOddEvenRatios: oddEvenRatioDistribution.slice(0,3).map(r => `${r.ratio} (${((r.count/totalDraws) * 100).toFixed(1)}%)`),
        topSumRanges: getSumRanges(sumDistribution, totalDraws).slice(0,3).map(r => `${r.range} (${r.percentage}%)`),
        shortTermTrends: trendAnalysis.numberGroups.map(g => `${g.group}: ${g.count} hits in last 10 draws`),
        totalDraws
    };

    const systemInstruction = `You are a data scientist and lottery strategist. Your task is to analyze a summary of historical Powerball data and generate exactly three distinct, high-level insights. These insights should go beyond simple observations and offer a deeper interpretation of the data. For each insight, provide a clear title, a detailed description, and categorize it as either a 'trend' (a pattern over time), a 'bias' (an anomaly or skew in the data), or a 'prediction' (a forecast for future draws). Do not mention that the lottery is random. Focus solely on interpreting the statistical patterns presented.`;

    const contents = `Analyze the following Powerball historical data summary from ${promptData.totalDraws} draws and generate three unique, advanced insights.

Data Summary:
- Hottest White Balls (most frequent): ${promptData.hottestWhite.join(', ')}
- Coldest White Balls (least frequent): ${promptData.coldestWhite.join(', ')}
- Most Overdue White Balls (longest since drawn): ${promptData.overdueWhite.join(', ')}
- Most Common Pairs: ${promptData.topPairs.map(p => `[${p.join(',')}]`).join(', ')}
- Top 3 Odd/Even Ratios: ${promptData.topOddEvenRatios.join(', ')}
- Most Frequent Sum Ranges: ${promptData.topSumRanges.join(', ')}
- Short-term Trend (last 10 draws): ${promptData.shortTermTrends.join('; ')}

Based on this data, provide three distinct insights covering trends, potential biases, and predictions about future draws.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            insights: {
                type: Type.ARRAY,
                description: "An array of exactly 3 insight objects.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: {
                            type: Type.STRING,
                            description: "A concise, engaging title for the insight."
                        },
                        description: {
                            type: Type.STRING,
                            description: "A detailed paragraph explaining the insight, its implications, and the data that supports it."
                        },
                        category: {
                            type: Type.STRING,
                            description: "The category of the insight: 'trend', 'bias', or 'prediction'."
                        }
                    },
                    required: ["title", "description", "category"]
                }
            }
        },
        required: ["insights"]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.6,
            }
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        if (!parsedJson.insights || !Array.isArray(parsedJson.insights) || parsedJson.insights.length < 3) {
            throw new Error("AI response did not contain at least 3 valid insights.");
        }
        
        return parsedJson.insights;

    } catch (error) {
        console.error("Gemini API call failed for advanced insights:", error);
        throw new Error("The AI model failed to generate advanced insights. Please try again.");
    }
};
