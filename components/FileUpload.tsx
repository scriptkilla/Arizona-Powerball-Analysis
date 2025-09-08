import React, { useCallback, useState } from 'react';
import type { Draw, CsvRow, PowerballRules } from '../types';
import { 
    MIN_WHITE_BALL, 
    MIN_POWERBALL, 
    NUM_WHITE_BALLS, 
    POWERBALL_RULE_SETS
} from '../constants';
import { UploadIcon, QuestionMarkCircleIcon } from './icons';

interface FileUploadProps {
    onDataLoaded: (data: Draw[]) => void;
    setError: (error: string) => void;
}

const getRulesForDate = (drawDate: Date): PowerballRules => {
    // POWERBALL_RULE_SETS is sorted from newest to oldest. Find the first
    // rule set where the draw date is on or after the rule's start date.
    const rules = POWERBALL_RULE_SETS.find(rule => drawDate >= rule.startDate);
    
    // This should never happen with a proper fallback, but as a safeguard:
    if (!rules) {
        return POWERBALL_RULE_SETS[POWERBALL_RULE_SETS.length - 1];
    }
    return rules;
};


const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, setError }) => {
    const [fileName, setFileName] = useState<string>('');

    const validateAndParseData = (data: CsvRow[]): { parsedData: Draw[], errors: string[] } => {
        if (!data || data.length === 0) {
            return { parsedData: [], errors: [] };
        }
        
        const headers = Object.keys(data[0]);

        // --- Identify Headers using RegEx for flexibility ---
        const findHeader = (patterns: RegExp) => headers.find(h => patterns.test(h));

        const dateHeader = findHeader(/date/i);
        const winningNumbersHeader = findHeader(/winning.*numbers|numbers/i);
        const powerballHeader = findHeader(/powerball|pb/i);
        const powerPlayHeader = findHeader(/multiplier|power\s*play/i);
        const whiteBallHeaders = headers
            .filter(h => /number\s*\d|wb\s*\d|white\s*ball\s*\d/i.test(h))
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)![0], 10);
                const numB = parseInt(b.match(/\d+/)![0], 10);
                return numA - numB;
            });
        
        const isMultiColumn = whiteBallHeaders.length >= NUM_WHITE_BALLS && powerballHeader;
        const isSingleColumn = winningNumbersHeader && !isMultiColumn;
        
        if (!isMultiColumn && !isSingleColumn) {
             throw new Error(`Unrecognized CSV format. Please ensure columns are clearly labeled (e.g., 'Draw Date', 'WB1'-'WB5', 'Powerball' or a single 'Winning Numbers' column).`);
        }

        const parsedData: Draw[] = [];
        const errors: string[] = [];

        data.forEach((row, index) => {
            const drawNumber = index + 2; // Account for header row
            try {
                let numbers: number[];
                let powerball: number;
                let powerPlay: number | undefined;
                let dateStr: string | undefined;
                
                if (dateHeader) dateStr = row[dateHeader];
                
                if (!dateStr) {
                    const potentialDateVal = Object.values(row).find(val => typeof val === 'string' && val.length > 5 && !isNaN(new Date(val).getTime()));
                    if (potentialDateVal) dateStr = potentialDateVal;
                }

                if (!dateStr) {
                    throw new Error(`Row ${drawNumber}: Could not find a valid date.`);
                }
                
                const drawDate = new Date(dateStr);
                if (isNaN(drawDate.getTime())) {
                     throw new Error(`Row ${drawNumber}: Invalid date format for "${dateStr}".`);
                }

                const rules = getRulesForDate(drawDate);

                if (isSingleColumn) {
                    const rawNumbers = String(row[winningNumbersHeader!]);
                    const allNums = rawNumbers.split(/[\s,-]+/).map(n => parseInt(n.trim(), 10));
                    
                    if (allNums.length < NUM_WHITE_BALLS + 1 || allNums.some(isNaN)) {
                        throw new Error(`Row ${drawNumber}: Column '${winningNumbersHeader}' has invalid data.`);
                    }
                    powerball = allNums.pop()!;
                    numbers = allNums.slice(0, NUM_WHITE_BALLS);
                } else if (isMultiColumn) {
                    numbers = whiteBallHeaders.slice(0, NUM_WHITE_BALLS).map(h => parseInt(row[h], 10));
                    powerball = parseInt(row[powerballHeader!], 10);
                } else {
                     throw new Error(`Row ${drawNumber}: Unrecognized CSV format.`);
                }
                
                if (powerPlayHeader && row[powerPlayHeader]) {
                    const ppValue = parseInt(String(row[powerPlayHeader]).replace(/x/i, ''), 10);
                    if (!isNaN(ppValue)) {
                        powerPlay = ppValue;
                    }
                }


                // --- Validation ---
                if (numbers.some(isNaN) || isNaN(powerball)) {
                    throw new Error(`Row ${drawNumber}: Contains non-numeric values.`);
                }
                if (new Set(numbers).size !== NUM_WHITE_BALLS) {
                     throw new Error(`Row ${drawNumber}: White ball numbers must be unique.`);
                }
                for (const num of numbers) {
                    if (num < MIN_WHITE_BALL || num > rules.maxWhiteBall) {
                        throw new Error(`Row ${drawNumber}: White ball number ${num} is out of range (${MIN_WHITE_BALL}-${rules.maxWhiteBall} for this draw date).`);
                    }
                }
                
                if (powerball < MIN_POWERBALL || powerball > rules.maxPowerball) {
                    throw new Error(`Row ${drawNumber}: Powerball number ${powerball} is out of range (${MIN_POWERBALL}-${rules.maxPowerball} for this draw date).`);
                }

                parsedData.push({
                    drawDate,
                    numbers: numbers.sort((a, b) => a - b),
                    powerball,
                    powerPlay,
                });
            } catch(e) {
                if (e instanceof Error) {
                    errors.push(e.message);
                }
            }
        });

        return { parsedData, errors };
    };


    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setFileName(file.name);
        setError('');

        if (file.type !== 'text/csv') {
            setError('Invalid file type. Please upload a CSV file.');
            return;
        }

        (window as any).Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: { data: CsvRow[] }) => {
                try {
                    const { parsedData, errors } = validateAndParseData(results.data);
                    
                    if (errors.length > 0) {
                        const errorMessage = `Encountered ${errors.length} issue(s) in the file. Invalid rows were skipped:\n- ${errors.slice(0, 5).join('\n- ')}${errors.length > 5 ? `\n... and ${errors.length - 5} more.` : ''}`;
                        setError(errorMessage);
                    }

                    onDataLoaded(parsedData);
                } catch (e) {
                     if (e instanceof Error) {
                        setError(e.message);
                    } else {
                        setError('An unknown error occurred during file parsing.');
                    }
                    onDataLoaded([]); // Clear data on fatal error
                }
            },
            error: (err: any) => {
                setError(`CSV parsing error: ${err.message}`);
            }
        });
    }, [onDataLoaded, setError]);

    return (
        <div className="bg-secondary p-4 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold text-text-primary">Load Data</h2>
                <div className="relative group">
                    <QuestionMarkCircleIcon className="w-5 h-5 text-text-secondary cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-gray-800 text-text-secondary text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <h4 className="font-bold text-text-primary mb-1">Expected CSV Formats:</h4>
                        
                        <p className="font-semibold mt-2">Option 1: Multi-Column</p>
                        <ul className="list-disc list-inside pl-2 space-y-0.5">
                            <li>'Date' column (e.g., "10/07/2015").</li>
                            <li>5 white ball columns (e.g., 'WB1', 'WB2', ...).</li>
                            <li>'Powerball' or 'PB' column.</li>
                            <li>Optional 'Power Play' column.</li>
                        </ul>

                        <p className="font-semibold mt-2">Option 2: Single Column</p>
                        <ul className="list-disc list-inside pl-2 space-y-0.5">
                            <li>'Date' column.</li>
                            <li>A 'Winning Numbers' column with all numbers (e.g., "5 17 23 45 61 12").</li>
                        </ul>
                        <div className="absolute right-3 -bottom-2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-800"></div>
                    </div>
                </div>
            </div>

            <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-700 hover:bg-gray-600 text-text-primary font-bold py-2 px-4 rounded-md inline-flex items-center w-full justify-center transition-colors">
                <UploadIcon className="w-5 h-5 mr-2"/>
                <span>{fileName ? 'Change File' : 'Upload Lottery Data (CSV)'}</span>
            </label>
            <input id="file-upload" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            {fileName && <p className="text-xs text-text-secondary mt-2 text-center truncate">Loaded: {fileName}</p>}
        </div>
    );
};

export default FileUpload;