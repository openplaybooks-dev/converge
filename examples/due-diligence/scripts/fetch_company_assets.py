#!/usr/bin/env python3
"""
fetch_company_assets.py — Download company logo/favicon for diagram embedding.

Fetches the favicon or logo from a company website and saves it as base64-encoded
data ready for embedding in Excalidraw image elements. Also downloads any publicly
available images from the company's about page.

Usage:
  python scripts/fetch_company_assets.py --website https://www.example.com \
    --out .converge/artifacts/due-diligence/assets/

Outputs:
  assets/logo-base64.json        — { "mime": "image/png", "data": "base64...", "source": "url" }
  assets/favicon-base64.json     — same format for favicon
  assets/manifest.json           — list of all downloaded assets

Dependencies: none (Python 3.9+ stdlib only — urllib for fetching)
"""

from __future__ import annotations

import json
import sys
import base64
import urllib.request
import urllib.parse
import re
from pathlib import Path
from datetime import datetime
from typing import Optional
from html.parser import HTMLParser


# ---------------------------------------------------------------------------
# HTML parser to find favicon/apple-touch-icon/logo links
# ---------------------------------------------------------------------------

class IconParser(HTMLParser):
    """Extract icon and logo URLs from HTML <head>."""

    def __init__(self, base_url: str):
        super().__init__()
        self.base_url = base_url
        self.icons: list[dict] = []  # {rel, url, sizes}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str]]):
        attrs_dict = dict(attrs)
        if tag == "link":
            rel = attrs_dict.get("rel", "").lower()
            href = attrs_dict.get("href", "")
            if href and any(r in rel for r in ("icon", "apple-touch-icon", "shortcut icon")):
                self.icons.append({
                    "rel": rel,
                    "url": urllib.parse.urljoin(self.base_url, href),
                    "sizes": attrs_dict.get("sizes", ""),
                })
        elif tag == "meta":
            prop = attrs_dict.get("property", "").lower()
            content = attrs_dict.get("content", "")
            if "og:image" in prop and content:
                self.icons.append({
                    "rel": "og:image",
                    "url": urllib.parse.urljoin(self.base_url, content),
                    "sizes": "",
                })


# ---------------------------------------------------------------------------
# Image fetching
# ---------------------------------------------------------------------------

def fetch_as_base64(url: str, timeout: int = 15) -> Optional[dict]:
    """Fetch an image URL and return {mime, data, size_bytes} or None."""
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; DueDiligenceBot/1.0)",
        })
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            mime = resp.headers.get("Content-Type", "image/png")
            if not mime.startswith("image/"):
                return None
            if len(raw) > 2 * 1024 * 1024:  # 2MB limit
                print(f"  ⚠ Image too large ({len(raw)} bytes), skipping")
                return None
            return {
                "mime": mime.split(";")[0].strip(),
                "data": base64.b64encode(raw).decode("ascii"),
                "size_bytes": len(raw),
            }
    except Exception as e:
        print(f"  ⚠ Failed to fetch {url}: {e}")
        return None


def find_best_icon(icons: list[dict], prefer_svg: bool = True) -> Optional[str]:
    """Pick the best icon URL from discovered icons."""
    # Preference: SVG > apple-touch-icon > large PNG > favicon.ico
    scored = []
    for icon in icons:
        url = icon["url"]
        score = 0
        if ".svg" in url.lower():
            score += 100
        if "apple-touch-icon" in icon["rel"]:
            score += 80
        if icon["sizes"]:
            try:
                w = int(icon["sizes"].split("x")[0])
                score += min(w, 192)
            except ValueError:
                pass
        if "favicon" in icon["rel"] or "shortcut icon" in icon["rel"]:
            score += 10
        if "og:image" in icon["rel"]:
            score += 50
        scored.append((score, url))
    scored.sort(reverse=True)
    return scored[0][1] if scored else None


