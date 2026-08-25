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
import { CustomNodeData, ScanStageEvent, StatsSummary, LayoutDirectionEnum } from './types';

const nodeTypes = {
  customCard: CustomCardNode,
};

// Layout re-calculator for LR and TB directions
function computeHierarchicalPositions(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirectionEnum = 'LR',
  collapsedSet: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  const isTB = direction === 'TB';

  // Group nodes by type
  const horizontalNodes = nodes.filter(n => (n.data as any)?.nodeType === 'horizontal_domain');
  const rootNode = nodes.find(n => (n.data as any)?.nodeType === 'apex_domain');
  const subNodes = nodes.filter(n => (n.data as any)?.nodeType === 'subdomain');
  const endpointNodes = nodes.filter(n => (n.data as any)?.nodeType === 'endpoint');

  // Filter out endpoint nodes belonging to collapsed subdomains
  const visibleEndpoints = endpointNodes.filter(ep => {
    const parentFqdn = (ep.data as any)?.fqdn;
    const parentSub = subNodes.find(s => (s.data as any)?.fqdn === parentFqdn);
    return !parentSub || !collapsedSet.has(parentSub.id);
  });

  const visibleNodes: Node[] = [];
  const visibleNodeIds = new Set<string>();

  if (direction === 'LR') {
    // 1. Horizontal Left
    horizontalNodes.forEach((hn, idx) => {
      visibleNodes.push({
        ...hn,
        position: { x: -320, y: 150 + idx * 160 },
        data: { ...(hn.data as any), layoutDirection: 'LR' }
      });
      visibleNodeIds.add(hn.id);
    });

    // 2. Apex Center
    if (rootNode) {
      visibleNodes.push({
        ...rootNode,
        position: { x: 60, y: Math.max(250, (subNodes.length * 190) / 2) },
        data: { ...(rootNode.data as any), layoutDirection: 'LR' }
      });
      visibleNodeIds.add(rootNode.id);
    }

    // 3. Subdomains & Endpoints
    let currentY = 50;
    subNodes.forEach((sn) => {
      const isCollapsed = collapsedSet.has(sn.id);
      const childEps = visibleEndpoints.filter(ep => (ep.data as any)?.fqdn === (sn.data as any)?.fqdn);

      visibleNodes.push({
        ...sn,
        position: { x: 460, y: currentY },
        data: { ...(sn.data as any), isCollapsed, layoutDirection: 'LR' }
      });
      visibleNodeIds.add(sn.id);

      if (!isCollapsed && childEps.length > 0) {
        childEps.forEach((ep, epIdx) => {
          visibleNodes.push({
            ...ep,
            position: { x: 900, y: currentY - 40 + epIdx * 75 },
            data: { ...(ep.data as any), layoutDirection: 'LR' }
          });
          visibleNodeIds.add(ep.id);
        });
        currentY += Math.max(190, childEps.length * 75 + 30);
      } else {
        currentY += 190;
      }
    });
  } else {
    // Top-to-Bottom (TB) Layout
    // 1. Horizontal top row
    horizontalNodes.forEach((hn, idx) => {
      visibleNodes.push({
        ...hn,
        position: { x: 100 + idx * 360, y: 50 },
        data: { ...(hn.data as any), layoutDirection: 'TB' }
      });
      visibleNodeIds.add(hn.id);
    });

    // 2. Apex Node
    if (rootNode) {
      visibleNodes.push({
        ...rootNode,
        position: { x: Math.max(250, (subNodes.length * 360) / 2 - 100), y: 240 },
        data: { ...(rootNode.data as any), layoutDirection: 'TB' }
      });
      visibleNodeIds.add(rootNode.id);
    }

    // 3. Subdomains row
    let currentX = 50;
    subNodes.forEach((sn) => {
      const isCollapsed = collapsedSet.has(sn.id);
      const childEps = visibleEndpoints.filter(ep => (ep.data as any)?.fqdn === (sn.data as any)?.fqdn);

      visibleNodes.push({
        ...sn,
        position: { x: currentX, y: 480 },
        data: { ...(sn.data as any), isCollapsed, layoutDirection: 'TB' }
      });
      visibleNodeIds.add(sn.id);

      if (!isCollapsed && childEps.length > 0) {
        childEps.forEach((ep, epIdx) => {
          visibleNodes.push({
            ...ep,
            position: { x: currentX, y: 700 + epIdx * 100 },
            data: { ...(ep.data as any), layoutDirection: 'TB' }
          });
          visibleNodeIds.add(ep.id);
        });
      }
      currentX += 360;
    });
  }

  // Filter edges to only connect visible nodes
  const visibleEdges = edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));

  return { nodes: visibleNodes, edges: visibleEdges };
}

