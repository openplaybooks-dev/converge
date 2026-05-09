---
id: 07-cross-reference
title: "Phase 3 — Cross-Reference & Risk Scoring"
outputs:
  - .converge/artifacts/due-diligence/risk-assessment.json
checks:
  - id: risk-assessment-exists
    cmd: test -f .converge/artifacts/due-diligence/risk-assessment.json
    description: risk-assessment.json written
  - id: risk-assessment-valid
    cmd: node .converge/checks/check-risk-assessment.js
    description: risk-assessment.json has all 6 scored dimensions (1-10) and red flags array
---

# Phase 3: Cross-Reference & Risk Scoring

Read all Phase 1 and Phase 2 outputs. Cross-reference claims, detect red flags, and produce a risk-scored assessment.

## Data Sources

Read all of these files:

```
.converge/artifacts/due-diligence/
├── company-site/site-data.json       # Website claims, leadership, products
├── sec-edgar/sec-data.json           # Financial data, risk factors, legal proceedings  
├── glassdoor/people-data.json        # Employee ratings, reviews, signals
├── news-search/news-data.json        # News coverage, sentiment
├── wayback/history-data.json         # Historical website evolution
└── deep-dive/
    ├── executives/*.json             # Per-executive background checks
    ├── products/*.json               # Product analysis (if spawned)
    ├── risks/*.json                  # Risk deep-dives (if spawned)
    └── legal/*.json                  # Legal research (if spawned)
```

## Analysis Tasks

### 1. Claims Verification
Compare claims made on the company website against other sources:
- "X+ customers" → check SEC filings for customer count
- "Industry leader" → check market position vs. competitors mentioned in 10-K
- "Best place to work" → check Glassdoor ratings

### 2. Employee Signal Correlation
- Do Glassdoor reviews align with news about layoffs/hiring?
- Does executive turnover in news match Glassdoor senior management ratings?
- Are salary ranges competitive? (compare Glassdoor salaries to industry averages)

### 3. Growth Signal Triangulation
- Job listings growth + website changes + news about expansion
- Revenue growth (SEC) vs. hiring growth (careers page + Glassdoor)
- Wayback: does website evolution show increasing sophistication?

### 4. Leadership Risk Assessment
- Executive turnover rate (from 8-Ks + news + Wayback bios)
- Negative news about executives
- Glassdoor CEO approval trend

### 5. Legal Risk Assessment
- Active lawsuits from SEC filings + news search
- Regulatory actions
- IP disputes
- Class actions

### 6. Timeline Construction
Build a chronological timeline of key events from all sources. Note clusters of negative events.

## Output: risk-assessment.json

```json
{
  "company": "string",
  "assessmentDate": "ISO 8601",
  "overallRiskScore": "number (1-10, 10 = lowest risk)",
  "financialHealth": "number (1-10)",
  "leadershipStability": "number (1-10)",
  "employeeSatisfaction": "number (1-10)",
  "legalRisk": "number (1-10, where 10 = no legal issues)",
  "marketPosition": "number (1-10)",
  "growthTrajectory": "number (1-10)",
  "redFlags": [
    {
      "description": "string",
      "severity": "critical|high|medium|low",
      "source": "string (which data file)",
      "corroboratedBy": ["string (other sources confirming)"],
      "recommendedAction": "string"
    }
  ],
  "claimsVerification": [
    {
      "claim": "string",
      "source": "string",
      "verified": "true|false|partial|unable",
      "evidence": "string"
    }
  ],
  "timeline": [
    {
      "date": "string",
      "event": "string",
      "source": "string",
      "sentiment": "positive|negative|neutral"
    }
  ],
  "recommendation": "PROCEED|CAUTION|WARNING"
}
```

## Scoring Guidelines

- **10**: Excellent — best in class, no concerns
- **8-9**: Strong — minor concerns, well above average
- **6-7**: Adequate — some concerns, at or near industry average
- **4-5**: Below average — significant concerns, requires investigation
- **2-3**: Poor — major concerns, high risk
- **1**: Critical — severe problems, extreme risk

Err toward lower scores when data is unavailable or uncertain.
