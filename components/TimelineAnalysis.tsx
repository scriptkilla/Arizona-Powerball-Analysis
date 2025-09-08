import React, { useState, useMemo, useRef, useCallback } from 'react';
import { NUM_WHITE_BALLS } from '../constants';

type SumPoint = {
    drawDate: Date;
    sum: number;
};

type GroupPoint = {
    drawDate: Date;
    low: number;
    mid: number;
    high: number;
};

interface TimelineAnalysisProps {
    sumHistory: SumPoint[];
    groupDistributionHistory: GroupPoint[];
}

interface TooltipData {
    x: number;
    y: number;
    content: React.ReactNode;
}

const SVG_WIDTH = 800;
const SVG_HEIGHT = 250;
const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 };
const CHART_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const CHART_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;
const NUM_BARS_TO_SHOW = 50;


const SumTimelineChart: React.FC<{ data: SumPoint[] }> = ({ data }) => {
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const { points, xScale, yScale, yTicks } = useMemo(() => {
        if (data.length === 0) return { points: '', xScale: () => 0, yScale: () => 0, yTicks: [] };

        const sums = data.map(d => d.sum);
        const minSum = Math.min(...sums);
        const maxSum = Math.max(...sums);

        const xScale = (index: number) => MARGIN.left + (index / (data.length - 1)) * CHART_WIDTH;
        const yScale = (sum: number) => MARGIN.top + CHART_HEIGHT - ((sum - minSum) / (maxSum - minSum)) * CHART_HEIGHT;

        const pathPoints = data.map((d, i) => `${xScale(i)},${yScale(d.sum)}`).join(' ');
        
        const tickCount = 5;
        const yTicks = Array.from({ length: tickCount }, (_, i) => {
            const val = minSum + (i / (tickCount - 1)) * (maxSum - minSum);
            return { value: Math.round(val), y: yScale(val) };
        });

        return { points: pathPoints, xScale, yScale, yTicks };
    }, [data]);

    const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current || data.length === 0) return;

        const svgPoint = svgRef.current.createSVGPoint();
        svgPoint.x = event.clientX;
        svgPoint.y = event.clientY;
        const { x } = svgPoint.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

        const index = Math.round(((x - MARGIN.left) / CHART_WIDTH) * (data.length - 1));
        
        if (index >= 0 && index < data.length) {
            const pointData = data[index];
            setTooltip({
                x: xScale(index),
                y: yScale(pointData.sum),
                content: (
                    <>
                        <div><strong>Sum:</strong> {pointData.sum}</div>
                        <div className="text-xs">{pointData.drawDate.toLocaleDateString()}</div>
                    </>
                ),
            });
        }
    }, [data, xScale, yScale]);

    return (
        <div className="relative w-full">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setTooltip(null)}
                className="w-full h-auto"
                aria-label="Timeline of white ball sums"
            >
                {/* Y-axis */}
                <g className="text-xs text-text-secondary fill-current">
                    {yTicks.map(tick => (
                        <g key={tick.value} transform={`translate(0, ${tick.y})`}>
                            <line x1={MARGIN.left - 5} x2={MARGIN.left} y1="0" y2="0" stroke="currentColor" />
                            <text x={MARGIN.left - 10} y="0" dy=".3em" textAnchor="end">{tick.value}</text>
                            <line x1={MARGIN.left} x2={SVG_WIDTH - MARGIN.right} y1="0" y2="0" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                        </g>
                    ))}
                    <text transform={`translate(15, ${SVG_HEIGHT / 2}) rotate(-90)`} textAnchor="middle">Sum of White Balls</text>
                </g>

                {/* X-axis Labels */}
                 <g className="text-xs text-text-secondary fill-current" transform={`translate(0, ${SVG_HEIGHT - MARGIN.bottom})`}>
                     <line x1={MARGIN.left} x2={SVG_WIDTH - MARGIN.right} y1="0" y2="0" stroke="currentColor" />
                     <text x={MARGIN.left} y="20" textAnchor="start">{data[0]?.drawDate.toLocaleDateString()}</text>
                     <text x={SVG_WIDTH - MARGIN.right} y="20" textAnchor="end">{data[data.length - 1]?.drawDate.toLocaleDateString()}</text>
                     <text x={SVG_WIDTH/2} y="20" textAnchor="middle">Draw Date</text>
                </g>

                {/* Line Chart */}
                <path d={`M${points}`} fill="none" stroke="#818cf8" strokeWidth="2" />
                <path d={`M${MARGIN.left},${yScale(data[0]?.sum || 0)} ${points} L${xScale(data.length -1)},${CHART_HEIGHT + MARGIN.top}`} fill="url(#sum-gradient)" opacity="0.4" />
                <defs>
                    <linearGradient id="sum-gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Tooltip elements */}
                {tooltip && (
                    <g transform={`translate(${tooltip.x}, ${tooltip.y})`}>
                        <circle r="5" fill="#818cf8" stroke="white" strokeWidth="2" />
                    </g>
                )}
            </svg>
            {tooltip && (
                <div
                    className="absolute p-2 text-sm bg-gray-900 rounded-md shadow-lg pointer-events-none transition-transform"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: `translate(-50%, -120%)`,
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
};

const GroupDistributionChart: React.FC<{ data: GroupPoint[] }> = ({ data }) => {
    const recentData = data.slice(-NUM_BARS_TO_SHOW);
    const barWidth = CHART_WIDTH / recentData.length;
    const colors = { low: '#60a5fa', mid: '#f472b6', high: '#f59e0b' }; // blue, pink, orange

    const yScale = (count: number) => (count / NUM_WHITE_BALLS) * CHART_HEIGHT;

    return (
        <div className="w-full">
            <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto" aria-label="Number group distribution for recent draws">
                {/* Y-axis */}
                <g className="text-xs text-text-secondary fill-current">
                     {[0,1,2,3,4,5].map(val => (
                         <g key={val} transform={`translate(0, ${MARGIN.top + CHART_HEIGHT - yScale(val)})`}>
                            <line x1={MARGIN.left - 5} x2={MARGIN.left} y1="0" y2="0" stroke="currentColor" />
                            <text x={MARGIN.left - 10} y="0" dy=".3em" textAnchor="end">{val}</text>
                            <line x1={MARGIN.left} x2={SVG_WIDTH - MARGIN.right} y1="0" y2="0" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                         </g>
                     ))}
                     <text transform={`translate(15, ${SVG_HEIGHT / 2}) rotate(-90)`} textAnchor="middle">Count of Balls</text>
                </g>
                {/* X-axis Labels */}
                <g className="text-xs text-text-secondary fill-current" transform={`translate(0, ${SVG_HEIGHT - MARGIN.bottom})`}>
                     <line x1={MARGIN.left} x2={SVG_WIDTH - MARGIN.right} y1="0" y2="0" stroke="currentColor" />
                     <text x={MARGIN.left} y="20" textAnchor="start">Older</text>
                     <text x={SVG_WIDTH - MARGIN.right} y="20" textAnchor="end">Newer</text>
                     <text x={SVG_WIDTH/2} y="20" textAnchor="middle">{NUM_BARS_TO_SHOW} Most Recent Draws</text>
                </g>

                {/* Bars */}
                <g>
                    {recentData.map((d, i) => {
                        const x = MARGIN.left + i * barWidth;
                        const lowHeight = yScale(d.low);
                        const midHeight = yScale(d.mid);
                        const highHeight = yScale(d.high);

                        const lowY = MARGIN.top + CHART_HEIGHT - lowHeight;
                        const midY = lowY - midHeight;
                        const highY = midY - highHeight;
                        
                        return (
                            <g key={i} className="group" transform={`translate(${x}, 0)`}>
                                <rect x="0" y={lowY} width={barWidth - 1} height={lowHeight} fill={colors.low} />
                                <rect x="0" y={midY} width={barWidth - 1} height={midHeight} fill={colors.mid} />
                                <rect x="0" y={highY} width={barWidth - 1} height={highHeight} fill={colors.high} />
                                <title>{`${d.drawDate.toLocaleDateString()}\nLow: ${d.low}\nMid: ${d.mid}\nHigh: ${d.high}`}</title>
                            </g>
                        );
                    })}
                </g>
            </svg>
            <div className="flex justify-center items-center space-x-4 text-xs mt-2">
                <div className="flex items-center"><span className="w-3 h-3 rounded-sm mr-1.5" style={{ backgroundColor: colors.low }} /> Low</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-sm mr-1.5" style={{ backgroundColor: colors.mid }} /> Mid</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-sm mr-1.5" style={{ backgroundColor: colors.high }} /> High</div>
            </div>
        </div>
    );
};


const TimelineAnalysis: React.FC<TimelineAnalysisProps> = ({ sumHistory, groupDistributionHistory }) => {
    const [activeChart, setActiveChart] = useState<'sum' | 'group'>('sum');

    if (!sumHistory || sumHistory.length < 2) {
        return <p className="text-text-secondary">Not enough data for timeline analysis.</p>;
    }

    return (
        <div className="w-full flex flex-col items-center">
            <div className="bg-gray-900 p-1 rounded-lg flex space-x-1 mb-4">
                <button
                    onClick={() => setActiveChart('sum')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeChart === 'sum' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-gray-700'}`}
                >
                    Sums Timeline
                </button>
                <button
                    onClick={() => setActiveChart('group')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeChart === 'group' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-gray-700'}`}
                >
                    Number Group Distribution
                </button>
            </div>
            <div className="w-full">
                {activeChart === 'sum' && <SumTimelineChart data={sumHistory} />}
                {activeChart === 'group' && <GroupDistributionChart data={groupDistributionHistory} />}
            </div>
        </div>
    );
};

export default TimelineAnalysis;
