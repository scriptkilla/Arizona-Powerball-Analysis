import React, { useState } from 'react';
import type { AnalysisResults, Draw } from '../types';
import StatCard from './StatCard';
import FullFrequencyChart from './FullFrequencyChart';
import PressureMap from './PressureMap';
import RatioDistributionChart from './RatioDistributionChart';
import SumDistributionChart from './SumDistributionChart';
import DeltaAnalysisChart from './DeltaAnalysisChart';
import CircularPatternFinder from './CircularPatternFinder';
import TimelineAnalysis from './TimelineAnalysis';
import ClusterMap from './ClusterMap';
import WinSimulator from './WinSimulator';
import BayesianProbabilityChart from './BayesianProbabilityChart';
import ProbabilityTopographyMap from './ProbabilityTopographyMap';
import FlowStateRiverMap from './FlowStateRiverMap';
import NumberDnaStrand from './NumberDnaStrand';
import TesseractExplorer from './TesseractExplorer';
import QuantumTunnelingPredictor from './QuantumTunnelingPredictor';
import { MAX_WHITE_BALL } from '../constants';
import { FireIcon, SnowflakeIcon, ChartBarIcon, BeakerIcon, EyeIcon, LinkIcon, WaveIcon, HelixIcon, TesseractIcon, QuantumTunnelingIcon } from './icons';


type Tab = 'overview' | 'frequency' | 'distributions' | 'patterns' | 'dna' | 'bayesian' | 'river' | 'tesseract' | 'quantum' | 'simulator';

