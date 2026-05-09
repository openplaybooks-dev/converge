#!/usr/bin/env python3
"""
aggregate_data.py — Merge all Phase 1 + Phase 2 due diligence data into one
consolidated JSON file. This single file drives both diagram generation and
report generation, eliminating the need for consumers to know the internal
directory structure.

Usage:
  python scripts/aggregate_data.py [--artifacts-root .converge/artifacts/due-diligence]

Output:
  <artifacts-root>/consolidated-data.json

Dependencies: none (Python 3.9+ stdlib only)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional


def load_json(path: Path) -> Optional[dict]:
    """Load JSON, returning None if missing or invalid."""
    try:
        if path.is_file():
            with open(path) as f:
                return json.load(f)
    except (json.JSONDecodeError, OSError):
        pass
    return None


def load_json_dir(directory: Path) -> list[dict]:
    """Load all JSON files in a directory."""
    if not directory.is_dir():
        return []
    results = []
    for f in sorted(directory.glob("*.json")):
        if f.name == "manifest.json":
            continue
        data = load_json(f)
        if data:
            results.append(data)
    return results


def safe_get(d: dict, *keys, default=None):
    """Safely traverse nested dicts."""
    for key in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(key, {})
    return d if d != {} else default


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Aggregate due diligence data")
    parser.add_argument("--artifacts-root", default=".converge/artifacts/due-diligence",
                        help="Path to artifacts directory")
    parser.add_argument("--output", default=None,
                        help="Output path (default: <artifacts-root>/consolidated-data.json)")
    args = parser.parse_args()

    root = Path(args.artifacts_root)
    if not root.is_dir():
        print(f"ERROR: Artifacts root not found: {root}", file=sys.stderr)
        sys.exit(1)

    # Load all Phase 1 data
    site = load_json(root / "company-site" / "site-data.json") or {}
    sec = load_json(root / "sec-edgar" / "sec-data.json") or {}
    people = load_json(root / "glassdoor" / "people-data.json") or {}
    news = load_json(root / "news-search" / "news-data.json") or {}
    history = load_json(root / "wayback" / "history-data.json") or {}

    # Load Phase 2 deep-dive data
    executives = load_json_dir(root / "deep-dive" / "executives")
    products_deep = load_json_dir(root / "deep-dive" / "products")
    risks_deep = load_json_dir(root / "deep-dive" / "risks")
    legal_deep = load_json_dir(root / "deep-dive" / "legal")

    # Load Phase 3 cross-reference
    risk_assessment = load_json(root / "risk-assessment.json") or {}

    # Load assets (logo, favicon) if available
    logo = load_json(root / "assets" / "logo-base64.json")
    og_image = load_json(root / "assets" / "og-image-base64.json")

    # ── Build consolidated data ──

    company_name = (
        site.get("company") or
        risk_assessment.get("company") or
        people.get("company") or
        sec.get("company") or
        "Unknown Company"
    )

    is_public = sec.get("publicCompany") is not False and bool(sec.get("latest10K"))

    # ── Compute derived metrics ──

    # News sentiment ratio
    articles = news.get("articles", [])
    total_articles = len(articles)
    pos_articles = sum(1 for a in articles if a.get("sentiment") == "positive")
    neg_articles = sum(1 for a in articles if a.get("sentiment") == "negative")
    neu_articles = total_articles - pos_articles - neg_articles

    # Red flag counts by severity
    red_flags = risk_assessment.get("redFlags", [])
    flag_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for rf in red_flags:
        sev = (rf.get("severity") or "medium").lower()
        flag_counts[sev] = flag_counts.get(sev, 0) + 1

    # Executive red flags
    exec_red_flags = []
    for ex in executives:
        for rf in ex.get("redFlags", []):
            exec_red_flags.append({
                "executive": ex.get("name", "?"),
                "description": rf.get("description", ""),
                "severity": rf.get("severity", "medium"),
            })

    # Legal items summary
    legal_proceedings = safe_get(sec, "latest10K", "legalProceedings") or []
    active_legal = sum(1 for lp in (legal_proceedings or [])
                       if isinstance(lp, dict) and lp.get("status", "").lower() in ("active", "pending"))

    # Timeline events from all sources
    timeline = risk_assessment.get("timeline", [])
    for a in articles:
        if a.get("sentiment") == "negative" or a.get("category") in ("lawsuit", "funding", "acquisition"):
            timeline.append({
                "date": a.get("date", ""),
                "event": a.get("headline", "")[:80],
                "sentiment": a.get("sentiment", "neutral"),
                "source": "NEWS",
            })
    for k8 in safe_get(sec, "recent8Ks") or []:
        timeline.append({
            "date": k8.get("filingDate", ""),
            "event": k8.get("summary", "")[:80],
            "sentiment": k8.get("significance", "neutral"),
            "source": "SEC",
        })
    for ms in history.get("milestones", []):
        timeline.append({
            "date": ms.get("date", ""),
            "event": ms.get("description", "")[:80],
            "sentiment": "neutral",
            "source": "WAYBACK",
        })

    # Deduplicate timeline
    seen = set()
    unique_timeline = []
    for ev in sorted(timeline, key=lambda e: str(e.get("date", ""))):
        key = (str(ev.get("date", "")), str(ev.get("event", ""))[:40])
        if key not in seen:
            seen.add(key)
            unique_timeline.append(ev)

    # ── Consolidated output ──

    consolidated = {
        "meta": {
            "company": company_name,
            "website": site.get("website") or "",
            "generatedAt": datetime.now().isoformat(),
            "isPublicCompany": is_public,
            "ticker": sec.get("ticker", ""),
            "dataCompleteness": {
                "companySite": bool(site),
                "secEdgar": is_public,
                "glassdoor": bool(people.get("ratings")),
                "newsSearch": total_articles > 0,
                "waybackMachine": bool(history.get("archiveOverview")),
            },
        },

        # Company identity (from site)
        "company": {
            "name": company_name,
            "website": site.get("website") or "",
            "homepage": site.get("homepage", {}),
            "about": site.get("about", {}),
            "leadership": site.get("leadership", [])[:10],
            "products": site.get("products", [])[:10],
            "careers": site.get("careers", {}),
            "blog": site.get("blog", {}),
            "claims": site.get("claims", [])[:10],
        },

        # Financial (from SEC)
        "financial": {
            "isPublic": is_public,
            "latest10K": safe_get(sec, "latest10K") or {},
            "latest10Q": safe_get(sec, "latest10Q") or {},
            "recent8Ks": safe_get(sec, "recent8Ks") or [],
            "riskFactors": safe_get(sec, "latest10K", "riskFactors") or [],
            "legalProceedings": legal_proceedings,
        },

        # People & Culture (from Glassdoor)
        "people": {
            "ratings": people.get("ratings", {}),
            "reviewSummary": people.get("reviewSummary", {}),
            "salaries": people.get("salaries", [])[:10],
            "signals": people.get("signals", {}),
            "recentReviews": people.get("recentReviews", [])[:10],
        },

        # News & Sentiment
        "news": {
            "totalArticles": total_articles,
            "articles": articles[:30],
            "summary": {
                "bySentiment": {"positive": pos_articles, "neutral": neu_articles, "negative": neg_articles},
                "byCategory": news.get("summary", {}).get("byCategory", {}),
                "recentTrend": news.get("summary", {}).get("recentTrend", ""),
            },
            "riskSignals": news.get("riskSignals", {}),
        },

        # Website history (from Wayback)
        "history": {
            "archiveOverview": history.get("archiveOverview", {}),
            "historicalSnapshots": history.get("historicalSnapshots", [])[:8],
            "milestones": history.get("milestones", [])[:10],
            "pageHistory": history.get("pageHistory", [])[:10],
        },

        # Deep dive results
        "deepDive": {
            "executives": executives[:15],
            "products": products_deep[:10],
            "risks": risks_deep[:15],
            "legal": legal_deep[:10],
        },

        # Risk assessment (from Phase 3)
        "riskAssessment": {
            "overallRiskScore": risk_assessment.get("overallRiskScore"),
            "financialHealth": risk_assessment.get("financialHealth"),
            "leadershipStability": risk_assessment.get("leadershipStability"),
            "employeeSatisfaction": risk_assessment.get("employeeSatisfaction"),
            "legalRisk": risk_assessment.get("legalRisk"),
            "marketPosition": risk_assessment.get("marketPosition"),
            "growthTrajectory": risk_assessment.get("growthTrajectory"),
            "recommendation": risk_assessment.get("recommendation", "CAUTION"),
            "redFlags": red_flags[:20],
            "claimsVerification": risk_assessment.get("claimsVerification", []),
        },

        # Derived metrics (computed above)
        "derived": {
            "redFlagCounts": flag_counts,
            "executiveRedFlags": exec_red_flags[:10],
            "activeLegalItems": active_legal,
            "totalLegalItems": len(legal_proceedings or []),
            "timeline": unique_timeline[:30],
            "sentimentRatio": {
                "positive": pos_articles,
                "neutral": neu_articles,
                "negative": neg_articles,
                "total": total_articles,
            },
            "leadershipCount": len(site.get("leadership", [])),
            "productCount": len(site.get("products", [])),
            "executiveTurnoverSignals": people.get("signals", {}).get("managementChangeMentions", 0),
            "layoffSignals": people.get("signals", {}).get("layoffMentions", 0),
        },

        # Image assets (base64 encoded)
        "images": {
            "logo": logo,
            "ogImage": og_image,
        },
    }

    out_path = Path(args.output) if args.output else (root / "consolidated-data.json")
    with open(out_path, "w") as f:
        json.dump(consolidated, f, indent=2, default=str)

    print(f"Consolidated data written to {out_path}")
    print(f"  Company: {company_name}")
    print(f"  Public: {is_public}")
    print(f"  Leadership: {len(site.get('leadership', []))} execs")
    print(f"  Products: {len(site.get('products', []))} products")
    print(f"  Articles: {total_articles}")
    print(f"  Red flags: {len(red_flags)} (C:{flag_counts['critical']} H:{flag_counts['high']} "
          f"M:{flag_counts['medium']} L:{flag_counts['low']})")
    print(f"  Legal items: {len(legal_proceedings or [])}")
    print(f"  Executive deep-dives: {len(executives)}")
    print(f"  Timeline events: {len(unique_timeline)}")
    if logo:
        print(f"  Logo: {logo.get('size_bytes', '?')} bytes ({logo.get('mime', '?')})")


if __name__ == "__main__":
    main()