// Initial Demo Graph
const initialRawNodes: Node[] = [
  {
    id: 'horizontal:githubstatus.com',
    type: 'customCard',
    position: { x: -320, y: 220 },
    data: { label: 'githubstatus.com', nodeType: 'horizontal_domain', status: 200 }
  },
  {
    id: 'domain:github.com',
    type: 'customCard',
    position: { x: 60, y: 220 },
    data: { label: 'github.com', nodeType: 'apex_domain', subdomainCount: 4, horizontalCount: 1, isRoot: true, status: 200, technologies: ['React', 'Next.js', 'Cloudflare'] }
  },
  {
    id: 'sub:api.github.com',
    type: 'customCard',
    position: { x: 460, y: 80 },
    data: { label: 'api.github.com', fqdn: 'api.github.com', nodeType: 'subdomain', ip: '140.82.114.6', pagesCount: 2, status: 200, technologies: ['Express', 'Node.js'] }
  },
  {
    id: 'sub:docs.github.com',
    type: 'customCard',
    position: { x: 460, y: 320 },
    data: { label: 'docs.github.com', fqdn: 'docs.github.com', nodeType: 'subdomain', ip: '140.82.112.5', pagesCount: 1, status: 200, technologies: ['Next.js', 'React'] }
  },
  {
    id: 'page:api.github.com:/users',
    type: 'customCard',
    position: { x: 900, y: 40 },
    data: { label: '/users', fqdn: 'api.github.com', nodeType: 'endpoint', url: 'https://api.github.com/users', statusCode: 200, responseTime: 38, isJsExtracted: true, title: 'GitHub Users API', technologies: ['Node.js'] }
  },
  {
    id: 'page:api.github.com:/repos',
    type: 'customCard',
    position: { x: 900, y: 130 },
    data: { label: '/repos', fqdn: 'api.github.com', nodeType: 'endpoint', url: 'https://api.github.com/repos', statusCode: 200, responseTime: 45, isJsExtracted: true, title: 'GitHub Repositories API', technologies: ['Node.js'] }
  },
  {
    id: 'page:docs.github.com:/rest',
    type: 'customCard',
    position: { x: 900, y: 300 },
    data: { label: '/rest', fqdn: 'docs.github.com', nodeType: 'endpoint', url: 'https://docs.github.com/rest', statusCode: 200, responseTime: 52, isSitemapDiscovered: true, title: 'REST API Documentation - GitHub Docs', technologies: ['Next.js'] }
  }
];

const initialRawEdges: Edge[] = [
  { id: 'e-h1', source: 'horizontal:githubstatus.com', target: 'domain:github.com', animated: true, style: { stroke: '#06B6D4', strokeWidth: 2, strokeDasharray: '5,5' } },
  { id: 'e1-2', source: 'domain:github.com', target: 'sub:api.github.com', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 } },
  { id: 'e1-3', source: 'domain:github.com', target: 'sub:docs.github.com', animated: true, style: { stroke: '#3B82F6', strokeWidth: 2 } },
  { id: 'e2-4', source: 'sub:api.github.com', target: 'page:api.github.com:/users', style: { stroke: '#10B981', strokeWidth: 1.5 } },
  { id: 'e2-5', source: 'sub:api.github.com', target: 'page:api.github.com:/repos', style: { stroke: '#10B981', strokeWidth: 1.5 } },
  { id: 'e3-6', source: 'sub:docs.github.com', target: 'page:docs.github.com:/rest', style: { stroke: '#10B981', strokeWidth: 1.5 } }
];

