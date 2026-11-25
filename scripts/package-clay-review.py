"""Self-contained nine-character review bundle, no network dependencies."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
root=Path(__file__).resolve().parents[1];out=Path('/workspace/exports');out.mkdir(exist_ok=True)
with ZipFile(out/'companion-planet-nine-clay-review.zip','w',ZIP_DEFLATED) as z:
 for pattern in ['assets/art/clay-stage/*','artifacts/clay-review/*.png','artifacts/clay-review/*.json']:
  for p in root.glob(pattern):z.write(p,p.relative_to(root))
 for file in ['scripts/sculpt-clay-sdf.py','scripts/build-clay-review.py','scripts/capture-clay-review.mjs','scripts/compose-clay-review.py','scripts/verify-clay-stage.py','scripts/verify-nine-clay.py','scripts/compose-nine-clay.py']:
  z.write(root/file,file)
 viewer=(root/'artifacts/clay-review/viewer.html').read_text()
 viewer=viewer.replace('<script type="module">','<script type="importmap">{"imports":{"three":"./vendor/three.module.js","three/addons/":"./vendor/addons/"}}</script><script type="module">')
 viewer=viewer.replace('`/assets/art/clay-stage/${id}.glb`','`./assets/art/clay-stage/${id}.glb`')
 z.writestr('review.html',viewer)
 for f in ['three.module.js','three.core.js']:z.write(root/'node_modules/three/build'/f,'vendor/'+f)
 for f in ['loaders/GLTFLoader.js','controls/OrbitControls.js','utils/BufferGeometryUtils.js']:
  z.write(root/'node_modules/three/examples/jsm'/f,'vendor/addons/'+f)
 z.write(root/'node_modules/three/LICENSE','vendor/THREE-LICENSE.txt')
 z.writestr('START_HERE.txt','同頻星球：九角色灰模外觀確認\n\n先看 artifacts/clay-review/nine-clay-front.png、nine-clay-quarter.png 與 nine-clay-body-only.png。\n模型與 Blender 原檔位於 assets/art/clay-stage/。\n\n旋轉檢視：解壓縮後在此資料夾啟動 python -m http.server 8081，再開 http://localhost:8081/review.html。\n檢視器與 Three.js 都在壓縮包內，不需外部網路。瀏覽器安全限制下，直接雙擊 HTML 不能讀取本機 GLB，請使用上述本機伺服器；亦可直接用 Blender 開啟 .blend。\n\n內含九隻獨立模型。星雲仔、蕨蕨子、菇菇獸已確認且原檔不變；其他六隻尚待外觀確認。純灰模、無動畫／材質特效、未接入正式網站，待使用者確認外觀後再進下一階段。\n')
print(out/'companion-planet-nine-clay-review.zip')
