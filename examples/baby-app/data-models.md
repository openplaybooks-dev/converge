# Data Models

## Entity: PregnancyProfile
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| dueDate | DateTime | yes | Estimated due date |
| lastMenstrualPeriod | DateTime | yes | Date of last menstrual period (used to calculate due date) |
| currentWeek | int | yes | Current pregnancy week (calculated from LMP) |
| currentTrimester | int | yes | Current trimester 1-3 (calculated from currentWeek) |
| userName | String | yes | Display name shown in greeting header |
| height | double | yes | User height for BMI calculation |
| units | WeightUnit | yes | Preferred weight unit (kg or lbs) |
| avatarInitial | String | yes | First letter of userName, displayed in avatar circle |

## Entity: WeightEntry
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| date | DateTime | yes | Date of weight measurement |
| value | double | yes | Weight value in user's preferred unit |
| notes | String? | no | Optional notes about the entry |

## Entity: CycleEntry
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| startDate | DateTime | yes | Cycle start date |
| endDate | DateTime? | no | Cycle end date (null if ongoing) |
| isIrregular | bool | yes | Whether this cycle was flagged as irregular |
| notes | String? | no | Optional notes or annotations |

## Entity: MoodEntry
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| date | DateTime | yes | Date of mood log |
| moodLevel | int | yes | Mood rating 1-5 (displayed as "4/5" on home stat card) |
| energyLevel | int | yes | Energy level 1-5 |
| notes | String? | no | Optional notes about mood |

## Entity: SymptomEntry
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| date | DateTime | yes | Date symptom was logged |
| type | SymptomType | yes | Category of symptom |
| severity | int | yes | Severity level 1-3 (color-coded in UI) |
| notes | String? | no | Optional description |

## Entity: DoctorVisit
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| date | DateTime | yes | Visit date |
| doctorName | String? | no | Name of doctor |
| summary | String | yes | Visit summary |
| notes | String? | no | Additional notes |

## Entity: Reminder
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| date | DateTime | yes | Reminder date |
| title | String | yes | Reminder title (e.g. "Next checkup") |
| isDone | bool | yes | Whether the reminder is completed |

## Entity: WeekContent
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| weekNumber | int | yes | Pregnancy week (1-42) |
| trimesterLabel | String | yes | e.g. "Second Trimester" |
| sizeComparison | String | yes | Fruit/vegetable analogy (e.g. "mango") |
| milestoneTitle | String? | no | Milestone celebration title (e.g. "Halfway there!") |
| milestoneDescription | String? | no | Milestone celebration body text |
| bodyChanges | List\<InfoItem\> | yes | Body changes for this week |
| babyDevelopment | List\<InfoItem\> | yes | Baby development milestones for this week |
| selfCareItems | List\<String\> | yes | Daily self-care checklist items |
| exerciseGuides | List\<String\> | yes | Safe exercises for current trimester |
| nutritionTips | List\<String\> | yes | Stage-appropriate nutrition tips |

## Entity: InfoItem
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | String | yes | Short heading (e.g. "Hearing develops") |
| description | String | yes | Explanatory text |

## Entity: SelfCareCheckState
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| weekNumber | int | yes | The pregnancy week this state belongs to |
| date | DateTime | yes | The date of the checklist |
| completedItems | List\<String\> | yes | List of completed checklist item labels |

## Entity: Article
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| title | String | yes | Article title |
| topic | ArticleTopic | yes | Topic category for filtering |
| body | String | yes | Rich text article content |
| illustrationUrl | String? | no | Hero image URL |
| readTime | String? | no | Estimated read time (e.g. "5 min") |
| isBookmarked | bool | yes | Whether user has bookmarked this article |
| relatedArticleIds | List\<String\> | yes | IDs of related articles shown at bottom |

