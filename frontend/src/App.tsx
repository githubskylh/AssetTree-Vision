import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import confetti from 'canvas-confetti';

import { CustomCardNode } from './components/CustomCardNode';
import { Navbar } from './components/Navbar';
import { SidebarStats } from './components/SidebarStats';
import { ScanProgressRadar } from './components/ScanProgressRadar';
import { NodeDrawer } from './components/NodeDrawer';
import { CustomNodeData, ScanStageEvent, StatsSummary } from './types';

const nodeTypes = {
  customCard: CustomCardNode,
};

// Enhanced Initial Demo Graph with Horizontal & Sitemap nodes
const initialNodes: Node[] = [
  {
    id: 'horizontal:githubstatus.com',
    type: 'customCard',
    position: { x: -280, y: 220 },
    data: {
      label: 'githubstatus.com',
      nodeType: 'horizontal_domain',
      status: 200
    }
  },
  {
    id: 'domain:github.com',
    type: 'customCard',
    position: { x: 80, y: 220 },
    data: {
      label: 'github.com',
      nodeType: 'apex_domain',
      subdomainCount: 4,
      horizontalCount: 1,
      isRoot: true,
      status: 200
    }
  },
  {
    id: 'sub:api.github.com',
    type: 'customCard',
    position: { x: 460, y: 80 },
    data: {
      label: 'api.github.com',
      nodeType: 'subdomain',
      ip: '140.82.114.6',
      pagesCount: 3,
      status: 200
    }
  },
  {
    id: 'sub:docs.github.com',
    type: 'customCard',
    position: { x: 460, y: 320 },
    data: {
      label: 'docs.github.com',
      nodeType: 'subdomain',
      ip: '140.82.112.5',
      pagesCount: 2,
      status: 200
    }
  },
  {
    id: 'page:api.github.com:/users',
    type: 'customCard',
    position: { x: 880, y: 40 },
    data: {
      label: '/users',
      nodeType: 'endpoint',
      url: 'https://api.github.com/users',
      statusCode: 200,
      responseTime: 38,
      isJsExtracted: true,
      title: 'GitHub Users API'
    }
  },
  {
    id: 'page:api.github.com:/repos',
    type: 'customCard',
    position: { x: 880, y: 130 },
    data: {
      label: '/repos',
      nodeType: 'endpoint',
      url: 'https://api.github.com/repos',
      statusCode: 200,
      responseTime: 45,
      isJsExtracted: true,
      title: 'GitHub Repositories API'
    }
  },
  {
    id: 'page:docs.github.com:/rest',
    type: 'customCard',
    position: { x: 880, y: 300 },
    data: {
      label: '/rest',
      nodeType: 'endpoint',
      url: 'https://docs.github.com/rest',
      statusCode: 200,
      responseTime: 52,
      isSitemapDiscovered: true,
      title: 'REST API Documentation - GitHub Docs'
    }
  }
];

