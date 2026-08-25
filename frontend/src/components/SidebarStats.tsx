import React from 'react';
import { Globe, Server, FileCode, Network, ShieldCheck, Activity } from 'lucide-react';
import { StatsSummary } from '../types';

interface SidebarStatsProps {
  stats: StatsSummary | null;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const SidebarStats: React.FC<SidebarStatsProps> = ({
  stats,
  activeFilter,
  onFilterChange,
}) => {
  return (
    <aside className="w-64 glass-panel border-r border-white/10 p-4 flex flex-col justify-between z-20 shrink-0 select-none">
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            资产态势大盘
          </h2>
        </div>

        {/* Root target indicator */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">当前分析主域</span>
          <p className="font-mono text-xs font-bold text-blue-400 truncate">
            {stats?.rootDomain || '等待输入目标...'}
          </p>
        </div>

        {/* Stats Matrix */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>发现子域</span>
            </div>
            <span className="text-lg font-bold font-mono text-cyan-300">
              {stats?.totalSubdomains ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>穿透路由</span>
            </div>
            <span className="text-lg font-bold font-mono text-emerald-300">
              {stats?.totalEndpoints ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <Network className="w-3.5 h-3.5 text-purple-400" />
              <span>总拓扑节点</span>
            </div>
            <span className="text-lg font-bold font-mono text-purple-300">
              {stats?.nodesCount ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>拓扑连线</span>
            </div>
            <span className="text-lg font-bold font-mono text-blue-300">
              {stats?.edgesCount ?? 0}
            </span>
          </div>
        </div>

        {/* View Filter */}
        <div className="pt-2">
          <span className="text-[11px] text-slate-400 block mb-2 font-semibold">
            节点分类高亮
          </span>
          <div className="space-y-1">
            {[
              { id: 'all', label: '🌐 全景资产 (All)' },
              { id: 'subdomains', label: '🌿 仅展示子域 (Subdomains)' },
              { id: 'endpoints', label: '📄 仅展示深层路由 (Routes)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => onFilterChange(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                  activeFilter === tab.id
                    ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/30 text-[10px] text-slate-400 space-y-1">
        <p className="text-blue-300 font-medium">⚡ 探测机制</p>
        <p>• CT Logs 证书日志毫秒嗅探</p>
        <p>• 异步 DNS 协程无阻塞解析</p>
        <p>• 前端 JS AST 路由反向提取</p>
      </div>
    </aside>
  );
};
