"""Encode user-supplied WAVs for web streaming; keep originals untouched."""
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
output = root / 'assets/music'
output.mkdir(exist_ok=True)
tracks = {}
for title, key in [('同頻星球', 'home'), ('月光書原', 'moon'), ('玫瑰花園', 'rose'), ('微風森林', 'forest')]:
    source, = (root / 'assets/misic').glob(title + '*.wav')
    target = output / f'{key}.mp3'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    '-i', str(source), '-map', '0:a:0', '-vn', '-map_metadata', '-1',
                    '-codec:a', 'libmp3lame', '-b:a', '160k', str(target)], check=True)
    tracks[key] = {
        'planet': title, 'source': str(source.relative_to(root)),
        'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'outputSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        'bytes': target.stat().st_size,
    }
(output / 'sources.json').write_text(json.dumps(tracks, ensure_ascii=False, indent=2) + '\n')
