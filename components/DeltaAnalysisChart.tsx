import React from 'react';

interface DeltaItem {
    delta: number;
    count: number;
}

interface DeltaAnalysisChartProps {
    items: DeltaItem[];
    totalDeltas: number;
}

const DeltaAnalysisChart: React.FC<DeltaAnalysisChartProps> = ({ items, totalDeltas }) => {
    if (!items || items.length === 0 || totalDeltas === 0) {
        return <p className="text-text-secondary">No data available.</p>;
    }

    const topItems = items.slice(0, 6); // Display top 6 most common gaps
    const maxCount = topItems.length > 0 ? Math.max(...topItems.map(item => item.count)) : 1;

    return (
        <div className="w-full h-[176px] space-y-2.5 flex flex-col justify-center pr-2">
            {topItems.map((item, index) => {
                const percentage = (item.count / totalDeltas) * 100;
                const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                
                return (
                    <div key={index} className="flex items-center gap-3 text-sm" aria-label={`Gap of ${item.delta}: ${item.count} times, ${percentage.toFixed(1)}%`}>
                        <span className="w-24 text-right text-text-secondary flex-shrink-0">Gap of {item.delta}</span>
                        <div className="w-full bg-gray-700 rounded-full h-4 relative">
                            <div
                                className="bg-green-500 h-4 rounded-full transition-all duration-500"
                                style={{ width: `${barWidth}%` }}
                                title={`${item.count} occurrences (${percentage.toFixed(1)}%)`}
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white mix-blend-difference">
                                {item.count.toLocaleString()} ({percentage.toFixed(1)}%)
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DeltaAnalysisChart;
