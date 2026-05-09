---
id: browser-background-check
title: Browser Background Check — Executive Research
---

# Browser Background Check

Research an individual executive or leader via Google News and public sources. Extract career history, past companies, board positions, and any notable events or controversies.

## Contract

**Inputs:**
- `executiveName` (string) — Full name of the person
- `currentCompany` (string) — Current company name
- `currentTitle` (string) — Current title at company
- `artifactsRoot` (string) — Path to write artifacts

**Outputs:**
- `{{artifactsRoot}}/executives/{{name-slug}}.json` — Executive profile data
- `{{artifactsRoot}}/screenshots/executives/{{name-slug}}.png` — Evidence screenshot

## Procedure

### 1. Search for the Executive

```bash
agent-browser --session dd-exec open https://www.google.com/search?q="{{executiveName}}+{{currentCompany}}+experience"
agent-browser --session dd-exec wait --load networkidle
agent-browser --session dd-exec snapshot -i
```

### 2. Extract Profile Information

From search results and any LinkedIn/public profiles found:

- Current role and tenure
- Previous roles (company, title, duration)
- Education (schools, degrees)
- Board positions (current and past)
- Notable achievements or awards
- Published articles or speaking engagements

### 3. Check for Red Flags

Run additional targeted searches:

```bash
agent-browser --session dd-exec open https://www.google.com/search?q="{{executiveName}}+controversy+lawsuit"
agent-browser --session dd-exec wait --load networkidle
agent-browser --session dd-exec snapshot -i
```

Note any:
- Negative news articles
- Lawsuits involving the executive
- Controversial statements or actions
- Sudden departures from previous roles
- SEC/regulatory actions

### 4. Output

```json
{
  "name": "string",
  "currentCompany": "string",
  "currentTitle": "string",
  "tenure": "string or null",
  "previousRoles": [
    {
      "company": "string",
      "title": "string",
      "duration": "string"
    }
  ],
  "education": [
    {"school": "string", "degree": "string", "year": "string or null"}
  ],
  "boardPositions": ["string"],
  "notableAchievements": ["string"],
  "redFlags": [
    {
      "description": "string",
      "source": "string",
      "severity": "high|medium|low"
    }
  ],
  "screenshotPath": "string"
}
```

```bash
agent-browser --session dd-exec close
```
