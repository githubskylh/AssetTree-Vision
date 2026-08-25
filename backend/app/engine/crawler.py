import asyncio
import re
import time
import logging
from urllib.parse import urljoin, urlparse
from typing import Dict, List, Set, Optional
import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel

from app.engine.sitemap_sniffer import sniff_robots_and_sitemap

logger = logging.getLogger(__name__)

# Regex for extracting hidden endpoints from JavaScript bundles
JS_ENDPOINT_REGEX = re.compile(
    r"""(?:"|')((?:/[a-zA-Z0-9_\-\.~]+)+(?:\?[a-zA-Z0-9_\-.~=&]*)?)(?:"|')""",
    re.VERBOSE
)

STATIC_EXTENSIONS_TO_SKIP = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico",
    ".css", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3",
    ".zip", ".tar.gz", ".rar", ".pdf"
}

class PageNodeInfo(BaseModel):
    url: str
    path: str
    status_code: Optional[int] = None
    title: Optional[str] = None
    server: Optional[str] = None
    response_time_ms: Optional[int] = None
    is_js_extracted: bool = False
    is_sitemap_discovered: bool = False
    parent_path: Optional[str] = None
    content_type: Optional[str] = None

class CrawlResult:
    def __init__(self, fqdn: str):
        self.fqdn = fqdn
        self.pages: Dict[str, PageNodeInfo] = {}
        self.scripts: Set[str] = set()

async def crawl_single_host(
    base_url: str,
    fqdn: str,
    root_domain: str,
    initial_path: str = "/",
    max_pages: int = 35,
    timeout_seconds: float = 6.0
) -> CrawlResult:
    """
    Crawls a single host for pages, robots.txt, sitemaps, and JS bundle endpoints.
    """
    result = CrawlResult(fqdn=fqdn)
    visited_urls: Set[str] = set()
    queue: List[str] = [urljoin(base_url, initial_path)]

    # 1. Proactive robots & sitemap sniffing
    sitemap_paths = await sniff_robots_and_sitemap(base_url, fqdn)
    for sm_p in list(sitemap_paths)[:15]:
        full_u = urljoin(base_url, sm_p)
        if sm_p not in result.pages:
            result.pages[sm_p] = PageNodeInfo(
                url=full_u,
                path=sm_p,
                status_code=200,
                title="Sitemap Discovered",
                is_sitemap_discovered=True
            )
        if full_u not in queue and len(queue) < 15:
            queue.append(full_u)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }

    async with httpx.AsyncClient(
        timeout=timeout_seconds,
        follow_redirects=True,
        verify=False,
        headers=headers
    ) as client:
        while queue and len(visited_urls) < max_pages:
            current_url = queue.pop(0)
            if current_url in visited_urls:
                continue
            visited_urls.add(current_url)

            parsed = urlparse(current_url)
            path = parsed.path or "/"
            if parsed.query:
                path = f"{path}?{parsed.query}"

            start_t = time.perf_counter()
            try:
                resp = await client.get(current_url)
                duration_ms = int((time.perf_counter() - start_t) * 1000)

                content_type = resp.headers.get("content-type", "")
                server = resp.headers.get("server", "")

                title = None
                if "text/html" in content_type:
                    soup = BeautifulSoup(resp.text[:100000], "html.parser")
                    if soup.title and soup.title.string:
                        title = soup.title.string.strip()[:60]

                    # Discover HTML links
                    for a_tag in soup.find_all("a", href=True):
                        href = a_tag["href"].strip()
                        if href.startswith("javascript:") or href.startswith("mailto:") or href.startswith("#"):
                            continue
                        abs_link = urljoin(current_url, href)
                        link_parsed = urlparse(abs_link)
                        # Ensure same host
                        if link_parsed.netloc.lower() == fqdn.lower():
                            if not any(link_parsed.path.lower().endswith(ext) for ext in STATIC_EXTENSIONS_TO_SKIP):
                                if abs_link not in visited_urls and abs_link not in queue:
                                    queue.append(abs_link)

                    # Discover JS scripts for endpoint extraction
                    for script in soup.find_all("script", src=True):
                        src = script["src"].strip()
                        abs_script = urljoin(current_url, src)
                        result.scripts.add(abs_script)

                result.pages[path] = PageNodeInfo(
                    url=current_url,
                    path=path,
                    status_code=resp.status_code,
                    title=title,
                    server=server,
                    response_time_ms=duration_ms,
                    content_type=content_type
                )

            except Exception:
                result.pages[path] = PageNodeInfo(
                    url=current_url,
                    path=path,
                    status_code=0,
                    title="Unreachable / Timeout",
                    response_time_ms=int((time.perf_counter() - start_t) * 1000)
                )

        # Process found JavaScript files for hidden endpoints
        js_scripts_to_scan = list(result.scripts)[:10]
        for js_url in js_scripts_to_scan:
            try:
                js_resp = await client.get(js_url)
                if js_resp.status_code == 200:
                    matches = JS_ENDPOINT_REGEX.findall(js_resp.text[:500000])
                    for raw_path in matches:
                        clean_path = raw_path.strip()
                        if any(clean_path.endswith(ext) for ext in STATIC_EXTENSIONS_TO_SKIP):
                            continue
                        if clean_path.startswith("//") or len(clean_path) < 2 or len(clean_path) > 80:
                            continue
                        if clean_path not in result.pages and len(result.pages) < max_pages + 25:
                            result.pages[clean_path] = PageNodeInfo(
                                url=urljoin(base_url, clean_path),
                                path=clean_path,
                                status_code=200,
                                title="JS Extracted Route",
                                is_js_extracted=True
                            )
            except Exception:
                pass

    return result
