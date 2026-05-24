# User Journeys — Portfolio Page

## Journey 1: First-Time Portfolio Screening

**User**: Rebecca (The Screening Client)
**Goal**: Assess whether the designer's style fits her firm's brand within 60 seconds

### Steps

1. **Lands on portfolio via Google search or shared link**
   - Desktop browser, work hours
   - Expects fast load and professional first impression

2. **Scans hero section for name, tagline, and positioning**
   - 5 seconds to form initial impression
   - If tagline is unclear or site looks dated, bounces immediately

3. **Browses work showcase grid**
   - Thumbnail quality must be high (no pixelation or slow load)
   - Titles/labels help understand each piece's context
   - No case study pages needed — grid view sufficient for initial screening

4. **Checks for recency indicators**
   - Date or timeline on work samples
   - If cannot determine recency, assumes work may be outdated

5. **Scans for contact information**
   - Visible email or contact section
   - Does not want to hunt through navigation

6. **Decides whether to explore further or move to next designer**
   - If style fits and impression is positive, continues browsing About section
   - If not, closes tab within 60 seconds

---

## Journey 2: Returning Visitor Intent to Contact

**User**: Marcus (The Returning Inquirer)
**Goal**: Find contact information and reach out directly via email

### Steps

1. **Returns to portfolio via bookmark or email thread**
   - Mobile browser (iPhone), low tech proficiency
   - Already decided this designer is a candidate

2. **Navigates directly to contact section**
   - Expects visible, human-readable email address
   - No forms or complex interfaces

3. **Evaluates designer availability**
   - Looks for "available for work" or similar signal
   - Does not want to fill out a form to ask

4. **Reads About/Process section for confidence**
   - Wants to feel assured this is a real, trustworthy professional
   - Personality matters — dry or corporate tone is a turn-off

5. **Copies email address and sends direct inquiry**
   - If email is visible: sends email immediately
   - If email requires digging or form is required: moves to next designer

---

## Journey 3: Mobile Discovery On Commute

**User**: Rebecca (Screening Client)
**Goal**: Quick quality assessment during downtime (10-minute commute)

### Steps

1. **Opens portfolio link on mobile browser**
   - iPhone, spotty WiFi
   - Expects fast load and clean mobile layout

2. **Hero section renders above fold**
   - Name and tagline immediately visible
   - Work grid accessible without horizontal scroll

3. **Scrolls through work samples**
   - Taps to enlarge thumbnails
   - Minimal zoom pinch required

4. **Locates contact section without hunting**
   - Contact info visible or one-tap away
   - Can copy email without leaving the page

5. **Decides whether to bookmark for later or dismiss**
   - If positive impression, bookmarks to share with team later
   - If not, dismisses and continues commute

---

## Journey 4: Team Collaborative Review

**User**: Rebecca (Screening Client) sharing with team
**Goal**: Share portfolio with team members for second opinion before reaching out

### Steps

1. **Finds portfolio that passes initial screening**
   - Desktop browser, fuller evaluation mode
   - Plans to share with team before making recommendation

2. **Browses full portfolio for depth assessment**
   - Reviews work grid, About section, and any process content
   - Evaluates whether work quality is consistent

3. **Shares link via email or Slack to team**
   - Simple copy-paste of URL
   - No login or gate required for team to view

4. **Team reviews independently**
   - Each team member forms their own impression
   - Shares feedback via email or in-person discussion

5. **Collaborative decision: proceed or pass**
   - If team consensus is positive, Rebecca initiates contact
   - If team flags concerns, moves to next designer candidate

---

## Journey 5: First Impression Bounce

**User**: Rebecca or Marcus
**Goal**: N/A — rapid negative assessment and exit

### Triggers (causes bounce)

- Slow load (>3 seconds on fast connection)
- Layout looks templated or dated
- Cannot find work samples or contact info within 15 seconds
- Mobile layout requires horizontal scroll or pinch-zoom
- Image quality is low or thumbnails are broken

### Exit Behavior

- Closes tab immediately
- Does not revisit
- May leave negative impression with shared link recipients

---

## Key Friction Points Summary

| Journey | Primary Friction | Mitigation |
|---|---|---|
| Screening (Rebecca) | Cannot assess recency of work | Add dates/timeline to work grid |
| Returning (Marcus) | Contact forms feel impersonal | Show visible email address |
| Mobile (Rebecca) | Slow load or poor layout | Static file, responsive CSS |
| Team Review | Sharing requires copy-paste | No gate, simple URL |
| Bounce | Template feel, dated design | Custom CSS, editorial layout |