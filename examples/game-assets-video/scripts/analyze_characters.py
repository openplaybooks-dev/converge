#!/usr/bin/env python3
"""
analyze_characters.py — Analyze characters and identify classes, groups, and shared attributes.

Reads sprites.json and generates character analysis with:
- Character classes/archetypes
- Shared visual attributes
- Design patterns
- Shared references needed

Usage:
  python scripts/analyze_characters.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from lib.sprite import find_project_root


def analyze_character_class(sprite: dict) -> str:
    """Determine character class based on description and attributes."""
    description = sprite.get("description", "").lower()
    name = sprite.get("name", "").lower()
    
    # Simple keyword-based classification
    if any(word in description for word in ["knight", "warrior", "armor", "sword", "shield"]):
        return "warrior"
    elif any(word in description for word in ["mage", "wizard", "magic", "staff", "spell"]):
        return "mage"
    elif any(word in description for word in ["elf", "archer", "ranger", "bow", "arrow"]):
        return "ranger"
    elif any(word in description for word in ["rogue", "thief", "assassin", "dagger"]):
        return "rogue"
    else:
        return "other"


def extract_shared_attributes(sprite: dict, char_class: str) -> dict:
    """Extract shared attributes for a character class."""
    attributes = {}
    
    if char_class == "warrior":
        attributes = {
            "armor_type": "heavy",
            "weapon_style": "melee",
            "color_theme": "metallic",
            "movement_style": "strong"
        }
    elif char_class == "mage":
        attributes = {
            "armor_type": "robes",
            "weapon_style": "staff",
            "color_theme": "magical",
            "movement_style": "flowing"
        }
    elif char_class == "ranger":
        attributes = {
            "armor_type": "light",
            "weapon_style": "ranged",
            "color_theme": "natural",
            "movement_style": "agile"
        }
    elif char_class == "rogue":
        attributes = {
            "armor_type": "light",
            "weapon_style": "dual_wield",
            "color_theme": "dark",
            "movement_style": "quick"
        }
    
    return attributes


def main() -> int:
    project_root = find_project_root(Path.cwd())

    # Load sprites.json
    sprites_file = project_root / "assets" / "sprites.json"
    if not sprites_file.exists():
        print(f"Error: {sprites_file} not found", file=sys.stderr)
        return 1

    sprites_data = json.loads(sprites_file.read_text(encoding="utf-8"))

    if not sprites_data:
        print("Error: sprites.json is empty", file=sys.stderr)
        return 1

    # Analyze characters
    classes = {}
    
    for sprite in sprites_data:
        char_id = sprite["id"]
        char_class = analyze_character_class(sprite)
        
        if char_class not in classes:
            classes[char_class] = {
                "characters": [],
                "shared_attributes": extract_shared_attributes(sprite, char_class)
            }
        
        classes[char_class]["characters"].append(char_id)

    # Generate shared references
    shared_references = []
    
    for class_name, class_data in classes.items():
        shared_references.append({
            "type": "class_style_guide",
            "class": class_name,
            "description": f"{class_name.capitalize()} class visual style guide"
        })

    # Build analysis
    analysis = {
        "classes": classes,
        "shared_references": shared_references,
        "summary": {
            "total_characters": len(sprites_data),
            "total_classes": len(classes),
            "total_shared_references": len(shared_references)
        }
    }

    # Write analysis
    output_path = project_root / ".converge" / "character-analysis.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(analysis, indent=2), encoding="utf-8")

    print(f"Character Analysis Complete")
    print(f"=" * 60)
    print(f"Total Characters:        {analysis['summary']['total_characters']}")
    print(f"Total Classes:           {analysis['summary']['total_classes']}")
    print(f"Shared References:       {analysis['summary']['total_shared_references']}")
    print(f"=" * 60)
    print(f"\nClasses Identified:")
    for class_name, class_data in classes.items():
        print(f"\n  {class_name.upper()}:")
        print(f"    Characters: {', '.join(class_data['characters'])}")
        print(f"    Attributes: {class_data['shared_attributes']}")
    
    print(f"\nAnalysis saved to: {output_path.relative_to(project_root)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
