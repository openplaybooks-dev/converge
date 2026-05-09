---
id: generate-due-diligence-diagrams
title: Generate Due Diligence Diagrams (Excalidraw)
---

# Generate Due Diligence Visualization Diagrams

Diagrams are generated **deterministically** via Python scripts — no LLM pixel math needed.

## Execution

Run these scripts in order:

```bash
# Step 1: Fetch company logo/favicon for diagram embedding
python scripts/fetch_company_assets.py \
  --website {{website}} \
  --out {{artifactsRoot}}/assets/

# Step 2: Aggregate all Phase 1-3 data into a single consolidated JSON
python scripts/aggregate_data.py \
  --artifacts-root {{artifactsRoot}}

# Step 3: Generate all 9 Excalidraw diagrams from the consolidated data
python scripts/generate_diagrams.py \
  --artifacts-root {{artifactsRoot}}
```

If scripts are unavailable, fall back to manual generation using the `excalidraw` skill reference for the JSON schema, color palette, and element types.

## Contract

**Inputs:**
- `artifactsRoot` (string) — Path to all collected artifacts
- `website` (string) — Company website URL (for logo fetching)

**Outputs (all under `{{artifactsRoot}}/diagrams/`):**
- `01-company-overview.excalidraw` — Mind-map overview of the company
- `02-leadership-orgchart.excalidraw` — Leadership hierarchy
- `03-financial-health.excalidraw` — Financial metrics scorecard
- `04-employee-sentiment.excalidraw` — Glassdoor ratings visualization
- `05-news-sentiment.excalidraw` — News coverage radial map
- `06-legal-risk-matrix.excalidraw` — Legal items risk matrix
- `07-key-events-timeline.excalidraw` — Chronological event timeline
- `08-red-flags.excalidraw` — Prioritized red flags
- `09-master-aggregation.excalidraw` — Master aggregation dashboard combining all sections
- `manifest.json` — Index of generated diagrams with element counts

If scripts ran successfully, skip the manual sections below.

## Manual Fallback — Data Sources

Read these files before generating diagrams:
- `{{artifactsRoot}}/company-site/site-data.json`
- `{{artifactsRoot}}/sec-edgar/sec-data.json`
- `{{artifactsRoot}}/glassdoor/people-data.json`
- `{{artifactsRoot}}/news-search/news-data.json`
- `{{artifactsRoot}}/wayback/history-data.json`
- `{{artifactsRoot}}/risk-assessment.json`
- `{{artifactsRoot}}/deep-dive/executives/*.json`
- `{{artifactsRoot}}/deep-dive/legal/*.json`
- `{{artifactsRoot}}/deep-dive/risks/*.json`

## Global Style Constants

All diagrams use these constants:
- **Font**: fontFamily 2 (Helvetica), textAlign "center", verticalAlign "middle"
- **Canvas**: viewBackgroundColor "#ffffff" for all
- **Roughness**: 0 (smooth/architect) for corporate presentation quality
- **Stroke width**: 2 for shapes, 2 for arrows
- **Seed range**: 1000–9999, unique per element

## Color System (consistent across all diagrams)

```
INFO_BG     = "#a5d8ff"   INFO_STROKE     = "#1971c2"
SUCCESS_BG  = "#b2f2bb"   SUCCESS_STROKE  = "#2f9e44"
WARNING_BG  = "#ffec99"   WARNING_STROKE  = "#f08c00"
DANGER_BG   = "#ffc9c9"   DANGER_STROKE   = "#e03131"
PURPLE_BG   = "#d0bfff"   PURPLE_STROKE   = "#9c36b5"
NEUTRAL_BG  = "#e9ecef"   NEUTRAL_STROKE  = "#495057"
WHITE_BG    = "#ffffff"   DARK_STROKE     = "#1e1e1e"
```

Score colors:
- **8-10 (Good)**: SUCCESS_BG / SUCCESS_STROKE
- **5-7 (Adequate)**: WARNING_BG / WARNING_STROKE
- **1-4 (Poor/Critical)**: DANGER_BG / DANGER_STROKE

---

## Diagram 1: Company Overview Dashboard

**File**: `01-company-overview.excalidraw`
**Canvas**: 1400 × 1000
**Type**: Mind map / overview card layout

### Layout (top-to-bottom, center-aligned)

**Header bar** (y: 0-60, full width):
- Title text: "{{company}} — Company Overview" — fontSize 32, centered at x=700, y=20
- Subtitle: "Due Diligence Research Report" — fontSize 16, centered at x=700, y=50

**Company identity card** (center, y: 100-220):
- Large rounded rectangle: x=400, y=100, w=600, h=120, roundness type 3, INFO_BG, INFO_STROKE
- Text inside (containerId): "{{company}}" fontSize 28, centered
- Sub-text below: industry + headquarters + founded year, fontSize 16

**Four quadrant cards** (y: 260-520):

**Left column (x: 80-620):**
- Products card (x: 80, y: 260, w: 540, h: 130): SUCCESS_BG
  - Header "Products & Services" — fontSize 22
  - List each product name + 1-line description, fontSize 14
- People card (x: 80, y: 410, w: 540, h: 110): INFO_BG
  - Header "People & Culture" — fontSize 22
  - Employee count, Glassdoor rating, CEO approval, fontSize 14

**Right column (x: 700-1320):**
- Financial card (x: 700, y: 260, w: 620, h: 130): PURPLE_BG
  - Header "Financial Snapshot" — fontSize 22
  - Revenue, Net Income, Growth Rate, Employee Count, fontSize 14
  - If private company: "Private Company — Limited Financial Data"
