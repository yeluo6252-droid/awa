import React, { useState, useEffect, useRef } from 'react';
import { SensorReading, Thresholds, ConnectionStatus, SoundType } from './types';
import { getSimulatedReading, fetchRealReading } from './services/sensorService';
import { analyzeEnvironment } from './services/geminiService';
import { OledCard } from './components/OledCard';
import { HistoryChart } from './components/HistoryChart';
import { HistoryQueryModal } from './components/HistoryQueryModal';
import { 
  Thermometer, 
  Droplets, 
  Gauge, 
  Mountain, 
  Activity, 
  Wifi, 
  WifiOff, 
  BrainCircuit, 
  AlertTriangle,
  Settings,
  RefreshCw,
  History,
  Volume2,
  ChevronDown,
  Globe,
  Cpu,
  XCircle
} from 'lucide-react';

const MAX_HISTORY_POINTS = 50;

const App: React.FC = () => {
  // State
  const [data, setData] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [thresholds, setThresholds] = useState<Thresholds>({
    tempMin: 18,
    tempMax: 28,
    humidMin: 30,
    humidMax: 70,
    soundEnabled: true,
    soundType: 'beep',
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showConnMenu, setShowConnMenu] = useState(false);
  const [espIp, setEspIp] = useState('192.168.1.100');
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Refs for intervals and audio
  const dataIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAlertState = useRef<boolean>(false);

  const playAlertSound = (type: SoundType) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    switch (type) {
      case 'beep':
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'alarm':
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'chime':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.4);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
        break;
    }
  };

  const handleDisconnect = () => {
    if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
    setConnectionStatus(ConnectionStatus.DISCONNECTED);
    setShowConnMenu(false);
  };

  const connectMock = () => {
    handleDisconnect();
    setConnectionStatus(ConnectionStatus.CONNECTING);
    setTimeout(() => {
      setConnectionStatus(ConnectionStatus.CONNECTED_MOCK);
      startDataCollection(true);
    }, 800);
  };

  const connectReal = async () => {
    handleDisconnect();
    setConnectionStatus(ConnectionStatus.CONNECTING);
    try {
      // Preliminary probe
      await fetchRealReading(espIp);
      setConnectionStatus(ConnectionStatus.CONNECTED_REAL);
      startDataCollection(false);
    } catch (e) {
      setConnectionStatus(ConnectionStatus.ERROR);
    }
  };

  const startDataCollection = (isMock: boolean) => {
    const tick = async () => {
      try {
        const reading = isMock ? getSimulatedReading() : await fetchRealReading(espIp);
        handleNewReading(reading);
      } catch (e) {
        if (!isMock) {
          setConnectionStatus(ConnectionStatus.ERROR);
          if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
        }
      }
    };
    tick();
    dataIntervalRef.current = window.setInterval(tick, 2000);
  };

  const handleNewReading = (reading: SensorReading) => {
    setData(reading);
    setHistory(prev => {
      const newHistory = [...prev, reading];
      return newHistory.length > MAX_HISTORY_POINTS ? newHistory.slice(1) : newHistory;
    });
  };

  const handleAnalyze = async () => {
    if (!data) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const result = await analyzeEnvironment(data, thresholds);
      setAiAnalysis(result);
    } catch (e) {
      setAiAnalysis("分析失败，请重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isTempAlert = data ? (data.temperature > thresholds.tempMax || data.temperature < thresholds.tempMin) : false;
  const isHumidAlert = data ? (data.humidity > thresholds.humidMax || data.humidity < thresholds.humidMin) : false;
  const hasAnyAlert = isTempAlert || isHumidAlert;

  useEffect(() => {
    if (hasAnyAlert && !lastAlertState.current && thresholds.soundEnabled) {
      playAlertSound(thresholds.soundType);
    }
    lastAlertState.current = hasAnyAlert;
  }, [hasAnyAlert, thresholds.soundEnabled, thresholds.soundType]);

  useEffect(() => {
    return () => {
      if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      <HistoryQueryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} />

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800 relative">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            智能家居环境监测中心
          </h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            <Activity size={14} /> 实时物联网传感器仪表板
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-all text-sm font-bold"
          >
            <History size={18} />
            <span className="hidden sm:inline">历史记录</span>
          </button>

          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg border transition-all ${showSettings ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-cyan-400'}`}
          >
            <Settings size={20} />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowConnMenu(!showConnMenu)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold border transition-all
                ${connectionStatus === ConnectionStatus.CONNECTED_REAL 
                  ? 'bg-green-950/30 border-green-500/50 text-green-400' 
                  : connectionStatus === ConnectionStatus.CONNECTED_MOCK
                  ? 'bg-blue-950/30 border-blue-500/50 text-blue-400'
                  : connectionStatus === ConnectionStatus.CONNECTING
                  ? 'bg-yellow-950/30 border-yellow-500/50 text-yellow-400 animate-pulse'
                  : connectionStatus === ConnectionStatus.ERROR
                  ? 'bg-red-950/30 border-red-500/50 text-red-500'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                }
              `}
            >
              {connectionStatus === ConnectionStatus.ERROR ? <XCircle size={16} /> : connectionStatus === ConnectionStatus.DISCONNECTED ? <WifiOff size={16} /> : <Wifi size={16} />}
              {connectionStatus}
              <ChevronDown size={14} />
            </button>

            {showConnMenu && (
              <div className="absolute top-full mt-2 right-0 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 animate-in zoom-in-95 duration-100 origin-top-right">
                <div className="text-[10px] text-slate-500 font-bold uppercase p-2 border-b border-slate-800 mb-2 tracking-widest">选择连接模式</div>
                
                <button 
                  onClick={connectMock}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 text-sm text-left transition-colors"
                >
                  <Globe className="text-blue-400" size={18} />
                  <div>
                    <div className="text-slate-200 font-bold">模拟连接</div>
                    <div className="text-[10px] text-slate-500">使用内置演示数据进行测试</div>
                  </div>
                </button>

                <div className="p-2 mt-1 space-y-2">
                  <div className="flex items-center gap-3 p-1">
                    <Cpu className="text-green-400" size={18} />
                    <div className="text-sm font-bold text-slate-200">正式连接 (ESP8266)</div>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={espIp}
                      onChange={(e) => setEspIp(e.target.value)}
                      placeholder="IP 地址 (如 192.168.1.100)"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-green-500 font-mono"
                    />
                    <button 
                      onClick={connectReal}
                      className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                    >
                      连接
                    </button>
                  </div>
                </div>

                {connectionStatus !== ConnectionStatus.DISCONNECTED && (
                  <button 
                    onClick={handleDisconnect}
                    className="w-full mt-2 flex items-center justify-center gap-2 p-2 rounded-lg bg-red-950/20 text-red-400 hover:bg-red-950/40 text-xs font-bold transition-colors border border-red-900/30"
                  >
                    <WifiOff size={14} /> 断开连接
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 grid md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-4">
            <h3 className="text-slate-300 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
              <Thermometer size={16} className="text-cyan-400"/> 温度阈值 (°C)
            </h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-[10px] text-slate-500 font-mono block mb-1">最低</label>
                <input type="number" value={thresholds.tempMin} onChange={(e) => setThresholds({...thresholds, tempMin: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none font-mono text-sm"/>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-500 font-mono block mb-1">最高</label>
                <input type="number" value={thresholds.tempMax} onChange={(e) => setThresholds({...thresholds, tempMax: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none font-mono text-sm"/>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-slate-300 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
              <Droplets size={16} className="text-blue-400"/> 湿度阈值 (%)
            </h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-[10px] text-slate-500 font-mono block mb-1">最低</label>
                <input type="number" value={thresholds.humidMin} onChange={(e) => setThresholds({...thresholds, humidMin: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none font-mono text-sm"/>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-500 font-mono block mb-1">最高</label>
                <input type="number" value={thresholds.humidMax} onChange={(e) => setThresholds({...thresholds, humidMax: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white outline-none font-mono text-sm"/>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-800 md:pl-8 pt-4 md:pt-0">
            <h3 className="text-slate-300 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
              <Volume2 size={16} className="text-purple-400"/> 声音警报选项
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">启用声音提示</span>
                <button onClick={() => setThresholds({...thresholds, soundEnabled: !thresholds.soundEnabled})} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${thresholds.soundEnabled ? 'bg-cyan-600' : 'bg-slate-700'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${thresholds.soundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="space-y-1">
                <div className="flex gap-2">
                  {(['beep', 'alarm', 'chime'] as SoundType[]).map((type) => (
                    <button key={type} onClick={() => { setThresholds({...thresholds, soundType: type}); playAlertSound(type); }} className={`flex-1 py-1.5 rounded border text-[10px] font-bold uppercase transition-all ${thresholds.soundType === type ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-950 border-slate-700 text-slate-500'}`}>{type === 'beep' ? '嘀嘀' : type === 'alarm' ? '警报' : '提示'}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OledCard title="温度" value={data ? data.temperature.toFixed(1) : '--'} unit="°C" icon={<Thermometer size={24} />} sensorType="DHT22" isAlert={isTempAlert} subValue={isTempAlert ? "警告：超标" : "正常范围"} />
        <OledCard title="湿度" value={data ? data.humidity.toFixed(1) : '--'} unit="%" icon={<Droplets size={24} />} sensorType="DHT22" isAlert={isHumidAlert} subValue={isHumidAlert ? "警告：超标" : "舒适区"} />
        <OledCard title="气压" value={data ? data.pressure.toFixed(1) : '--'} unit="hPa" icon={<Gauge size={24} />} sensorType="BMP280" subValue="大气压" />
        <OledCard title="海拔" value={data ? data.altitude.toFixed(0) : '--'} unit="m" icon={<Mountain size={24} />} sensorType="BMP280" subValue="估算海拔" />
      </div>

      {/* AI Analysis */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50">
          <h3 className="font-bold text-slate-300 flex items-center gap-2"><BrainCircuit size={18} className="text-purple-400" />智能环境分析</h3>
          <button onClick={handleAnalyze} disabled={!data || isAnalyzing} className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50">
            {isAnalyzing ? <RefreshCw className="animate-spin" size={14}/> : <BrainCircuit size={14}/>} {isAnalyzing ? "分析中..." : "立即分析"}
          </button>
        </div>
        <div className="p-6 min-h-[80px] flex items-center justify-center bg-slate-950/30">
          {isAnalyzing && <p className="text-purple-400 animate-pulse text-sm">正在分析当前环境数据...</p>}
          {aiAnalysis && !isAnalyzing && <div className="w-full text-slate-300 text-sm leading-relaxed whitespace-pre-line border-l-4 border-purple-500 pl-4">{aiAnalysis}</div>}
          {!aiAnalysis && !isAnalyzing && <p className="text-slate-600 text-xs">实时数据采集完成后即可进行 AI 环境评估。</p>}
        </div>
      </div>

      {/* Charts & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        <HistoryChart data={history} dataKey="temperature" color="#22d3ee" unit="°C" title="温度趋势" />
        <HistoryChart data={history} dataKey="humidity" color="#60a5fa" unit="%" title="湿度趋势" />
        <HistoryChart data={history} dataKey="pressure" color="#a78bfa" unit="hPa" title="气压趋势" />
        <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg h-64 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2"><AlertTriangle size={16} /> 系统事件日志</h3>
          <ul className="space-y-2">
            {history.slice().reverse().map((log, idx) => {
              const hT = log.temperature > thresholds.tempMax; const lT = log.temperature < thresholds.tempMin; const hH = log.humidity > thresholds.humidMax;
              if (!hT && !lT && !hH) return null;
              return (
                <li key={idx} className="text-[10px] font-mono p-2 rounded bg-red-950/20 border border-red-900/30 text-red-300 flex items-center justify-between">
                  <span>{hT && `[温度过高] ${log.temperature}°C `}{lT && `[温度过低] ${log.temperature}°C `}{hH && `[湿度过高] ${log.humidity}% `}</span>
                  <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </li>
              );
            })}
            {history.length > 0 && !history.some(h => h.temperature > thresholds.tempMax || h.humidity > thresholds.humidMax) && <li className="text-[10px] text-green-500 font-mono flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>系统正常</li>}
            {connectionStatus === ConnectionStatus.DISCONNECTED && <li className="text-[10px] text-slate-600 font-mono">等待设备接入...</li>}
            {connectionStatus === ConnectionStatus.ERROR && <li className="text-[10px] text-red-500 font-mono font-bold flex items-center gap-2"><XCircle size={10} />错误: 未发现指定 IP 的设备</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;