#!/usr/bin/env python3
"""Generate PNG icons for Wolfgang PWA"""

from PIL import Image, ImageDraw, ImageFont
import sys

def create_icon(size, filename):
    """Create a simple icon with background color and emoji"""
    # Create image with dark blue background
    img = Image.new('RGB', (size, size), color='#2c3e50')
    draw = ImageDraw.Draw(img)

    # Try to add emoji text (may not render perfectly on all systems)
    try:
        # Use a large font size
        font_size = int(size * 0.6)
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()

    # Draw the emoji or letter
    text = "🍳"

    # Get text bounding box to center it
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) / 2
        y = (size - text_height) / 2
        draw.text((x, y), text, fill='white', font=font)
    except:
        # Fallback: just draw 'W' if emoji doesn't work
        text = 'W'
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) / 2
        y = (size - text_height) / 2
        draw.text((x, y), text, fill='white', font=font)

    # Save the image
    img.save(filename, 'PNG')
    print(f"Created {filename} ({size}x{size})")

if __name__ == '__main__':
    try:
        create_icon(192, 'icon-192.png')
        create_icon(512, 'icon-512.png')
        print("Icons generated successfully!")
    except Exception as e:
        print(f"Error generating icons: {e}")
        sys.exit(1)
