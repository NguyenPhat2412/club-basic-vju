#!/usr/bin/env python3
"""
Technical Reference Load Benchmark for VJU Student Club Management System (PB-48 / PB-61).
Executes concurrent HTTP requests against live Spring Boot + PostgreSQL 16 endpoints
on http://localhost:8080 and computes p50, p95, p99, throughput (RPS), and error rate.

NOTE (PB-48 AC03 / PB-61 AC03): Results are technical reference measurements on the local
development/demo environment and do NOT constitute a commercial SLA guarantee.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import http.cookiejar
import json
import math
import statistics
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class Sample:
    scenario: str
    status: int
    latency_ms: float
    ok: bool


def percentile(sorted_values: List[float], pct: float) -> float:
    if not sorted_values:
        return 0.0
    idx = max(0, min(len(sorted_values) - 1, math.ceil((pct / 100.0) * len(sorted_values)) - 1))
    return sorted_values[idx]


def login_and_get_cookie_header(base_url: str, email: Optional[str], password: Optional[str]) -> Optional[str]:
    if not email or not password:
        return None
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

    # 1. Fetch CSRF cookie
    with opener.open(f"{base_url}/api/v1/auth/csrf", timeout=5.0) as _:
        pass
    xsrf = next((c.value for c in jar if c.name == "XSRF-TOKEN"), "")

    # 2. Authenticate
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}/api/v1/auth/login",
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": xsrf,
        },
    )
    with opener.open(req, timeout=5.0) as resp:
        if resp.status != 200:
            return None
    return "; ".join(f"{c.name}={c.value}" for c in jar)


def hit(url: str, scenario: str, cookie_header: Optional[str] = None) -> Sample:
    headers: Dict[str, str] = {"Accept": "application/json"}
    if cookie_header:
        headers["Cookie"] = cookie_header
    req = urllib.request.Request(url, headers=headers, method="GET")
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            _ = resp.read()
            dt = (time.perf_counter() - t0) * 1000.0
            return Sample(scenario=scenario, status=resp.status, latency_ms=dt, ok=(200 <= resp.status < 300))
    except urllib.error.HTTPError as e:
        dt = (time.perf_counter() - t0) * 1000.0
        return Sample(scenario=scenario, status=e.code, latency_ms=dt, ok=False)
    except Exception:
        dt = (time.perf_counter() - t0) * 1000.0
        return Sample(scenario=scenario, status=0, latency_ms=dt, ok=False)


def discover_first_club_id(base_url: str) -> Optional[str]:
    req = urllib.request.Request(f"{base_url}/api/v1/public/clubs?limit=20", headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=5.0) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        items = data.get("items") or []
        for c in items:
            if c.get("code") == "VJUA":
                return c["id"]
        return items[0]["id"] if items else None


def main() -> None:
    parser = argparse.ArgumentParser(description="Run PB-48 reference HTTP benchmark.")
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--workers", type=int, default=20)
    parser.add_argument("--requests-per-scenario", type=int, default=100)
    parser.add_argument("--email", default="")
    parser.add_argument("--password", default="")
    parser.add_argument("--json-out", default="")
    args = parser.parse_args()

    cookie_header = login_and_get_cookie_header(args.base_url, args.email or None, args.password or None)
    club_id = discover_first_club_id(args.base_url)

    scenarios = [
        ("GET /api/v1/public/clubs", f"{args.base_url}/api/v1/public/clubs?offset=0&limit=20", None),
        ("GET /api/v1/public/events", f"{args.base_url}/api/v1/public/events?offset=0&limit=20", None),
    ]
    if cookie_header and club_id:
        scenarios.extend(
            [
                ("GET /api/v1/clubs/{clubId}/events", f"{args.base_url}/api/v1/clubs/{club_id}/events?limit=20", cookie_header),
                ("GET /api/v1/clubs/{clubId}/tasks", f"{args.base_url}/api/v1/clubs/{club_id}/tasks?limit=20", cookie_header),
                ("GET /api/v1/clubs/{clubId}/statistics", f"{args.base_url}/api/v1/clubs/{club_id}/statistics", cookie_header),
                ("GET /api/v1/statistics/system", f"{args.base_url}/api/v1/statistics/system", cookie_header),
            ]
        )

    # Warmup
    for name, url, ck in scenarios:
        for _ in range(5):
            hit(url, name, ck)

    summary_rows = []
    t_global_start = time.perf_counter()

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        for name, url, ck in scenarios:
            t_start = time.perf_counter()
            futs = [pool.submit(hit, url, name, ck) for _ in range(args.requests_per_scenario)]
            samples = [f.result() for f in futs]
            elapsed = max(time.perf_counter() - t_start, 1e-6)

            latencies = sorted(s.latency_ms for s in samples)
            errors = sum(1 for s in samples if not s.ok)
            row = {
                "scenario": name,
                "requests": len(samples),
                "workers": args.workers,
                "rps": round(len(samples) / elapsed, 2),
                "avg_ms": round(statistics.mean(latencies), 2),
                "p50_ms": round(percentile(latencies, 50), 2),
                "p95_ms": round(percentile(latencies, 95), 2),
                "p99_ms": round(percentile(latencies, 99), 2),
                "max_ms": round(max(latencies), 2),
                "error_count": errors,
                "error_rate_pct": round((errors / len(samples)) * 100.0, 2),
            }
            summary_rows.append(row)

    total_elapsed = round(time.perf_counter() - t_global_start, 2)
    report = {
        "baseUrl": args.base_url,
        "workers": args.workers,
        "requestsPerScenario": args.requests_per_scenario,
        "totalElapsedSeconds": total_elapsed,
        "authenticatedScenariosIncluded": bool(cookie_header and club_id),
        "scenarios": summary_rows,
    }

    print(json.dumps(report, indent=2, ensure_ascii=False))
    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
