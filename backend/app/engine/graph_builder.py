from typing import Dict, List, Any, Optional
from pydantic import BaseModel

class FlowNode(BaseModel):
    id: str
    type: str = "customCard"
    position: Dict[str, float]
    data: Dict[str, Any]

class FlowEdge(BaseModel):
    id: str
    source: str
    target: str
    animated: bool = False
    style: Optional[Dict[str, Any]] = None
    type: str = "smoothstep"

class TopologyGraph(BaseModel):
    nodes: List[FlowNode]
    edges: List[FlowEdge]
    stats: Dict[str, Any]

def build_react_flow_graph(
    root_domain: str,
    active_subdomains: Dict[str, Any],
    crawled_hosts: Dict[str, Any]
) -> TopologyGraph:
    """
    Builds a hierarchical React Flow graph with card nodes and animated edges.
    Arranged in a left-to-right (LR) / top-to-bottom (TB) layout.
    """
    nodes: List[FlowNode] = []
    edges: List[FlowEdge] = []

    # 1. Root Domain Node (Apex Domain)
    apex_id = f"domain:{root_domain}"
    nodes.append(
        FlowNode(
            id=apex_id,
            position={"x": 50.0, "y": 250.0},
            data={
                "label": root_domain,
                "nodeType": "apex_domain",
                "subdomainCount": len(active_subdomains),
                "isRoot": True,
                "status": 200
            }
        )
    )

    # 2. Subdomain Nodes (Vertical Column)
    subdomain_list = sorted(list(active_subdomains.keys()))
    y_offset = 50.0
    y_gap = 180.0

    for idx, fqdn in enumerate(subdomain_list):
        sub_id = f"sub:{fqdn}"
        sub_info = active_subdomains[fqdn]
        ip_addr = getattr(sub_info, "ip", None) or "DNS Resolved"
        cname = getattr(sub_info, "cname", None)

        crawl_data = crawled_hosts.get(fqdn)
        pages_count = len(crawl_data.pages) if crawl_data else 0

        pos_y = y_offset + (idx * y_gap)
        nodes.append(
            FlowNode(
                id=sub_id,
                position={"x": 420.0, "y": pos_y},
                data={
                    "label": fqdn,
                    "nodeType": "subdomain",
                    "ip": ip_addr,
                    "cname": cname,
                    "pagesCount": pages_count,
                    "status": 200 if getattr(sub_info, "is_alive", True) else 0
                }
            )
        )

        # Connect Apex to Subdomain
        edges.append(
            FlowEdge(
                id=f"edge:{apex_id}->{sub_id}",
                source=apex_id,
                target=sub_id,
                animated=True,
                style={"stroke": "#3B82F6", "strokeWidth": 2}
            )
        )

        # 3. Deep Page Nodes (Third Column)
        if crawl_data and crawl_data.pages:
            page_items = list(crawl_data.pages.items())[:12] # show up to 12 top pages per host in main graph
            for p_idx, (path, page_info) in enumerate(page_items):
                page_id = f"page:{fqdn}:{path}"
                page_y = pos_y - 60.0 + (p_idx * 75.0)

                nodes.append(
                    FlowNode(
                        id=page_id,
                        position={"x": 820.0, "y": page_y},
                        data={
                            "label": path,
                            "nodeType": "endpoint",
                            "fqdn": fqdn,
                            "url": page_info.url,
                            "statusCode": page_info.status_code,
                            "title": page_info.title,
                            "responseTime": page_info.response_time_ms,
                            "isJsExtracted": page_info.is_js_extracted,
                            "server": page_info.server
                        }
                    )
                )

                # Connect Subdomain to Page
                edges.append(
                    FlowEdge(
                        id=f"edge:{sub_id}->{page_id}",
                        source=sub_id,
                        target=page_id,
                        animated=False,
                        style={
                            "stroke": "#10B981" if page_info.status_code == 200 else "#F59E0B",
                            "strokeWidth": 1.5
                        }
                    )
                )

    total_pages = sum(len(c.pages) for c in crawled_hosts.values()) if crawled_hosts else 0

    return TopologyGraph(
        nodes=nodes,
        edges=edges,
        stats={
            "rootDomain": root_domain,
            "totalSubdomains": len(active_subdomains),
            "totalEndpoints": total_pages,
            "nodesCount": len(nodes),
            "edgesCount": len(edges)
        }
    )
