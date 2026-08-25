import React from 'react';
import { Globe, Server, FileCode, Network, ShieldCheck, Activity, Share2, Filter, Cpu, PieChart } from 'lucide-react';
import { StatsSummary } from '../types';

interface SidebarStatsProps {
  stats: StatsSummary | null;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onSelectTech: (tech: string) => void;
}

export const SidebarStats: React.FC<SidebarStatsProps> = ({
  stats,
  activeFilter,
  onFilterChange,
  onSelectTech
}) => {
  const dist = stats?.statusDistribution || { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, "other": 0 };
  const totalStatusCount = (dist["2xx"] || 0) + (dist["3xx"] || 0) + (dist["4xx"] || 0) + (dist["5xx"] || 0) + (dist["other"] || 0);

  const calcPercent = (count: number) => {
    if (!totalStatusCount) return '0%';
    return `${Math.round((count / totalStatusCount) * 100)}%`;
  };

  return (
    <aside className="w-64 glass-panel border-r border-white/10 p-4 flex flex-col justify-between z-20 shrink-0 select-none overflow-y-auto">
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
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>穿透路由</span>
            </div>
            <span className="text-base font-bold font-mono text-emerald-300">
              {stats?.totalEndpoints ?? 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <Network className="w-3.5 h-3.5 text-purple-400" />
              <span>拓扑节点</span>
            </div>
            <span className="text-base font-bold font-mono text-purple-300">
              {stats?.nodesCount ?? 0}
            </span>
          </div>
        </div>

        {/* HTTP Status Code Distribution Bar */}
        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <PieChart className="w-3 h-3 text-emerald-400" /> 响应状态码分布
            </span>
            <span className="font-mono text-[10px] text-slate-400">{totalStatusCount} 请求</span>
          </div>

          {/* Color bar */}
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
            <div style={{ width: calcPercent(dist["2xx"]) }} className="bg-emerald-500 transition-all" title={`2xx OK: ${dist["2xx"]}`} />
            <div style={{ width: calcPercent(dist["3xx"]) }} className="bg-amber-500 transition-all" title={`3xx Redirect: ${dist["3xx"]}`} />
            <div style={{ width: calcPercent(dist["4xx"]) }} className="bg-orange-500 transition-all" title={`4xx Client Error: ${dist["4xx"]}`} />
            <div style={{ width: calcPercent(dist["5xx"]) }} className="bg-rose-500 transition-all" title={`5xx Server Error: ${dist["5xx"]}`} />
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-slate-400">
            <span className="text-emerald-400">2xx: {dist["2xx"]}</span>
            <span className="text-amber-400">3xx: {dist["3xx"]}</span>
            <span className="text-orange-400">4xx: {dist["4xx"]}</span>
            <span className="text-rose-400">5xx: {dist["5xx"]}</span>
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

        {/* Detected Tech Stacks */}
        {stats?.technologies && stats.technologies.length > 0 && (
          <div className="pt-1 space-y-2">
            <span className="text-[11px] text-slate-400 block font-semibold flex items-center gap-1">
              <Cpu className="w-3 h-3 text-purple-400" /> 识别出的技术栈指纹
            </span>
            <div className="flex flex-wrap gap-1">
              {stats.technologies.map((tech) => (
                <button
                  key={tech}
                  onClick={() => onSelectTech(tech)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-950/40 text-purple-300 border border-purple-800/50 hover:bg-purple-900/60 transition-all cursor-pointer"
                  title={`点击在画布中高亮所有使用 ${tech} 的节点`}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/30 text-[10px] text-slate-400 space-y-1 mt-4">
        <p className="text-blue-300 font-medium flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> v2.0 旗舰引擎生效中
        </p>
        <p>• 动态树状分支手风琴折叠</p>
        <p>• 横向/纵向排版双向自由切换</p>
        <p>• Wappalyzer 级指纹智能提取</p>
      </div>
    </aside>
  );
};