- Risk card (x: 700, y: 410, w: 620, h: 110): WARNING_BG
  - Header "Key Risk Indicators" — fontSize 22
  - Top 3-5 risk categories with counts, fontSize 14

**Bottom strip — key metrics** (y: 560-660):
- 5 equal-width metric boxes in a row (each w=230, h=80):
  1. "Overall Score: X/10" — color by score range
  2. "Financial: X/10"
  3. "Leadership: X/10"  
  4. "Legal Risk: X/10"
  5. "Growth: X/10"
- Each: rounded rect with score color, number in fontSize 36, label in fontSize 14

**Footer** (y: 700):
- Report date, sources note, fontSize 12, NEUTRAL_STROKE

### Data Binding
- Products: `site-data.json → products[]`
- People: `people-data.json → ratings`, `site-data.json → about`
- Financial: `sec-data.json → latest10K` (or "Private Company" fallback)
- Risks: `sec-data.json → latest10K.riskFactors[]` grouped by category
- Metrics: `risk-assessment.json → overallRiskScore, financialHealth, leadershipStability, legalRisk, growthTrajectory`

---

## Diagram 2: Leadership Organization Chart

**File**: `02-leadership-orgchart.excalidraw`
**Canvas**: 1400 × (200 + N×100) where N = number of executives
**Type**: Hierarchical organization chart

### Layout (top-down tree)

**Title**: "{{company}} — Leadership & Organization" — fontSize 28, centered at x=700, y=20

**CEO box** (top center, x: 550, y: 60, w: 300, h: 80):
- Rounded rect, INFO_BG, INFO_STROKE
- Name fontSize 20, Title fontSize 14
- Tenure badge if known (small rect, WARNING_BG)

**Direct reports** (row below CEO, y: 200):
- Position exec boxes horizontally, 2-4 per row
- Each box: w=280, h=90, WHITE_BG, DARK_STROKE
- Name fontSize 18, Title fontSize 14
- If has red flags: small DANGER_BG indicator dot (ellipse w=15, h=15) in corner
- Spacing: 40px between boxes

**Arrows**: CEO box → each direct report. Solid, INFO_STROKE, endArrowhead "arrow".

**Second row** (if data available, y: 340):
- Additional leadership from site-data or SEC filings
- Smaller boxes: w=240, h=70

### Data Binding
- `site-data.json → leadership[]`
- `deep-dive/executives/*.json` for red flags per executive
- Sort by title hierarchy (CEO → C-suite → VP → Director)

---

## Diagram 3: Financial Health Scorecard

**File**: `03-financial-health.excalidraw`
**Canvas**: 1200 × 900
**Type**: Dashboard / scorecard

### Layout

**Title**: "Financial Health Analysis" — fontSize 28, x=600, y=20

**Revenue Section** (y: 70-220):
- Large info card (x: 60, y: 70, w: 500, h: 150): INFO_BG
  - "Revenue" fontSize 22
  - Revenue number in large fontSize 32
  - YoY growth with trend arrow (up=green, down=red)
- Revenue trend mini-chart (x: 600, y: 70, w: 540, h: 150): WHITE_BG, DARK_STROKE
  - Simple bar or line visualization using rectangles
  - Last 3-4 periods if data available

**Key Metrics Row** (y: 260-400):
Four metric cards in a row (each w=260, h=110):
1. "Net Income" — SUCCESS_BG or DANGER_BG based on profit/loss
2. "Total Assets" — INFO_BG
3. "Employees" — NEUTRAL_BG
4. "Revenue Growth" — color by positive/negative

**Risk Factors Section** (y: 430-700):
- Section header "Risk Factors (from 10-K)" fontSize 22, x=600, y=440
- Each risk factor as a horizontal bar (x: 60, w: 1080, h: 35):
  - Rounded rect with severity color: high=DANGER_BG, medium=WARNING_BG, low=NEUTRAL_BG
  - Risk heading text (fontSize 14, left-aligned), truncated to fit
  - Count of materialized events from deep-dive if any
- Show top 8-10 risks

**Material Events Section** (y: 730-850):
- "Recent Material Events (8-K)" fontSize 22
- Each 8-K as a compact card: date + item + summary, w=340, h=60
- Color: positive=SUCCESS_BG, negative=DANGER_BG, neutral=NEUTRAL_BG

### Data Binding
- `sec-data.json → latest10K`, `latest10Q`, `recent8Ks[]`
- `deep-dive/risks/*.json` for materialized events
- If private company: single large card "Private Company — Financial data not publicly available through SEC"

---

## Diagram 4: Employee Sentiment Scorecard

**File**: `04-employee-sentiment.excalidraw`
**Canvas**: 1200 × 850
**Type**: Dashboard with radial score indicators

### Layout

**Title**: "People & Culture — Employee Sentiment" — fontSize 28, x=600, y=20

**Overall Score Gauges** (y: 70-280, left-to-right):
Five gauge cards in a row (each w=200, h=180):
1. **Overall Rating**: Large circle (ellipse w=120, h=120) with score inside, colored by range
   - Score number fontSize 36 inside circle
   - "/5" fontSize 16 below number
   - Label "Overall Rating" fontSize 14 below
2. **Recommend to Friend**: Same gauge style, percentage inside
3. **CEO Approval**: Same gauge style
4. **Culture & Values**: Same gauge style  
5. **Work/Life Balance**: Same gauge style

**Sub-Ratings Row** (y: 310-400):
Five compact cards (each w=200, h=70):
- Compensation & Benefits
- Career Opportunities
- Senior Management
- Diversity & Inclusion (if available)
- Work/Life Balance (repeated for detail)

Each: WHITE_BG, DARK_STROKE, rating in fontSize 28, label in fontSize 12

