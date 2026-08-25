import React, { useState } from 'react';
import { Search, Sparkles, Download, RefreshCw, Network, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onStartScan: (url: string, depth: number) => void;
  isScanning: boolean;
  onExportJson: () => void;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onStartScan,
  isScanning,
  onExportJson,
  onReset
}) => {
  const [inputUrl, setInputUrl] = useState('https://github.com');
  const [depth, setDepth] = useState(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim() && !isScanning) {
      onStartScan(inputUrl.trim(), depth);
    }
  };

  return (
    <header className="h-16 border-b border-white/10 glass-panel px-6 flex items-center justify-between z-30 relative shrink-0">
      {/* Left: Brand Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/25">
          <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
            <Network className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm tracking-wide bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              AssetTree-Vision
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400">URL 全维度资产穿透与树状拓扑图</p>
        </div>
      </div>

      {/* Center: Search & Control Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-2xl w-full mx-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-blue-400" />
          </div>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="输入任意目标 URL 或域名 (如 https://example.com 或 api.sub.domain.com)"
            disabled={isScanning}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
          />
        </div>

        {/* Depth Selector */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-xs text-slate-300">
          <span className="text-[11px] text-slate-400">深度:</span>
          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            disabled={isScanning}
            className="bg-transparent text-cyan-400 font-mono font-semibold focus:outline-none cursor-pointer"
          >
            <option value={1} className="bg-slate-900">1 级 (主干)</option>
            <option value={2} className="bg-slate-900">2 级 (推荐)</option>
            <option value={3} className="bg-slate-900">3 级 (深度)</option>
          </select>
        </div>

        {/* Launch Button */}
        <button
          type="submit"
          disabled={isScanning || !inputUrl.trim()}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all duration-200 ${
            isScanning
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95'
          }`}
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>透视穿透中...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>开始透视</span>
            </>
          )}
        </button>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExportJson}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors"
          title="导出当前拓扑图 JSON"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>导出 JSON</span>
        </button>
        <button
          onClick={onReset}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          title="重置画布"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
