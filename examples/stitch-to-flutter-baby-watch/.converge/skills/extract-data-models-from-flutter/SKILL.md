# Extract Data Models from Flutter Skill

Analyze Flutter widget files to extract all data entities, fields, and relationships.

## Purpose

Screen widgets contain hardcoded data, inline type definitions, and implicit data structures. This skill extracts them into a formal data model specification.

## Procedure

1. **Scan all screen files** — Read every `.dart` file in `lib/screens/` and `lib/widgets/`
2. **Identify data entities** — Look for:
   - Hardcoded `List` or `Map` constants
   - Inline class/typedef definitions
   - Widget props that represent domain data
   - Text content that represents entity fields
3. **Cross-reference with UX.md** — Check `.stitch/UX.md` for additional entities mentioned in data context
4. **Cross-reference with HTML designs** — Check `.stitch/system/*.html` for data patterns
5. **Generate specification** — Write `data-models.md`

## data-models.md Format

```markdown
# Data Models

## Entity: Novel
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| title | String | yes | Novel title |
| author | String | yes | Author name |
| coverUrl | String? | no | Cover image URL |
| synopsis | String | yes | Book description |
| genres | List<String> | yes | Genre tags |
| rating | double | yes | Average rating (0-5) |
| chapterCount | int | yes | Total chapters |
| status | NovelStatus | yes | ongoing / completed / hiatus |

## Entity: Chapter
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| novelId | String | yes | Parent novel ID |
| title | String | yes | Chapter title |
| number | int | yes | Chapter number |
| content | String | yes | Chapter text content |
| wordCount | int | yes | Word count |
| publishedAt | DateTime | yes | Publication date |

## Enums

### NovelStatus
- ongoing
- completed
- hiatus

## Relationships
- Novel has many Chapters (1:N via novelId)
- User has many LibraryEntries (1:N via userId)
- LibraryEntry references one Novel (N:1 via novelId)

## Mock Data Requirements
- 8-12 novels with varied genres and statuses
- 5-15 chapters per novel
- 3-5 genres
- Realistic titles and author names
```

## Rules

- Every field must have a Dart type
- Use `?` suffix for optional fields
- Use enums for constrained string values
- Document all entity relationships
- Specify mock data quantity per entity