**Review Themes** (y: 430-650, two columns):
- **Pros** (left, x: 60, w: 520):
  - Header "What Employees Like" fontSize 20, SUCCESS_STROKE
  - Each pro theme as a rounded rect (SUCCESS_BG), fontSize 14
  - Stack vertically, h=35 each
- **Cons** (right, x: 620, w: 520):
  - Header "What Employees Dislike" fontSize 20, DANGER_STROKE
  - Each con theme as a rounded rect (DANGER_BG), fontSize 14
  - Stack vertically

**Signals Bar** (y: 680-800):
- "Signals Detected" header fontSize 20
- Horizontal bars showing counts:
  - Layoff mentions (DANGER_BG), Restructuring (WARNING_BG), Management changes (WARNING_BG), Growth mentions (SUCCESS_BG)
- Each: label + count number + proportional width bar

**Trend Arrow** (top right, x: 1050, y: 70):
- Large arrow or indicator showing trend direction
- "IMPROVING" (green) / "STABLE" (yellow) / "DECLINING" (red)
- Based on review trend analysis

### Data Binding
- `people-data.json → ratings`, `reviewSummary`, `recentReviews[]`, `signals`

---

## Diagram 5: News Sentiment & Coverage Map

**File**: `05-news-sentiment.excalidraw`
**Canvas**: 1400 × 950
**Type**: Radial / mind-map style with category clusters

### Layout

**Title**: "News Coverage & Sentiment Analysis" — fontSize 28, x=700, y=20

**Center node** (x: 550, y: 120, w: 300, h: 100):
- Large rounded rect, INFO_BG, INFO_STROKE
- "{{company}}" fontSize 22
- "{{totalArticles}} articles analyzed" fontSize 14
- "Sentiment: {{positiveRatio}}% Positive" fontSize 14

**Category clusters** — 8 categories arranged in circle around center (radius ~280px):

Each category is a box (w=240, h=100) with:
- Category name fontSize 18
- Article count fontSize 24
- Sentiment ratio bar (stacked colored rects: green=positive, red=negative, gray=neutral)
- Positioned at 45° increments around center

Categories and their colors:
1. **Product** (top, 0°): INFO_BG — product launches, features, updates
2. **Partnership** (45°): SUCCESS_BG — new partnerships, alliances
3. **Funding** (90°): SUCCESS_BG — funding rounds, IPO, investment
4. **Earnings** (135°): PURPLE_BG — quarterly/annual reports
5. **Analyst** (180°): NEUTRAL_BG — analyst ratings, price targets
6. **Leadership** (225°): WARNING_BG — executive moves, board changes
7. **Lawsuit** (270°): DANGER_BG — legal actions, regulatory
8. **Layoff/Scandal** (315°): DANGER_BG — layoffs, controversies

**Connecting arrows**: Center → each category, solid lines, INFO_STROKE

**Bottom section — Key Headlines** (y: 680-900):
- "Notable Headlines" fontSize 20
- Top 8-10 articles as horizontal cards (each w=1280, h=45):
  - Date (w=100), Headline (w=800, truncated), Publication (w=200), Sentiment badge (w=80)
  - Background by sentiment: positive=SUCCESS_BG, negative=DANGER_BG, neutral=NEUTRAL_BG
  - FontSize 14

### Data Binding
- `news-data.json → articles[]`, `summary`

---

## Diagram 6: Legal & Compliance Risk Matrix

**File**: `06-legal-risk-matrix.excalidraw`
**Canvas**: 1400 × (400 + N×100)
**Type**: Risk matrix / heat map

### Layout

**Title**: "Legal & Compliance Risk Assessment" — fontSize 28, x=700, y=20

**Risk Matrix Grid** (y: 80, w: 1280):

Column headers (x: 60, y: 80, h: 40):
- "Legal Item" (w=400)
- "Materiality" (w=180)
- "Probability" (w=180)
- "Financial Impact" (w=250)
- "Status" (w=180)
- "Sources" (w=190)

Each legal item as a row (h=55):
- Item description text — fontSize 16, left-aligned
- Materiality cell: HIGH (DANGER_BG) / MEDIUM (WARNING_BG) / LOW (SUCCESS_BG)
- Probability cell: HIGH (DANGER_BG) / MEDIUM (WARNING_BG) / LOW (SUCCESS_BG)
- Financial impact: text, fontSize 14
- Status cell: ACTIVE (DANGER_BG) / SETTLED (SUCCESS_BG) / DISMISSED (NEUTRAL_BG) / PENDING (WARNING_BG)
- Sources cell: list of source abbreviations, fontSize 12

**Summary Cards** (below matrix, y adapts):
Three cards side by side (each w=400, h=80):
1. "Total Legal Items: N" — NEUTRAL_BG
2. "Active High-Risk Items: N" — DANGER_BG  
3. "Estimated Total Exposure: $X" — WARNING_BG

### Data Binding
- `sec-data.json → latest10K.legalProceedings[]`
- `news-data.json → articles[]` (filtered for lawsuit/legal category)
- `deep-dive/legal/*.json`

---

## Diagram 7: Key Events Timeline

**File**: `07-key-events-timeline.excalidraw`
**Canvas**: 1600 × 800
**Type**: Horizontal timeline

### Layout

**Title**: "Key Events & Milestones Timeline" — fontSize 28, x=800, y=20

**Timeline axis** (y: 350):
- Horizontal line across canvas (x: 60 to x: 1540), DARK_STROKE, strokeWidth 3
- Arrowhead at right end

**Event markers** positioned chronologically left-to-right along the axis:

Events pulled from multiple sources and sorted by date. Each event is a card positioned above or below the axis (alternating to avoid overlap):

