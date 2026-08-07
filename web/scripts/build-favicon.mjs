/**
 * Build Servigas favicon.ico + favicon.svg from servigas-mark.png.
 * Usage (from web/): node scripts/build-favicon.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");
const src = resolve(webRoot, "public", "servigas-mark.png");
const outIco = resolve(webRoot, "public", "favicon.ico");
const outSvg = resolve(webRoot, "public", "favicon.svg");

const py = `
from pathlib import Path
import base64, io
from PIL import Image

SRC = Path(r"${src.replace(/\\/g, "\\\\")}")
OUT_ICO = Path(r"${outIco.replace(/\\/g, "\\\\")}")
OUT_SVG = Path(r"${outSvg.replace(/\\/g, "\\\\")}")

img = Image.open(SRC).convert("RGBA")
pixels = img.load()
w, h = img.size
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if r < 28 and g < 28 and b < 28:
            pixels[x, y] = (r, g, b, 0)

bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)
    side = max(img.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - img.size[0]) // 2
    oy = (side - img.size[1]) // 2
    canvas.paste(img, (ox, oy), img)
    img = canvas

sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
img_256.save(OUT_ICO, format="ICO", sizes=sizes)
print(f"wrote {OUT_ICO} ({OUT_ICO.stat().st_size} bytes)")

png_buf = io.BytesIO()
img_256.save(png_buf, format="PNG")
b64 = base64.b64encode(png_buf.getvalue()).decode("ascii")
svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">\\n'
    f'  <image href="data:image/png;base64,{b64}" width="256" height="256"/>\\n'
    "</svg>"
)
OUT_SVG.write_text(svg, encoding="utf-8")
print(f"wrote {OUT_SVG} ({OUT_SVG.stat().st_size} bytes)")
`;

const result = spawnSync("python", ["-c", py], { encoding: "utf8" });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
