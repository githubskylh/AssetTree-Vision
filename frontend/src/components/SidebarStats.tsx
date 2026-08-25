import React from 'react';
import { Globe, Server, FileCode, Network, ShieldCheck, Activity, Share2, Filter } from 'lucide-react';
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
            全维度态势大盘
          </h2>
        </div>

        {/* Root target indicator */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">当前分析母根域</span>
          <p className="font-mono text-xs font-bold text-blue-400 truncate">
            {stats?.rootDomain || '等待输入目标...'}
          </p>
        </div>

        {/* Stats Matrix */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-cyan-900/40">
            <div className="flex items-center gap-1.5 text-cyan-300 text-[11px] mb-1">
              <Share2 className="w-3 h-3 text-cyan-400" />
              <span>横向同根</span>
            </div>
            <span className="text-base font-bold font-mono text-cyan-300">
              {stats?.totalHorizontal ?? 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <Server className="w-3 h-3 text-blue-400" />
              <span>纵向子域</span>
            </div>
            <span className="text-base font-bold font-mono text-blue-300">
              {stats?.totalSubdomains ?? 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <FileCode className="w-3 h-3 text-emerald-400" />
              <span>穿透路由</span>
            </div>
            <span className="text-base font-bold font-mono text-emerald-300">
              {stats?.totalEndpoints ?? 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <Network className="w-3 h-3 text-purple-400" />
              <span>拓扑节点</span>
            </div>
            <span className="text-base font-bold font-mono text-purple-300">
              {stats?.nodesCount ?? 0}
            </span>
          </div>
        </div>

        {/* View Filter Tabs */}
        <div className="pt-1">
          <span className="text-[11px] text-slate-400 block mb-2 font-semibold flex items-center gap-1">
            <Filter className="w-3 h-3 text-blue-400" /> 分类视角筛选
          </span>
          <div className="space-y-1">
            {[
              { id: 'all', label: '🌐 全景拓扑 (All Assets)' },
              { id: 'horizontal', label: '🔀 横向同根域 (Horizontal)' },
              { id: 'subdomains', label: '🌿 纵向子域主干 (Subdomains)' },
              { id: 'endpoints', label: '📄 深度穿透路由 (Routes)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => onFilterChange(tab.id)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all ${
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
        <p className="text-blue-300 font-medium flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> 穿透引擎增强已激活
        </p>
        <p>• SSL SANs 横向根域深度扩散</p>
        <p>• Robots/Sitemap 结构化探测</p>
        <p>• JS AST/正则隐式接口逆向</p>
      </div>
    </aside>
  );
};
