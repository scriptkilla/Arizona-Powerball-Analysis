import React from 'react';
import type { NumberOverdue } from '../types';
import { NUM_STATS_TO_SHOW } from '../constants';

interface PressureMapProps {
    items: NumberOverdue[];
    colorClass: string;
}

const PressureMap: React.FC<PressureMapProps> = ({ items, colorClass }) => {
    if (!items || items.length === 0) {
        return <p className="text-text-secondary">No data available.</p>;
    }

    const topItems = items.slice(0, NUM_STATS_TO_SHOW + 5); // Show top 15
    const maxDrawsSince = topItems.length > 0 ? topItems[0].drawsSince : 1;

    return (
        <div className="w-full h-[200px] space-y-1.5 flex flex-col justify-center pr-2 overflow-y-auto">
            {topItems.map((item, index) => {
                const barWidth = maxDrawsSince > 0 ? (item.drawsSince / maxDrawsSince) * 100 : 0;

                return (
                    <div
                        key={item.number}
                        className="flex items-center gap-2 text-sm group"
                        aria-label={`Number ${item.number}: ${item.drawsSince} draws since last seen.`}
                    >
                        <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-white text-sm ${colorClass}`}>
                            {item.number}
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-5 relative">
                            <div
                                className={`${colorClass} h-5 rounded-full transition-all duration-500 ease-out`}
                                style={{ width: `${barWidth}%`, animation: `grow ${0.5 + index * 0.05}s ease-out forwards`, transformOrigin: 'left' }}
                                title={`${item.drawsSince} draws ago`}
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white mix-blend-difference">
                                {item.drawsSince} draws
                            </span>
                        </div>
                    </div>
                );
            })}
             <style>{`
                @keyframes grow {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
            `}</style>
        </div>
    );
};

export default PressureMap;
