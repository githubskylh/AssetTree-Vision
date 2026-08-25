import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
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

// Initial Demo Graph
const initialNodes: Node[] = [
  {
    id: 'domain:github.com',
    type: 'customCard',
    position: { x: 50, y: 220 },
    data: {
      label: 'github.com',
      nodeType: 'apex_domain',
      subdomainCount: 4,
      isRoot: true,
      status: 200
    }
  },
  {
    id: 'sub:api.github.com',
    type: 'customCard',
    position: { x: 420, y: 80 },
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
    position: { x: 420, y: 320 },
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
    position: { x: 820, y: 40 },
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
    position: { x: 820, y: 130 },
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
    position: { x: 820, y: 300 },
    data: {
      label: '/rest',
      nodeType: 'endpoint',
      url: 'https://docs.github.com/rest',
      statusCode: 200,
      responseTime: 52,
      isJsExtracted: false,
      title: 'REST API Documentation - GitHub Docs'
    }
  }
];

const initialEdges: Edge[] = [
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

  const statsSummary: StatsSummary = useMemo(() => {
    const rootNode = nodes.find(n => (n.data as any)?.nodeType === 'apex_domain');
    const subdomains = nodes.filter(n => (n.data as any)?.nodeType === 'subdomain');
    const endpoints = nodes.filter(n => (n.data as any)?.nodeType === 'endpoint');

    return {
      rootDomain: (rootNode?.data as any)?.label || 'github.com',
      totalSubdomains: subdomains.length,
      totalEndpoints: endpoints.length,
      nodesCount: nodes.length,
      edgesCount: edges.length
    };
  }, [nodes, edges]);

  // Filtered nodes
  const displayNodes = useMemo(() => {
    if (activeFilter === 'all') return nodes;
    if (activeFilter === 'subdomains') {
      return nodes.filter(n => (n.data as any)?.nodeType === 'apex_domain' || (n.data as any)?.nodeType === 'subdomain');
    }
    if (activeFilter === 'endpoints') {
      return nodes.filter(n => (n.data as any)?.nodeType === 'endpoint' || (n.data as any)?.nodeType === 'subdomain');
    }
    return nodes;
  }, [nodes, activeFilter]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data as unknown as CustomNodeData);
    setIsDrawerOpen(true);
  }, []);

  const handleStartScan = useCallback((url: string, depth: number) => {
    setIsScanning(true);
    setCurrentStage({ stage: 'normalizing', message: `正在启动三维穿透引擎：${url}` });
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
        message: `已完成子域 [${data.host}] 深度穿透，提取 ${data.pagesCount} 条路由`
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
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    });

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setCurrentStage({ stage: 'error', message: '探测任务完成或连接结束' });
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

  const handleReset = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCurrentStage(null);
  }, [setNodes, setEdges]);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0B0F19] text-slate-100 overflow-hidden">
      {/* Top Navbar */}
      <Navbar
        onStartScan={handleStartScan}
        isScanning={isScanning}
        onExportJson={handleExportJson}
        onReset={handleReset}
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
            <Background color="#1E293B" gap={20} size={1} variant={BackgroundVariant.Dots} />
            <Controls className="!bg-[#131B2E] !border-slate-800" />
            <MiniMap
              nodeStrokeColor="#3B82F6"
              nodeColor="#1E293B"
              maskColor="rgba(11, 15, 25, 0.7)"
              className="!bg-[#131B2E]/90 !border-slate-800 !rounded-xl"
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
