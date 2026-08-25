export type NodeTypeEnum = 'apex_domain' | 'subdomain' | 'endpoint' | 'horizontal_domain';
export type LayoutDirectionEnum = 'LR' | 'TB';

export interface CustomNodeData {
  label: string;
  nodeType: NodeTypeEnum;
  status?: number;
  ip?: string;
  cname?: string;
  subdomainCount?: number;
  horizontalCount?: number;
  pagesCount?: number;
  url?: string;
  statusCode?: number;
  title?: string;
  responseTime?: number;
  isJsExtracted?: boolean;
  isSitemapDiscovered?: boolean;
  server?: string;
  isRoot?: boolean;
  fqdn?: string;
  technologies?: string[];
  isCollapsed?: boolean;
  isHighlighted?: boolean;
  onToggleCollapse?: (nodeId: string) => void;
  layoutDirection?: LayoutDirectionEnum;
}

export interface ScanStageEvent {
  stage: 'idle' | 'normalizing' | 'horizontal_san' | 'horizontal_done' | 'passive_ct' | 'passive_ct_done' | 'dns_probing' | 'dns_done' | 'deep_crawling' | 'graph_ready' | 'complete' | 'error';
  message: string;
  count?: number;
  horizontalCount?: number;
  domains?: string[];
  activeHosts?: string[];
  pagesCount?: number;
  host?: string;
}

export interface StatsSummary {
  rootDomain: string;
  totalHorizontal: number;
  totalSubdomains: number;
  totalEndpoints: number;
  nodesCount: number;
  edgesCount: number;
  technologies?: string[];
  statusDistribution?: {
    "2xx": number;
    "3xx": number;
    "4xx": number;
    "5xx": number;
    "other": number;
  };
}
