import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number | undefined;
    subValue?: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subValue, icon: Icon, color = 'text-highlight' }) => {
    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex items-center space-x-4 transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl cursor-pointer">
            <div className={`p-3 bg-gray-900/50 rounded-full ${color}`}>
                <Icon className="w-8 h-8" />
            </div>
            <div>
                <p className="text-sm text-text-secondary">{title}</p>
                <p className="text-2xl font-bold text-text-primary">{value ?? '-'}</p>
                {subValue && <p className="text-xs text-text-secondary">{subValue}</p>}
            </div>
        </div>
    );
};

export default StatCard;