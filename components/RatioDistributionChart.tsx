import React from 'react';

interface RatioItem {
    ratio: string;
    count: number;
}

interface RatioDistributionChartProps {
    items: RatioItem[];
    totalDraws: number;
}

const RatioDistributionChart: React.FC<RatioDistributionChartProps> = ({ items, totalDraws }) => {
    if (!items || items.length === 0 || totalDraws === 0) {
        return <p className="text-text-secondary">No data available.</p>;
    }

    const maxCount = Math.max(...items.map(item => item.count));

    return (
        <div className="w-full h-[176px] space-y-2.5 flex flex-col justify-center pr-2">
            {items.slice(0, 6).map((item, index) => { // Limit to top 6 ratios
                const percentage = (item.count / totalDraws) * 100;
                const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                const ratioLabel = item.ratio.replace('O', ' Odd').replace('E', ' Even').replace('/', ' / ');

                return (
                    <div key={index} className="flex items-center gap-3 text-sm" aria-label={`${ratioLabel}: ${item.count} times, ${percentage.toFixed(1)}%`}>
                        <span className="w-24 text-right text-text-secondary flex-shrink-0">{ratioLabel}</span>
                        <div className="w-full bg-gray-700 rounded-full h-4 relative">
                            <div
                                className="bg-purple-500 h-4 rounded-full transition-all duration-500"
                                style={{ width: `${barWidth}%` }}
                                title={`${item.count} draws (${percentage.toFixed(1)}%)`}
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white mix-blend-difference">
                                {item.count} ({percentage.toFixed(1)}%)
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default RatioDistributionChart;
