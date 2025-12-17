import React from 'react';

interface OledCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: React.ReactNode;
  sensorType: string;
  isAlert?: boolean;
  subValue?: string;
}

export const OledCard: React.FC<OledCardProps> = ({ 
  title, 
  value, 
  unit, 
  icon, 
  sensorType,
  isAlert = false,
  subValue
}) => {
  return (
    <div className={`
      relative p-4 rounded-xl border-2 transition-all duration-300
      ${isAlert 
        ? 'border-red-500 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
        : 'border-slate-800 bg-slate-900 shadow-lg hover:border-cyan-500/50'
      }
    `}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`${isAlert ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-1 mt-2">
        <span className={`text-4xl font-mono font-bold tracking-tight oled-font
          ${isAlert ? 'text-red-500' : 'text-white'}
        `}>
          {value}
        </span>
        <span className="text-sm text-slate-500 font-mono">{unit}</span>
      </div>

      {subValue && (
        <div className="mt-2 text-xs text-slate-500 font-mono border-t border-slate-800 pt-1">
          {subValue}
        </div>
      )}

      <div className="absolute bottom-2 right-4">
        <span className="text-[10px] uppercase text-slate-600 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
          {sensorType}
        </span>
      </div>
    </div>
  );
};