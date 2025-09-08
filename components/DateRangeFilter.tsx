import React, { useState, useEffect } from 'react';
import type { Draw } from '../types';
import { ClockIcon } from './icons';

interface DateRangeFilterProps {
    onFilter: (startDate: Date | null, endDate: Date | null) => void;
    originalDraws: Draw[];
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onFilter, originalDraws }) => {
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [minDate, setMinDate] = useState<string>('');
    const [maxDate, setMaxDate] = useState<string>('');

    useEffect(() => {
        if (originalDraws.length > 0) {
            const dates = originalDraws.map(d => d.drawDate);
            const min = new Date(Math.min(...dates.map(d => d.getTime())));
            const max = new Date(Math.max(...dates.map(d => d.getTime())));
            const toInputString = (date: Date) => date.toISOString().split('T')[0];
            
            const minStr = toInputString(min);
            const maxStr = toInputString(max);
            setMinDate(minStr);
            setMaxDate(maxStr);
            // Set initial state to full range
            setStartDate(minStr);
            setEndDate(maxStr);
        }
    }, [originalDraws]);


    const handlePreset = (years: number) => {
        const end = new Date(maxDate);
        const start = new Date(maxDate);
        start.setFullYear(start.getFullYear() - years);

        const toInputString = (date: Date) => date.toISOString().split('T')[0];
        const finalStartDateStr = start < new Date(minDate) ? minDate : toInputString(start);

        setStartDate(finalStartDateStr);
        setEndDate(toInputString(end));
        // Use UTC to prevent timezone off-by-one errors on filtering
        onFilter(new Date(finalStartDateStr + 'T00:00:00Z'), new Date(toInputString(end) + 'T23:59:59Z'));
    };
    
    const handleApplyCustom = () => {
         if (startDate && endDate) {
            // Adjust for timezone issues: create Date objects in UTC to avoid off-by-one day errors.
            const startUTC = new Date(startDate + 'T00:00:00Z');
            const endUTC = new Date(endDate + 'T23:59:59Z');
            onFilter(startUTC, endUTC);
        }
    };

    const handleReset = () => {
        setStartDate(minDate);
        setEndDate(maxDate);
        onFilter(null, null); // Signal a reset
    };

    if (originalDraws.length === 0) {
        return null;
    }

    return (
        <div className="bg-secondary p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3 text-text-primary flex items-center">
                <ClockIcon className="w-6 h-6 mr-2 text-blue-400" />
                Filter by Date
            </h2>
            <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handlePreset(1)} className="text-xs py-1 px-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors">Last Year</button>
                    <button onClick={() => handlePreset(5)} className="text-xs py-1 px-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors">Last 5 Yrs</button>
                    <button onClick={handleReset} className="text-xs py-1 px-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors">All Time</button>
                </div>
                <div>
                    <label htmlFor="start-date" className="text-xs text-text-secondary">From</label>
                    <input
                        type="date"
                        id="start-date"
                        value={startDate}
                        min={minDate}
                        max={endDate || maxDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-1.5 text-text-primary text-sm focus:ring-accent focus:border-accent"
                        aria-label="Start Date Filter"
                    />
                </div>
                <div>
                    <label htmlFor="end-date" className="text-xs text-text-secondary">To</label>
                    <input
                        type="date"
                        id="end-date"
                        value={endDate}
                        min={startDate || minDate}
                        max={maxDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-1.5 text-text-primary text-sm focus:ring-accent focus:border-accent"
                        aria-label="End Date Filter"
                    />
                </div>
                 <button 
                    onClick={handleApplyCustom}
                    className="w-full bg-accent hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors">
                    Apply Custom Range
                </button>
            </div>
        </div>
    );
};

export default DateRangeFilter;