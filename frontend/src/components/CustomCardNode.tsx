import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Globe, Server, FileCode, Layers, Cpu, Share2, Map, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { CustomNodeData } from '../types';

export const CustomCardNode = memo(({ id, data, selected }: NodeProps<any>) => {
  const nodeData = data as CustomNodeData;

  const isApex = nodeData.nodeType === 'apex_domain';
  const isHorizontal = nodeData.nodeType === 'horizontal_domain';
  const isSub = nodeData.nodeType === 'subdomain';
  const isEndpoint = nodeData.nodeType === 'endpoint';
  const isTB = nodeData.layoutDirection === 'TB';

  const targetPosition = isTB ? Position.Top : Position.Left;
  const sourcePosition = isTB ? Position.Bottom : Position.Right;

  // Determine status color
  const getStatusColor = (code?: number) => {
    if (!code || code === 200) return 'bg-emerald-500 text-emerald-100 border-emerald-400/30';
    if (code >= 300 && code < 400) return 'bg-amber-500 text-amber-100 border-amber-400/30';
    if (code >= 400 && code < 500) return 'bg-orange-500 text-orange-100 border-orange-400/30';
    return 'bg-rose-500 text-rose-100 border-rose-400/30';
  };

  return (
    <div
      className={`min-w-[240px] max-w-[340px] rounded-xl transition-all duration-300 select-none ${
        nodeData.isHighlighted
          ? 'ring-4 ring-cyan-400 shadow-2xl shadow-cyan-500/50 scale-105 animate-pulse'
          : selected
          ? 'ring-2 ring-blue-400 shadow-xl shadow-blue-500/20 scale-[1.02]'
          : ''
      } ${
        isApex
          ? 'bg-gradient-to-b from-[#1E293B] to-[#0F172A] border-2 border-blue-500/70 shadow-lg shadow-blue-900/40'
          : isHorizontal
          ? 'bg-gradient-to-b from-[#16273b] to-[#0d1e2f] border-2 border-cyan-500/60 shadow-lg shadow-cyan-950/40'
          : isSub
          ? 'bg-[#131B2E]/95 border border-cyan-500/40 shadow-md shadow-cyan-950/20'
          : 'bg-[#182235]/85 border border-slate-700/60'
      }`}
    >
      {/* Target Handle */}
      {!isHorizontal && (
        <Handle
          type="target"
          position={targetPosition}
          className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-slate-900"
        />
      )}

      {/* Card Header */}
      <div className="p-3.5 border-b border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`p-1.5 rounded-lg shrink-0 ${
              isApex
                ? 'bg-blue-500/20 text-blue-400'
                : isHorizontal
                ? 'bg-cyan-500/20 text-cyan-300'
                : isSub
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {isApex && <Globe className="w-4 h-4" />}
            {isHorizontal && <Share2 className="w-4 h-4" />}
            {isSub && <Server className="w-4 h-4" />}
            {isEndpoint && <FileCode className="w-4 h-4" />}
          </div>
          <span className="font-mono text-xs font-semibold text-slate-200 truncate">
            {nodeData.label}
          </span>
        </div>

        {/* Status code badge */}
        {nodeData.statusCode && (
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${getStatusColor(
              nodeData.statusCode
            )}`}
          >
            {nodeData.statusCode}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3 space-y-2 text-xs">
        {/* Apex details */}
        {isApex && (
          <div className="space-y-1.5 text-slate-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-slate-300">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                根域母体 (Apex)
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[11px]">
                {nodeData.subdomainCount || 0} 子域
              </span>
            </div>
            {nodeData.horizontalCount !== undefined && nodeData.horizontalCount > 0 && (
              <div className="flex items-center justify-between text-[11px] text-cyan-300 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-800/40">
                <span className="flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  横向同根关联
                </span>
                <span className="font-mono font-bold">
                  {nodeData.horizontalCount} 根域
                </span>
              </div>
            )}
          </div>
        )}

        {/* Horizontal domain details */}
        {isHorizontal && (
          <div className="space-y-1 text-cyan-200">
            <div className="flex items-center justify-between text-[11px]">
              <span>SSL 证书 SANs 同源</span>
              <span className="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded text-[10px]">
                横向兄弟域
              </span>
            </div>
          </div>
        )}

        {/* Subdomain details */}
        {isSub && (
          <div className="space-y-1.5 text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">DNS 解析 IP</span>
              <span className="font-mono text-[11px] text-cyan-300">
                {nodeData.ip || 'Resolved'}
              </span>
            </div>
            {nodeData.cname && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">CNAME 别名</span>
                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                  {nodeData.cname}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[11px] text-slate-400">已穿透路由</span>
              {nodeData.pagesCount !== undefined && nodeData.pagesCount > 0 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nodeData.onToggleCollapse?.(id);
                  }}
                  className="flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-2 py-0.5 rounded transition-all"
                  title="点击折叠/展开该子域下的子页面"
                >
                  {nodeData.isCollapsed ? (
                    <>
                      <ChevronRight className="w-3 h-3 text-emerald-400" />
                      <span>展开 {nodeData.pagesCount} 条</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 text-emerald-400" />
                      <span>折叠 {nodeData.pagesCount} 条</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="text-[11px] font-mono text-slate-500">0 条</span>
              )}
            </div>
          </div>
        )}

        {/* Endpoint details */}
        {isEndpoint && (
          <div className="space-y-1">
            {nodeData.title && (
              <p className="text-slate-300 truncate text-[11px]" title={nodeData.title}>
                {nodeData.title}
              </p>
            )}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              {nodeData.responseTime !== undefined ? (
                <span>⏱️ {nodeData.responseTime}ms</span>
              ) : (
                <span>-</span>
              )}
              <div className="flex items-center gap-1">
                {nodeData.isJsExtracted && (
                  <span className="flex items-center gap-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
                    <Cpu className="w-2.5 h-2.5" /> JS
                  </span>
                )}
                {nodeData.isSitemapDiscovered && (
                  <span className="flex items-center gap-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">
                    <Map className="w-2.5 h-2.5" /> Sitemap
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tech Badges */}
        {nodeData.technologies && nodeData.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1.5 border-t border-white/5">
            {nodeData.technologies.map((t) => (
              <span
                key={t}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-cyan-300 border border-slate-700/60"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Source Handle */}
      {!isEndpoint && (
        <Handle
          type="source"
          position={sourcePosition}
          className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-slate-900"
        />
      )}
    </div>
  );
});
