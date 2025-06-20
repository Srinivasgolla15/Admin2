
import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  trend?: number; // Percentage change
  trendDirection?: 'up' | 'down' | 'neutral';
  period?: string;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ trend, trendDirection, period }) => {
  if (trend === undefined || trendDirection === undefined) {
    return null;
  }

  const colorClass =
    trendDirection === 'up' ? 'text-green-500' :
    trendDirection === 'down' ? 'text-red-500' :
    'text-gray-500 dark:text-gray-400';

  const Icon =
    trendDirection === 'up' ? ArrowUp :
    trendDirection === 'down' ? ArrowDown :
    Minus;

  return (
    <div className={`flex items-center text-xs ${colorClass}`}>
      <Icon size={14} className="mr-0.5" />
      <span>{Math.abs(trend)}%</span>
      {period && <span className="ml-1 text-gray-500 dark:text-gray-400">vs {period}</span>}
    </div>
  );
};

export default TrendIndicator;
    