---
id: browser-extract-glassdoor
title: Browser Extract — Glassdoor Company Overview
---

# Browser Extract Glassdoor

Extract company overview data from Glassdoor's public pages (no login required). Gather employee reviews, ratings, salary ranges, and cultural signals.

## Contract

**Inputs:**
- `company` (string) — Company name to search
- `artifactsRoot` (string) — Path to write artifacts

**Outputs:**
- `{{artifactsRoot}}/people-data.json` — Structured employee/company data
- `{{artifactsRoot}}/screenshots/` — Screenshot evidence

## Procedure

### 1. Navigate to Glassdoor

```bash
agent-browser --session dd-glassdoor open https://www.glassdoor.com
agent-browser --session dd-glassdoor wait --load networkidle
agent-browser --session dd-glassdoor snapshot -i
```

### 2. Search for the Company

```bash
# Find the search input and fill company name
agent-browser --session dd-glassdoor find placeholder "Company" fill "{{company}}"
# Click search
agent-browser --session dd-glassdoor find text "Search" click
# OR press Enter
agent-browser --session dd-glassdoor key Enter

agent-browser --session dd-glassdoor wait --load networkidle
agent-browser --session dd-glassdoor snapshot -i
```

### 3. Select the Company from Results

From the search results, find the company and click through to its overview page:

```bash
agent-browser --session dd-glassdoor find text "{{company}}" click
agent-browser --session dd-glassdoor wait --load networkidle
agent-browser --session dd-glassdoor screenshot "{{artifactsRoot}}/screenshots/glassdoor-overview.png" --full
agent-browser --session dd-glassdoor snapshot -i
```

### 4. Extract Company Overview

From the overview page, extract:

**Basic Info:**
- Company name (as listed on Glassdoor)
- Industry
- Company size (e.g., "1001-5000 employees", "10000+ employees")
- Founded year
- Headquarters location
- Type (Public / Private)
- Website URL

**Ratings:**
- Overall rating (out of 5)
- Recommend to a friend (%)
- CEO approval (%)
- Culture & Values rating
- Work/Life Balance rating
- Compensation & Benefits rating
- Career Opportunities rating
- Senior Management rating

**Review Summary:**
- Number of reviews
- Pros (top 3-5 themes)
- Cons (top 3-5 themes)
- Recent review count trend (increasing, decreasing, stable)

Screenshot the overview section and ratings.

### 5. Extract Salary Data

Navigate to the "Salaries" tab:

```bash
agent-browser --session dd-glassdoor find text "Salaries" click
agent-browser --session dd-glassdoor wait --load networkidle
agent-browser --session dd-glassdoor snapshot -i
```

Extract salary ranges for key roles:
- Software Engineer (if tech company)
- Product Manager
- Sales
- Marketing
- Any executive-level roles visible

For each role, capture:
- Role title
- Average base salary
- Salary range (low-high)
- Number of salaries reported

Screenshot the salaries page.

### 6. Extract Review Trends

Navigate to the "Reviews" tab. Scan the most recent reviews (10-20):

For each review:
- Date
- Rating (1-5)
- Role of reviewer
- Summary (first 100 chars of review text)
- Pro/Con themes

Look for patterns:
- Are reviews improving or declining recently?
- Common complaints
- Common praise
- Any mention of layoffs, restructuring, management changes

### 7. Build people-data.json

```json
{
  "company": "string",
  "glassdoorUrl": "string",
  "fetchTimestamp": "ISO 8601",
  "overview": {
    "industry": "string",
    "size": "string",
    "founded": "string",
    "headquarters": "string",
    "type": "public|private",
    "website": "string"
  },
  "ratings": {
    "overall": "number (1-5)",
    "recommendToFriend": "string (percentage)",
    "ceoApproval": "string (percentage)",
    "cultureAndValues": "number",
    "workLifeBalance": "number",
    "compensationAndBenefits": "number",
    "careerOpportunities": "number",
    "seniorManagement": "number"
  },
  "reviewSummary": {
    "totalReviews": "number",
    "pros": ["string (theme)"],
    "cons": ["string (theme)"],
    "trendDirection": "improving|stable|declining"
  },
  "salaries": [
    {
      "role": "string",
      "averageBase": "string",
      "rangeLow": "string",
      "rangeHigh": "string",
      "sampleSize": "number"
    }
  ],
  "recentReviews": [
    {
      "date": "string",
      "rating": "number",
      "role": "string",
      "summary": "string",
      "pro": "string",
      "con": "string"
    }
  ],
  "signals": {
    "layoffMentions": "number",
    "restructuringMentions": "number",
    "managementChangeMentions": "number",
    "hiringFreezeMentions": "number",
    "growthMentions": "number"
  },
  "screenshots": [
    {"section": "string", "path": "string"}
  ]
}
```

### 8. Handle Glassdoor Restrictions

Glassdoor may show a sign-in wall or limit content. If blocked:
- Extract whatever is visible without login
- Screenshot what's available
- Note in `people-data.json.notes` what was inaccessible
- The task should still succeed with partial data

```bash
agent-browser --session dd-glassdoor close
```

## Error Recovery

- Glassdoor frequently shows sign-in prompts — try the "X" or "Not now" to dismiss
- If search results don't show the right company, try the direct URL pattern: `https://www.glassdoor.com/Overview/Working-at-COMPANY-NAME-EI_IEXXXXX.htm`
- If salary tab requires login, skip and note
- If reviews are behind login wall, extract what's visible from the overview page only
