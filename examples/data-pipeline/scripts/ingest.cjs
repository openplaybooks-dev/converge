#!/usr/bin/env node
/* eslint-disable */
// RSS ingestion helper used by `.converge/playbooks/default/tasks/01-ingest/`.
//
// Modes (controlled by INGEST_MODE env, default "snapshot"):
//   snapshot  Read data/source/feeds-snapshot.xml and parse it.
//   live      Fetch every URL in feeds.json, concatenate the raw bodies into
//             data/source/feeds-snapshot.xml (with <!-- feed: name --> markers),
//             then parse the new snapshot.
//
// Both modes write data/source/articles.json. Article ids are sha1(url).slice(0,12)
// so cluster/dedupe results stay deterministic across reruns of the same snapshot.
//
// Exits non-zero on <10 valid articles so the task's `enough-articles` check fails fast.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SNAPSHOT = "data/source/feeds-snapshot.xml";
const ARTICLES = "data/source/articles.json";
const FEEDS = "feeds.json";
const MODE = process.env.INGEST_MODE === "live" ? "live" : "snapshot";

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripHtml(s) {
  return decodeEntities(String(s || "").replace(/<[^>]*>/g, "")).trim();
}

function unwrapCdata(s) {
  const m = String(s || "").match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : s || "";
}

function pickTag(block, tag) {
  // Non-greedy, multiline. Returns the first match content or "".
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? unwrapCdata(m[1].trim()) : "";
}

function pickAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]+)"`, "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

function parseDate(s) {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

function hash12(s) {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);
}

function splitFeeds(xml) {
  // Split on <!-- feed: name --> markers. Returns [{name, body}, ...].
  const parts = [];
  const re = /<!--\s*feed:\s*([^>-]+?)\s*-->/g;
  let last = null;
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (last) {
      parts.push({ name: last.name, body: xml.slice(last.end, m.index) });
    }
    last = { name: m[1].trim(), end: m.index + m[0].length };
  }
  if (last) parts.push({ name: last.name, body: xml.slice(last.end) });
  return parts;
}

function parseFeedBody(name, body, cap) {
  const records = [];
  // RSS <item> ... </item> or Atom <entry> ... </entry>
  const itemRe = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = itemRe.exec(body)) !== null && records.length < cap) {
    const block = m[2];
    const tagName = m[1].toLowerCase();
    const title = stripHtml(pickTag(block, "title"));
    let url = "";
    if (tagName === "entry") {
      url = pickAttr(block, "link", "href") || pickTag(block, "id");
    } else {
      url = pickTag(block, "link") || pickAttr(block, "link", "href");
    }
    url = stripHtml(url);
    if (!title || !url) continue;
    const summaryRaw =
      pickTag(block, "description") ||
      pickTag(block, "summary") ||
      pickTag(block, "content");
    const summary = stripHtml(summaryRaw).slice(0, 500);
    const published = parseDate(
      pickTag(block, "pubDate") ||
        pickTag(block, "published") ||
        pickTag(block, "updated") ||
        pickTag(block, "dc:date")
    );
    records.push({
      id: hash12(url),
      title,
      url,
      source: name,
      published_at: published,
      raw_summary: summary,
    });
  }
  return records;
}

async function fetchFeeds() {
  const cfg = JSON.parse(fs.readFileSync(FEEDS, "utf8"));
  const cap = cfg.max_articles_per_feed || 10;
  const parts = [];
  for (const feed of cfg.feeds || []) {
    try {
      const r = await fetch(feed.url, {
        headers: { "user-agent": "converge-data-pipeline/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) {
        console.warn(`! ${feed.name}: HTTP ${r.status} — skipping`);
        parts.push(`<!-- feed: ${feed.name} -->\n<!-- fetch failed: HTTP ${r.status} -->`);
        continue;
      }
      const body = await r.text();
      console.log(`✓ ${feed.name}: ${body.length} bytes`);
      parts.push(`<!-- feed: ${feed.name} -->\n${body}`);
    } catch (e) {
      console.warn(`! ${feed.name}: ${e.message} — skipping`);
      parts.push(`<!-- feed: ${feed.name} -->\n<!-- fetch failed: ${e.message} -->`);
    }
  }
  fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
  fs.writeFileSync(SNAPSHOT, parts.join("\n\n"));
  return cap;
}

async function main() {
  let cap = 10;
  if (MODE === "live") {
    console.log("── live mode: fetching feeds ──");
    cap = await fetchFeeds();
  } else {
    if (!fs.existsSync(SNAPSHOT)) {
      console.error(
        `✗ snapshot ${SNAPSHOT} missing — run \`scripts/run.sh --live\` once to seed it`
      );
      process.exit(1);
    }
    const cfg = JSON.parse(fs.readFileSync(FEEDS, "utf8"));
    cap = cfg.max_articles_per_feed || 10;
    console.log(`── snapshot mode: parsing ${SNAPSHOT} ──`);
  }

  const xml = fs.readFileSync(SNAPSHOT, "utf8");
  const feeds = splitFeeds(xml);
  const all = [];
  for (const f of feeds) {
    const recs = parseFeedBody(f.name, f.body, cap);
    console.log(`  ${f.name}: ${recs.length} articles`);
    all.push(...recs);
  }

  // Dedupe by url across feeds (HN often re-syndicates).
  const seen = new Set();
  const articles = [];
  for (const a of all) {
    if (seen.has(a.url)) continue;
    seen.add(a.url);
    articles.push(a);
  }

  fs.mkdirSync(path.dirname(ARTICLES), { recursive: true });
  fs.writeFileSync(
    ARTICLES,
    JSON.stringify(
      {
        captured_at: new Date().toISOString(),
        mode: MODE,
        articles,
      },
      null,
      2
    )
  );
  console.log(`✓ wrote ${ARTICLES} (${articles.length} articles)`);

  if (articles.length < 10) {
    console.error(
      `✗ only ${articles.length} articles — need at least 10 to cluster meaningfully`
    );
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