Event card (w=200, h=110):
- Date fontSize 14, bold
- Event description fontSize 14
- Source badge (SEC/NEWS/WAYBACK/GLASSDOOR) fontSize 10, NEUTRAL_BG
- Color by sentiment:
  - Positive (SUCCESS_BG, placed above axis)
  - Negative (DANGER_BG, placed below axis)
  - Neutral (NEUTRAL_BG, placed above axis)

**Connector lines**: Each card → timeline axis, vertical dashed line, NEUTRAL_STROKE

**Time markers**: Year labels along the axis at regular intervals

**Clusters**: If multiple events in same month, group with a bracket and "N events" label

**Legend** (bottom right):
- Green card = Positive event
- Red card = Negative event
- Gray card = Neutral event
- Source badges explained

### Timeline Construction
1. Collect events from all sources:
   - `sec-data.json → recent8Ks[]`, `latest10K.legalProceedings[]`
   - `news-data.json → articles[]` (significant ones)
   - `wayback/history-data.json → milestones[]`
   - `people-data.json → signals` (layoffs, restructuring)
   - `risk-assessment.json → timeline[]`
2. Sort by date ascending
3. Select top 15-25 most significant events
4. Position proportionally along timeline axis

### Data Binding
- All data sources listed above

---

## Diagram 8: Red Flags Priority Map

**File**: `08-red-flags.excalidraw`
**Canvas**: 1200 × (200 + N×90)
**Type**: Prioritized risk register

### Layout

**Title**: "Red Flags & Risk Register" — fontSize 28, x=600, y=20

**Severity sections** (stacked vertically):

**CRITICAL** section (y: 70):
- Section bar (full width, h=40, DANGER_BG, DANGER_STROKE): "CRITICAL — Immediate Attention Required"
- For each critical flag:
  - Rounded rect (w=1100, h=65, DANGER_BG lighter opacity)
  - Description fontSize 16 (left-aligned)
  - Source badge (right side): which data file(s) found it
  - Corroboration indicator: "Confirmed by N sources" or "Single source — verify"
  - Recommended action in italics, fontSize 12

**HIGH** section (y adapts):
- Section bar (WARNING_BG darker): "HIGH — Significant Concern"
- Same card layout, WARNING_BG

**MEDIUM** section:
- Section bar (NEUTRAL_BG): "MEDIUM — Monitor Closely"
- Same card layout, NEUTRAL_BG

**LOW** section:
- Section bar (SUCCESS_BG): "LOW — Tracked Items"
- Same card layout, SUCCESS_BG

**Summary counter** (bottom right):
- "Total Red Flags: N | Critical: C | High: H | Medium: M | Low: L"

### Data Binding
- `risk-assessment.json → redFlags[]`

---

## Diagram 9: Master Aggregation Dashboard

**File**: `09-master-aggregation.excalidraw`
**Canvas**: 3200 × 2400
**Type**: Master aggregation — all key information from Diagrams 1-8 combined into one comprehensive view

This is the definitive diagram. It aggregates the most important data from every preceding diagram into a single, dense-but-readable canvas. Every section is a condensed version of its corresponding detailed diagram, selected to show only the highest-signal information.

### Layout Philosophy

- **8 framed sections** arranged in a 3-row, 3-column grid with header/footer bands
- Each section is a self-contained `frame` element with a title bar and border
- Information density prioritized — every pixel carries signal
- Consistent visual hierarchy: section title → key metric → supporting detail
- Color coding matches the source diagrams for cross-reference
- All elements within a section share a `groupIds` tag for logical grouping

### Global Layout Grid

Canvas: 3200 × 2400. Grid columns: left (x: 20-1080), center (x: 1100-2140), right (x: 2160-3180).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  HEADER BAND: Company Name | Overall Score /10 | Recommendation | Date       │
├────────────────────┬────────────────────┬────────────────────────────────────┤
│ A. COMPANY IDENTITY│ B. FINANCIAL       │ C. LEADERSHIP & ORGANIZATION       │
│ (w:1060, h:420)    │ SNAPSHOT           │ (w:1040, h:420)                    │
│                    │ (w:1040, h:420)    │                                    │
│  • Name, Industry  │                    │  • Mini org chart (5-8 execs)      │
│  • Founded, HQ     │  • Revenue (big)   │  • CEO → direct reports            │
│  • Size, Type      │  • Net Income      │  • Red flag dots on execs          │
│  • Products (list) │  • Growth %        │  • Avg tenure indicator            │
│  • Locations       │  • Employees       │  • Board members (if known)        │
│  • Key claims      │  • Top 3 risk      │                                    │
│                    │    factors (names)  │                                    │
├────────────────────┴────────────────────┴────────────────────────────────────┤
│ D. EMPLOYEE SENTIMENT (w:2100, h:340)                                         │
│                                                                                │
│  [Overall /5] [Recommend %] [CEO %] [Culture] [W/L Balance] [Comp] [Career]  │
│  Pros: theme1, theme2, theme3  │  Cons: theme1, theme2, theme3               │
│  Signals: Layoffs:N  Restructuring:N  Mgmt Changes:N  Growth:N               │
├────────────────────┬────────────────────┬────────────────────────────────────┤
│ E. NEWS SENTIMENT  │ F. LEGAL & RISK    │ G. RED FLAGS                       │
│ (w:1060, h:500)    │ MATRIX             │ (w:1040, h:500)                    │
│                    │ (w:1040, h:500)    │                                    │
│  • Total articles  │                    │  • CRITICAL (N items)              │
│  • Pos/Neu/Neg     │  • Legal items     │  • HIGH (N items)                  │
│    ratio as bars   │    grid (rows)     │  • MEDIUM (N items)                │
│  • Category        │  • Materiality     │  • LOW (N items)                   │
│    breakdown       │  • Probability     │  Each flag: desc + source + action │
│    (8 categories   │  • Financial       │                                    │
│     as mini cards) │    impact          │                                    │
│  • Top headlines   │  • Status          │                                    │
│    (5 most imp.)   │  • Total exposure  │                                    │
├────────────────────┴────────────────────┴────────────────────────────────────┤
│ H. KEY EVENTS TIMELINE (full width, h:380)                                    │
│                                                                                │
│  •───●───────●────────────●─────────●──────────●──────────●──────────●───▶    │
│  Date  Event1   Event2     Event3    Event4     Event5     Event6    Event7  │
│  (10-15 most significant events, color-coded by sentiment, with source badge) │
├────────────────────┬────────────────────┬────────────────────────────────────┤
│ I. SIX DIMENSION   │ J. DATA QUALITY &  │ K. VERDICT                         │
│ SCORECARD          │ SOURCES            │ (w:1040, h:280)                    │
│ (w:1060, h:280)    │ (w:1040, h:280)    │                                    │
│                    │                    │  • RECOMMENDATION (large)          │
│  Financial    ████ │  Company Site  ✓   │  • Overall score /10               │
│  Leadership   ███  │  SEC EDGAR     ✓   │  • 3 key strengths                 │
│  Employee Sat ██   │  Glassdoor     ✓   │  • 3 key concerns                  │
│  Legal Risk   ████ │  Google News   ✓   │  • Suggested next steps            │
│  Market Pos   ███  │  Wayback Mach  ✓   │                                    │
│  Growth       ████ │                    │                                    │
├────────────────────┴────────────────────┴────────────────────────────────────┤
│  FOOTER: Generated {{date}} | Sources: SEC EDGAR, Glassdoor, Google News,     │
│  Wayback Machine, Company Website | Converge Due Diligence Pipeline           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Section A: Company Identity (frame, x:20, y:100, w:1060, h:420)

