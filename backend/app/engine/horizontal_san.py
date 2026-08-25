import ssl
import socket
import asyncio
from typing import Set, List
from urllib.parse import urlparse
import publicsuffix2
import logging

logger = logging.getLogger(__name__)

async def extract_horizontal_domains_from_ssl(hostname: str, root_domain: str, port: int = 443, timeout: float = 4.0) -> Set[str]:
    """
    Connects to target server via TLS and extracts Subject Alternative Names (SANs)
    from the SSL certificate. If the certificate binds other root domains, they are
    identified as horizontal pivot domains.
    """
    horizontal_roots: Set[str] = set()

    def _sync_ssl_fetch():
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with socket.create_connection((hostname, port), timeout=timeout) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert(binary_form=False)
                # If binary form needed for non-validated
                if not cert:
                    # Retrieve der cert
                    der_cert = ssock.getpeercert(binary_form=True)
                    # parse der
                    return _parse_der_sans(der_cert)
                sans = []
                for field in cert.get('subjectAltName', []):
                    if field[0] == 'DNS':
                        sans.append(field[1])
                return sans

    def _parse_der_sans(der_cert):
        # Fallback raw parser
        import re
        sans = []
        try:
            # Regex match domain names inside DER
            raw_text = str(der_cert)
            matches = re.findall(r'([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9\-\.]+)', raw_text)
            for m in matches:
                clean = m.strip('.').lower()
                if '.' in clean and not clean.startswith('.'):
                    sans.append(clean)
        except Exception:
            pass
        return sans

    try:
        loop = asyncio.get_running_loop()
        san_list = await loop.run_in_executor(None, _sync_ssl_fetch)
        for san in san_list:
            san_clean = san.lower().strip()
            if san_clean.startswith("*."):
                san_clean = san_clean[2:]
            extracted_root = publicsuffix2.get_sld(san_clean)
            if extracted_root and extracted_root != root_domain and len(extracted_root) > 3:
                horizontal_roots.add(extracted_root)
    except Exception as e:
        logger.debug(f"SSL SAN extraction for {hostname} warning: {e}")

    return horizontal_roots
