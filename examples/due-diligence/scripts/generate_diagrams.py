#!/usr/bin/env python3
"""
generate_diagrams.py — Generate 9 Excalidraw diagrams from due diligence data.

Reads all structured JSON data from a due diligence run and generates
professionally-laid-out .excalidraw diagram files. Deterministic pixel
math replaces what would otherwise require an LLM to manually place
400+ elements — faster, more reliable, and maintainable.

Usage:
  python scripts/generate_diagrams.py [--artifacts-root .converge/artifacts/due-diligence]

Outputs:
  <artifacts-root>/diagrams/
    01-company-overview.excalidraw
    02-leadership-orgchart.excalidraw
    ...
    09-master-aggregation.excalidraw
    manifest.json

Dependencies: none (Python 3.9+ stdlib only)
"""

from __future__ import annotations

import json
import sys
import random
from pathlib import Path
from datetime import datetime
from typing import Optional

# ---------------------------------------------------------------------------
# Color system — consistent across all diagrams
# ---------------------------------------------------------------------------

INFO_BG = "#a5d8ff"
INFO_STROKE = "#1971c2"
SUCCESS_BG = "#b2f2bb"
SUCCESS_STROKE = "#2f9e44"
WARNING_BG = "#ffec99"
WARNING_STROKE = "#f08c00"
DANGER_BG = "#ffc9c9"
DANGER_STROKE = "#e03131"
PURPLE_BG = "#d0bfff"
PURPLE_STROKE = "#9c36b5"
NEUTRAL_BG = "#e9ecef"
NEUTRAL_STROKE = "#495057"
DARK_STROKE = "#1e1e1e"
WHITE_BG = "#ffffff"
HEADER_BG = "#1a1a2e"
HEADER_TEXT = "#ffffff"

FONT_FAMILY = 2  # Helvetica
ROUGHNESS = 0     # Architect / smooth


def score_color(score: float, max_score: float = 10.0) -> tuple[str, str]:
    """Return (bg, stroke) for a score value."""
    ratio = score / max_score
    if ratio >= 0.8:
        return SUCCESS_BG, SUCCESS_STROKE
    elif ratio >= 0.5:
        return WARNING_BG, WARNING_STROKE
    else:
        return DANGER_BG, DANGER_STROKE


def sentiment_color(sentiment: str) -> tuple[str, str]:
    """Return (bg, stroke) for a sentiment label."""
    s = (sentiment or "").lower()
    if s in ("positive", "success", "improving"):
        return SUCCESS_BG, SUCCESS_STROKE
    elif s in ("negative", "danger", "declining", "critical"):
        return DANGER_BG, DANGER_STROKE
    elif s in ("warning", "caution", "medium"):
        return WARNING_BG, WARNING_STROKE
    else:
        return NEUTRAL_BG, NEUTRAL_STROKE


# ---------------------------------------------------------------------------
# Excalidraw element builders
# ---------------------------------------------------------------------------

class ExcalidrawFile:
    """Accumulates elements and serializes a .excalidraw file."""

    def __init__(self):
        self.elements: list[dict] = []
        self._next_seed = 1000 + random.randint(0, 500)

    def seed(self) -> int:
        s = self._next_seed
        self._next_seed += 1
        return s

    def _base(self, el_type: str, x: float, y: float, w: float, h: float) -> dict:
        return {
            "id": f"{el_type}-{self.seed()}",
            "type": el_type,
            "x": x, "y": y, "width": w, "height": h,
            "angle": 0, "strokeColor": DARK_STROKE, "backgroundColor": WHITE_BG,
            "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
            "roughness": ROUGHNESS, "opacity": 100, "seed": self.seed(),
            "version": 1, "versionNonce": self.seed(),
            "isDeleted": False, "groupIds": [], "boundElements": [],
            "link": None, "locked": False,
        }

    def rect(self, x: float, y: float, w: float, h: float,
             bg: str = WHITE_BG, stroke: str = DARK_STROKE,
             roundness: Optional[dict] = None, group: str = "",
             opacity: int = 100) -> dict:
        el = self._base("rectangle", x, y, w, h)
        el["backgroundColor"] = bg
        el["strokeColor"] = stroke
        el["roundness"] = roundness
        el["opacity"] = opacity
        if group:
            el["groupIds"] = [group]
        return el

    def ellipse(self, x: float, y: float, w: float, h: float,
                bg: str = WHITE_BG, stroke: str = DARK_STROKE,
                group: str = "") -> dict:
        el = self._base("ellipse", x, y, w, h)
        el["backgroundColor"] = bg
        el["strokeColor"] = stroke
        if group:
            el["groupIds"] = [group]
        return el

    def diamond(self, x: float, y: float, w: float, h: float,
                bg: str = WHITE_BG, stroke: str = DARK_STROKE) -> dict:
        el = self._base("diamond", x, y, w, h)
        el["backgroundColor"] = bg
        el["strokeColor"] = stroke
        return el

    def text(self, x: float, y: float, content: str, size: int = 16,
             color: str = DARK_STROKE, align: str = "left",
             container_id: Optional[str] = None, group: str = "",
             bold: bool = False, v_align: str = "top") -> dict:
        el = self._base("text", x, y, 10, 10)
        el["text"] = content
        el["fontSize"] = size
        el["fontFamily"] = FONT_FAMILY
        el["textAlign"] = align
        el["verticalAlign"] = v_align
        el["strokeColor"] = color
        el["backgroundColor"] = "transparent"
        el["fillStyle"] = "solid"
        el["autoResize"] = True
        el["lineHeight"] = 1.25
        el["containerId"] = container_id
        if group:
            el["groupIds"] = [group]
        return el

    def arrow(self, x: float, y: float, points: list,
              stroke: str = DARK_STROKE, end_arrow: str = "arrow",
              start_binding: Optional[dict] = None,
              end_binding: Optional[dict] = None,
              group: str = "", dashed: bool = False) -> dict:
        w = max(abs(p[-1][0]) for p in points) + 20 if points else 100
        h = max(abs(p[-1][1]) for p in points) + 20 if points else 20
        el = self._base("arrow", x, y, w, h)
        el["points"] = points
        el["strokeColor"] = stroke
        el["startArrowhead"] = None
        el["endArrowhead"] = end_arrow
        el["startBinding"] = start_binding
        el["endBinding"] = end_binding
        el["strokeStyle"] = "dashed" if dashed else "solid"
        if group:
            el["groupIds"] = [group]
        return el

    def line(self, x: float, y: float, points: list,
             stroke: str = DARK_STROKE, dashed: bool = False,
             group: str = "") -> dict:
        el = self._base("line", x, y, 100, 10)
        el["points"] = points
        el["strokeColor"] = stroke
        el["startArrowhead"] = None
        el["endArrowhead"] = None
        el["strokeStyle"] = "dashed" if dashed else "solid"
        if group:
            el["groupIds"] = [group]
        return el

    def frame(self, x: float, y: float, w: float, h: float,
              name: str = "", group: str = "") -> dict:
        el = self._base("frame", x, y, w, h)
        el["name"] = name
        if group:
            el["groupIds"] = [group]
        return el

    def section_title(self, x: float, y: float, w: float, text_str: str,
                      bg: str = INFO_BG, group: str = ""):
        """A titled section bar: colored rect + white text."""
        r = self.rect(x, y, w, 36, bg=bg, stroke=bg, roundness=None, group=group)
        t = self.text(x + 12, y + 7, text_str, size=16, color=WHITE_BG,
                      group=group, bold=True)
        return r, t

    def score_bar(self, x: float, y: float, score: float, max_score: float = 10.0,
                  label: str = "", bar_w: int = 260, bar_h: int = 22, group: str = ""):
        """A labeled score bar: label + 10 small rects (filled/empty)."""
        elements = []
        if label:
            elements.append(self.text(x, y - 2, label, size=14, color=DARK_STROKE, group=group))
        filled = max(0, min(int(max_score), int(score)))
        seg_w = 24
        for i in range(int(max_score)):
            sx = x + (180 if label else 0) + i * (seg_w + 2)
            bg, stroke = score_color(i + 1, max_score)
            if i >= filled:
                bg, stroke = NEUTRAL_BG, NEUTRAL_STROKE
            elements.append(self.rect(sx, y, seg_w, bar_h, bg=bg, stroke=stroke, group=group))
        # Score number
        elements.append(self.text(x + (180 if label else 0) + int(max_score) * (seg_w + 2) + 8,
                                   y - 2, str(int(score)), size=22, color=DARK_STROKE, group=group))
        return elements

    def gauge_circle(self, cx: float, y: float, score: float, max_score: float,
                     label: str, radius: int = 50) -> list:
        """A circular gauge: circle with score inside + label below."""
        elements = []
        bg, stroke = score_color(score, max_score)
        # outer circle
        elements.append(self.ellipse(cx - radius, y, radius * 2, radius * 2, bg=bg, stroke=stroke))
        # score text inside
        score_str = f"{score:.1f}" if isinstance(score, float) else str(score)
        elements.append(self.text(cx - 18, y + radius - 18, score_str, size=28,
                                  color=DARK_STROKE, align="center"))
        # label below
        elements.append(self.text(cx - radius, y + radius * 2 + 6, label, size=12,
                                  color=NEUTRAL_STROKE, align="center"))
        return elements

    def card(self, x: float, y: float, w: float, h: float,
             title: str = "", lines: list[str] = None,
             bg: str = WHITE_BG, stroke: str = DARK_STROKE,
             group: str = "", opacity: int = 100) -> list:
        """A card: rounded rect + optional title + text lines."""
        elements = []
        elements.append(self.rect(x, y, w, h, bg=bg, stroke=stroke,
                                  roundness={"type": 3}, group=group, opacity=opacity))
        cy = y + 10
        if title:
            elements.append(self.text(x + 12, cy, title, size=16, color=stroke,
                                      group=group, bold=True))
            cy += 24
        if lines:
            for line in lines:
                elements.append(self.text(x + 12, cy, line, size=13,
                                          color=DARK_STROKE, group=group))
                cy += 20
        return elements

    def badge(self, x: float, y: float, text_str: str,
              bg: str = NEUTRAL_BG, stroke: str = NEUTRAL_STROKE,
              size: int = 13) -> list:
        """A small labeled badge."""
        tw = len(text_str) * (size * 0.6) + 20
        return [
            self.rect(x, y, tw, 26, bg=bg, stroke=stroke, roundness={"type": 3}),
            self.text(x + 10, y + 3, text_str, size=size, color=stroke),
        ]

    def add_elements(self, elements: list):
        """Add multiple elements (flatten nested lists)."""
        for el in elements:
            if isinstance(el, list):
                self.add_elements(el)
            elif isinstance(el, dict):
                self.elements.append(el)

    def to_json(self) -> str:
        files = getattr(self, '_files', {})
        return json.dumps({
            "type": "excalidraw",
            "version": 2,
            "source": "https://excalidraw.com",
            "elements": self.elements,
            "appState": {"viewBackgroundColor": "#ffffff", "gridSize": None},
            "files": files,
        }, indent=2)


