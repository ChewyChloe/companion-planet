"""Ship the actual production React/R3F build for local material review."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
root=Path(__file__).resolve().parents[1];out=Path('/workspace/exports');out.mkdir(exist_ok=True)
with ZipFile(out/'nebula-material-browser-review.zip','w',ZIP_DEFLATED) as z:
 for p in (root/'dist').rglob('*'):
  if p.is_file():z.write(p,Path('web')/p.relative_to(root/'dist'))
 for p in (root/'artifacts/nebula-material').glob('*'):
  if p.is_file():z.write(p,Path('comparisons')/p.name)
 z.write(root/'NEBULA_MATERIAL_REVIEW.md','NEBULA_MATERIAL_REVIEW.md')
 for file in ['src/art/nebula-material-test.ts','src/art/NebulaInterior.tsx','src/art/NebulaBloom.tsx']:
  z.write(root/file,file)
 z.writestr('START_HERE.txt','星雲仔：真正 React Three Fiber 網頁材質測試\n\n解壓縮後進入 web 資料夾，在終端執行：\npython -m http.server 8081\n\n開啟：http://localhost:8081/?nebula-material=mist\nA：?nebula-material=soft\nC：?nebula-material=gel\n近照：?art-review&nebula-material=mist\n條紋透射對照：?art-review&nebula-material=mist&material-probe\n\n這是專案真正的正式前端建置，不是圖片或 Blender 渲染。網頁內可選 A/B/C、旋轉場景、切近照。static 本機服務不提供 AI 後端，因此此包只用於材質確認；完整 AI 服務請使用既有網站。\ncomparisons 資料夾包含實際瀏覽器截圖與報告。\n只製作星雲仔材質；模型身體頂點保持不變，沒有新增動畫。\n')
print(out/'nebula-material-browser-review.zip')