## Entity: Exercise
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| name | String | yes | Exercise name |
| category | ExerciseCategory | yes | Type: breathing, stretching, or meditation |
| duration | Duration | yes | Estimated duration |
| steps | List\<String\> | yes | Step-by-step instructions |
| benefits | List\<String\> | yes | List of wellness benefits |
| difficulty | String? | no | Difficulty level label |
| illustrationUrl | String? | no | Exercise illustration |

## Entity: UserPreferences
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| dailyRemindersEnabled | bool | yes | Toggle for daily reminder notifications |
| checkupAlertsEnabled | bool | yes | Toggle for checkup alert notifications |
| selfCareNudgesEnabled | bool | yes | Toggle for self-care nudge notifications |
| reducedMotionEnabled | bool | yes | Toggle for reduced motion/animations |
| units | WeightUnit | yes | Preferred weight unit (kg/lbs) |

## Enums

### WeightUnit
- kg
- lbs

### SymptomType
- nausea
- fatigue
- headache
- backPain
- swelling
- cramping
- dizziness
- other

### ExerciseCategory
- breathing
- stretching
- meditation

### ArticleTopic
- nutrition
- bodyChanges
- maternalCare
- babyDevelopment

### AppMode
- pregnancy
- wellness

### MoodLevel
- 1 (very low)
- 2 (low)
- 3 (neutral)
- 4 (good)
- 5 (great)

## Relationships
- PregnancyProfile has many WeightEntries (1:N via implicit ownership)
- PregnancyProfile has many CycleEntries (1:N via implicit ownership)
- PregnancyProfile has many MoodEntries (1:N via implicit ownership)
- PregnancyProfile has many SymptomEntries (1:N via implicit ownership)
- PregnancyProfile has many DoctorVisits (1:N via implicit ownership)
- PregnancyProfile has many Reminders (1:N via implicit ownership)
- PregnancyProfile has one UserPreferences (1:1)
- WeekContent is standalone reference data keyed by weekNumber
- Article is standalone reference data (filterable by ArticleTopic)
- Exercise is standalone reference data (filterable by ExerciseCategory)
- Article references many Articles via relatedArticleIds (N:N self-referential)

## Screen to Entity Mapping
| Screen | Entities Consumed |
|--------|-------------------|
| Home | PregnancyProfile, WeightEntry (latest), MoodEntry (latest), Reminder (next), WeekContent (current week) |
| Cycle Tracking | CycleEntry, PregnancyProfile |
| Weight & Nutrition | WeightEntry, PregnancyProfile, WeekContent (nutrition tips) |
| Pregnancy Progress | PregnancyProfile, WeekContent, SelfCareCheckState |
| Mindfulness | Exercise, MoodEntry (today) |
| Exercise Detail | Exercise |
| Health Log | DoctorVisit, SymptomEntry, Reminder |
| Mood & Wellness | MoodEntry, PregnancyProfile |
| Education | Article |
| Article Reader | Article |
| Settings | PregnancyProfile, UserPreferences |

## Mock Data Requirements
- 1 PregnancyProfile (week 22, due date ~18 weeks out, name "Mira")
- 15-20 WeightEntries spanning weeks 15-22 (values ~56-59 kg, gradual increase)
- 3-5 CycleEntries (pre-pregnancy history)
- 10-14 MoodEntries spanning last 2 weeks (mood levels 2-5, energy levels 2-5)
- 5-8 SymptomEntries with varied types and severities
- 3-4 DoctorVisits with realistic summaries
- 4-6 Reminders (mix of done and pending, next checkup in 5 days)
- 42 WeekContent entries (one per pregnancy week, with size comparisons, body changes, baby development)
- 4 SelfCareCheckState items per day (prenatal vitamins, hydration, kegel exercises, gentle stretching)
- 10-15 Articles across all 4 topics
- 8-12 Exercises across all 3 categories (breathing, stretching, meditation)
- 1 UserPreferences with defaults (kg, all notifications on, reduced motion off)