const initialEdges: Edge[] = [
  { id: 'e-h1', source: 'horizontal:githubstatus.com', target: 'domain:github.com', animated: true, style: { stroke: '#06B6D4', strokeWidth: 2, strokeDasharray: '5,5' } },
  { id: 'e1-2', source: 'domain:github.com', target: 'sub:api.github.com', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 } },
  { id: 'e1-3', source: 'domain:github.com', target: 'sub:docs.github.com', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 } },
  { id: 'e2-4', source: 'sub:api.github.com', target: 'page:api.github.com:/users', style: { stroke: '#10B981', strokeWidth: 1.5 } },
  { id: 'e2-5', source: 'sub:api.github.com', target: 'page:api.github.com:/repos', style: { stroke: '#10B981', strokeWidth: 1.5 } },
  { id: 'e3-6', source: 'sub:docs.github.com', target: 'page:docs.github.com:/rest', style: { stroke: '#10B981', strokeWidth: 1.5 } }
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [isScanning, setIsScanning] = useState(false);
  const [currentStage, setCurrentStage] = useState<ScanStageEvent | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<CustomNodeData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');

  const statsSummary: StatsSummary = useMemo(() => {
    const rootNode = nodes.find(n => (n.data as any)?.nodeType === 'apex_domain');
    const horizontals = nodes.filter(n => (n.data as any)?.nodeType === 'horizontal_domain');
    const subdomains = nodes.filter(n => (n.data as any)?.nodeType === 'subdomain');
    const endpoints = nodes.filter(n => (n.data as any)?.nodeType === 'endpoint');

    return {
      rootDomain: (rootNode?.data as any)?.label || 'github.com',
      totalHorizontal: horizontals.length,
      totalSubdomains: subdomains.length,
      totalEndpoints: endpoints.length,
      nodesCount: nodes.length,
      edgesCount: edges.length
    };
  }, [nodes, edges]);

  // Filtered & Highlighted nodes
  const displayNodes = useMemo(() => {
    let filtered = nodes;
    if (activeFilter === 'horizontal') {
      filtered = nodes.filter(n => (n.data as any)?.nodeType === 'horizontal_domain' || (n.data as any)?.nodeType === 'apex_domain');
    } else if (activeFilter === 'subdomains') {
      filtered = nodes.filter(n => (n.data as any)?.nodeType === 'apex_domain' || (n.data as any)?.nodeType === 'subdomain');
    } else if (activeFilter === 'endpoints') {
      filtered = nodes.filter(n => (n.data as any)?.nodeType === 'endpoint' || (n.data as any)?.nodeType === 'subdomain');
    }

    if (!searchFilter.trim()) {
      return filtered.map(n => ({
        ...n,
        data: { ...(n.data as any), isHighlighted: false }
      }));
    }

    const query = searchFilter.toLowerCase().trim();
    return filtered.map(n => {
      const d = n.data as any;
      const labelMatch = (d.label || '').toLowerCase().includes(query);
      const titleMatch = (d.title || '').toLowerCase().includes(query);
      const statusMatch = String(d.statusCode || d.status || '').includes(query);
      const isMatch = labelMatch || titleMatch || statusMatch;

      return {
        ...n,
        data: {
          ...d,
          isHighlighted: isMatch
        }
      };
    });
  }, [nodes, activeFilter, searchFilter]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data as unknown as CustomNodeData);
    setIsDrawerOpen(true);
  }, []);

  const handleStartScan = useCallback((url: string, depth: number) => {
    setIsScanning(true);
    setCurrentStage({ stage: 'normalizing', message: `正在启动全维度穿透引擎：${url}` });
    setNodes([]);
    setEdges([]);

    const eventSource = new EventSource(`/api/scan/stream?url=${encodeURIComponent(url)}`);

    eventSource.addEventListener('stage', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setCurrentStage(data);
    });

    eventSource.addEventListener('host_crawled', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setCurrentStage({
        stage: 'deep_crawling',
        message: `已完成子域 [${data.host}] 深度穿透，挖掘 ${data.pagesCount} 条路由`
      });
    });

    eventSource.addEventListener('graph_ready', (e: MessageEvent) => {
      const graph = JSON.parse(e.data);
      setNodes(graph.nodes);
      setEdges(graph.edges);
    });

    eventSource.addEventListener('complete', (e: MessageEvent) => {
      setIsScanning(false);
      eventSource.close();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    });

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setCurrentStage({ stage: 'error', message: '探测任务完成或连接已关闭' });
      setIsScanning(false);
      eventSource.close();
    };
  }, [setNodes, setEdges]);

  const handleExportJson = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, edges, stats: statsSummary }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AssetTree_${statsSummary.rootDomain}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [nodes, edges, statsSummary]);

  const handleExportCsv = useCallback(() => {
    const headers = ["ID", "Node Type", "Label", "Status Code", "Full URL", "IP Address", "Response Time (ms)", "Server", "Title", "JS Route", "Sitemap"];
    const rows = nodes.map(n => {
      const d = n.data as any;
      return [
        `"${n.id}"`,
        `"${d.nodeType || ''}"`,
        `"${d.label || ''}"`,
        `"${d.statusCode || d.status || ''}"`,
        `"${d.url || ''}"`,
        `"${d.ip || ''}"`,
        `"${d.responseTime ?? ''}"`,
        `"${d.server || ''}"`,
        `"${(d.title || '').replace(/"/g, '""')}"`,
        `"${d.isJsExtracted ? 'Yes' : 'No'}"`,
        `"${d.isSitemapDiscovered ? 'Yes' : 'No'}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `AssetTree_Assets_${statsSummary.rootDomain}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [nodes, statsSummary]);

  const handleReset = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCurrentStage(null);
    setSearchFilter('');
  }, [setNodes, setEdges]);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0B0F19] text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Navbar
        onStartScan={handleStartScan}
        isScanning={isScanning}
        onExportJson={handleExportJson}
        onExportCsv={handleExportCsv}
        onReset={handleReset}
        searchFilter={searchFilter}
        onSearchFilterChange={setSearchFilter}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Sidebar Stats */}
        <SidebarStats
          stats={statsSummary}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Center: React Flow Canvas */}
        <main className="flex-1 h-full relative">
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            fitView
            attributionPosition="bottom-right"
            className="bg-[#0B0F19]"
          >
            <Background color="#1E293B" gap={24} size={1.2} variant={BackgroundVariant.Dots} />
            <Controls className="!bg-[#131B2E] !border-slate-800" />
            <MiniMap
              nodeStrokeColor="#3B82F6"
              nodeColor="#1E293B"
              maskColor="rgba(11, 15, 25, 0.75)"
              className="!bg-[#131B2E]/90 !border-slate-800 !rounded-xl shadow-2xl"
            />
          </ReactFlow>

          {/* Live Progress Radar Overlay */}
          <ScanProgressRadar
            currentStage={currentStage}
            isScanning={isScanning}
          />
        </main>

        {/* Right Inspector Drawer */}
        <NodeDrawer
          nodeData={selectedNodeData}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      </div>
    </div>
  );
}
