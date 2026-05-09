---
id: browser-legal-check
title: Browser Legal Check — Court Records & Legal Research
---

# Browser Legal Check

Research legal items (lawsuits, regulatory actions, IP disputes) associated with a company. Search public court records, legal news, and regulatory databases.

## Contract

**Inputs:**
- `company` (string) — Company name
- `legalItem` (string) — Description of the legal issue to research
- `artifactsRoot` (string) — Path to write artifacts

**Outputs:**
- `{{artifactsRoot}}/legal/{{item-slug}}.json` — Legal research data
- `{{artifactsRoot}}/screenshots/legal/{{item-slug}}.png` — Evidence screenshot

## Procedure

### 1. Search Legal News

```bash
agent-browser --session dd-legal open https://www.google.com/search?q="{{company}}+{{legalItem}}+lawsuit+court"
agent-browser --session dd-legal wait --load networkidle
agent-browser --session dd-legal screenshot "{{artifactsRoot}}/screenshots/legal/{{item-slug}}.png" --full
agent-browser --session dd-legal snapshot -i
```

### 2. Check Regulatory Sources

Navigate to relevant regulatory sites if applicable:

**SEC Enforcement (if public company):**
```bash
agent-browser --session dd-legal open https://www.sec.gov/litigation
```

**FTC Legal:**
```bash
agent-browser --session dd-legal open https://www.ftc.gov/legal-library/browse/cases-proceedings
```

**DOJ Antitrust:**
```bash
agent-browser --session dd-legal open https://www.justice.gov/atr/antitrust-case-filings
```

### 3. Extract Key Information

For each legal item found:
- Case name and number (if available)
- Court / jurisdiction
- Filing date
- Plaintiffs and defendants
- Nature of the claim
- Current status (pending, settled, dismissed, judgment)
- Potential financial impact or penalties
- Precedent or industry significance

### 4. Assess Materiality

Evaluate:
- **Materiality**: Is this a material risk to the business? (high/medium/low)
- **Probability**: Likelihood of negative outcome? (high/medium/low)
- **Financial impact**: Estimated range if known
- **Reputational impact**: Degree of public attention

### 5. Output

```json
{
  "company": "string",
  "legalItem": "string",
  "researchDate": "ISO 8601",
  "findings": [
    {
      "caseName": "string or null",
      "caseNumber": "string or null",
      "court": "string or null",
      "filingDate": "string or null",
      "plaintiffs": ["string"],
      "defendants": ["string"],
      "nature": "string",
      "status": "pending|settled|dismissed|judgment|unknown",
      "potentialImpact": "string",
      "source": "string (URL)"
    }
  ],
  "assessment": {
    "materiality": "high|medium|low",
    "probabilityOfNegativeOutcome": "high|medium|low",
    "estimatedFinancialImpact": "string or null",
    "reputationalImpact": "string"
  },
  "screenshotPath": "string"
}
```

```bash
agent-browser --session dd-legal close
```
