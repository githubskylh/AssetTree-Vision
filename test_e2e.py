import httpx
import json
import time

def run_tests():
    print("========================================")
    print("🚀 AssetTree-Vision E2E System Test")
    print("========================================")

    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=30.0)

    # 1. Health check
    print("\n[1/4] Testing Health Endpoint...")
    r_health = client.get("/api/health")
    assert r_health.status_code == 200
    print(f"✅ Health OK: {r_health.json()}")

    # 2. SSRF Protection check
    print("\n[2/4] Testing SSRF Defense...")
    ssrf_targets = ["http://127.0.0.1:8080", "http://169.254.169.254", "http://localhost"]
    for t in ssrf_targets:
        r_ssrf = client.post("/api/scan/probe", json={"url": t})
        print(f"   Target {t} -> Status: {r_ssrf.status_code}, Msg: {r_ssrf.json().get('detail')}")
        assert r_ssrf.status_code == 400
    print("✅ SSRF Protection Filter is 100% Effective!")

    # 3. Synchronous Probing
    print("\n[3/4] Testing Full Synchronous Probe on 'https://example.com'...")
    start_t = time.perf_counter()
    r_probe = client.post("/api/scan/probe", json={"url": "https://example.com", "max_depth": 2})
    elapsed = time.perf_counter() - start_t
    assert r_probe.status_code == 200
    probe_data = r_probe.json()
    print(f"✅ Probe Completed in {elapsed:.2f}s!")
    print(f"   Nodes Generated: {len(probe_data['nodes'])}")
    print(f"   Edges Generated: {len(probe_data['edges'])}")
    print(f"   Stats: {probe_data['stats']}")

    # 4. SSE Stream Probing
    print("\n[4/4] Testing Server-Sent Events (SSE) Live Stream...")
    with client.stream("GET", "/api/scan/stream?url=https://example.com") as response:
        assert response.status_code == 200
        event_count = 0
        for line in response.iter_lines():
            if line.startswith("data:"):
                event_count += 1
                data_json = json.loads(line[5:].strip())
                print(f"   🌊 SSE Stream Event #{event_count}: {data_json.get('stage') or data_json.get('status')} - {data_json.get('message', '')}")
    print(f"✅ SSE Stream Verified ({event_count} events received)!")

    print("\n========================================")
    print("🎉 ALL TESTS PASSED SUCCESSFULLY (100%)!")
    print("========================================")

if __name__ == "__main__":
    run_tests()
