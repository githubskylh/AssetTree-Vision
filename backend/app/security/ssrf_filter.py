import ipaddress
import socket
from urllib.parse import urlparse

BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),      # IPv4 Loopback
    ipaddress.ip_network("10.0.0.0/8"),       # Private network
    ipaddress.ip_network("172.16.0.0/12"),    # Private network
    ipaddress.ip_network("192.168.0.0/16"),   # Private network
    ipaddress.ip_network("169.254.0.0/16"),   # Link-Local & Cloud Metadata (169.254.169.254)
    ipaddress.ip_network("0.0.0.0/8"),        # Current network
    ipaddress.ip_network("::1/128"),          # IPv6 Loopback
    ipaddress.ip_network("fc00::/7"),         # IPv6 Private network
    ipaddress.ip_network("fe80::/10"),        # IPv6 Link-Local
]

def is_safe_target_host(hostname: str) -> bool:
    """
    Validates if a target hostname resolves to a public, non-private IP address.
    Prevents SSRF attacks probing cloud instance metadata or LAN infrastructure.
    """
    if not hostname or hostname.lower() in ["localhost", "127.0.0.1", "0.0.0.0", "::1"]:
        return False

    try:
        # Check if direct IP
        ip_obj = ipaddress.ip_address(hostname)
        for net in BLOCKED_IP_NETWORKS:
            if ip_obj in net:
                return False
        return True
    except ValueError:
        pass

    try:
        # Resolve hostname to IPs
        resolved_ips = socket.getaddrinfo(hostname, None)
        for entry in resolved_ips:
            sockaddr = entry[4]
            ip_str = sockaddr[0]
            ip_obj = ipaddress.ip_address(ip_str)
            for net in BLOCKED_IP_NETWORKS:
                if ip_obj in net:
                    return False
        return True
    except Exception:
        # If DNS resolution fails, allow parser to proceed or let it fail gracefully in resolver
        return True
