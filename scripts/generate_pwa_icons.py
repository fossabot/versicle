from PIL import Image, ImageDraw, ImageFont
import os

def generate_icon(size):
    # Create a white background image
    img = Image.new('RGB', (size, size), color=(255, 255, 255))
    d = ImageDraw.Draw(img)

    # Draw a big "V" in the center
    # Since we can't easily rely on system fonts being available/consistent,
    # we'll draw the V using polygons or lines.

    # Calculate coordinates for a "V"
    # Top-left, Bottom-center, Top-right
    # Padding of 20%
    padding = size * 0.2

    p1 = (padding, padding)
    p2 = (size / 2, size - padding)
    p3 = (size - padding, padding)

    # Draw the V with some thickness
    # We'll use a polygon to make it filled

    thickness = size * 0.1

    # Outer V
    outer_v = [
        (padding, padding),
        (size / 2, size - padding),
        (size - padding, padding)
    ]

    # Inner V points (calculated roughly to give thickness)
    # We can just draw thick lines using line() with width
    d.line([p1, p2], fill=(0, 0, 0), width=int(thickness))
    d.line([p2, p3], fill=(0, 0, 0), width=int(thickness))

    # Save the image
    filename = f"public/pwa-{size}x{size}.png"
    img.save(filename)
    print(f"Generated {filename}")

if __name__ == "__main__":
    if not os.path.exists("public"):
        os.makedirs("public")

    generate_icon(192)
    generate_icon(512)
