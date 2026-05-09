---
id: browser-search-news
title: Browser Search — Google News
---

# Browser Search Google News

Search Google News for recent coverage of a company. Categorize articles by topic and sentiment. Extract headlines, dates, and publications.

## Contract

**Inputs:**
- `company` (string) — Company name to search
- `artifactsRoot` (string) — Path to write artifacts

**Outputs:**
- `{{artifactsRoot}}/news-data.json` — Structured news coverage data
- `{{artifactsRoot}}/screenshots/` — Screenshot evidence

## Procedure

### 1. Navigate to Google News

```bash
agent-browser --session dd-news open https://news.google.com
agent-browser --session dd-news wait --load networkidle
agent-browser --session dd-news snapshot -i
```

### 2. Search for the Company

```bash
# Find the search input
agent-browser --session dd-news find placeholder "Search" fill "{{company}}"
agent-browser --session dd-news key Enter
agent-browser --session dd-news wait --load networkidle
agent-browser --session dd-news screenshot "{{artifactsRoot}}/screenshots/news-search-results.png" --full
agent-browser --session dd-news snapshot -i
```

### 3. Scan Articles

Extract the top articles (aim for 20-40). For each:

```bash
# Use snapshot to see article headlines
agent-browser --session dd-news get text
```

For each article extract:
- Headline
- Publication / source
- Date / time ago (e.g., "2 days ago")
- Brief snippet (first ~200 chars visible in search results)

### 4. Categorize Articles

Classify each article into a category:
- **product** — new product launch, feature, update
- **funding** — raised funding, IPO, SPAC
- **partnership** — new partnership, alliance, channel
- **leadership** — CEO change, executive hire/departure
- **lawsuit** — sued, suing, legal action, regulatory
- **scandal** — data breach, misconduct, controversy
- **layoff** — layoffs, restructuring, office closure
- **acquisition** — acquiring or being acquired
- **earnings** — quarterly/annual earnings report
- **analyst** — analyst upgrade/downgrade, price target change
- **other** — doesn't fit above

### 5. Assess Sentiment

For each article, assess sentiment:
- **positive** — good news for the company
- **negative** — bad news, risk, criticism
- **neutral** — factual reporting without clear positive/negative angle

Base this on the headline and snippet. Be conservative — err toward neutral when unclear.

### 6. Run Additional Targeted Searches

Run supplementary searches for specific risk-relevant topics:

```bash
# Lawsuit check
agent-browser --session dd-news find placeholder "Search" fill "{{company}} lawsuit"
agent-browser --session dd-news key Enter
# Extract results...

# Layoff check
agent-browser --session dd-news find placeholder "Search" fill "{{company}} layoffs"
agent-browser --session dd-news key Enter
# Extract results...

# Controversy check
agent-browser --session dd-news find placeholder "Search" fill "{{company}} controversy investigation"
agent-browser --session dd-news key Enter
# Extract results...
```

### 7. Build news-data.json

```json
{
  "company": "string",
  "fetchTimestamp": "ISO 8601",
  "searchUrl": "string",
  "totalArticlesScanned": "number",
  "articles": [
    {
      "headline": "string",
      "publication": "string",
      "date": "string",
      "snippet": "string",
      "category": "product|funding|partnership|leadership|lawsuit|scandal|layoff|acquisition|earnings|analyst|other",
      "sentiment": "positive|negative|neutral",
      "url": "string or null"
    }
  ],
  "summary": {
    "totalArticles": "number",
    "byCategory": {
      "product": "number",
      "funding": "number",
      "...": "number"
    },
    "bySentiment": {
      "positive": "number",
      "negative": "number",
      "neutral": "number"
    },
    "recentTrend": "string (assessment of what the news cycle says about the company right now)"
  },
  "riskSignals": {
    "lawsuitArticles": "number",
    "layoffArticles": "number",
    "scandalArticles": "number",
    "leadershipTurnoverArticles": "number"
  },
  "screenshots": [
    {"search": "string", "path": "string"}
  ]
}
```

### 8. Cleanup

```bash
agent-browser --session dd-news close
```

## Error Recovery

- Google News may show different layouts by region — adapt to whatever layout is shown
- If search returns few results, try variations: "{{company}} news", "{{company}} stock"
- If Google blocks automated access, wait and retry with longer delays between actions
- Screenshot whatever is visible even if some searches fail
