import React from 'react';
import { X, Globe, ExternalLink, ShieldCheck, Server, Clock, Cpu } from 'lucide-react';
import { CustomNodeData } from '../types';

interface NodeDrawerProps {
  nodeData: CustomNodeData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const NodeDrawer: React.FC<NodeDrawerProps> = ({
  nodeData,
  isOpen,
  onClose
}) => {
  if (!isOpen || !nodeData) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 glass-panel border-l border-white/10 z-40 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="space-y-6 overflow-y-auto pr-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-100">节点全景详情</h3>
              <p className="text-[11px] text-slate-400 font-mono capitalize">
                {nodeData.nodeType.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Identity */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">节点标识 / 路径</label>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs text-cyan-300 break-all">
              {nodeData.label}
            </div>
          </div>

          {nodeData.url && (
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">完整访问 URL</label>
              <a
                href={nodeData.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs text-blue-400 hover:text-blue-300 hover:border-blue-500/50 transition-all break-all group"
              >
                <span className="truncate mr-2">{nodeData.url}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          )}
        </div>

        {/* Detailed Attributes */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            技术指标与指纹
          </h4>

          <div className="grid grid-cols-2 gap-2">
            {nodeData.statusCode && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">HTTP 响应码</span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {nodeData.statusCode} OK
                </span>
              </div>
            )}

            {nodeData.responseTime !== undefined && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">请求耗时</span>
                <span className="font-mono text-xs font-bold text-cyan-400">
                  {nodeData.responseTime} ms
                </span>
              </div>
            )}

            {nodeData.ip && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 col-span-2">
                <span className="text-[10px] text-slate-400 block mb-1">DNS 解析 IP</span>
                <span className="font-mono text-xs font-bold text-purple-300">
                  {nodeData.ip}
                </span>
              </div>
            )}

            {nodeData.server && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 col-span-2">
                <span className="text-[10px] text-slate-400 block mb-1">Web Server 指纹</span>
                <span className="font-mono text-xs text-slate-200">
                  {nodeData.server}
                </span>
              </div>
            )}
          </div>

          {nodeData.isJsExtracted && (
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/50 flex items-start gap-2">
              <Cpu className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-purple-200">
                <p className="font-semibold">隐蔽前端路由 (JS Extracted)</p>
                <p className="text-purple-300/80 mt-0.5">
                  该接口/路由通过从前端打包的 JavaScript 脚本 AST/正则分析中逆向提取还原。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
        >
          关闭抽屉
        </button>
      </div>
    </div>
  );
};