def try_common_favicon_urls(base_url: str) -> list[str]:
    """Generate common favicon URL patterns to try."""
    parsed = urllib.parse.urlparse(base_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    return [
        f"{origin}/favicon.ico",
        f"{origin}/favicon.svg",
        f"{origin}/favicon.png",
        f"{origin}/apple-touch-icon.png",
        f"{origin}/apple-touch-icon-precomposed.png",
    ]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Fetch company logo/favicon for diagram embedding")
    parser.add_argument("--website", required=True, help="Company website URL")
    parser.add_argument("--out", required=True, help="Output directory for assets")
    parser.add_argument("--timeout", type=int, default=15, help="HTTP timeout in seconds")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    website = args.website.rstrip("/")
    if not website.startswith("http"):
        website = f"https://{website}"

    print(f"Fetching assets for {website}...")

    manifest = {"fetchedAt": datetime.now().isoformat(), "website": website, "assets": {}}

    # Step 1: Parse homepage HTML for icon links
    icons = []
    try:
        req = urllib.request.Request(website, headers={
            "User-Agent": "Mozilla/5.0 (compatible; DueDiligenceBot/1.0)",
        })
        with urllib.request.urlopen(req, timeout=args.timeout) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
            parser = IconParser(website)
            parser.feed(html)
            icons = parser.icons
            print(f"  Found {len(icons)} icon/logo links in HTML")
    except Exception as e:
        print(f"  ⚠ Could not fetch homepage HTML: {e}")

    # Step 2: Try common favicon URLs as fallback
    common_urls = try_common_favicon_urls(website)
    all_candidate_urls = [i["url"] for i in icons] + common_urls

    # Step 3: Pick the best icon and fetch it
    best_url = find_best_icon(icons) if icons else common_urls[0] if common_urls else None
    if not best_url and common_urls:
        best_url = common_urls[0]

    logo_result = None
    if best_url:
        print(f"  Trying: {best_url}")
        logo_result = fetch_as_base64(best_url, timeout=args.timeout)

    # Step 4: If the best pick failed, try fallbacks
    if not logo_result:
        for url in all_candidate_urls[:8]:
            if url == best_url:
                continue
            print(f"  Trying fallback: {url}")
            logo_result = fetch_as_base64(url, timeout=args.timeout)
            if logo_result:
                break

    # Step 5: Save results
    if logo_result:
        logo_path = out_dir / "logo-base64.json"
        logo_data = {
            "mime": logo_result["mime"],
            "data": logo_result["data"],
            "size_bytes": logo_result["size_bytes"],
            "source": best_url or "favicon.ico",
            "fetchedAt": datetime.now().isoformat(),
        }
        with open(logo_path, "w") as f:
            json.dump(logo_data, f, indent=2)
        manifest["assets"]["logo"] = {
            "file": "logo-base64.json",
            "mime": logo_result["mime"],
            "size_bytes": logo_result["size_bytes"],
            "source": best_url,
        }
        print(f"  ✓ Logo saved to {logo_path} ({logo_result['size_bytes']} bytes, {logo_result['mime']})")

        # Also save as raw file for direct use
        ext = logo_result["mime"].split("/")[-1]
        if ext == "svg+xml":
            ext = "svg"
        raw_path = out_dir / f"logo.{ext}"
        with open(raw_path, "wb") as f:
            f.write(base64.b64decode(logo_result["data"]))
        manifest["assets"]["logo"]["raw_file"] = f"logo.{ext}"
    else:
        print("  ✗ Could not fetch any logo/favicon")
        manifest["assets"]["logo"] = None

    # Step 6: Try to fetch OG image (social preview — usually larger logo)
    og_image_url = None
    for icon in icons:
        if icon["rel"] == "og:image":
            og_image_url = icon["url"]
            break

    if og_image_url and og_image_url != best_url:
        print(f"  Fetching OG image: {og_image_url}")
        og_result = fetch_as_base64(og_image_url, timeout=args.timeout)
        if og_result:
            og_path = out_dir / "og-image-base64.json"
            with open(og_path, "w") as f:
                json.dump({
                    "mime": og_result["mime"],
                    "data": og_result["data"],
                    "size_bytes": og_result["size_bytes"],
                    "source": og_image_url,
                    "fetchedAt": datetime.now().isoformat(),
                }, f, indent=2)
            manifest["assets"]["ogImage"] = {
                "file": "og-image-base64.json",
                "mime": og_result["mime"],
                "size_bytes": og_result["size_bytes"],
            }
            print(f"  ✓ OG image saved ({og_result['size_bytes']} bytes)")

    # Write manifest
    manifest_path = out_dir / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    success = manifest["assets"]["logo"] is not None
    print(f"\n{'✓ Done' if success else '⚠ Partial — no logo fetched'}")
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