# ---------------------------------------------------------------------------
# Data loader
# ---------------------------------------------------------------------------

def load_json(path: Path) -> Optional[dict]:
    """Load a JSON file, returning None if missing or invalid."""
    try:
        if path.exists():
            with open(path) as f:
                return json.load(f)
    except (json.JSONDecodeError, OSError):
        pass
    return None


class DueDiligenceData:
    """Loads and provides access to all due diligence data.

    Prefers consolidated-data.json if available (produced by aggregate_data.py),
    falling back to individual JSON files from the Phase 1-3 pipeline.
    """

    def __init__(self, artifacts_root: Path):
        self.root = artifacts_root
        self.logo = None  # {mime, data, size_bytes} for Excalidraw image embedding
        self.og_image = None

        # Try consolidated first (from aggregate_data.py)
        consolidated = load_json(artifacts_root / "consolidated-data.json")
        if consolidated:
            self._from_consolidated(consolidated)
        else:
            self._from_individual_files()

    def _from_consolidated(self, c: dict):
        """Load from aggregate_data.py output."""
        meta = c.get("meta", {})
        self._company = meta.get("company", "Unknown")
        self._is_public = meta.get("isPublicCompany", False)

        comp = c.get("company", {})
        self.site = {
            "company": self._company,
            "website": comp.get("website", ""),
            "homepage": comp.get("homepage", {}),
            "about": comp.get("about", {}),
            "leadership": comp.get("leadership", []),
            "products": comp.get("products", []),
            "careers": comp.get("careers", {}),
            "blog": comp.get("blog", {}),
            "claims": comp.get("claims", []),
        }

        fin = c.get("financial", {})
        self.sec = {
            "publicCompany": fin.get("isPublic", False),
            "latest10K": fin.get("latest10K", {}),
            "latest10Q": fin.get("latest10Q", {}),
            "recent8Ks": fin.get("recent8Ks", []),
            "ticker": meta.get("ticker", ""),
        }

        ppl = c.get("people", {})
        self.people = {
            "company": self._company,
            "ratings": ppl.get("ratings", {}),
            "reviewSummary": ppl.get("reviewSummary", {}),
            "signals": ppl.get("signals", {}),
            "recentReviews": ppl.get("recentReviews", []),
        }

        nws = c.get("news", {})
        self.news = {
            "articles": nws.get("articles", []),
            "summary": {
                "bySentiment": nws.get("summary", {}).get("bySentiment", {}),
                "byCategory": nws.get("summary", {}).get("byCategory", {}),
                "recentTrend": nws.get("summary", {}).get("recentTrend", ""),
            },
            "riskSignals": nws.get("riskSignals", {}),
        }

        hist = c.get("history", {})
        self.history = {
            "archiveOverview": hist.get("archiveOverview", {}),
            "historicalSnapshots": hist.get("historicalSnapshots", []),
            "milestones": hist.get("milestones", []),
            "pageHistory": hist.get("pageHistory", []),
        }

        dd = c.get("deepDive", {})
        self.executives = dd.get("executives", [])
        self.products_deep = dd.get("products", [])
        self.risk_items = dd.get("risks", [])
        self.legal_items = dd.get("legal", [])

        ra = c.get("riskAssessment", {})
        derived = c.get("derived", {})
        self.risk = {
            "company": self._company,
            "overallRiskScore": ra.get("overallRiskScore"),
            "financialHealth": ra.get("financialHealth"),
            "leadershipStability": ra.get("leadershipStability"),
            "employeeSatisfaction": ra.get("employeeSatisfaction"),
            "legalRisk": ra.get("legalRisk"),
            "marketPosition": ra.get("marketPosition"),
            "growthTrajectory": ra.get("growthTrajectory"),
            "recommendation": ra.get("recommendation", "CAUTION"),
            "redFlags": ra.get("redFlags", []),
            "claimsVerification": ra.get("claimsVerification", []),
            "timeline": derived.get("timeline", []),
        }

        # Images
        images = c.get("images", {})
        self.logo = images.get("logo")
        self.og_image = images.get("ogImage")

    def _from_individual_files(self):
        """Fallback: load from individual JSON files."""
        self.site = load_json(self.root / "company-site" / "site-data.json") or {}
        self.sec = load_json(self.root / "sec-edgar" / "sec-data.json") or {}
        self.people = load_json(self.root / "glassdoor" / "people-data.json") or {}
        self.news = load_json(self.root / "news-search" / "news-data.json") or {}
        self.history = load_json(self.root / "wayback" / "history-data.json") or {}
        self.risk = load_json(self.root / "risk-assessment.json") or {}
        self.executives = self._load_json_dir("deep-dive/executives")
        self.legal_items = self._load_json_dir("deep-dive/legal")
        self.risk_items = self._load_json_dir("deep-dive/risks")
        self._company = (self.site.get("company") or self.risk.get("company") or
                         self.people.get("company") or "Unknown Company")
        self._is_public = (self.sec.get("publicCompany") is not False and
                           bool(self.sec.get("latest10K")))
        self.logo = load_json(self.root / "assets" / "logo-base64.json")
        self.og_image = load_json(self.root / "assets" / "og-image-base64.json")

    def _load_json_dir(self, rel_path: str) -> list[dict]:
        d = self.root / rel_path
        if not d.is_dir():
            return []
        results = []
        for f in sorted(d.glob("*.json")):
            data = load_json(f)
            if data:
                results.append(data)
        return results

    @property
    def company(self) -> str:
        return self._company

    @property
    def is_public(self) -> bool:
        return self._is_public

    def add_logo_to_file(self, f: ExcalidrawFile, x: float, y: float, w: float, h: float):
        """Embed the company logo as an Excalidraw image element.
        Returns the element dict or None if no logo available.
        """
        if not self.logo or not self.logo.get("data"):
            return None
        file_id = f"logo-{f.seed()}"
        f._files = getattr(f, '_files', {})
        f._files[file_id] = {
            "mimeType": self.logo["mime"],
            "dataURL": f"data:{self.logo['mime']};base64,{self.logo['data']}",
        }
        el = f._base("image", x, y, w, h)
        el["fileId"] = file_id
        el["status"] = "saved"
        el["scale"] = [1, 1]
        return el


