import React, { useMemo } from 'react';

interface SumItem {
    sum: number;
    count: number;
}

interface SumDistributionChartProps {
    items: SumItem[];
    totalDraws: number;
}

const SumDistributionChart: React.FC<SumDistributionChartProps> = ({ items, totalDraws }) => {
    const sumRanges = useMemo(() => {
        if (!items || items.length === 0 || totalDraws === 0) {
            return [];
        }

        const sums = items.map(i => i.sum);
        const minSum = Math.min(...sums);
        const maxSum = Math.max(...sums);
        
        const numBuckets = 7;
        const rangeSize = Math.ceil((maxSum - minSum + 1) / numBuckets);

        if (rangeSize <= 0) return [];

        const buckets = Array.from({ length: numBuckets }, (_, i) => {
            const start = minSum + i * rangeSize;
            return {
                label: `${start}-${start + rangeSize - 1}`,
                count: 0,
            };
        });

        for (const item of items) {
            const bucketIndex = Math.floor((item.sum - minSum) / rangeSize);
            if (buckets[bucketIndex]) {
                buckets[bucketIndex].count += item.count;
            }
        }
        
        return buckets.filter(b => b.count > 0);

    }, [items, totalDraws]);

    if (sumRanges.length === 0) {
        return <p className="text-text-secondary">No sum data available.</p>;
    }

    const maxCount = Math.max(...sumRanges.map(item => item.count));

    return (
        <div className="w-full h-[176px] space-y-2.5 flex flex-col justify-center pr-2">
            {sumRanges.map((item, index) => {
                const percentage = (item.count / totalDraws) * 100;
                const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                return (
                    <div key={index} className="flex items-center gap-3 text-sm" aria-label={`Sum range ${item.label}: ${item.count} times, ${percentage.toFixed(1)}%`}>
                        <span className="w-24 text-right text-text-secondary flex-shrink-0">{item.label}</span>
                        <div className="w-full bg-gray-700 rounded-full h-4 relative">
                            <div
                                className="bg-teal-500 h-4 rounded-full transition-all duration-500"
                                style={{ width: `${barWidth}%` }}
                                title={`${item.count} draws (${percentage.toFixed(1)}%)`}
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white mix-blend-difference">
                                {item.count.toLocaleString()}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default SumDistributionChart;
