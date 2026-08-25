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
    version="1.2.0"
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
    return {"status": "online", "service": "AssetTree-Vision Core Engine", "version": "1.2.0"}

@app.post("/api/scan/probe")
async def run_probe_once(req: ProbeRequest):
    """
    Synchronous probe endpoint returning complete graph JSON once ready.
    """
    target = normalize_target_url(req.url)
    if not is_safe_target_host(target.fqdn):
        raise HTTPException(status_code=400, detail="Target host is a private/internal IP (SSRF Blocked).")

    # 1. Concurrently run Horizontal SANs + CT lookup
    san_task = extract_horizontal_domains_from_ssl(target.fqdn, target.root_domain)
    ct_task = query_cert_transparency_subdomains(target.root_domain)
    horizontal_domains, ct_subdomains = await asyncio.gather(san_task, ct_task)
    ct_subdomains.add(target.fqdn)

    # 2. Active DNS resolution
    active_subdomains = await probe_subdomains_concurrently(target.root_domain, ct_subdomains)
    if target.fqdn not in active_subdomains:
        active_subdomains[target.fqdn] = type("Sub", (), {"fqdn": target.fqdn, "ip": "Resolved", "is_alive": True})()

    # 3. Concurrent Deep Page Crawl on top hosts
    crawled_hosts = {}
    top_hosts = list(active_subdomains.keys())[:6]

    async def _bound_crawl(h: str):
        base_u = f"https://{h}"
        res = await crawl_single_host(base_u, h, target.root_domain, initial_path=target.initial_path if h == target.fqdn else "/")
        return h, res

    crawl_tasks = [_bound_crawl(h) for h in top_hosts]
    crawl_results = await asyncio.gather(*crawl_tasks, return_exceptions=True)
    for item in crawl_results:
        if isinstance(item, tuple):
            crawled_hosts[item[0]] = item[1]

    # 4. Build Flow Graph
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
        await asyncio.sleep(0.1)

        # Stage 2 & 3: Concurrent Horizontal SANs & CT Logs
        yield f"event: stage\ndata: {json.dumps({'stage': 'horizontal_san', 'message': '并行嗅探 SSL 证书 SANs 关联根域与公开 CT Logs...'})}\n\n"
        san_task = extract_horizontal_domains_from_ssl(target.fqdn, target.root_domain)
        ct_task = query_cert_transparency_subdomains(target.root_domain)
        horizontal_domains, ct_subdomains = await asyncio.gather(san_task, ct_task)
        ct_subdomains.add(target.fqdn)

        yield f"event: stage\ndata: {json.dumps({'stage': 'horizontal_done', 'message': f'已发现 {len(horizontal_domains)} 个横向同根域与 {len(ct_subdomains)} 个候选子域', 'horizontalCount': len(horizontal_domains), 'domains': list(horizontal_domains)})}\n\n"
        await asyncio.sleep(0.1)

        # Stage 4: Active Fast DNS Probing
        yield f"event: stage\ndata: {json.dumps({'stage': 'dns_probing', 'message': '正在执行毫秒级异步 DNS 状态解析与子域校验...'})}\n\n"
        active_subdomains = await probe_subdomains_concurrently(target.root_domain, ct_subdomains)
        if target.fqdn not in active_subdomains:
            active_subdomains[target.fqdn] = type("Sub", (), {"fqdn": target.fqdn, "ip": "Resolved", "is_alive": True})()

        active_hosts_list = list(active_subdomains.keys())
        yield f"event: stage\ndata: {json.dumps({'stage': 'dns_done', 'message': f'已确认 {len(active_subdomains)} 个活跃子域', 'activeHosts': active_hosts_list})}\n\n"
        await asyncio.sleep(0.1)

        # Stage 5: Concurrent Deep Page Crawling
        yield f"event: stage\ndata: {json.dumps({'stage': 'deep_crawling', 'message': '并发穿透页面、嗅探 sitemap.xml 并逆向 JS 隐蔽 API...'})}\n\n"
        crawled_hosts = {}
        top_hosts = active_hosts_list[:6]

        async def _bound_crawl(h: str):
            base_u = f"https://{h}"
            res = await crawl_single_host(base_u, h, target.root_domain, initial_path=target.initial_path if h == target.fqdn else "/")
            return h, res

        crawl_tasks = [_bound_crawl(h) for h in top_hosts]
        crawl_results = await asyncio.gather(*crawl_tasks, return_exceptions=True)
        for item in crawl_results:
            if isinstance(item, tuple):
                crawled_hosts[item[0]] = item[1]
                yield f"event: host_crawled\ndata: {json.dumps({'host': item[0], 'pagesCount': len(item[1].pages)})}\n\n"

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