# ---------------------------------------------------------------------------
# Diagram generators
# ---------------------------------------------------------------------------

def generate_diagram_01(f: ExcalidrawFile, data: DueDiligenceData):
    """Company Overview Dashboard — 1400x1000"""

    header = data.site.get("homepage", {})
    about = data.site.get("about", {})
    products = data.site.get("products", [])
    leadership = data.site.get("leadership", [])
    claims = data.site.get("claims", [])

    # Header
    f.add_elements(f.text(700, 15, f"{data.company} — Company Overview",
                          size=30, color=DARK_STROKE, align="center"))
    f.add_elements(f.text(700, 50, "Due Diligence Research Report",
                          size=14, color=NEUTRAL_STROKE, align="center"))

    # Company identity card
    f.add_elements(f.card(350, 80, 700, 110,
                          title=data.company,
                          lines=[
                              f"Industry: {about.get('industry', 'N/A')}",
                              f"Founded: {about.get('founded', 'N/A')}  |  HQ: {about.get('headquarters', 'N/A')}",
                              f"Employees: {about.get('claimedEmployeeCount', 'N/A')}",
                          ],
                          bg=INFO_BG, stroke=INFO_STROKE))

    # Products card (left)
    product_lines = [f"• {p.get('name', '?')}: {p.get('description', '')[:80]}" for p in products[:5]]
    f.add_elements(f.card(60, 240, 620, 150,
                          title="Products & Services",
                          lines=product_lines or ["No products identified"],
                          bg=SUCCESS_BG, stroke=SUCCESS_STROKE))

    # Leadership summary (right)
    leader_lines = [f"• {l.get('name', '?')} — {l.get('title', '?')}" for l in leadership[:6]]
    f.add_elements(f.card(720, 240, 620, 150,
                          title="Leadership Team",
                          lines=leader_lines or ["No leadership data"],
                          bg=INFO_BG, stroke=INFO_STROKE))

    # Financial card (left)
    if data.is_public:
        k10 = data.sec.get("latest10K", {})
        fin_lines = [
            f"Revenue: {k10.get('revenue', 'N/A')}",
            f"Net Income: {k10.get('netIncome', 'N/A')}",
            f"Revenue Growth: {k10.get('revenueGrowth', 'N/A')}",
        ]
        fin_bg, fin_stroke = PURPLE_BG, PURPLE_STROKE
    else:
        fin_lines = ["Private Company — Limited Financial Data"]
        fin_bg, fin_stroke = NEUTRAL_BG, NEUTRAL_STROKE
    f.add_elements(f.card(60, 420, 620, 120, title="Financial Snapshot",
                          lines=fin_lines, bg=fin_bg, stroke=fin_stroke))

    # Claims card (right)
    claim_lines = [f"• {c.get('claim', '')[:100]}" for c in claims[:4]]
    f.add_elements(f.card(720, 420, 620, 120, title="Key Claims (Cross-Referenced)",
                          lines=claim_lines or ["No quantitative claims identified"],
                          bg=WARNING_BG, stroke=WARNING_STROKE))

    # Key metrics strip
    scores = data.risk
    metrics = [
        ("Overall Score", scores.get("overallRiskScore", "?"), 10),
        ("Financial", scores.get("financialHealth", "?"), 10),
        ("Leadership", scores.get("leadershipStability", "?"), 10),
        ("Legal Risk", scores.get("legalRisk", "?"), 10),
        ("Growth", scores.get("growthTrajectory", "?"), 10),
    ]
    for i, (label, score, max_s) in enumerate(metrics):
        mx = 60 + i * 270
        bg, stroke = score_color(score, max_s) if isinstance(score, (int, float)) else (NEUTRAL_BG, NEUTRAL_STROKE)
        f.add_elements(f.rect(mx, 580, 250, 80, bg=bg, stroke=stroke, roundness={"type": 3}))
        f.add_elements(f.text(mx + 125, 592, str(score), size=36, color=DARK_STROKE, align="center"))
        f.add_elements(f.text(mx + 125, 632, label, size=14, color=NEUTRAL_STROKE, align="center"))

    # Footer
    f.add_elements(f.text(700, 700, f"Generated {datetime.now().strftime('%Y-%m-%d')} | Sources: SEC, Glassdoor, Google News, Wayback Machine, Company Website",
                          size=11, color=NEUTRAL_STROKE, align="center"))


def generate_diagram_02(f: ExcalidrawFile, data: DueDiligenceData):
    """Leadership Organization Chart"""
    leaders = data.site.get("leadership", [])
    if not leaders:
        f.add_elements(f.text(700, 100, f"{data.company} — No leadership data available",
                              size=22, color=NEUTRAL_STROKE, align="center"))
        return

    f.add_elements(f.text(700, 18, f"{data.company} — Leadership & Organization",
                          size=26, color=DARK_STROKE, align="center"))

    # CEO at top
    ceo = leaders[0]
    ceo_box = f.rect(550, 60, 300, 80, bg=INFO_BG, stroke=INFO_STROKE, roundness={"type": 3})
    ceo_text = f.text(700, 75, ceo.get("name", "?"), size=18, color=DARK_STROKE, align="center")
    ceo_title = f.text(700, 102, ceo.get("title", "?"), size=13, color=NEUTRAL_STROKE, align="center")
    f.add_elements([ceo_box, ceo_text, ceo_title])

    # Direct reports — arrange in rows of 3
    others = leaders[1:9]  # up to 8 direct reports
    for i, exec in enumerate(others):
        row = i // 3
        col = i % 3
        ex = 200 + col * 360
        ey = 220 + row * 140
        has_flag = False
        for exd in data.executives:
            if exd.get("name", "").lower() == exec.get("name", "").lower():
                if exd.get("redFlags"):
                    has_flag = True
                    break

        f.add_elements(f.rect(ex, ey, 280, 80, bg=WHITE_BG, stroke=DARK_STROKE, roundness={"type": 3}))
        f.add_elements(f.text(ex + 140, ey + 15, exec.get("name", "?"), size=16,
                              color=DARK_STROKE, align="center"))
        f.add_elements(f.text(ex + 140, ey + 42, exec.get("title", ""), size=12,
                              color=NEUTRAL_STROKE, align="center"))
        if has_flag:
            f.add_elements(f.ellipse(ex + 252, ey + 8, 16, 16, bg=DANGER_BG, stroke=DANGER_STROKE))

        # Arrow from CEO
        f.add_elements(f.arrow(700, 140, [[ex + 140 - 700, 0], [0, ey - 140]],
                               stroke=INFO_STROKE, dashed=True))


