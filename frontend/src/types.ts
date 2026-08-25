export type NodeTypeEnum = 'apex_domain' | 'subdomain' | 'endpoint' | 'horizontal_domain';

export interface CustomNodeData {
  label: string;
  nodeType: NodeTypeEnum;
  status?: number;
  ip?: string;
  cname?: string;
  subdomainCount?: number;
  pagesCount?: number;
  url?: string;
  statusCode?: number;
  title?: string;
  responseTime?: number;
  isJsExtracted?: boolean;
  server?: string;
  isRoot?: boolean;
  fqdn?: string;
}

export interface ScanStageEvent {
  stage: 'idle' | 'normalizing' | 'passive_ct' | 'passive_ct_done' | 'dns_probing' | 'dns_done' | 'deep_crawling' | 'graph_ready' | 'complete' | 'error';
  message: string;
  count?: number;
  activeHosts?: string[];
  pagesCount?: number;
  host?: string;
}

export interface StatsSummary {
  rootDomain: string;
  totalSubdomains: number;
  totalEndpoints: number;
  nodesCount: number;
  edgesCount: number;
}
