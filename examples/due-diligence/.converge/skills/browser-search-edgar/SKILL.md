---
id: browser-search-edgar
title: Browser Search — SEC EDGAR
---

# Browser Search SEC EDGAR

Search the SEC EDGAR database for a public company's filings using agent-browser. Extract key financial metrics, risk factors, legal proceedings, and material events from 10-K, 10-Q, and 8-K filings.

## Contract

**Inputs:**
- `ticker` (string) — Stock ticker symbol (e.g., `PATH`)
- `company` (string) — Company name (fallback if ticker not found)
- `artifactsRoot` (string) — Path to write artifacts

**Outputs:**
- `{{artifactsRoot}}/sec-data.json` — Structured SEC filing data
- `{{artifactsRoot}}/screenshots/` — Screenshot evidence of key filing sections

## Procedure

### 1. Navigate to EDGAR Company Search

```bash
agent-browser --session dd-sec-edgar open https://www.sec.gov/edgar/searchedgar/companysearch
agent-browser --session dd-sec-edgar wait --load networkidle
agent-browser --session dd-sec-edgar snapshot -i
```

### 2. Search for Company

Find the company search input, fill with ticker, and submit:

```bash
agent-browser --session dd-sec-edgar find placeholder "Company name" fill "{{ticker}}"
# OR use snapshot ref:
agent-browser --session dd-sec-edgar fill @eN "{{ticker}}"
agent-browser --session dd-sec-edgar find text "Search" click
agent-browser --session dd-sec-edgar wait --load networkidle
agent-browser --session dd-sec-edgar snapshot -i
```

If ticker search fails, try the company name.

### 3. Find Latest Filings

From the search results, navigate to the company's filing list. Look for the most recent:
- **10-K** (annual report) — most recent 1-2
- **10-Q** (quarterly report) — most recent 1-2
- **8-K** (current report / material events) — most recent 3-5

For each filing, click through to the filing detail page, then open the actual document.

### 4. Extract from 10-K

Navigate to the most recent 10-K. Use the document viewer or open the full text.

**Key sections to find and extract:**

```bash
# Navigate within the filing - use the table of contents or scroll
agent-browser --session dd-sec-edgar snapshot -i
agent-browser --session dd-sec-edgar find text "Risk Factors" click
# or scroll to find relevant sections
```

Extract from 10-K:

**Business Overview (Item 1):**
- Business description
- Revenue segments
- Customer base description
- Competition mention
- Geographic presence

**Risk Factors (Item 1A):**
- List ALL risk factor headings
- For each: 1-sentence summary
- Flag risks that seem especially severe

**Financial Data (Item 8):**
- Total revenue (most recent fiscal year)
- Net income / loss
- Total assets
- Number of employees
- Revenue growth rate (year over year)

**Legal Proceedings (Item 3):**
- Any active material legal proceedings
- Summary of each

**Management Discussion (Item 7):**
- Key business trends mentioned
- Growth strategy
- Challenges acknowledged

Take screenshots of:
- Financial statement summary page
- Risk factors first page
- Any legal proceedings section

### 5. Extract from 10-Q

Navigate to the most recent 10-Q. Extract:
- Quarter revenue
- Quarter net income
- Material changes from last 10-K
- New risk factors (if any)
- Updated guidance or outlook

### 6. Extract from 8-Ks

For each recent 8-K (last 3-5), extract:
- Filing date
- Item number (e.g., Item 5.02 = director/officer changes)
- Summary of what happened
- Significance (positive/negative/neutral for the company)

### 7. Build sec-data.json

```json
{
  "company": "string",
  "ticker": "string",
  "cik": "string",
  "fetchTimestamp": "ISO 8601",
  "latest10K": {
    "filingDate": "string",
    "fiscalYear": "number",
    "revenue": "string",
    "netIncome": "string",
    "totalAssets": "string",
    "employeeCount": "string or null",
    "revenueGrowth": "string or null",
    "businessDescription": "string",
    "revenueSegments": ["string"],
    "competitors": ["string"],
    "geographicPresence": ["string"],
    "riskFactors": [
      {
        "heading": "string",
        "summary": "string",
        "severity": "high|medium|low"
      }
    ],
    "legalProceedings": [
      {
        "description": "string",
        "status": "string"
      }
    ],
    "managementDiscussion": {
      "keyTrends": ["string"],
      "growthStrategy": "string",
      "challengesAcknowledged": ["string"]
    }
  },
  "latest10Q": {
    "filingDate": "string",
    "quarterRevenue": "string",
    "quarterNetIncome": "string",
    "materialChanges": ["string"],
    "newRiskFactors": ["string"],
    "outlook": "string or null"
  },
  "recent8Ks": [
    {
      "filingDate": "string",
      "itemNumber": "string",
      "summary": "string",
      "significance": "positive|negative|neutral"
    }
  ],
  "screenshots": [
    {"section": "string", "path": "string"}
  ],
  "notes": "string (if any sections were unavailable)"
}
```

### 8. Handle Private Companies

If no ticker is provided or EDGAR search returns no results:
- Write `sec-data.json` with `"publicCompany": false` and a note
- The task still succeeds (the check should handle this case)

```bash
agent-browser --session dd-sec-edgar close
```

## Error Recovery

- SEC.gov has rate limits — if blocked, wait 30s and retry
- EDGAR document viewer can be slow — use `wait --load networkidle` and generous timeouts
- If interactive document viewer is too complex, try the direct text URL: `https://www.sec.gov/cgi-bin/viewer?action=view&cik=CIK&accession_number=ACCESSION&xbrl_type=v`
- If a section isn't found in the document, note it as `null` rather than failing
