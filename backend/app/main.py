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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AssetTree-Vision")

app = FastAPI(
    title="AssetTree-Vision API",
    description="URL Multi-Dimensional Asset Exploration & Tree Topology Engine",
    version="1.0.0"
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
    return {"status": "online", "service": "AssetTree-Vision Core Engine"}

@app.post("/api/scan/probe")
async def run_probe_once(req: ProbeRequest):
    """
    Synchronous probe endpoint returning complete graph JSON once ready.
    """
    target = normalize_target_url(req.url)
    if not is_safe_target_host(target.fqdn):
        raise HTTPException(status_code=400, detail="Target host is a private/internal IP (SSRF Blocked).")

    # 1. Passive CT lookup
    ct_subdomains = await query_cert_transparency_subdomains(target.root_domain)
    ct_subdomains.add(target.fqdn)

    # 2. Active DNS resolution
    active_subdomains = await probe_subdomains_concurrently(target.root_domain, ct_subdomains)
    if target.fqdn not in active_subdomains:
        active_subdomains[target.fqdn] = type("Sub", (), {"fqdn": target.fqdn, "ip": "Resolved", "is_alive": True})()

    # 3. Deep Page Crawl on top hosts
    crawled_hosts = {}
    top_hosts = list(active_subdomains.keys())[:6]
    for host in top_hosts:
        base_u = f"https://{host}"
        crawl_res = await crawl_single_host(base_u, host, target.root_domain, initial_path=target.initial_path if host == target.fqdn else "/")
        crawled_hosts[host] = crawl_res

    # 4. Build Flow Graph
    graph = build_react_flow_graph(target.root_domain, active_subdomains, crawled_hosts)
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
        yield f"event: stage\ndata: {json.dumps({'stage': 'normalizing', 'message': f'URL normalized: {target.root_domain} (FQDN: {target.fqdn})', 'target': target.dict()})}\n\n"
        await asyncio.sleep(0.3)

        # Stage 2: Passive CT Logs
        yield f"event: stage\ndata: {json.dumps({'stage': 'passive_ct', 'message': f'Querying Certificate Transparency logs for *.{target.root_domain}...'})}\n\n"
        ct_subdomains = await query_cert_transparency_subdomains(target.root_domain)
        ct_subdomains.add(target.fqdn)
        yield f"event: stage\ndata: {json.dumps({'stage': 'passive_ct_done', 'message': f'Discovered {len(ct_subdomains)} candidate subdomains from CT logs.', 'count': len(ct_subdomains)})}\n\n"
        await asyncio.sleep(0.3)

        # Stage 3: Active Fast DNS Probing
        yield f"event: stage\ndata: {json.dumps({'stage': 'dns_probing', 'message': 'Running asynchronous high-speed DNS validation & wordlist probing...'})}\n\n"
        active_subdomains = await probe_subdomains_concurrently(target.root_domain, ct_subdomains)
        if target.fqdn not in active_subdomains:
            active_subdomains[target.fqdn] = type("Sub", (), {"fqdn": target.fqdn, "ip": "Resolved", "is_alive": True})()

        active_hosts_list = list(active_subdomains.keys())
        yield f"event: stage\ndata: {json.dumps({'stage': 'dns_done', 'message': f'Verified {len(active_subdomains)} live subdomains.', 'activeHosts': active_hosts_list})}\n\n"
        await asyncio.sleep(0.3)

        # Stage 4: Deep Page Crawling & JS Routing Extraction
        yield f"event: stage\ndata: {json.dumps({'stage': 'deep_crawling', 'message': 'Penetrating deep page routes & extracting JS endpoints...'})}\n\n"
        crawled_hosts = {}
        top_hosts = active_hosts_list[:6] # prioritize up to 6 key hosts for fast streaming response

        for host in top_hosts:
            base_u = f"https://{host}"
            crawl_res = await crawl_single_host(
                base_u, host, target.root_domain,
                initial_path=target.initial_path if host == target.fqdn else "/"
            )
            crawled_hosts[host] = crawl_res
            yield f"event: host_crawled\ndata: {json.dumps({'host': host, 'pagesCount': len(crawl_res.pages)})}\n\n"

        # Stage 5: Final Graph Delivery
        graph = build_react_flow_graph(target.root_domain, active_subdomains, crawled_hosts)
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
