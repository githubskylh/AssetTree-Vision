import asyncio
import json
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.normalizer import normalize_target_url, TargetInfo
from app.security.ssrf_filter import is_safe_target_host
from app.engine.passive_ct import query_cert_transparency_subdomains
from app.engine.dns_resolver import probe_subdomains_concurrently
from app.engine.crawler import crawl_single_host
from app.engine.graph_builder import build_react_flow_graph
from app.engine.horizontal_san import extract_horizontal_domains_from_ssl

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AssetTree-Vision")

app = FastAPI(
    title="AssetTree-Vision API",
    description="URL Multi-Dimensional Asset Exploration & Tree Topology Engine",
    version="1.1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProbeRequest(BaseModel):
    url: str
    max_depth: int = 2

@app.get("/api/health")
async def health_check():
    return {"status": "online", "service": "AssetTree-Vision Core Engine", "version": "1.1.0"}

@app.post("/api/scan/probe")
async def run_probe_once(req: ProbeRequest):
    """
    Synchronous probe endpoint returning complete graph JSON once ready.
    """
    target = normalize_target_url(req.url)
    if not is_safe_target_host(target.fqdn):
        raise HTTPException(status_code=400, detail="Target host is a private/internal IP (SSRF Blocked).")

    # 1. Horizontal SANs discovery
    horizontal_domains = await extract_horizontal_domains_from_ssl(target.fqdn, target.root_domain)

    # 2. Passive CT lookup
    ct_subdomains = await query_cert_transparency_subdomains(target.root_domain)
    ct_subdomains.add(target.fqdn)

    # 3. Active DNS resolution
    active_subdomains = await probe_subdomains_concurrently(target.root_domain, ct_subdomains)
    if target.fqdn not in active_subdomains:
        active_subdomains[target.fqdn] = type("Sub", (), {"fqdn": target.fqdn, "ip": "Resolved", "is_alive": True})()

    # 4. Deep Page Crawl on top hosts
    crawled_hosts = {}
    top_hosts = list(active_subdomains.keys())[:8]
    for host in top_hosts:
        base_u = f"https://{host}"
        crawl_res = await crawl_single_host(base_u, host, target.root_domain, initial_path=target.initial_path if host == target.fqdn else "/")
        crawled_hosts[host] = crawl_res

    # 5. Build Flow Graph
    graph = build_react_flow_graph(target.root_domain, active_subdomains, crawled_hosts, horizontal_domains)
    return graph

@app.get("/api/scan/stream")
async def run_probe_stream(url: str = Query(..., description="Target URL or domain")):
    """
    SSE Stream endpoint broadcasting live sprouting events as assets are discovered.
    """
    target = normalize_target_url(url)
    if not is_safe_target_host(target.fqdn):
        raise HTTPException(status_code=400, detail="Target host is a private/internal IP (SSRF Blocked).")

    async def event_generator() -> AsyncGenerator[str, None]:
        # Stage 1: Normalized
        yield f"event: stage\ndata: {json.dumps({'stage': 'normalizing', 'message': f'URL 智能归一化: {target.root_domain} (起始FQDN: {target.fqdn})', 'target': target.dict()})}\n\n"
        await asyncio.sleep(0.2)

        # Stage 2: Horizontal SANs Discovery
        yield f"event: stage\ndata: {json.dumps({'stage': 'horizontal_san', 'message': f'正在嗅探 SSL 证书 SANs 备用名称中的横向同根域名...'})}\n\n"
        horizontal_domains = await extract_horizontal_domains_from_ssl(target.fqdn, target.root_domain)
        yield f"event: stage\ndata: {json.dumps({'stage': 'horizontal_done', 'message': f'已挖掘到 {len(horizontal_domains)} 个横向关联根域', 'horizontalCount': len(horizontal_domains), 'domains': list(horizontal_domains)})}\n\n"
        await asyncio.sleep(0.2)

        # Stage 3: Passive CT Logs
        yield f"event: stage\ndata: {json.dumps({'stage': 'passive_ct', 'message': f'检索公开证书透明度日志 (CT Logs: *.{target.root_domain})...'})}\n\n"
        ct_subdomains = await query_cert_transparency_subdomains(target.root_domain)
        ct_subdomains.add(target.fqdn)
        yield f"event: stage\ndata: {json.dumps({'stage': 'passive_ct_done', 'message': f'从 CT Logs 中发现 {len(ct_subdomains)} 个候选子域', 'count': len(ct_subdomains)})}\n\n"
        await asyncio.sleep(0.2)

        # Stage 4: Active Fast DNS Probing
        yield f"event: stage\ndata: {json.dumps({'stage': 'dns_probing', 'message': '执行高并发非阻塞 DNS 字典与 A/CNAME 状态校验...'})}\n\n"
        active_subdomains = await probe_subdomains_concurrently(target.root_domain, ct_subdomains)
        if target.fqdn not in active_subdomains:
            active_subdomains[target.fqdn] = type("Sub", (), {"fqdn": target.fqdn, "ip": "Resolved", "is_alive": True})()

        active_hosts_list = list(active_subdomains.keys())
        yield f"event: stage\ndata: {json.dumps({'stage': 'dns_done', 'message': f'成功校验 {len(active_subdomains)} 个存活子域节点', 'activeHosts': active_hosts_list})}\n\n"
        await asyncio.sleep(0.2)

        # Stage 5: Deep Page Crawling & JS Routing Extraction
        yield f"event: stage\ndata: {json.dumps({'stage': 'deep_crawling', 'message': '穿透站内路由、嗅探 sitemap.xml 并提取前端 JS 隐蔽 API...'})}\n\n"
        crawled_hosts = {}
        top_hosts = active_hosts_list[:8]

        for host in top_hosts:
            base_u = f"https://{host}"
            crawl_res = await crawl_single_host(
                base_u, host, target.root_domain,
                initial_path=target.initial_path if host == target.fqdn else "/"
            )
            crawled_hosts[host] = crawl_res
            yield f"event: host_crawled\ndata: {json.dumps({'host': host, 'pagesCount': len(crawl_res.pages)})}\n\n"

        # Stage 6: Final Graph Delivery
        graph = build_react_flow_graph(target.root_domain, active_subdomains, crawled_hosts, horizontal_domains)
        yield f"event: graph_ready\ndata: {json.dumps(graph.dict())}\n\n"
        yield f"event: complete\ndata: {json.dumps({'status': 'done', 'stats': graph.stats})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
