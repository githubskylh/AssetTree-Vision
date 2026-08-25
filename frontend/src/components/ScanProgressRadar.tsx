import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Radio } from 'lucide-react';
import { ScanStageEvent } from '../types';

interface ScanProgressRadarProps {
  currentStage: ScanStageEvent | null;
  isScanning: boolean;
}

export const ScanProgressRadar: React.FC<ScanProgressRadarProps> = ({
  currentStage,
  isScanning
}) => {
  if (!isScanning && !currentStage) return null;

  return (
    <div className="absolute bottom-6 left-72 z-30 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none">
      <div className="glass-card p-4 rounded-2xl border border-blue-500/30 shadow-2xl pointer-events-auto">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              探测雷达实时流 (Live SSE)
            </span>
          </div>
          {isScanning ? (
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              正在穿透
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              穿透完成
            </span>
          )}
        </div>

        <p className="text-xs text-slate-200 font-mono line-clamp-2">
          {currentStage?.message || '初始化探测引擎中...'}
        </p>

        {/* Dynamic progress bar animation */}
        {isScanning && (
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 animate-pulse w-full rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
};
