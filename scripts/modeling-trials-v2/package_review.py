from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[2];a=root/'artifacts/planet-rebuild/capability-v2';s=root/'assets/art/planet-rebuild/capability-v2';scripts=Path(__file__).resolve().parent
files=[p for folder in [a,s,scripts] for p in folder.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ['.zip'] and p.name!='files-manifest.json']
source=root/'assets/art/planet-rebuild/references/companion-planet/同頻星球.png';files.append(source)
manifest=[{'path':str(p.relative_to(root)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(files)]
(a/'files-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));files.append(a/'files-manifest.json')
with zipfile.ZipFile(a/'treehouse-v2-review.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,p.relative_to(root))
print('PACKAGED',len(files),'files')
