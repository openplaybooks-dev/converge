---
id: browser-crawl-company-site
title: Browser Crawl — Company Website
---

# Browser Crawl Company Site

Crawl a company's public website using agent-browser. Extract structured data about products, leadership, locations, careers, and claims. Capture screenshots as evidence.

## Contract

**Inputs:**
- `website` (string) — Company website URL (e.g., `https://www.uipath.com`)
- `company` (string) — Company name
- `artifactsRoot` (string) — Path to write artifacts (e.g., `.converge/artifacts/due-diligence/company-site`)

**Outputs:**
- `{{artifactsRoot}}/site-data.json` — Structured company data
- `{{artifactsRoot}}/screenshots/` — Screenshot evidence

## Procedure

### 1. Homepage Recon

```bash
agent-browser --session dd-company-site open {{website}}
agent-browser --session dd-company-site wait --load networkidle
agent-browser --session dd-company-site screenshot "{{artifactsRoot}}/screenshots/homepage.png" --full
agent-browser --session dd-company-site snapshot -i
```

From the homepage snapshot, identify:
- Navigation links (About, Products, Pricing, Careers, Blog, Contact)
- Hero headline and subheadline
- Customer logos / testimonials
- Primary CTA

### 2. Discover Key Pages

For each nav section found, navigate and snapshot:

**About page:**
```bash
agent-browser --session dd-company-site click @eN  # "About" link
agent-browser --session dd-company-site wait --load networkidle
agent-browser --session dd-company-site screenshot "{{artifactsRoot}}/screenshots/about.png" --full
agent-browser --session dd-company-site snapshot -i
```

Extract:
- Founding year and story
- Mission statement
- Office locations / headquarters
- Number of employees (if stated)
- Leadership team names and titles

**Products/Solutions pages:**
Navigate to each product/solution section. For each:
- Product name and description
- Key features (bullet points)
- Pricing (if public)
- Target customer / use case
- Screenshot

**Careers/Jobs page:**
- Number of open positions (growth signal)
- Departments hiring most
- Office locations hiring
- Any mention of remote work policy

**Blog / News / Press:**
- Most recent 5-10 posts (titles + dates)
- Categories/topics covered
- Posting frequency (e.g., "2 posts per week" vs "last post 6 months ago")

**Contact page:**
- Physical addresses
- Support channels
- Sales contact info

### 3. Extract Claims

As you browse, note any quantitative claims made on the website:
- "X+ customers"
- "Y% of Fortune 500"
- "Z million users"
- Revenue claims
- Growth rate claims
- Industry leadership claims ("#1 in...", "leading provider of...")

These will be cross-referenced in Phase 3.

### 4. Build site-data.json

Compile all findings into structured JSON:

```json
{
  "company": "string",
  "website": "string",
  "crawlTimestamp": "ISO 8601",
  "homepage": {
    "headline": "string",
    "subheadline": "string",
    "primaryCTA": "string",
    "customerLogos": ["string"],
    "testimonials": ["string"]
  },
  "about": {
    "founded": "string (year or null)",
    "mission": "string",
    "headquarters": "string",
    "claimedEmployeeCount": "string or null",
    "locations": ["string"]
  },
  "leadership": [
    {
      "name": "string",
      "title": "string",
      "bio": "string (first 200 chars)",
      "photoUrl": "string or null"
    }
  ],
  "products": [
    {
      "name": "string",
      "description": "string",
      "keyFeatures": ["string"],
      "pricing": "string or null",
      "targetCustomer": "string or null",
      "screenshotPath": "string"
    }
  ],
  "careers": {
    "openPositions": "number or null",
    "topDepartments": ["string"],
    "hiringLocations": ["string"],
    "remotePolicy": "string or null"
  },
  "blog": {
    "recentPosts": [
      {"title": "string", "date": "string", "url": "string"}
    ],
    "postingFrequency": "string (assessment)"
  },
  "claims": [
    {
      "claim": "string",
      "source": "string (page URL)",
      "type": "customers|revenue|growth|market-position|other"
    }
  ],
  "screenshots": [
    {"page": "string", "path": "string"}
  ]
}
```

### 5. Close Session

```bash
agent-browser --session dd-company-site close
```

## Error Recovery

- If a page doesn't load within 30s, retry once, then skip and note in `site-data.json.notes`
- If navigation links can't be found, try direct URL paths: `{{website}}/about`, `{{website}}/products`, `{{website}}/careers`, `{{website}}/blog`, `{{website}}/contact`
- If the site is a SPA, wait for `networkidle` after each navigation
- If snapshot returns empty (JS-blocked), fall back to `get html` and extract text

## Safety

- Do NOT fill any forms
- Do NOT click "Sign Up", "Login", "Get Started", "Free Trial" buttons
- Do NOT submit contact forms or newsletter signups
- Read-only browsing only
