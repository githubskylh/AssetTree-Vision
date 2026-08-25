import httpx
import re
from urllib.parse import urljoin, urlparse
from typing import Set
import logging

logger = logging.getLogger(__name__)

async def sniff_robots_and_sitemap(base_url: str, fqdn: str, timeout: float = 3.0) -> Set[str]:
    """
    Fast and light sniff for /robots.txt and direct sitemap URLs.
    """
    discovered_paths: Set[str] = set()

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }

    async with httpx.AsyncClient(timeout=timeout, verify=False, headers=headers, follow_redirects=True) as client:
        try:
            robots_url = urljoin(base_url, "/robots.txt")
            r_rob = await client.get(robots_url)
            if r_rob.status_code == 200:
                for line in r_rob.text.splitlines()[:50]:
                    clean_line = line.strip()
                    if clean_line.lower().startswith(("disallow:", "allow:")):
                        parts = clean_line.split(":", 1)
                        if len(parts) > 1:
                            path = parts[1].strip()
                            if path and not path.startswith("*") and len(path) > 1 and len(path) < 60:
                                discovered_paths.add(path)
                                if len(discovered_paths) >= 8:
                                    break
        except Exception:
            pass

    return discovered_paths