def generate_diagram_03(f: ExcalidrawFile, data: DueDiligenceData):
    """Financial Health Scorecard — 1200x900"""
    f.add_elements(f.text(600, 18, "Financial Health Analysis", size=26, color=DARK_STROKE, align="center"))

    if not data.is_public:
        f.add_elements(f.card(200, 100, 800, 100,
                              title="Private Company",
                              lines=["Financial data not publicly available through SEC filings.",
                                     "Financial assessment based on publicly available information only."],
                              bg=NEUTRAL_BG, stroke=NEUTRAL_STROKE))
        return

    k10 = data.sec.get("latest10K", {})
    k10q = data.sec.get("latest10Q", {})
    k8s = data.sec.get("recent8Ks", [])

    # Revenue
    revenue = k10.get("revenue", "N/A")
    growth = k10.get("revenueGrowth", "N/A")
    f.add_elements(f.card(40, 60, 540, 140, title="Revenue",
                          lines=[revenue, f"YoY Growth: {growth}"],
                          bg=INFO_BG, stroke=INFO_STROKE))

    # Net Income
    ni = k10.get("netIncome", "N/A")
    ni_bg = SUCCESS_BG if ni and "-" not in str(ni) else DANGER_BG
    f.add_elements(f.card(620, 60, 540, 140, title="Net Income",
                          lines=[ni], bg=ni_bg, stroke=DARK_STROKE))

    # Key metrics row
    metrics = [
        ("Total Assets", k10.get("totalAssets", "N/A"), INFO_BG),
        ("Employees", k10.get("employeeCount", "N/A"), NEUTRAL_BG),
        ("Revenue Growth", growth, SUCCESS_BG if growth and "-" not in str(growth) else DANGER_BG),
        ("Fiscal Year", str(k10.get("fiscalYear", "N/A")), NEUTRAL_BG),
    ]
    for i, (label, value, bg) in enumerate(metrics):
        mx = 40 + i * 290
        f.add_elements(f.rect(mx, 230, 270, 80, bg=bg, stroke=DARK_STROKE, roundness={"type": 3}))
        f.add_elements(f.text(mx + 135, 242, str(value), size=24, color=DARK_STROKE, align="center"))
        f.add_elements(f.text(mx + 135, 276, label, size=12, color=NEUTRAL_STROKE, align="center"))

    # Risk factors
    risks = k10.get("riskFactors", [])
    f.add_elements(f.text(40, 340, "Risk Factors (from 10-K)", size=18, color=WARNING_STROKE))
    for i, risk in enumerate(risks[:8]):
        ry = 370 + i * 42
        severity = risk.get("severity", "medium")
        bg = DANGER_BG if severity == "high" else (WARNING_BG if severity == "medium" else NEUTRAL_BG)
        heading = risk.get("heading", "?")[:100]
        f.add_elements(f.rect(40, ry, 1120, 34, bg=bg, stroke=DARK_STROKE, opacity=60,
                              roundness={"type": 3}))
        f.add_elements(f.text(52, ry + 7, heading, size=13, color=DARK_STROKE))

    # Recent 8-Ks
    if k8s:
        f.add_elements(f.text(40, 740, "Recent Material Events (8-K)", size=18, color=PURPLE_STROKE))
        for i, k8 in enumerate(k8s[:3]):
            kx = 40 + i * 390
            sig = k8.get("significance", "neutral")
            bg, stroke = sentiment_color(sig)
            f.add_elements(f.card(kx, 770, 370, 50,
                                  title=f"{k8.get('filingDate', '?')}",
                                  lines=[k8.get("summary", "")[:90]],
                                  bg=bg, stroke=stroke))


def generate_diagram_04(f: ExcalidrawFile, data: DueDiligenceData):
    """Employee Sentiment Scorecard — 1200x850"""
    f.add_elements(f.text(600, 18, "People & Culture — Employee Sentiment", size=26,
                          color=DARK_STROKE, align="center"))

    ratings = data.people.get("ratings", {})
    if not ratings:
        f.add_elements(f.card(250, 100, 700, 80, title="Glassdoor Data Limited",
                              lines=["Employee sentiment data not available or behind login wall."],
                              bg=NEUTRAL_BG, stroke=NEUTRAL_STROKE))
        return

    # Gauge circles
    gauges = [
        ("Overall", ratings.get("overall", 0), 5.0),
        ("Recommend", float(str(ratings.get("recommendToFriend", "0%")).rstrip("%")), 100.0),
        ("CEO Approval", float(str(ratings.get("ceoApproval", "0%")).rstrip("%")), 100.0),
        ("Culture", ratings.get("cultureAndValues", 0), 5.0),
        ("W/L Balance", ratings.get("workLifeBalance", 0), 5.0),
        ("Compensation", ratings.get("compensationAndBenefits", 0), 5.0),
        ("Career Opps", ratings.get("careerOpportunities", 0), 5.0),
        ("Sr. Mgmt", ratings.get("seniorManagement", 0), 5.0),
    ]
    for i, (label, score, max_s) in enumerate(gauges):
        cx = 90 + i * 145
        f.add_elements(f.gauge_circle(cx, 70, score, max_s, label, radius=45))

    # Pros and Cons
    review = data.people.get("reviewSummary", {})
    pros = review.get("pros", [])[:3]
    cons = review.get("cons", [])[:3]

    f.add_elements(f.text(60, 200, "What Employees Value", size=16, color=SUCCESS_STROKE))
    for i, pro in enumerate(pros):
        f.add_elements(f.card(60, 230 + i * 40, 540, 32, lines=[pro[:100]],
                              bg=SUCCESS_BG, stroke=SUCCESS_STROKE))

    f.add_elements(f.text(640, 200, "Areas of Concern", size=16, color=DANGER_STROKE))
    for i, con in enumerate(cons):
        f.add_elements(f.card(640, 230 + i * 40, 540, 32, lines=[con[:100]],
                              bg=DANGER_BG, stroke=DANGER_STROKE))

    # Signals
    signals = data.people.get("signals", {})
    signal_items = [
        ("Layoff Mentions", signals.get("layoffMentions", 0), DANGER_BG),
        ("Restructuring", signals.get("restructuringMentions", 0), WARNING_BG),
        ("Mgmt Changes", signals.get("managementChangeMentions", 0), WARNING_BG),
        ("Growth Mentions", signals.get("growthMentions", 0), SUCCESS_BG),
    ]
    for i, (label, count, bg) in enumerate(signal_items):
        sx = 60 + i * 290
        f.add_elements(f.rect(sx, 390, 270, 45, bg=bg, stroke=DARK_STROKE, opacity=70,
                              roundness={"type": 3}))
        f.add_elements(f.text(sx + 135, 400, f"{label}: {count}", size=14,
                              color=DARK_STROKE, align="center"))