const Dashboard: React.FC<{ analysisResults: AnalysisResults, draws: Draw[] }> = ({ analysisResults, draws }) => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const tabs: { id: Tab; name: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
        { id: 'overview', name: 'Overview', icon: ChartBarIcon },
        { id: 'frequency', name: 'Frequency & Overdue', icon: FireIcon },
        { id: 'distributions', name: 'Distributions', icon: EyeIcon },
        { id: 'patterns', name: 'Patterns & Trends', icon: LinkIcon },
        { id: 'dna', name: 'DNA Analysis', icon: HelixIcon },
        { id: 'bayesian', name: 'Bayesian Analysis', icon: BeakerIcon },
        { id: 'river', name: 'River Map', icon: WaveIcon },
        { id: 'tesseract', name: 'Tesseract', icon: TesseractIcon },
        { id: 'quantum', name: 'Quantum Predictor', icon: QuantumTunnelingIcon },
        { id: 'simulator', name: 'Simulator', icon: BeakerIcon },
    ];
    
    const {
        totalDraws,
        hottestWhiteBalls,
        coldestWhiteBalls,
        hottestPowerballs,
        coldestPowerballs,
        overdueWhiteBalls,
        overduePowerballs,
        commonPairs,
        sumDistribution,
        deltaDistribution,
        oddEvenRatioDistribution,
        whiteBallFrequency,
        powerballFrequency,
        pairFrequencyData,
        sumHistory,
        groupDistributionHistory,
        bayesianWhiteBallProbabilities,
        bayesianPowerballProbabilities,
    } = analysisResults;

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Hottest White Ball" value={hottestWhiteBalls[0]?.number} subValue={`${hottestWhiteBalls[0]?.count} times`} icon={FireIcon} color="text-red-400" />
                        <StatCard title="Coldest White Ball" value={coldestWhiteBalls[0]?.number} subValue={`${coldestWhiteBalls[0]?.count} times`} icon={SnowflakeIcon} color="text-blue-400" />
                        <StatCard title="Hottest Powerball" value={hottestPowerballs[0]?.number} subValue={`${hottestPowerballs[0]?.count} times`} icon={FireIcon} color="text-red-400" />
                        <StatCard title="Most Overdue PB" value={overduePowerballs[0]?.number} subValue={`${overduePowerballs[0]?.drawsSince} draws`} icon={SnowflakeIcon} color="text-blue-400" />
                        
                        <div className="col-span-2 lg:col-span-4 p-4 bg-gray-800 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2 text-text-primary">Sum of White Balls Timeline</h3>
                            <TimelineAnalysis sumHistory={sumHistory} groupDistributionHistory={groupDistributionHistory}/>
                        </div>
                    </div>
                );
            case 'frequency':
                 return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4 text-text-primary">White Ball Frequency Heatmap</h3>
                            <FullFrequencyChart items={whiteBallFrequency} colorHex="#f87171" title="White Balls"/>
                        </div>
                         <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4 text-text-primary">Powerball Frequency Heatmap</h3>
                            <FullFrequencyChart items={powerballFrequency} colorHex="#ef4444" title="Powerballs"/>
                        </div>
                         <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4 text-text-primary">White Ball Overdue Pressure Map</h3>
                            <PressureMap items={overdueWhiteBalls} colorClass="bg-cyan-500"/>
                        </div>
                         <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4 text-text-primary">Powerball Overdue Pressure Map</h3>
                            <PressureMap items={overduePowerballs} colorClass="bg-red-500"/>
                        </div>
                    </div>
                );
            case 'distributions':
                return (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4 text-text-primary">Odd vs. Even Ratio Distribution</h3>
                            <RatioDistributionChart items={oddEvenRatioDistribution} totalDraws={totalDraws}/>
                        </div>
                         <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4 text-text-primary">Sum of White Balls Distribution</h3>
                            <SumDistributionChart items={sumDistribution} totalDraws={totalDraws}/>
                        </div>
                         <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4 text-text-primary">Number Gap (Delta) Analysis</h3>
                            <p className="text-xs text-text-secondary -mt-3 mb-4">Frequency of the numeric gap between adjacent sorted white balls.</p>
                            <DeltaAnalysisChart items={deltaDistribution} totalDeltas={totalDraws * 4}/>
                        </div>
                         <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4 text-text-primary">Most Common Pairs</h3>
                             <ul className="space-y-2 text-sm">
                                {commonPairs.map(({pair, count}, index) => (
                                    <li key={index} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-7 h-7 bg-white text-black rounded-full flex items-center justify-center font-bold text-xs">{pair[0]}</div>
                                            <div className="w-7 h-7 bg-white text-black rounded-full flex items-center justify-center font-bold text-xs">{pair[1]}</div>
                                        </div>
                                        <span className="text-text-secondary">{count} times</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
            case 'patterns':
                 return (
                    <div className="grid grid-cols-1 gap-6">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-text-primary">Pair Correlation Network</h3>
                            <p className="text-xs text-text-secondary mb-2">Click a number to see its most common partners.</p>
                            <CircularPatternFinder pairFrequencyData={pairFrequencyData} whiteBallFrequency={whiteBallFrequency} maxWhiteBall={MAX_WHITE_BALL}/>
                        </div>
                         <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-text-primary">Cluster Analysis</h3>
                            <p className="text-xs text-text-secondary mb-2">Numbers that frequently appear together are drawn closer. Node size represents frequency.</p>
                            <ClusterMap pairFrequencyData={pairFrequencyData} whiteBallFrequency={whiteBallFrequency}/>
                        </div>
                    </div>
                );
            case 'dna':
                return <NumberDnaStrand draws={draws} />;
            case 'bayesian':
                return (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4 text-text-primary">White Ball Bayesian Probabilities</h3>
                            <BayesianProbabilityChart items={bayesianWhiteBallProbabilities} colorClass="bg-cyan-500" />
                        </div>
                         <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-4 text-text-primary">Powerball Bayesian Probabilities</h3>
                            <BayesianProbabilityChart items={bayesianPowerballProbabilities} colorClass="bg-red-500"/>
                        </div>
                        <div className="col-span-1 lg:col-span-2 bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2 text-text-primary">White Ball Probability Topography</h3>
                            <p className="text-xs text-text-secondary mb-4">A 3D map of number probabilities. Higher peaks indicate a higher likelihood based on Bayesian analysis.</p>
                            <ProbabilityTopographyMap items={bayesianWhiteBallProbabilities} maxBallNumber={MAX_WHITE_BALL} title="White Ball Topography" />
                        </div>
                     </div>
                );
            case 'river':
                return <FlowStateRiverMap draws={draws} />;
            case 'tesseract':
                return <TesseractExplorer analysisResults={analysisResults} />;
            case 'quantum':
                return <QuantumTunnelingPredictor analysisResults={analysisResults} />;
            case 'simulator':
                return <WinSimulator analysisResults={analysisResults} />;
            default:
                return null;
        }
    };
    

    return (
        <div className="bg-secondary p-4 rounded-lg shadow-md">
            <div className="mb-4 border-b border-gray-700 flex space-x-2 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-accent text-white'
                                : 'text-text-secondary hover:bg-gray-700'
                        }`}
                    >
                        <tab.icon className="w-5 h-5 mr-2" />
                        {tab.name}
                    </button>
                ))}
            </div>
            <div className="animate-fade-in">
                {renderContent()}
            </div>
        </div>
    );
};

export default Dashboard;