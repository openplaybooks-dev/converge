# Task: 03-characters/01-analysis

# Character Analysis

Analyze all characters from sprites.json and generate design documents based on art style, breaking down structure, classes, groups, and shared attributes.

## Task

Run character analysis to identify:
- Character classes (e.g., warrior, mage, archer)
- Shared visual styles within classes
- Common attributes and groupings
- Design patterns across characters

```bash
python3 scripts/analyze_characters.py
```

## Output

Generates `.converge/character-analysis.json` containing:

**Character Classes:**
- Identified classes/archetypes
- Characters belonging to each class
- Shared visual attributes

**Design Patterns:**
- Common color palettes
- Shared animation states
- Style groupings

**Shared References Needed:**
- Cross-character assets (e.g., class-specific effects)
- Shared style guides
- Common elements

## Example Output

```json
{
  "classes": {
    "warrior": {
      "characters": ["hero-knight"],
      "shared_attributes": {
        "armor_type": "heavy",
        "weapon_style": "melee",
        "color_theme": "metallic"
      }
    },
    "mage": {
      "characters": ["shadow-mage"],
      "shared_attributes": {
        "armor_type": "robes",
        "weapon_style": "staff",
        "color_theme": "magical"
      }
    },
    "ranger": {
      "characters": ["forest-elf"],
      "shared_attributes": {
        "armor_type": "light",
        "weapon_style": "ranged",
        "color_theme": "natural"
      }
    }
  },
  "shared_references": [
    {
      "type": "class_style_guide",
      "class": "warrior",
      "description": "Heavy armor style guide with metallic materials"
    },
    {
      "type": "class_style_guide",
      "class": "mage",
      "description": "Flowing robes with magical effects"
    }
  ]
}
```

## Verification

- Analysis file exists
- All characters are classified
- Shared references identified
- Design patterns documented