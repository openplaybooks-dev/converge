#!/usr/bin/env python3
"""
Create green screen template images for chroma key sprite generation.
"""

from PIL import Image
from pathlib import Path

def create_green_template(width: int, height: int, output_path: Path):
    """Create a solid green (#00FF00) template image."""
    img = Image.new('RGB', (width, height), color=(0, 255, 0))
    img.save(output_path)
    print(f"Created green template: {output_path} ({width}x{height})")

if __name__ == "__main__":
    project_root = Path(__file__).parent.parent
    templates_dir = project_root / ".templates"
    templates_dir.mkdir(parents=True, exist_ok=True)

    # Create templates for different resolutions
    create_green_template(128, 128, templates_dir / "green_128x128.png")
    create_green_template(256, 256, templates_dir / "green_256x256.png")
    create_green_template(512, 512, templates_dir / "green_512x512.png")

    print("\nGreen screen templates created successfully!")
