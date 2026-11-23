"""Stitch run.cjs output into one video: a 2x2 grid of the three clients'
views (A, B, C) plus a panel with the current step and the running check
list. Usage: python3 scripts/mp-e2e/make-video.py <outDir> [fps]
Writes <outDir>/mp-e2e.mp4 (needs ffmpeg on PATH; Pillow for compositing)."""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

out = sys.argv[1]
fps = sys.argv[2] if len(sys.argv) > 2 else '2'
caps = json.load(open(os.path.join(out, 'captions.json')))
report = json.load(open(os.path.join(out, 'report.json')))
names = {r['id']: r['name'] for r in report.get('results', [])}
CW, CH = 960, 540
comp_dir = os.path.join(out, 'comp')
os.makedirs(comp_dir, exist_ok=True)

def font(size):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()

big, mid, small = font(30), font(22), font(17)
last = {}
for i, c in enumerate(caps):
    img = Image.new('RGB', (CW * 2, CH * 2), (8, 10, 16))
    d = ImageDraw.Draw(img)
    for k, (name, (x, y)) in enumerate(zip('ABC', [(0, 0), (CW, 0), (0, CH)])):
        shot = c['shots'].get(name)
        if shot:
            last[name] = Image.open(os.path.join(out, 'frames', shot)).convert('RGB').resize((CW, CH))
        if name in last and (shot or name != 'C' or 'leaves' not in c['caption']):
            img.paste(last[name], (x, y))
        else:
            d.text((x + 380, y + 250), 'offline', fill=(90, 90, 90), font=big)
        d.rectangle([x, y, x + 150, y + 40], fill=(0, 0, 0))
        d.text((x + 10, y + 5), f'Client {name}', fill=(120, 220, 120), font=mid)
    # info panel
    x, y = CW, CH
    d.text((x + 20, y + 15), 'Tenebris multiplayer e2e', fill=(76, 175, 80), font=big)
    d.text((x + 20, y + 58), c['caption'], fill=(255, 255, 255), font=mid)
    yy = y + 100
    for cid, ok in c['checks']:
        d.text((x + 20, yy), ('PASS ' if ok else 'FAIL ') + cid, fill=(120, 220, 120) if ok else (240, 90, 90), font=small)
        d.text((x + 170, yy), names.get(cid, '')[:62], fill=(200, 200, 200), font=small)
        yy += 22
    img.save(os.path.join(comp_dir, f'{i:04d}.png'))

mp4 = os.path.join(out, 'mp-e2e.mp4')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', fps, '-i', os.path.join(comp_dir, '%04d.png'),
                '-vf', 'scale=1920:1080', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', mp4], check=True)
print(mp4)
