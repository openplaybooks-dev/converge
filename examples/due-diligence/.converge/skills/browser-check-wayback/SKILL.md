---
id: browser-check-wayback
title: Browser Check — Wayback Machine
---

# Browser Check Wayback Machine

Use the Internet Archive's Wayback Machine to research a company website's history. Track how positioning, products, and messaging changed over time. Identify when key pages first appeared.

## Contract

**Inputs:**
- `website` (string) — Company website URL
- `company` (string) — Company name
- `artifactsRoot` (string) — Path to write artifacts

**Outputs:**
- `{{artifactsRoot}}/history-data.json` — Historical website data
- `{{artifactsRoot}}/screenshots/` — Screenshot evidence

## Procedure

### 1. Navigate to Wayback Machine

```bash
agent-browser --session dd-wayback open https://web.archive.org
agent-browser --session dd-wayback wait --load networkidle
agent-browser --session dd-wayback snapshot -i
```

### 2. Search for the Company Website

```bash
agent-browser --session dd-wayback find placeholder "Enter a URL" fill "{{website}}"
agent-browser --session dd-wayback key Enter
agent-browser --session dd-wayback wait --load networkidle
agent-browser --session dd-wayback screenshot "{{artifactsRoot}}/screenshots/wayback-calendar.png" --full
agent-browser --session dd-wayback snapshot -i
```

### 3. Analyze the Calendar View

The Wayback Machine shows a calendar/timeline view of all snapshots. From this page, extract:

- **First snapshot date**: When was the website first archived?
- **Total snapshots**: How many snapshots exist?
- **Snapshot frequency trend**: Are there more snapshots recently or historically? (indicates website activity)
- **Major gaps**: Any long periods with no snapshots?

Screenshot the calendar view.

### 4. Check Key Historical Snapshots

Select snapshots from key time periods to compare. Navigate to the snapshot for each period:

**One year ago:**
```bash
# Click the year in the calendar bar, then a date with a snapshot
agent-browser --session dd-wayback click @eN  # specific date
agent-browser --session dd-wayback wait --load networkidle
agent-browser --session dd-wayback screenshot "{{artifactsRoot}}/screenshots/wayback-1year-ago.png" --full
```

From this snapshot, note:
- What did the homepage look like?
- What products were featured?
- How has the messaging/positioning changed?

**Two years ago:**
- Same analysis
- Screenshot

**Five years ago (if available):**
- Same analysis
- Screenshot

**First available snapshot:**
- What did the company look like at the beginning?
- Screenshot

### 5. Track Specific Page History

Check when key pages first appeared:

```bash
# For each key page, search the Wayback Machine
agent-browser --session dd-wayback find placeholder "Enter a URL" fill "{{website}}/pricing"
agent-browser --session dd-wayback key Enter
agent-browser --session dd-wayback wait --load networkidle
```

Check first appearance of:
- `/pricing` — when did they first publish pricing?
- `/careers` or `/jobs` — when did they start hiring publicly?
- `/blog` or `/news` — when did content marketing begin?
- `/about` — when did they first tell their story?
- Product-specific pages

For each, record:
- First snapshot date
- How the page content evolved

### 6. Identify Website Milestones

Look for significant website changes:
- **Major redesigns**: Complete visual overhauls
- **Domain changes**: Did the company rebrand/rename?
- **New product sections**: When did new products appear?
- **Pricing model changes**: Did pricing structure change?
- **Acquisition mentions**: "A [Company] company" or "Now part of [Company]"
- **International expansion**: New language versions, new regional sites

### 7. Build history-data.json

```json
{
  "company": "string",
  "website": "string",
  "fetchTimestamp": "ISO 8601",
  "archiveOverview": {
    "firstSnapshot": "string (date)",
    "totalSnapshots": "number",
    "snapshotFrequency": "increasing|stable|decreasing",
    "majorGaps": ["string (periods with no snapshots)"]
  },
  "historicalSnapshots": [
    {
      "date": "string",
      "label": "1-year-ago|2-years-ago|5-years-ago|first",
      "url": "string (archive URL)",
      "observations": "string",
      "screenshotPath": "string"
    }
  ],
  "pageHistory": [
    {
      "page": "string (URL path)",
      "firstSeen": "string (date or null)",
      "evolution": "string (how the page changed over time)"
    }
  ],
  "milestones": [
    {
      "date": "string (approximate)",
      "type": "redesign|new-product|pricing-change|rebrand|acquisition|international",
      "description": "string",
      "evidenceUrl": "string (archive URL)"
    }
  ],
  "screenshots": [
    {"period": "string", "path": "string"}
  ]
}
```

### 8. Cleanup

```bash
agent-browser --session dd-wayback close
```

## Error Recovery

- Wayback Machine can be slow — use `wait --load networkidle` with longer timeouts
- Some historical snapshots may fail to load (incomplete archives) — skip and note
- If the calendar view is overwhelming, focus on the most recent year + key milestone years
- If the website has few or no snapshots, document what's available and succeed with partial data