**Frame**: "Company Profile" — DARK_STROKE border, WHITE_BG

**Title bar** (rect w=1060, h=36): "COMPANY PROFILE" — INFO_BG, fontSize 18, white text

**Identity card** (x:40, y:150, w=500, h=180):
- Company name fontSize 28, bold, DARK_STROKE
- Industry fontSize 16: "Industry: {{industry}}"
- Founded fontSize 16: "Founded: {{founded}}"
- Headquarters fontSize 16: "HQ: {{headquarters}}"
- Company type fontSize 16: "Type: {{public/private}}"
- Employee count fontSize 16: "Employees: {{count}}"

**Products list** (x:580, y:150, w=480, h=180):
- "Products & Services" fontSize 18, INFO_STROKE
- Each product as a compact row (h=28):
  - Product name fontSize 14, bold + brief description fontSize 12
  - Show top 5 products max

**Claims box** (x:40, y:350, w=1000, h=50):
- Rounded rect, WARNING_BG: "Claims Made: " followed by key claims from website
- Each claim as inline text, fontSize 12
- "Claims cross-referenced in Phase 3 analysis"

**Locations** (x:40, y:410, w=1000, h=0, text only):
- "Locations: {{location1}}, {{location2}}, ..." fontSize 12, NEUTRAL_STROKE

**Data source**: `site-data.json`

---

### Section B: Financial Snapshot (frame, x:1100, y:100, w:1040, h:420)

**Frame**: "Financial Snapshot" — DARK_STROKE border, WHITE_BG

**Title bar**: "FINANCIAL SNAPSHOT" — PURPLE_BG, fontSize 18

**Revenue — big number** (x:1120, y:150, w=480, h=100):
- "REVENUE" fontSize 16, NEUTRAL_STROKE
- Revenue number fontSize 42, bold, SUCCESS_STROKE
- Fiscal year label fontSize 14
- YoY growth as colored badge: "+X% YoY" (SUCCESS_BG if positive, DANGER_BG if negative)

**Net Income** (x:1640, y:150, w=480, h=100):
- "NET INCOME" fontSize 16, NEUTRAL_STROKE
- Net income number fontSize 42, bold
- Color: SUCCESS_STROKE if profitable, DANGER_STROKE if loss
- Margin percentage fontSize 14

**Key metrics row** (y:280, 4 boxes across, each w=240, h=80):
1. "Total Assets" — INFO_BG, fontSize 14 label, fontSize 24 value
2. "Employees" — NEUTRAL_BG, same format
3. "Revenue Growth" — SUCCESS_BG or DANGER_BG
4. "Fiscal Year" — NEUTRAL_BG, year label

**Top risk factors** (y:380):
- "Top Risk Factors (from 10-K)" fontSize 14, WARNING_STROKE
- 3 most severe risks, each as compact text line, fontSize 12
- Each prefixed with severity dot: 🔴 high, 🟡 medium

**Material events** (y:460):
- "Recent 8-K Events:" fontSize 14 + up to 3 events as compact text, fontSize 11

**If private company**: Replace all financial data with single centered card: "Private Company — Financial data not publicly available through SEC filings" + "Financial assessment based on publicly available information only"

**Data source**: `sec-data.json`

---

### Section C: Leadership & Organization (frame, x:2160, y:100, w:1040, h:420)

**Frame**: "Leadership & Organization" — DARK_STROKE border, WHITE_BG

**Title bar**: "LEADERSHIP" — INFO_BG, fontSize 18

**Mini org chart** (hierarchical, top-down within the frame):

CEO box (center top, x:2540, y:150, w=280, h=70):
- Rounded rect, INFO_BG, INFO_STROKE
- Name fontSize 18, Title fontSize 14
- Tenure badge: "since YYYY" fontSize 11

