#!/usr/bin/env bash
set -euo pipefail

ROOT="/workspace/docs/marketing/comercial-plataforma/export"
FRAMES="$ROOT/frames"
WORK="$ROOT/work"
OUT="$ROOT/comercial-plataforma-35s.mp4"
ART="/opt/cursor/artifacts/comercial-plataforma"
mkdir -p "$WORK" "$ART"

scale() {
  local src="$1" dest="$2"
  ffmpeg -y -i "$src" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x1A1A1A,setsar=1,format=yuv420p" "$dest" </dev/null
}

scale "$FRAMES/veo-escena-1-caos.png" "$WORK/s1.png"
scale "$FRAMES/veo-escena-2-click.png" "$WORK/s2.png"
scale "$FRAMES/frame-home.png" "$WORK/u1.png"
scale "$FRAMES/frame-roles.png" "$WORK/u2.png"
scale "$FRAMES/frame-pos.png" "$WORK/u3.png"
scale "$FRAMES/veo-escena-4-alivio.png" "$WORK/s4.png"
scale "$FRAMES/frame-cierre.png" "$WORK/s5.png"

# Soft zoom clips
make_clip() {
  local img="$1" dur="$2" dest="$3" zspeed="$4"
  ffmpeg -y -loop 1 -i "$img" -t "$dur" -vf "zoompan=z='min(1.08,1+${zspeed}*on)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$((dur*25)):s=1920x1080:fps=25,format=yuv420p" -r 25 -pix_fmt yuv420p -an "$dest" </dev/null
}

make_clip "$WORK/s1.png" 5 "$WORK/c1.mp4" 0.0008
make_clip "$WORK/s2.png" 5 "$WORK/c2.mp4" 0.0006
make_clip "$WORK/u1.png" 3 "$WORK/c3.mp4" 0.0004
make_clip "$WORK/u2.png" 4 "$WORK/c4.mp4" 0.0003
make_clip "$WORK/u3.png" 5 "$WORK/c5.mp4" 0.0004
make_clip "$WORK/s4.png" 8 "$WORK/c6.mp4" 0.0005
make_clip "$WORK/s5.png" 5 "$WORK/c7.mp4" 0.0003

cat > "$WORK/list.txt" <<EOF
file '$WORK/c1.mp4'
file '$WORK/c2.mp4'
file '$WORK/c3.mp4'
file '$WORK/c4.mp4'
file '$WORK/c5.mp4'
file '$WORK/c6.mp4'
file '$WORK/c7.mp4'
EOF

ffmpeg -y -f concat -safe 0 -i "$WORK/list.txt" -c copy "$WORK/video-silent.mp4" </dev/null

# Subtitles (VO lines)
cat > "$WORK/subs.srt" <<'EOF'
1
00:00:00,000 --> 00:00:05,000
Cuando el mostrador se satura… el negocio se frena.
Stock en un lado, pedidos en otro, la caja por separado.

2
00:00:05,000 --> 00:00:12,000
Ahora todo vive en un solo lugar:
inventario, ventas, compras y contabilidad.

3
00:00:12,000 --> 00:00:18,000
Una interfaz hecha a tu medida:
cada usuario ve lo que necesita.

4
00:00:18,000 --> 00:00:28,000
Tan simple que tu equipo lo adopta el mismo día.
Buscás, armás el ticket… y cobrás.

5
00:00:28,000 --> 00:00:35,000
Menos caos. Más control.
Todo tu negocio, en un solo lugar.
EOF

# Mix VO + burn subs (Montserrat local or DejaVu fallback)
FONTDIR="$ROOT"
ffmpeg -y -i "$WORK/video-silent.mp4" -i "$ROOT/vo-final.mp3" \
  -vf "subtitles=$WORK/subs.srt:fontsdir=${FONTDIR}:force_style='FontName=Montserrat SemiBold,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=48,Alignment=2'" \
  -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 192k \
  -shortest -movflags +faststart "$OUT" </dev/null

cp "$OUT" "$ART/comercial-plataforma-35s.mp4"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "$OUT"
ls -lh "$OUT" "$ART/comercial-plataforma-35s.mp4"
echo BUILD_OK
