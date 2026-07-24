"""One-shot: extract flame isotipo from composed logo PNG."""
from pathlib import Path

from PIL import Image

src = Path(__file__).resolve().parents[1] / "public" / "servigas-logo.png"
img = Image.open(src).convert("RGBA")
w, h = img.size
pixels = img.load()

out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
op = out.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if r > 220 and g > 220 and b > 220:
            continue
        if r < 70 and g < 70 and b < 70:
            continue
        if (r > 120 and g > 40 and b < 180) or (r > 180 and g > 100):
            op[x, y] = (r, g, b, 255)

bbox = out.getbbox()
if not bbox:
    raise SystemExit("no flame pixels found")
cropped = out.crop(bbox)
side = max(cropped.size) + 16
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
ox = (side - cropped.size[0]) // 2
oy = (side - cropped.size[1]) // 2
canvas.paste(cropped, (ox, oy), cropped)

web = Path(__file__).resolve().parents[1] / "public" / "servigas-mark.png"
odoo = (
    Path(__file__).resolve().parents[2]
    / "custom_addons"
    / "servigas_core"
    / "static"
    / "src"
    / "img"
    / "servigas_mark.png"
)
canvas.save(web)
canvas.save(odoo)
print(f"saved {web} and {odoo} size={canvas.size} from bbox={bbox}")