def generate_diagram_05(f: ExcalidrawFile, data: DueDiligenceData):
    """News Sentiment & Coverage Map — 1400x950"""
    f.add_elements(f.text(700, 18, "News Coverage & Sentiment Analysis", size=26,
                          color=DARK_STROKE, align="center"))

    articles = data.news.get("articles", [])
    summary = data.news.get("summary", {})
    if not articles:
        f.add_elements(f.card(300, 100, 800, 80, title="No News Data",
                              lines=["No news articles collected."],
                              bg=NEUTRAL_BG, stroke=NEUTRAL_STROKE))
        return

    # Sentiment bars
    total = len(articles)
    p_count = summary.get("bySentiment", {}).get("positive", 0)
    n_count = summary.get("bySentiment", {}).get("negative", 0)
    neu_count = total - p_count - n_count
    max_w = 1200

    f.add_elements(f.card(100, 60, 1200, 100, title=f"Total Articles: {total}",
                          lines=[f"Positive: {p_count} ({100*p_count//max(1,total)}%)  |  "
                                 f"Neutral: {neu_count} ({100*neu_count//max(1,total)}%)  |  "
                                 f"Negative: {n_count} ({100*n_count//max(1,total)}%)"],
                          bg=INFO_BG, stroke=INFO_STROKE))

    # Category cards in a grid
    categories = {}
    for a in articles:
        cat = a.get("category", "other")
        categories[cat] = categories.get(cat, 0) + 1

    cat_names = ["product", "partnership", "funding", "earnings",
                 "analyst", "leadership", "lawsuit", "layoff", "scandal"]
    cat_colors = {
        "product": INFO_BG, "partnership": SUCCESS_BG, "funding": SUCCESS_BG,
        "earnings": PURPLE_BG, "analyst": NEUTRAL_BG, "leadership": WARNING_BG,
        "lawsuit": DANGER_BG, "layoff": DANGER_BG, "scandal": DANGER_BG,
    }
    for i, cat in enumerate(cat_names):
        if cat not in categories:
            continue
        col = i % 4
        row = i // 4
        cx = 100 + col * 320
        cy = 200 + row * 100
        count = categories[cat]
        bg = cat_colors.get(cat, NEUTRAL_BG)
        f.add_elements(f.rect(cx, cy, 290, 80, bg=bg, stroke=DARK_STROKE, roundness={"type": 3}))
        f.add_elements(f.text(cx + 145, cy + 12, cat.title(), size=16,
                              color=DARK_STROKE, align="center"))
        f.add_elements(f.text(cx + 145, cy + 40, str(count), size=28,
                              color=DARK_STROKE, align="center"))

    # Top headlines
    sentiment_sorted = sorted(articles, key=lambda a: (
        0 if a.get("sentiment") == "negative" else (1 if a.get("sentiment") == "neutral" else 2)
    ))[:8]
    f.add_elements(f.text(100, 520, "Notable Headlines", size=18, color=DARK_STROKE))
    for i, article in enumerate(sentiment_sorted):
        hy = 555 + i * 38
        sent = article.get("sentiment", "neutral")
        bg, stroke = sentiment_color(sent)
        headline = article.get("headline", "?")[:110]
        date = article.get("date", "")[:12]
        f.add_elements(f.rect(100, hy, 1200, 32, bg=bg, stroke=stroke, opacity=50))
        f.add_elements(f.text(110, hy + 6, f"{date}", size=11, color=NEUTRAL_STROKE))
        f.add_elements(f.text(210, hy + 6, headline, size=12, color=DARK_STROKE))
        f.add_elements(f.badge(1260, hy + 3, sent.title(), bg=bg, stroke=stroke, size=11))


def generate_diagram_06(f: ExcalidrawFile, data: DueDiligenceData):
    """Legal & Compliance Risk Matrix"""
    f.add_elements(f.text(700, 18, "Legal & Compliance Risk Assessment", size=26,
                          color=DARK_STROKE, align="center"))

    legal_procs = data.sec.get("latest10K", {}).get("legalProceedings", [])
    # Also check deep-dive legal items
    if not legal_procs and not data.legal_items:
        f.add_elements(f.card(250, 100, 900, 80, title="No Legal Items Identified",
                              lines=["No material legal proceedings found in SEC filings or news."],
                              bg=SUCCESS_BG, stroke=SUCCESS_STROKE))
        return

    # Column headers
    headers = [
        ("Legal Item", 420), ("Materiality", 160), ("Probability", 160),
        ("Status", 160), ("Impact", 420),
    ]
    hx = 60
    for hdr, w in headers:
        f.add_elements(f.rect(hx, 70, w, 36, bg=DARK_STROKE, stroke=DARK_STROKE))
        f.add_elements(f.text(hx + 10, 77, hdr, size=13, color=WHITE_BG, bold=True))
        hx += w + 4

    items = legal_procs[:8] if legal_procs else [{"description": str(li.get("legalItem", li.get("nature", "?")))[:120]}
                                                   for li in data.legal_items[:8]]
    for i, item in enumerate(items):
        ry = 114 + i * 52
        desc = (item.get("description", str(item)) if isinstance(item, dict) else str(item))[:100]
        mat = item.get("materiality", "medium") if isinstance(item, dict) else "medium"
        prob = item.get("probabilityOfNegativeOutcome", "medium") if isinstance(item, dict) else "medium"
        status = item.get("status", "unknown") if isinstance(item, dict) else "unknown"

        mat_bg = {"high": DANGER_BG, "medium": WARNING_BG, "low": SUCCESS_BG}.get(mat, NEUTRAL_BG)
        prob_bg = {"high": DANGER_BG, "medium": WARNING_BG, "low": SUCCESS_BG}.get(prob, NEUTRAL_BG)
        stat_bg = {"active": DANGER_BG, "pending": WARNING_BG, "settled": SUCCESS_BG,
                   "dismissed": NEUTRAL_BG}.get(status, NEUTRAL_BG)

        hx = 60
        f.add_elements(f.rect(hx, ry, 420, 46, bg=WHITE_BG, stroke=NEUTRAL_STROKE))
        f.add_elements(f.text(hx + 8, ry + 12, desc, size=13, color=DARK_STROKE))
        hx += 424
        f.add_elements(f.rect(hx, ry, 160, 46, bg=mat_bg, stroke=DARK_STROKE, opacity=70))
        f.add_elements(f.text(hx + 80, ry + 12, mat.upper(), size=12, color=DARK_STROKE, align="center"))
        hx += 164
        f.add_elements(f.rect(hx, ry, 160, 46, bg=prob_bg, stroke=DARK_STROKE, opacity=70))
        f.add_elements(f.text(hx + 80, ry + 12, prob.upper(), size=12, color=DARK_STROKE, align="center"))
        hx += 164
        f.add_elements(f.rect(hx, ry, 160, 46, bg=stat_bg, stroke=DARK_STROKE, opacity=70))
        f.add_elements(f.text(hx + 80, ry + 12, status.upper(), size=12, color=DARK_STROKE, align="center"))
        hx += 164
        impact = item.get("estimatedFinancialImpact", "") if isinstance(item, dict) else ""
        f.add_elements(f.rect(hx, ry, 420, 46, bg=WHITE_BG, stroke=NEUTRAL_STROKE))
        f.add_elements(f.text(hx + 8, ry + 12, str(impact)[:80] or "N/A", size=12, color=NEUTRAL_STROKE))


