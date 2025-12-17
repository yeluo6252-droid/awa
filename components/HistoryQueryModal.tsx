import React, { useState } from 'react';
import { X, Calendar, Search, Loader2 } from 'lucide-react';
import { SensorReading } from '../types';
import { getHistoricalData } from '../services/sensorService';
import { HistoryChart } from './HistoryChart';

interface HistoryQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryQueryModal: React.FC<HistoryQueryModalProps> = ({ isOpen, onClose }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SensorReading[] | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    setLoading(true);
    try {
      const result = await getHistoricalData(date);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="text-cyan-400" />
            历史数据查询
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Controls */}
        <div className="p-6 flex flex-col md:flex-row gap-4 items-end md:items-center border-b border-slate-800 bg-slate-900/50">
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <label className="text-xs text-slate-500 font-mono uppercase">选择日期</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:border-cyan-500 transition-colors cursor-pointer"
            />
          </div>
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            查询数据
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!data && !loading && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Search size={48} className="mb-4 opacity-20" />
              <p>请选择日期并点击查询以查看历史记录</p>
            </div>
          )}

          {loading && (
             <div className="flex flex-col items-center justify-center h-64 text-cyan-400">
              <Loader2 size={48} className="animate-spin mb-4" />
              <p>正在从数据库检索数据...</p>
            </div>
          )}

          {data && (
            <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <HistoryChart 
                data={data}
                dataKey="temperature"
                color="#22d3ee"
                unit="°C"
                title="全天温度变化"
              />
               <HistoryChart 
                data={data}
                dataKey="humidity"
                color="#60a5fa"
                unit="%"
                title="全天湿度变化"
              />
               <HistoryChart 
                data={data}
                dataKey="pressure"
                color="#a78bfa"
                unit="hPa"
                title="全天气压变化"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};