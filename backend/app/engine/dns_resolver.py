import asyncio
import socket
import logging
from typing import Dict, List, Optional, Set
import dns.asyncresolver
import dns.resolver

logger = logging.getLogger(__name__)

# High-frequency enterprise subdomain prefixes
COMMON_SUBDOMAIN_WORDLIST = [
    "www", "api", "app", "admin", "dev", "test", "stage", "prod",
    "portal", "auth", "login", "sso", "mail", "cdn", "static",
    "docs", "blog", "shop", "pay", "gateway", "gw", "dashboard",
    "status", "cloud", "oa", "crm", "erp", "gitlab", "jenkins",
    "internal", "m", "mobile", "v1", "v2", "graphql", "ws", "socket"
]

class SubdomainResult:
    def __init__(self, fqdn: str, ip: Optional[str] = None, cname: Optional[str] = None, is_alive: bool = False):
        self.fqdn = fqdn
        self.ip = ip
        self.cname = cname
        self.is_alive = is_alive

async def resolve_single_subdomain(fqdn: str, resolver: dns.asyncresolver.Resolver) -> SubdomainResult:
    """
    Resolve A/CNAME records for a single subdomain.
    """
    try:
        answers = await resolver.resolve(fqdn, "A", lifetime=2.0)
        ips = [rdata.to_text() for rdata in answers]
        return SubdomainResult(fqdn=fqdn, ip=ips[0] if ips else None, is_alive=True)
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.Timeout):
        try:
            cname_answers = await resolver.resolve(fqdn, "CNAME", lifetime=2.0)
            cnames = [rdata.to_text() for rdata in cname_answers]
            return SubdomainResult(fqdn=fqdn, cname=cnames[0] if cnames else None, is_alive=True)
        except Exception:
            return SubdomainResult(fqdn=fqdn, is_alive=False)
    except Exception:
        return SubdomainResult(fqdn=fqdn, is_alive=False)

async def probe_subdomains_concurrently(root_domain: str, candidate_subdomains: Set[str], max_concurrency: int = 50) -> Dict[str, SubdomainResult]:
    """
    Concurrently resolve both candidate subdomains (from CT logs) and wordlist probing.
    """
    # Merge candidates with common wordlist
    full_candidates = set(candidate_subdomains)
    for prefix in COMMON_SUBDOMAIN_WORDLIST:
        full_candidates.add(f"{prefix}.{root_domain}")

    resolver = dns.asyncresolver.Resolver()
    resolver.nameservers = ["1.1.1.1", "8.8.8.8", "114.114.114.114"]
    resolver.timeout = 2.0
    resolver.lifetime = 3.0

    semaphore = asyncio.Semaphore(max_concurrency)

    async def _bound_resolve(host: str) -> SubdomainResult:
        async with semaphore:
            return await resolve_single_subdomain(host, resolver)

    tasks = [_bound_resolve(host) for host in full_candidates]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    active_results: Dict[str, SubdomainResult] = {}
    for res in results:
        if isinstance(res, SubdomainResult) and res.is_alive:
            active_results[res.fqdn] = res

    return active_results
