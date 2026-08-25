from urllib.parse import urlparse
import publicsuffix2
from pydantic import BaseModel
from typing import Optional

class TargetInfo(BaseModel):
    raw_input: str
    scheme: str
    fqdn: str
    root_domain: str
    subdomain_prefix: str
    port: int
    base_url: str
    initial_path: str

def normalize_target_url(raw_input: str) -> TargetInfo:
    """
    Normalizes any raw input (Apex domain, subdomain, full URL with query/path)
    into a structured TargetInfo object.
    """
    clean_input = raw_input.strip()
    if not clean_input.startswith("http://") and not clean_input.startswith("https://"):
        # Default to https for security and modern sites
        parsed_test = urlparse("//" + clean_input)
        scheme = "https"
        netloc = parsed_test.netloc or parsed_test.path
        path = parsed_test.path if parsed_test.netloc else "/"
        if not path:
            path = "/"
    else:
        parsed_test = urlparse(clean_input)
        scheme = parsed_test.scheme
        netloc = parsed_test.netloc
        path = parsed_test.path or "/"

    if ":" in netloc:
        host_parts = netloc.split(":")
        fqdn = host_parts[0].lower()
        try:
            port = int(host_parts[1])
        except ValueError:
            port = 443 if scheme == "https" else 80
    else:
        fqdn = netloc.lower()
        port = 443 if scheme == "https" else 80

    # Extract root domain via Public Suffix List
    root_domain = publicsuffix2.get_sld(fqdn)
    if not root_domain:
        # Fallback for localhost or unusual domains
        parts = fqdn.split(".")
        if len(parts) >= 2:
            root_domain = ".".join(parts[-2:])
        else:
            root_domain = fqdn

    # Calculate subdomain prefix
    if fqdn == root_domain:
        subdomain_prefix = ""
    elif fqdn.endswith("." + root_domain):
        subdomain_prefix = fqdn[: -(len(root_domain) + 1)]
    else:
        subdomain_prefix = ""

    base_url = f"{scheme}://{fqdn}"
    if (scheme == "https" and port != 443) or (scheme == "http" and port != 80):
        base_url += f":{port}"

    return TargetInfo(
        raw_input=raw_input,
        scheme=scheme,
        fqdn=fqdn,
        root_domain=root_domain,
        subdomain_prefix=subdomain_prefix,
        port=port,
        base_url=base_url,
        initial_path=path,
    )
