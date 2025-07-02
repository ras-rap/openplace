import requests
import cairosvg
from PIL import Image
import numpy as np
import io
import time

# === CONFIGURATION ===

API_BASE_URL = "https://openplace.ras-rap.click/"
CANVAS_ID = "HDvd9YO09aWQ"
USER_ID = "FlagBot"

# Rectangle corners (top-left and bottom-right)
X1, Y1 = 101, 201
X2, Y2 = 300, 400

# SVG flag URL (from https://flagicons.lipis.dev/)
SVG_URL = "https://flagicons.lipis.dev/flags/1x1/us.svg"  # Germany by default

BORDER = True
BORDER_COLOR = "#000000"
SLEEP_BETWEEN_PIXELS = 0.001  # seconds, set to 0 for fastest

# If True, map all colors to the closest in this palette
USE_PALETTE = False
DEFAULT_COLORS = [
    "#FFFFFF", "#E4E4E4", "#888888", "#222222", "#FFA7D1", "#E50000",
    "#E59500", "#A06A42", "#E5D900", "#94E044", "#02BE01", "#00D3DD",
    "#0083C7", "#0000EA", "#CF6EE4", "#820080",
]

# === END CONFIGURATION ===

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_hex(rgb):
    return "#{:02X}{:02X}{:02X}".format(*rgb)

def closest_palette_color(hex_color, palette):
    r1, g1, b1 = hex_to_rgb(hex_color)
    min_dist = float("inf")
    closest = palette[0]
    for p in palette:
        r2, g2, b2 = hex_to_rgb(p)
        dist = (r1 - r2)**2 + (g1 - g2)**2 + (b1 - b2)**2
        if dist < min_dist:
            min_dist = dist
            closest = p
    return closest

def svg_url_to_pixel_array(svg_url, width, height, palette=None):
    print(f"Downloading SVG from {svg_url} ...")
    svg_data = requests.get(svg_url).content
    print(f"Rendering SVG to {width}x{height} PNG ...")
    png_bytes = cairosvg.svg2png(bytestring=svg_data, output_width=width, output_height=height)
    if png_bytes is None:
        raise ValueError("Failed to convert SVG to PNG bytes.")
    image = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    arr = np.array(image)
    pixel_array = []
    for y in range(height):
        row = []
        for x in range(width):
            r, g, b, a = arr[y, x]
            if a < 128:
                color = "#FFFFFF"
            else:
                color = rgb_to_hex((r, g, b))
            if palette is not None:
                color = closest_palette_color(color, palette)
            row.append(color)
        pixel_array.append(row)
    return pixel_array

def place_pixel(x, y, color):
    url = f"{API_BASE_URL}/api/canvas/{CANVAS_ID}/place"
    payload = {
        "x": x,
        "y": y,
        "color": color,
        "userId": USER_ID,
    }
    try:
        r = requests.post(url, json=payload)
        if r.status_code == 200:
            return True
        else:
            print(f"Failed to place pixel at ({x},{y}): {r.text}")
            return False
    except Exception as e:
        print(f"Error placing pixel at ({x},{y}): {e}")
        return False

def draw_flag_from_pixels(flag_pixels, x1, y1, x2, y2, border=True):
    x_min, x_max = min(x1, x2), max(x1, x2)
    y_min, y_max = min(y1, y2), max(y1, y2)
    width = x_max - x_min + 1
    height = y_max - y_min + 1

    # Scale flag_pixels to fit the rectangle if needed
    flag_np = np.array(flag_pixels)
    orig_h, orig_w = flag_np.shape[:2]
    if (orig_w, orig_h) != (width, height):
        # Nearest neighbor scaling
        y_idx = (np.linspace(0, orig_h - 1, height)).astype(int)
        x_idx = (np.linspace(0, orig_w - 1, width)).astype(int)
        flag_np = flag_np[y_idx][:, x_idx]

    for dy, y in enumerate(range(y_min, y_max + 1)):
        for dx, x in enumerate(range(x_min, x_max + 1)):
            # Border logic
            if border and (
                x == x_min or x == x_max or y == y_min or y == y_max
            ):
                pixel_color = BORDER_COLOR
            else:
                pixel_color = flag_np[dy][dx]
            place_pixel(x, y, pixel_color)
            if SLEEP_BETWEEN_PIXELS > 0:
                time.sleep(SLEEP_BETWEEN_PIXELS)
        print(f"Finished row y={y}")
    print("🏁 Flag placed!")

if __name__ == "__main__":
    x_min, x_max = min(X1, X2), max(X1, X2)
    y_min, y_max = min(Y1, Y2), max(Y1, Y2)
    width = x_max - x_min + 1
    height = y_max - y_min + 1

    palette = DEFAULT_COLORS if USE_PALETTE else None
    flag_pixels = svg_url_to_pixel_array(SVG_URL, width, height, palette=palette)
    draw_flag_from_pixels(flag_pixels, X1, Y1, X2, Y2, border=BORDER)