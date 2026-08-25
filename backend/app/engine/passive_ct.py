import httpx
import logging
from typing import Set

logger = logging.getLogger(__name__)

async def query_cert_transparency_subdomains(root_domain: str, timeout_seconds: float = 4.0) -> Set[str]:
    """
    Passively query Certificate Transparency logs (crt.sh) for subdomains of the root_domain.
    Strict timeout ensures immediate fallback to high-speed DNS resolver if crt.sh lags on huge domains.
    """
    discovered: Set[str] = set()
    url = f"https://crt.sh/?q=%.{root_domain}&output=json"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                for entry in data[:150]:
                    name_value = entry.get("name_value", "")
                    for name in name_value.split("\n"):
                        clean_name = name.strip().lower()
                        if clean_name.startswith("*."):
                            clean_name = clean_name[2:]
                        if clean_name.endswith(root_domain) and clean_name != root_domain:
                            discovered.add(clean_name)
    except Exception as e:
        logger.warning(f"Passive CT lookup for {root_domain} notice: {e}")

    return discovered
