import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { SensorReading } from '../types';

interface HistoryChartProps {
  data: SensorReading[];
  dataKey: keyof SensorReading;
  color: string;
  unit: string;
  title: string;
}

// Custom Tooltip Component for detailed view
const CustomTooltip = ({ active, payload, label, unit, color }: TooltipProps<number, string> & { unit: string; color: string }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    // Format full timestamp: YYYY/MM/DD HH:mm:ss
    const fullTimeStr = new Date(data.timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    return (
      <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-sm bg-opacity-95 z-50">
        <p className="text-slate-400 text-xs mb-1 font-mono border-b border-slate-800 pb-1">{fullTimeStr}</p>
        <div className="flex items-baseline gap-1 mt-1">
           <span className="font-bold font-mono text-lg" style={{ color: color }}>
            {payload[0].value}
          </span>
          <span className="text-xs text-slate-500">{unit}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const HistoryChart: React.FC<HistoryChartProps> = ({ data, dataKey, color, unit, title }) => {
  const formattedData = data.map(d => ({
    ...d,
    // Short time for X-Axis display
    timeStr: new Date(d.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  }));

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">{title}</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              dataKey="timeStr" 
              stroke="#64748b" 
              fontSize={10} 
              tickMargin={10}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={10} 
              domain={['auto', 'auto']}
              unit={unit}
            />
            <Tooltip 
              content={<CustomTooltip unit={unit} color={color} />}
              cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              fillOpacity={1} 
              fill={`url(#color${dataKey})`} 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};