Direct reports (row below CEO, y:260):
- 2-3 boxes per row, each w=220, h=65
- WHITE_BG, DARK_STROKE
- Name fontSize 16, Title fontSize 12
- Red flag dot (ellipse w=12, h=12, DANGER_BG) if exec has flags
- Arrows from CEO to each direct report (solid, INFO_STROKE)

Second row (y:370, if more execs):
- Smaller boxes w=190, h=55, same format
- Arrows from relevant direct reports

**Board members** (if available, y:460):
- "Board Members:" fontSize 14 + names as inline text, fontSize 12

**Leadership signals** (bottom of frame, y:490):
- "Avg Executive Tenure: X years" fontSize 12
- "Executive Turnover (2yr): N departures" fontSize 12
- "CEO Approval: X%" fontSize 12

**Data sources**: `site-data.json → leadership[]`, `deep-dive/executives/*.json`, `people-data.json → ratings.ceoApproval`

---

### Section D: Employee Sentiment (frame, x:20, y:540, w:2100, h:340)

**Frame**: "Employee Sentiment" — DARK_STROKE border, WHITE_BG

**Title bar**: "EMPLOYEE SENTIMENT" — SUCCESS_BG, fontSize 18

**Rating gauges** (7 circular indicators in a row, y:600):

Each gauge: ellipse w=100, h=100, with score number inside fontSize 28, label below fontSize 12.

1. **Overall** (x:60): Rating /5, colored by range
2. **Recommend** (x:200): Percentage, colored by range  
3. **CEO** (x:340): Approval %, colored by range
4. **Culture** (x:480): Rating /5
5. **W/L Balance** (x:620): Rating /5
6. **Compensation** (x:760): Rating /5
7. **Career Opps** (x:900): Rating /5

Color each gauge by its score range (8-10=SUCCESS_BG, 5-7=WARNING_BG, 1-4=DANGER_BG for /5 ratings scale proportionally).

**Pros & Cons** (y:730, two columns):
- **Pros** (x:40, w=1000): "What Employees Value" fontSize 14, SUCCESS_STROKE
  - Top 3 pro themes as compact cards (w=320, h=30 each, SUCCESS_BG), fontSize 13
- **Cons** (x:1080, w=1000): "Areas of Concern" fontSize 14, DANGER_STROKE
  - Top 3 con themes as compact cards (w=320, h=30 each, DANGER_BG), fontSize 13

**Signals strip** (y:810):
- 4 compact indicators in a row, each w=250, h=40:
  - "Layoff mentions: N" (DANGER_BG if >0)
  - "Restructuring: N" (WARNING_BG if >0)
  - "Mgmt changes: N" (WARNING_BG if >0)
  - "Growth mentions: N" (SUCCESS_BG if >0)

**Data source**: `people-data.json`

---

### Section E: News Sentiment (frame, x:20, y:900, w:1060, h:500)

**Frame**: "News Coverage" — DARK_STROKE border, WHITE_BG

**Title bar**: "NEWS COVERAGE & SENTIMENT" — INFO_BG, fontSize 18

**Sentiment meter** (y:960):
- Three stacked horizontal bars showing proportion:
  - Positive: N articles (X%) — SUCCESS_BG bar, width proportional
  - Neutral: N articles (X%) — NEUTRAL_BG bar
  - Negative: N articles (X%) — DANGER_BG bar
- Total articles count on right

**Category breakdown** (y:1060):
- 8 category mini-cards in a 4×2 grid (each w=240, h=70):
  - Product, Partnership, Funding, Earnings
  - Analyst, Leadership, Lawsuit, Layoff/Scandal
- Each card: category name fontSize 14, count fontSize 22, sentiment mini-bar (3 colored rects showing ratio)

**Top headlines** (y:1240):
- "Notable Headlines" fontSize 14
- 5 most significant headlines, each as a compact row (h=28):
  - Date (w=90), Headline (truncated, w=700), Sentiment badge (w=70), fontSize 12
  - Row background by sentiment: positive=SUCCESS_BG light, negative=DANGER_BG light

**Data source**: `news-data.json`

---

### Section F: Legal & Risk Matrix (frame, x:1100, y:900, w:1040, h:500)

**Frame**: "Legal & Compliance" — DARK_STROKE border, WHITE_BG

**Title bar**: "LEGAL & COMPLIANCE RISK" — PURPLE_BG, fontSize 18

**Risk matrix grid** (y:960):

Column headers (h=32, fontSize 13, bold):
- "Item" (w=380)
- "Materiality" (w=150)
- "Probability" (w=150)
- "Status" (w=150)
- "Impact" (w=190)

Rows (h=48 each):
- Item description fontSize 13, left-aligned
- Materiality badge: HIGH (DANGER_BG rect w=120 h=28), MEDIUM (WARNING_BG), LOW (SUCCESS_BG)
- Probability badge: same format
- Status badge: ACTIVE (DANGER_BG), SETTLED (SUCCESS_BG), PENDING (WARNING_BG), DISMISSED (NEUTRAL_BG)
- Financial impact text fontSize 12

Show top 6-8 items. If no legal items, show: "No material legal proceedings identified" in NEUTRAL_BG card.

**Summary row** (below grid):
- "Total Items: N | Active High-Risk: N | Est. Exposure: $X"
- Compact info card, w=1000, h=36, WARNING_BG

**Data sources**: `sec-data.json → latest10K.legalProceedings[]`, `deep-dive/legal/*.json`, `news-data.json` (lawsuit articles)

---

### Section G: Red Flags (frame, x:2160, y:900, w:1040, h:500)

