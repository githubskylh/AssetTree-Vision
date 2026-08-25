import httpx
import re
from urllib.parse import urljoin, urlparse
from typing import Set
import logging

logger = logging.getLogger(__name__)

async def sniff_robots_and_sitemap(base_url: str, fqdn: str, timeout: float = 2.5) -> Set[str]:
    """
    Fast sniff for /robots.txt and literal sitemap URLs, ignoring wildcard regex patterns.
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
                for line in r_rob.text.splitlines()[:40]:
                    clean_line = line.strip()
                    if clean_line.lower().startswith(("disallow:", "allow:")):
                        parts = clean_line.split(":", 1)
                        if len(parts) > 1:
                            path = parts[1].strip()
                            # STRICT FILTER: Discard wildcard regex like /*/*/forks or query patterns
                            if path and not any(ch in path for ch in ["*", "?", "$", "\\", " "]) and len(path) > 1 and len(path) < 40:
                                discovered_paths.add(path)
                                if len(discovered_paths) >= 6:
                                    break
        except Exception:
            pass

    return discovered_paths
