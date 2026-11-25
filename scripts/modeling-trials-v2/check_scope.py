"""Compare the frozen files recorded before the tree-only iteration."""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[2]
baseline=json.loads((root/'artifacts/planet-rebuild/capability-v2/protected-files-before.json').read_text())
changed=[p for p,h in baseline.items() if not (root/p).is_file() or hashlib.sha256((root/p).read_bytes()).hexdigest()!=h]
out=root/'artifacts/planet-rebuild/capability-v2/scope-verification.json'
out.write_text(json.dumps({'protected_file_count':len(baseline),'changed_protected_files':changed,'pass':not changed},indent=2))
assert not changed,changed
print('PROTECTED_FILES_UNCHANGED',len(baseline))
