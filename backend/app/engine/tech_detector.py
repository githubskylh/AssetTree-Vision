from typing import List, Set, Dict
from bs4 import BeautifulSoup

TECH_RULES: Dict[str, Dict] = {
    "Cloudflare": {
        "headers": ["cf-ray", "cf-cache-status", "server: cloudflare"],
        "cookies": ["__cfduid", "cf_clearance"]
    },
    "Nginx": {
        "headers": ["server: nginx"]
    },
    "Apache": {
        "headers": ["server: apache"]
    },
    "Next.js": {
        "html": ["id=\"__next\"", "/_next/static"],
        "headers": ["x-powered-by: next.js"]
    },
    "React": {
        "html": ["data-reactroot", "react-dom", "react.development.js", "react.production.min.js"]
    },
    "Vue.js": {
        "html": ["data-v-", "vue.js", "vue.min.js", "vue.runtime"]
    },
    "Webpack": {
        "html": ["webpackJsonp", "/static/js/webpack", "webpack-"]
    },
    "Vite": {
        "html": ["/@vite/client", "vite/dist"]
    },
    "Tailwind CSS": {
        "html": ["tailwindcss"]
    },
    "WordPress": {
        "html": ["wp-content", "wp-includes", "wordpress"],
        "headers": ["x-powered-by: wordpress"]
    },
    "Express / Node.js": {
        "headers": ["x-powered-by: express"]
    },
    "FastAPI / Python": {
        "headers": ["server: uvicorn", "server: gunicorn"]
    },
    "PHP": {
        "headers": ["x-powered-by: php"],
        "cookies": ["PHPSESSID"]
    },
    "GitHub Pages": {
        "headers": ["server: github.com"]
    },
    "Vercel": {
        "headers": ["x-vercel-id", "server: vercel"]
    }
}

def detect_technologies(headers: Dict[str, str], html_content: str = "") -> List[str]:
    """
    Fingerprints web technologies, frameworks, and servers from HTTP response headers and DOM markers.
    """
    detected: Set[str] = set()
    norm_headers = {k.lower(): v.lower() for k, v in headers.items()}
    html_lower = html_content.lower()[:80000] if html_content else ""

    for tech, rules in TECH_RULES.items():
        # Check header rules
        for rule in rules.get("headers", []):
            if ":" in rule:
                h_name, h_val = [x.strip() for x in rule.split(":", 1)]
                if h_name in norm_headers and h_val in norm_headers[h_name]:
                    detected.add(tech)
                    break
            else:
                if rule in norm_headers:
                    detected.add(tech)
                    break

        # Check HTML rules
        if tech not in detected:
            for marker in rules.get("html", []):
                if marker.lower() in html_lower:
                    detected.add(tech)
                    break

    return sorted(list(detected))