export default function App() {
  const [allMasterNodes, setAllMasterNodes] = useState<Node[]>(initialRawNodes);
  const [allMasterEdges, setAllMasterEdges] = useState<Edge[]>(initialRawEdges);
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(new Set());
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirectionEnum>('LR');

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [isScanning, setIsScanning] = useState(false);
  const [currentStage, setCurrentStage] = useState<ScanStageEvent | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<CustomNodeData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [historyList, setHistoryList] = useState<string[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('assettree_history');
      if (saved) {
        setHistoryList(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveToHistory = (url: string) => {
    try {
      const updated = [url, ...historyList.filter(h => h !== url)].slice(0, 8);
      setHistoryList(updated);
      localStorage.setItem('assettree_history', JSON.stringify(updated));
    } catch {}
  };

  // Toggle Collapse on subdomains
  const handleToggleCollapse = useCallback((nodeId: string) => {
    setCollapsedSet(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Recalculate rendered nodes whenever raw nodes, collapse state, or layout direction changes
  useEffect(() => {
    const nodesWithHandler = allMasterNodes.map(n => ({
      ...n,
      data: {
        ...(n.data as any),
        onToggleCollapse: handleToggleCollapse
      }
    }));

    const result = computeHierarchicalPositions(nodesWithHandler, allMasterEdges, layoutDirection, collapsedSet);
    setNodes(result.nodes);
    setEdges(result.edges);
  }, [allMasterNodes, allMasterEdges, layoutDirection, collapsedSet, handleToggleCollapse]);

  const statsSummary: StatsSummary = useMemo(() => {
    const rootNode = allMasterNodes.find(n => (n.data as any)?.nodeType === 'apex_domain');
    const horizontals = allMasterNodes.filter(n => (n.data as any)?.nodeType === 'horizontal_domain');
    const subdomains = allMasterNodes.filter(n => (n.data as any)?.nodeType === 'subdomain');
    const endpoints = allMasterNodes.filter(n => (n.data as any)?.nodeType === 'endpoint');

    const techs = new Set<string>();
    const statusDist = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, "other": 0 };

    allMasterNodes.forEach(n => {
      const d = n.data as any;
      if (d.technologies) {
        d.technologies.forEach((t: string) => techs.add(t));
      }
      const s = d.statusCode || d.status;
      if (s) {
        if (s >= 200 && s < 300) statusDist["2xx"]++;
        else if (s >= 300 && s < 400) statusDist["3xx"]++;
        else if (s >= 400 && s < 500) statusDist["4xx"]++;
        else if (s >= 500) statusDist["5xx"]++;
        else statusDist["other"]++;
      }
    });

    return {
      rootDomain: (rootNode?.data as any)?.label || 'github.com',
      totalHorizontal: horizontals.length,
      totalSubdomains: subdomains.length,
      totalEndpoints: endpoints.length,
      nodesCount: allMasterNodes.length,
      edgesCount: allMasterEdges.length,
      technologies: Array.from(techs),
      statusDistribution: statusDist
    };
  }, [allMasterNodes, allMasterEdges]);

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
      const techMatch = (d.technologies || []).some((t: string) => t.toLowerCase().includes(query));
      const isMatch = labelMatch || titleMatch || statusMatch || techMatch;

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

  const handleToggleLayout = useCallback(() => {
    setLayoutDirection(prev => (prev === 'LR' ? 'TB' : 'LR'));
  }, []);

  const handleSelectTech = useCallback((tech: string) => {
    setSearchFilter(tech);
  }, []);

  const handleStartScan = useCallback((url: string, depth: number) => {
    setIsScanning(true);
    setCurrentStage({ stage: 'normalizing', message: `正在启动全维度穿透引擎：${url}` });
    setAllMasterNodes([]);
    setAllMasterEdges([]);
    setCollapsedSet(new Set());
    saveToHistory(url);

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
      setAllMasterNodes(graph.nodes);
      setAllMasterEdges(graph.edges);
    });

    eventSource.addEventListener('complete', (e: MessageEvent) => {
      setIsScanning(false);
      eventSource.close();
      confetti({
        particleCount: 110,
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
  }, [historyList]);

  const handleExportJson = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes: allMasterNodes, edges: allMasterEdges, stats: statsSummary }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AssetTree_${statsSummary.rootDomain}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [allMasterNodes, allMasterEdges, statsSummary]);

  const handleExportCsv = useCallback(() => {
    const headers = ["ID", "Node Type", "Label", "Status Code", "Full URL", "IP Address", "Response Time (ms)", "Server", "Tech Stack", "Title", "JS Route", "Sitemap"];
    const rows = allMasterNodes.map(n => {
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
        `"${(d.technologies || []).join('; ')}"`,
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
  }, [allMasterNodes, statsSummary]);

  const handleReset = useCallback(() => {
    setAllMasterNodes(initialRawNodes);
    setAllMasterEdges(initialRawEdges);
    setCollapsedSet(new Set());
    setCurrentStage(null);
    setSearchFilter('');
  }, []);

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
        layoutDirection={layoutDirection}
        onToggleLayout={handleToggleLayout}
        historyList={historyList}
        onSelectHistory={(hUrl) => handleStartScan(hUrl, 2)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Sidebar Stats */}
        <SidebarStats
          stats={statsSummary}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onSelectTech={handleSelectTech}
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