def generate_diagram_07(f: ExcalidrawFile, data: DueDiligenceData):
    """Key Events Timeline — 1600x800"""
    f.add_elements(f.text(800, 18, "Key Events & Milestones Timeline", size=26,
                          color=DARK_STROKE, align="center"))

    # Collect events
    events = []
    for e in data.risk.get("timeline", []):
        events.append((e.get("date", ""), e.get("event", ""), e.get("sentiment", "neutral"),
                       e.get("source", "")))

    for a in data.news.get("articles", []):
        if a.get("sentiment") in ("negative",) or a.get("category") in ("lawsuit", "funding", "layoff", "acquisition"):
            events.append((a.get("date", ""), a.get("headline", "")[:80],
                           a.get("sentiment", "neutral"), "NEWS"))

    for k8 in data.sec.get("recent8Ks", []):
        events.append((k8.get("filingDate", ""), k8.get("summary", "")[:80],
                       k8.get("significance", "neutral"), "SEC"))

    for ms in data.history.get("milestones", []):
        events.append((ms.get("date", ""), ms.get("description", "")[:80],
                       "neutral", "WAYBACK"))

    # Sort and deduplicate
    events.sort(key=lambda e: e[0] or "")
    seen = set()
    unique = []
    for e in events:
        key = (e[0], e[1][:40])
        if key not in seen:
            seen.add(key)
            unique.append(e)

    selected = unique[:20]
    if not selected:
        f.add_elements(f.card(300, 100, 1000, 80, title="No Events",
                              lines=["No significant events identified across sources."],
                              bg=NEUTRAL_BG, stroke=NEUTRAL_STROKE))
        return

    # Timeline axis
    axis_y = 350
    f.add_elements(f.line(60, axis_y, [[0, 0], [1480, 0]], stroke=DARK_STROKE))
    f.add_elements(f.arrow(1530, axis_y - 5, [[0, 0], [20, 10]], stroke=DARK_STROKE))

    # Position events along axis
    for i, (date, desc, sent, source) in enumerate(selected):
        ex = 80 + i * (1480 // max(1, len(selected)))
        bg, stroke = sentiment_color(sent)
        above = sent != "negative"
        ey = axis_y - 110 if above else axis_y + 30

        f.add_elements(f.rect(ex - 90, ey, 180, 60, bg=bg, stroke=stroke, roundness={"type": 3}))
        f.add_elements(f.text(ex - 82, ey + 6, date[:12] if date else "?", size=10,
                              color=NEUTRAL_STROKE))
        f.add_elements(f.text(ex - 82, ey + 22, desc[:70], size=10, color=DARK_STROKE))
        f.add_elements(f.badge(ex + 110 - 90, ey + 40, source[:8], size=9))

        # Connector
        f.add_elements(f.line(ex, ey + 60 if above else ey,
                              [[0, 0], [0, axis_y - (ey + (60 if above else 0))]],
                              stroke=NEUTRAL_STROKE, dashed=True))

    # Legend
    f.add_elements(f.badge(1350, 40, "Positive", bg=SUCCESS_BG, stroke=SUCCESS_STROKE))
    f.add_elements(f.badge(1350, 72, "Negative", bg=DANGER_BG, stroke=DANGER_STROKE))
    f.add_elements(f.badge(1350, 104, "Neutral", bg=NEUTRAL_BG, stroke=NEUTRAL_STROKE))


def generate_diagram_08(f: ExcalidrawFile, data: DueDiligenceData):
    """Red Flags Priority Map"""
    f.add_elements(f.text(600, 18, "Red Flags & Risk Register", size=26,
                          color=DARK_STROKE, align="center"))

    flags = data.risk.get("redFlags", [])
    if not flags:
        f.add_elements(f.card(250, 100, 700, 80, title="No Red Flags Identified",
                              lines=["No red flags detected across all data sources."],
                              bg=SUCCESS_BG, stroke=SUCCESS_STROKE))
        return

    severities = {"critical": [], "high": [], "medium": [], "low": []}
    for rf in flags:
        sev = (rf.get("severity") or "medium").lower()
        severities.setdefault(sev, []).append(rf)

    section_specs = [
        ("CRITICAL — Immediate Attention Required", DANGER_BG, DANGER_STROKE, "critical"),
        ("HIGH — Significant Concern", WARNING_BG, WARNING_STROKE, "high"),
        ("MEDIUM — Monitor Closely", NEUTRAL_BG, NEUTRAL_STROKE, "medium"),
        ("LOW — Tracked Items", SUCCESS_BG, SUCCESS_STROKE, "low"),
    ]

    cy = 70
    for label, bg, stroke, sev_key in section_specs:
        flags_in = severities.get(sev_key, [])
        if not flags_in:
            continue
        f.add_elements(f.rect(60, cy, 1100, 36, bg=bg, stroke=stroke))
        f.add_elements(f.text(80, cy + 8, label, size=14, color=DARK_STROKE, bold=True))
        cy += 42
        for rf in flags_in[:5]:
            desc = rf.get("description", "?")[:110]
            source = rf.get("source", "")
            action = rf.get("recommendedAction", "")[:80]
            f.add_elements(f.rect(60, cy, 1100, 52, bg=bg, stroke=stroke, opacity=40,
                                  roundness={"type": 3}))
            f.add_elements(f.text(72, cy + 6, desc, size=13, color=DARK_STROKE))
            f.add_elements(f.text(72, cy + 28, f"Action: {action}", size=11, color=NEUTRAL_STROKE))
            f.add_elements(f.badge(1000, cy + 10, f"Source: {source[:20]}", size=10))
            cy += 58
        cy += 10

    # Summary counter
    total = len(flags)
    crit = len(severities.get("critical", []))
    high = len(severities.get("high", []))
    med = len(severities.get("medium", []))
    low = len(severities.get("low", []))
    f.add_elements(f.text(600, cy + 10,
                          f"Total: {total}  |  Critical: {crit}  |  High: {high}  |  Medium: {med}  |  Low: {low}",
                          size=13, color=NEUTRAL_STROKE, align="center"))


def generate_diagram_09(f: ExcalidrawFile, data: DueDiligenceData):
    """Master Aggregation Dashboard — 3200x2200"""
    # This is a condensed version that calls helper sections.
    # Full implementation would be much larger; this shows the structure.

    # Header band
    f.add_elements(f.rect(0, 0, 3200, 70, bg=HEADER_BG, stroke=HEADER_BG))
    f.add_elements(f.text(30, 15, data.company, size=30, color=HEADER_TEXT, bold=True))
    f.add_elements(f.text(300, 22, "Due Diligence Report", size=16, color=HEADER_TEXT))
    overall = data.risk.get("overallRiskScore", "?")
    rec = data.risk.get("recommendation", "CAUTION")
    rec_bg = SUCCESS_BG if rec == "PROCEED" else (WARNING_BG if rec == "CAUTION" else DANGER_BG)
    f.add_elements(f.rect(2850, 12, 140, 46, bg=rec_bg, stroke=DARK_STROKE, roundness={"type": 3}))
    f.add_elements(f.text(2920, 22, f"Score: {overall}/10", size=18, color=DARK_STROKE, align="center"))
    f.add_elements(f.rect(3000, 12, 170, 46, bg=rec_bg, stroke=DARK_STROKE, roundness={"type": 3}))
    f.add_elements(f.text(3085, 22, rec, size=18, color=DARK_STROKE, align="center"))

    # === ROW 1 (y:90-480) ===
    # A. Company Identity
    f.add_elements(f.frame(20, 90, 1060, 380, name="Company Profile"))
    about = data.site.get("about", {})
    products = data.site.get("products", [])
    ident_lines = [
        f"Industry: {about.get('industry', 'N/A')}",
        f"Founded: {about.get('founded', 'N/A')}  |  HQ: {about.get('headquarters', 'N/A')}",
        f"Type: {'Public' if data.is_public else 'Private'}",
        f"Employees: {about.get('claimedEmployeeCount', 'N/A')}",
    ]
    f.add_elements(f.section_title(20, 90, 1060, "COMPANY PROFILE", bg=INFO_BG))
    f.add_elements(f.card(35, 140, 500, 170, title=data.company,
                          lines=ident_lines, bg=INFO_BG, stroke=INFO_STROKE))

    # Embed company logo if available (top-right of identity section)
    logo_el = data.add_logo_to_file(f, 870, 140, 180, 100)
    if logo_el:
        f.elements.append(logo_el)
    prod_lines = [f"• {p.get('name', '?')}" for p in products[:5]]
    f.add_elements(f.card(560, 140, 500, 170, title="Products & Services",
                          lines=prod_lines or ["N/A"], bg=SUCCESS_BG, stroke=SUCCESS_STROKE))

    claims = data.site.get("claims", [])[:3]
    claim_text = "Claims: " + " | ".join(c.get("claim", "")[:60] for c in claims)
    f.add_elements(f.text(35, 330, claim_text[:120], size=11, color=WARNING_STROKE))
    locations = ", ".join(about.get("locations", [])[:4]) or "N/A"
    f.add_elements(f.text(35, 350, f"Locations: {locations}", size=11, color=NEUTRAL_STROKE))

    # B. Financial Snapshot
    f.add_elements(f.frame(1100, 90, 1040, 380, name="Financial Snapshot"))
    f.add_elements(f.section_title(1100, 90, 1040, "FINANCIAL SNAPSHOT", bg=PURPLE_BG))
    if data.is_public:
        k10 = data.sec.get("latest10K", {})
        rev = k10.get("revenue", "N/A")
        ni = k10.get("netIncome", "N/A")
        growth = k10.get("revenueGrowth", "N/A")
        f.add_elements(f.card(1120, 140, 470, 100, title="REVENUE",
                              lines=[rev, f"YoY Growth: {growth}"],
                              bg=SUCCESS_BG, stroke=SUCCESS_STROKE))
        ni_bg = DANGER_BG if ni and "-" in str(ni) else SUCCESS_BG
        f.add_elements(f.card(1620, 140, 470, 100, title="NET INCOME",
                              lines=[ni], bg=ni_bg, stroke=DARK_STROKE))

        metric_items = [
            ("Total Assets", k10.get("totalAssets", "N/A"), INFO_BG),
            ("Employees", k10.get("employeeCount", "N/A"), NEUTRAL_BG),
        ]
        for i, (label, val, bg) in enumerate(metric_items):
            f.add_elements(f.rect(1120 + i * 250, 270, 230, 70, bg=bg, stroke=DARK_STROKE,
                                  roundness={"type": 3}))
            f.add_elements(f.text(1235 + i * 250, 282, str(val), size=22, color=DARK_STROKE,
                                  align="center"))
            f.add_elements(f.text(1235 + i * 250, 312, label, size=12, color=NEUTRAL_STROKE,
                                  align="center"))

        risks = k10.get("riskFactors", [])[:3]
        for i, r in enumerate(risks):
            f.add_elements(f.text(1120, 370 + i * 24, f"• {r.get('heading', '?')[:90]}", size=11,
                                  color=DANGER_STROKE if r.get('severity') == 'high' else WARNING_STROKE))
    else:
        f.add_elements(f.card(1120, 140, 990, 100, title="Private Company",
                              lines=["Financial data not publicly available through SEC."],
                              bg=NEUTRAL_BG, stroke=NEUTRAL_STROKE))

    # C. Leadership
    f.add_elements(f.frame(2160, 90, 1040, 380, name="Leadership"))
    f.add_elements(f.section_title(2160, 90, 1040, "LEADERSHIP", bg=INFO_BG))
    leaders = data.site.get("leadership", [])
    if leaders:
        ceo = leaders[0]
        f.add_elements(f.rect(2520, 140, 280, 70, bg=INFO_BG, stroke=INFO_STROKE, roundness={"type": 3}))
        f.add_elements(f.text(2660, 155, ceo.get("name", "?"), size=16, color=DARK_STROKE, align="center"))
        f.add_elements(f.text(2660, 180, ceo.get("title", "?"), size=12, color=NEUTRAL_STROKE, align="center"))

        for i, exec in enumerate(leaders[1:7]):
            col = i % 2
            row = i // 2
            ex = 2180 + col * 510
            ey = 250 + row * 80
            f.add_elements(f.rect(ex, ey, 240, 60, bg=WHITE_BG, stroke=DARK_STROKE, roundness={"type": 3}))
            f.add_elements(f.text(ex + 120, ey + 10, exec.get("name", "?"), size=14,
                                  color=DARK_STROKE, align="center"))
            f.add_elements(f.text(ex + 120, ey + 34, exec.get("title", "?")[:40], size=11,
                                  color=NEUTRAL_STROKE, align="center"))

    # === ROW 2 — Employee Sentiment (full width) ===
    f.add_elements(f.frame(20, 490, 3180, 280, name="Employee Sentiment"))
    f.add_elements(f.section_title(20, 490, 3180, "EMPLOYEE SENTIMENT", bg=SUCCESS_BG))
    ratings = data.people.get("ratings", {})
    if ratings:
        gauge_data = [
            ("Overall", ratings.get("overall", 0), 5.0),
            ("Recommend", float(str(ratings.get("recommendToFriend", "0")).rstrip("%")), 100.0),
            ("CEO", float(str(ratings.get("ceoApproval", "0")).rstrip("%")), 100.0),
            ("Culture", ratings.get("cultureAndValues", 0), 5.0),
            ("W/L Bal", ratings.get("workLifeBalance", 0), 5.0),
            ("Comp", ratings.get("compensationAndBenefits", 0), 5.0),
            ("Career", ratings.get("careerOpportunities", 0), 5.0),
        ]
        for i, (label, score, max_s) in enumerate(gauge_data):
            cx = 80 + i * 440
            f.add_elements(f.gauge_circle(cx, 540, score, max_s, label, radius=40))

        review = data.people.get("reviewSummary", {})
        pros = review.get("pros", [])[:2]
        cons = review.get("cons", [])[:2]
        f.add_elements(f.text(60, 650, "Pros: " + ", ".join(pros)[:150], size=12, color=SUCCESS_STROKE))
        f.add_elements(f.text(1660, 650, "Cons: " + ", ".join(cons)[:150], size=12, color=DANGER_STROKE))

    # === ROW 3 (y:790-1260) ===
    # E. News (left)
    f.add_elements(f.frame(20, 790, 1050, 460, name="News Coverage"))
    f.add_elements(f.section_title(20, 790, 1050, "NEWS COVERAGE & SENTIMENT", bg=INFO_BG))
    articles = data.news.get("articles", [])
    if articles:
        total = len(articles)
        summary = data.news.get("summary", {})
        pct = summary.get("bySentiment", {})
        pos = pct.get("positive", 0)
        neg = pct.get("negative", 0)
        neu = total - pos - neg
        f.add_elements(f.text(35, 840, f"Total: {total} articles  |  Pos: {pos}  |  Neu: {neu}  |  Neg: {neg}",
                              size=14, color=DARK_STROKE))
        for i, a in enumerate(articles[:6]):
            sent = a.get("sentiment", "neutral")
            bg, stroke = sentiment_color(sent)
            f.add_elements(f.rect(35, 870 + i * 38, 1000, 30, bg=bg, stroke=stroke, opacity=40))
            f.add_elements(f.text(45, 876 + i * 38, a.get("headline", "?")[:110], size=11, color=DARK_STROKE))

    # F. Legal (center)
    f.add_elements(f.frame(1090, 790, 1040, 460, name="Legal & Compliance"))
    f.add_elements(f.section_title(1090, 790, 1040, "LEGAL & COMPLIANCE RISK", bg=PURPLE_BG))
    legal_procs = data.sec.get("latest10K", {}).get("legalProceedings", [])
    if legal_procs:
        for i, lp in enumerate(legal_procs[:5]):
            f.add_elements(f.text(1105, 845 + i * 30, f"• {lp.get('description', str(lp))[:120]}",
                                  size=12, color=DARK_STROKE))
    else:
        f.add_elements(f.text(1105, 845, "No material legal proceedings identified.", size=13,
                              color=SUCCESS_STROKE))

    # G. Red Flags (right)
    f.add_elements(f.frame(2150, 790, 1050, 460, name="Red Flags"))
    f.add_elements(f.section_title(2150, 790, 1050, "RED FLAGS & RISK REGISTER", bg=DANGER_BG))
    flags = data.risk.get("redFlags", [])
    if flags:
        for i, rf in enumerate(flags[:8]):
            sev = (rf.get("severity") or "medium").lower()
            bg = {"critical": DANGER_BG, "high": WARNING_BG, "medium": NEUTRAL_BG,
                  "low": SUCCESS_BG}.get(sev, NEUTRAL_BG)
            f.add_elements(f.rect(2165, 840 + i * 44, 1000, 36, bg=bg, stroke=DARK_STROKE, opacity=50))
            f.add_elements(f.text(2175, 848 + i * 44, rf.get("description", "?")[:110],
                                  size=12, color=DARK_STROKE))

    # === ROW 4 — Timeline (full width) ===
    f.add_elements(f.frame(20, 1270, 3180, 260, name="Key Events Timeline"))
    f.add_elements(f.section_title(20, 1270, 3180, "KEY EVENTS TIMELINE", bg=NEUTRAL_BG))
    timeline = data.risk.get("timeline", [])
    if timeline:
        axis_y = 1420
        f.add_elements(f.line(40, axis_y, [[0, 0], [3100, 0]], stroke=DARK_STROKE))
        for i, ev in enumerate(timeline[:12]):
            ex = 60 + i * (3100 // max(1, len(timeline[:12])))
            sent = ev.get("sentiment", "neutral")
            bg, stroke = sentiment_color(sent)
            desc = ev.get("event", str(ev))[:60]
            f.add_elements(f.rect(ex - 80, axis_y - 55, 160, 40, bg=bg, stroke=stroke,
                                  roundness={"type": 3}))
            f.add_elements(f.text(ex - 72, axis_y - 45, desc, size=9, color=DARK_STROKE))
            f.add_elements(f.line(ex, axis_y - 15, [[0, 0], [0, 15]], stroke=NEUTRAL_STROKE, dashed=True))

    # === ROW 5 (y:1550-1800) ===
    # I. Six Dimension Scorecard
    f.add_elements(f.frame(20, 1550, 1060, 240, name="Risk Scorecard"))
    f.add_elements(f.section_title(20, 1550, 1060, "SIX DIMENSION RISK SCORECARD", bg=WARNING_BG))
    dims = [
        ("Financial Health", data.risk.get("financialHealth", 0)),
        ("Leadership Stability", data.risk.get("leadershipStability", 0)),
        ("Employee Satisfaction", data.risk.get("employeeSatisfaction", 0)),
        ("Legal & Compliance Risk", data.risk.get("legalRisk", 0)),
        ("Market Position", data.risk.get("marketPosition", 0)),
        ("Growth Trajectory", data.risk.get("growthTrajectory", 0)),
    ]
    for i, (label, score) in enumerate(dims):
        f.add_elements(f.score_bar(35, 1600 + i * 30, score, label=label,
                                   bar_w=200, bar_h=20, group="scorecard"))

    # J. Data Quality
    f.add_elements(f.frame(1100, 1550, 1040, 240, name="Data Sources"))
    f.add_elements(f.section_title(1100, 1550, 1040, "DATA QUALITY & SOURCES", bg=NEUTRAL_BG))
    sources = [
        ("Company Website", bool(data.site), "✓"),
        ("SEC EDGAR", data.is_public, "✓" if data.is_public else "N/A (Private)"),
        ("Glassdoor", bool(data.people.get("ratings")), "✓" if data.people.get("ratings") else "⚠ Limited"),
        ("Google News", bool(data.news.get("articles")), f"✓ ({len(data.news.get('articles', []))} articles)"),
        ("Wayback Machine", bool(data.history.get("archiveOverview")), "✓" if data.history.get("archiveOverview") else "N/A"),
    ]
    for i, (name, ok, status) in enumerate(sources):
        bg = SUCCESS_BG if ok else NEUTRAL_BG
        f.add_elements(f.rect(1115, 1600 + i * 35, 1000, 28, bg=bg, stroke=DARK_STROKE, opacity=60))
        f.add_elements(f.text(1125, 1604 + i * 35, f"{name}: {status}", size=13, color=DARK_STROKE))

    # K. Verdict
    f.add_elements(f.frame(2160, 1550, 1040, 240, name="Verdict"))
    rec_bg, rec_stroke = sentiment_color(rec)
    f.add_elements(f.section_title(2160, 1550, 1040, "VERDICT & RECOMMENDATION", bg=rec_bg))
    f.add_elements(f.rect(2480, 1600, 400, 100, bg=rec_bg, stroke=rec_stroke, roundness={"type": 3}))
    f.add_elements(f.text(2680, 1615, "OVERALL SCORE", size=14, color=DARK_STROKE, align="center"))
    f.add_elements(f.text(2680, 1640, str(overall), size=56, color=DARK_STROKE, align="center"))
    f.add_elements(f.text(2680, 1690, "/10", size=20, color=DARK_STROKE, align="center"))
    f.add_elements(f.text(2680, 1730, f"RECOMMENDATION: {rec}", size=20, color=rec_stroke,
                          align="center", bold=True))

    # Footer
    f.add_elements(f.rect(0, 1820, 3200, 40, bg=NEUTRAL_BG, stroke=NEUTRAL_STROKE, opacity=50))
    f.add_elements(f.text(1600, 1830,
                          f"Generated {datetime.now().strftime('%Y-%m-%d')} | "
                          "Sources: SEC EDGAR, Glassdoor, Google News, Wayback Machine, Company Website | "
                          "Converge Due Diligence Pipeline",
                          size=10, color=NEUTRAL_STROKE, align="center"))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

GENERATORS = [
    ("01-company-overview", generate_diagram_01),
    ("02-leadership-orgchart", generate_diagram_02),
    ("03-financial-health", generate_diagram_03),
    ("04-employee-sentiment", generate_diagram_04),
    ("05-news-sentiment", generate_diagram_05),
    ("06-legal-risk-matrix", generate_diagram_06),
    ("07-key-events-timeline", generate_diagram_07),
    ("08-red-flags", generate_diagram_08),
    ("09-master-aggregation", generate_diagram_09),
]


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generate due diligence Excalidraw diagrams")
    parser.add_argument("--artifacts-root", default=".converge/artifacts/due-diligence",
                        help="Path to artifacts directory")
    args = parser.parse_args()

    root = Path(args.artifacts_root)
    if not root.is_dir():
        print(f"ERROR: Artifacts root not found: {root}", file=sys.stderr)
        print("Run the due diligence playbook first to generate data files.", file=sys.stderr)
        sys.exit(1)

    data = DueDiligenceData(root)
    out_dir = root / "diagrams"
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = {"generatedAt": datetime.now().isoformat(), "diagrams": []}

    for name, generator in GENERATORS:
        f = ExcalidrawFile()
        print(f"Generating {name}...")
        generator(f, data)

        filename = f"{name}.excalidraw"
        out_path = out_dir / filename
        with open(out_path, "w") as fp:
            fp.write(f.to_json())

        manifest["diagrams"].append({
            "id": name,
            "file": filename,
            "elements": len(f.elements),
        })
        print(f"  → {out_path} ({len(f.elements)} elements)")

    manifest_path = out_dir / "manifest.json"
    with open(manifest_path, "w") as fp:
        json.dump(manifest, fp, indent=2)
    print(f"\nDone. {len(manifest['diagrams'])} diagrams written to {out_dir}/")


if __name__ == "__main__":
    main()
