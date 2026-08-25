import httpx
import re
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlparse
from typing import Set, List
import logging

logger = logging.getLogger(__name__)

async def sniff_robots_and_sitemap(base_url: str, fqdn: str, timeout: float = 4.0) -> Set[str]:
    """
    Proactively requests robots.txt and sitemap.xml to discover structured site routes instantly.
    """
    discovered_paths: Set[str] = set()

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; AssetTreeVisionBot/1.0; +http://asset-tree.vision)"
    }

    async with httpx.AsyncClient(timeout=timeout, verify=False, headers=headers, follow_redirects=True) as client:
        # 1. robots.txt
        try:
            robots_url = urljoin(base_url, "/robots.txt")
            r_rob = await client.get(robots_url)
            if r_rob.status_code == 200:
                for line in r_rob.text.splitlines():
                    clean_line = line.strip()
                    if clean_line.lower().startswith(("disallow:", "allow:")):
                        parts = clean_line.split(":", 1)
                        if len(parts) > 1:
                            path = parts[1].strip()
                            if path and not path.startswith("*") and len(path) > 1:
                                discovered_paths.add(path)
                    elif clean_line.lower().startswith("sitemap:"):
                        parts = clean_line.split(":", 1)
                        if len(parts) > 1:
                            sitemap_url = parts[1].strip()
                            try:
                                r_sm = await client.get(sitemap_url)
                                if r_sm.status_code == 200:
                                    urls = re.findall(r"<loc>(https?://[^<]+)</loc>", r_sm.text)
                                    for u in urls[:50]:
                                        p = urlparse(u).path
                                        if p:
                                            discovered_paths.add(p)
                            except Exception:
                                pass
        except Exception:
            pass

        # 2. default /sitemap.xml if not yet found
        if len(discovered_paths) < 5:
            try:
                sm_url = urljoin(base_url, "/sitemap.xml")
                r_sm = await client.get(sm_url)
                if r_sm.status_code == 200:
                    urls = re.findall(r"<loc>(https?://[^<]+)</loc>", r_sm.text)
                    for u in urls[:50]:
                        p = urlparse(u).path
                        if p:
                            discovered_paths.add(p)
            except Exception:
                pass

    return discovered_paths