**Frame**: "Red Flags" — DARK_STROKE border, WHITE_BG

**Title bar**: "RED FLAGS & RISK REGISTER" — DANGER_BG, fontSize 18

**Severity-grouped list** (y:960):

**CRITICAL** (if any):
- Section label: "CRITICAL" — DANGER_BG rect w=120 h=28, fontSize 14
- Each critical flag as a card (w=1000, h=50):
  - Description fontSize 13 (left), Source badge fontSize 11 (right, NEUTRAL_BG)
  - Background: DANGER_BG at 30% opacity

**HIGH**:
- Section label: "HIGH" — WARNING_BG rect w=120 h=28, fontSize 14
- Same card format, WARNING_BG

**MEDIUM**:
- Section label: "MEDIUM" — NEUTRAL_BG rect w=120 h=28
- Compact rows (h=28 each), fontSize 12

**LOW**:
- Section label: "LOW" — SUCCESS_BG rect w=120 h=28
- Inline text list, fontSize 11

Show up to 15 flags total across all severities. If none in a category, omit that section.

**Counter** (bottom of section):
- "Total: N | Critical: C | High: H | Medium: M | Low: L" fontSize 12

**Data source**: `risk-assessment.json → redFlags[]`

---

### Section H: Key Events Timeline (frame, x:20, y:1420, w:3160, h:380)

**Frame**: "Key Events Timeline" — DARK_STROKE border, WHITE_BG

**Title bar**: "KEY EVENTS TIMELINE" — NEUTRAL_BG, fontSize 18

**Timeline axis** (y:1560):
- Horizontal line x:60 to x:3140, DARK_STROKE, strokeWidth 2
- Arrowhead at right end

**Event markers** (10-15 events, positioned chronologically):
- Each event: rounded rect w=180, h=60
- Date fontSize 11 (bold), Event description fontSize 11
- Source badge fontSize 9: SEC / NEWS / WAYBACK / GLASSDOOR
- Above axis: positive/neutral events (SUCCESS_BG / NEUTRAL_BG)
- Below axis: negative events (DANGER_BG)
- Dashed connector line from card to axis, NEUTRAL_STROKE

**Year labels**: At regular intervals along axis, fontSize 12, NEUTRAL_STROKE

**Legend** (x:2800, y:1460):
- 3 small rects: "▲ Positive" (SUCCESS_BG), "▼ Negative" (DANGER_BG), "─ Neutral" (NEUTRAL_BG)

**Data sources**: `risk-assessment.json → timeline[]`, `news-data.json → articles[]`, `sec-data.json → recent8Ks[]`, `wayback/history-data.json → milestones[]`

---

### Section I: Six Dimension Scorecard (frame, x:20, y:1820, w:1060, h:280)

**Frame**: "Risk Scorecard" — DARK_STROKE border, WHITE_BG

**Title bar**: "SIX DIMENSION RISK SCORECARD" — WARNING_BG, fontSize 18

**6 dimension bars** (y:1880, stacked vertically, each h=38):

Each dimension row:
- Label fontSize 14 (w=180, left-aligned)
- Score bar: 10 rects in a row (each w=24, h=22), filled=colored by score range, empty=NEUTRAL_BG
- Score number fontSize 22 (right-aligned)
- 1-line verdict fontSize 11

1. **Financial Health**: score from `risk-assessment.json.financialHealth`
2. **Leadership Stability**: score from `risk-assessment.json.leadershipStability`
3. **Employee Satisfaction**: score from `risk-assessment.json.employeeSatisfaction`
4. **Legal & Compliance Risk**: score from `risk-assessment.json.legalRisk` (10 = no risk)
5. **Market Position**: score from `risk-assessment.json.marketPosition`
6. **Growth Trajectory**: score from `risk-assessment.json.growthTrajectory`

**Data source**: `risk-assessment.json`

---

### Section J: Data Quality & Sources (frame, x:1100, y:1820, w:1040, h:280)

**Frame**: "Data Sources" — DARK_STROKE border, WHITE_BG

**Title bar**: "DATA QUALITY & SOURCES" — NEUTRAL_BG, fontSize 18

**Source indicators** (y:1880):
5 source cards in a column (each w=1000, h=40):
1. "Company Website" — SUCCESS_BG: "✓ Crawled {{N}} pages, {{M}} screenshots"
2. "SEC EDGAR" — SUCCESS_BG or NEUTRAL_BG (if private): "✓ 10-K, 10-Q, {{N}} 8-Ks" or "N/A — Private Company"
3. "Glassdoor" — SUCCESS_BG or WARNING_BG (if limited): "✓ {{N}} reviews, {{M}} salary ranges" or "⚠ Limited — sign-in wall"
4. "Google News" — SUCCESS_BG: "✓ {{N}} articles, {{M}} categorized"
5. "Wayback Machine" — SUCCESS_BG or NEUTRAL_BG: "✓ {{N}} snapshots since {{firstDate}}" or "Limited — {{N}} snapshots"

**Coverage note** (y:2090):
- "Data completeness: {{X}}/5 sources with substantial data"
- "Assessment confidence: {{HIGH/MEDIUM/LOW}} based on data availability"
- "All data sourced from publicly available information as of {{date}}"

---

### Section K: Verdict (frame, x:2160, y:1820, w:1040, h:280)

**Frame**: "Verdict" — DARK_STROKE border, WHITE_BG

**Title bar**: "VERDICT & RECOMMENDATION" — (colored by recommendation: PROCEED=SUCCESS_BG, CAUTION=WARNING_BG, WARNING=DANGER_BG), fontSize 18

**Overall score** (center of section, y:1900):
- Large rounded rect w=400 h=120, centered, colored by score range
- "OVERALL SCORE" fontSize 16
- Score fontSize 72, bold
- "/10" fontSize 28

**Recommendation word** (y:2060):
- "RECOMMENDATION: **PROCEED** / **CAUTION** / **WARNING**" fontSize 28, bold
- Color matches recommendation level

**Key strengths** (y:1950, left side x:2180):
- "Key Strengths" fontSize 14, SUCCESS_STROKE
- 3 bullet points, fontSize 12

**Key concerns** (y:1950, right side x:2700):
- "Key Concerns" fontSize 14, DANGER_STROKE  
- 3 bullet points, fontSize 12

**Next steps** (y:2080):
- "Suggested Next Steps:" fontSize 13 + 2-3 action items, fontSize 11

---

### Header Band (full width, y:0, x:0, w:3200, h:80)

- Dark rect background (#1a1a2e) spanning full canvas width
- Company name fontSize 32, white text, x=40, y=15
- Separator diamond or dot
- "Due Diligence Report" fontSize 18, lighter text
- Overall score badge (right side, x=2800): rounded rect with score color, "Score: X/10" fontSize 24
- Recommendation badge (x=3000): PROCEED/CAUTION/WARNING in appropriate color
- Date line fontSize 12 below title

### Footer Band (full width, y:2120, x:0, w:3200, h:60)

- Thin line separator (DARK_STROKE, full width)
- "Generated {{date}} | Sources: SEC EDGAR, Glassdoor, Google News, Wayback Machine, Company Website | Converge Due Diligence Pipeline | Open at excalidraw.com to explore, edit, and export"
- fontSize 11, NEUTRAL_STROKE, centered
- Left side: "Diagram 9/9 — Master Aggregation" fontSize 10
- Right side: Page indicator

### Implementation Notes

1. **Canvas origin**: All coordinates in this spec are relative to a 3200×2200 canvas (plus 80px header + 60px footer). The actual `.excalidraw` canvas height should be ~2200 (the footer y is adjusted to fit after Section K).

2. **Frame borders**: Each section is wrapped in a `frame` element. Child elements set `frameId`. This allows sections to be visually distinct.

3. **Data-driven sizing**: If certain sections have no data (e.g., no SEC data for private company, no legal items), expand adjacent sections to fill the space rather than leaving empty frames.

4. **Unique seeds**: With ~200-400 elements in this diagram, assign seeds from 1000 upward, incrementing by 1. Track the counter mentally.

5. **Group IDs**: Use descriptive groupIds per section: `"sect-a-identity"`, `"sect-b-financial"`, `"sect-c-leadership"`, etc.

6. **Text truncation**: Long text fields (product descriptions, risk factor names, headlines) must be truncated to fit their allocated width. Use fontSize 11-12 for dense text areas.

7. **Color consistency**: Use the exact hex colors from the global style constants. Score-based coloring must match across all sections.

### Data Binding Summary

| Section | Primary Data Source | Fallback if Missing |
|---------|-------------------|-------------------|
| A. Identity | `site-data.json` | "Data unavailable" |
| B. Financial | `sec-data.json` | "Private company — limited data" |
| C. Leadership | `site-data.json`, `deep-dive/executives/` | Show only known execs |
| D. Sentiment | `people-data.json` | "Glassdoor data limited" |
| E. News | `news-data.json` | "No news data collected" |
| F. Legal | `sec-data.json`, `deep-dive/legal/` | "No legal items identified" |
| G. Red Flags | `risk-assessment.json` | "No red flags identified" |
| H. Timeline | `risk-assessment.json`, all sources | Show available events |
| I. Scorecard | `risk-assessment.json` | "Scores pending Phase 3" |
| J. Quality | All Phase 1 output existence checks | Mark missing as "N/A" |
| K. Verdict | `risk-assessment.json` | "Assessment incomplete" |

---

## Generation Order

Generate diagrams in order 1-9. Each diagram is a standalone `.excalidraw` file. After all diagrams are generated, produce a `diagrams/manifest.json`:

```json
{
  "generatedAt": "ISO 8601",
  "diagrams": [
    {"id": "01-company-overview", "file": "01-company-overview.excalidraw", "title": "Company Overview Dashboard"},
    {"id": "02-leadership-orgchart", "file": "02-leadership-orgchart.excalidraw", "title": "Leadership Organization Chart"},
    {"id": "03-financial-health", "file": "03-financial-health.excalidraw", "title": "Financial Health Scorecard"},
    {"id": "04-employee-sentiment", "file": "04-employee-sentiment.excalidraw", "title": "Employee Sentiment Scorecard"},
    {"id": "05-news-sentiment", "file": "05-news-sentiment.excalidraw", "title": "News Sentiment & Coverage Map"},
    {"id": "06-legal-risk-matrix", "file": "06-legal-risk-matrix.excalidraw", "title": "Legal & Compliance Risk Matrix"},
    {"id": "07-key-events-timeline", "file": "07-key-events-timeline.excalidraw", "title": "Key Events Timeline"},
    {"id": "08-red-flags", "file": "08-red-flags.excalidraw", "title": "Red Flags Priority Map"},
    {"id": "09-master-aggregation", "file": "09-master-aggregation.excalidraw", "title": "Master Aggregation Dashboard"}
  ]
}
```

## Quality Bar

- Every element has a unique `seed` (sequential from 1000)
- All shapes use semantic color conventions consistently
- All text uses fontFamily 2 (Helvetica) for professional look
- All arrows properly bind to their connected shapes
- Complex sections use `groupIds` for logical grouping
- Canvas sizes are generous enough to avoid crowding
- Spacing: minimum 20px between elements, 40px between sections
