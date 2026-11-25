"""Deliver independently usable assets plus the actual production web renderer."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
root=Path(__file__).resolve().parents[1];out=Path('/workspace/exports');out.mkdir(exist_ok=True)
ids=['nebula','sprout','fern','mushroom','aurora','blossom','stardust','water','puff']
with ZipFile(out/'companion-planet-nine-colored-residents.zip','w',ZIP_DEFLATED) as z:
 for id in ids:
  glb=root/('public/models/material-preview/nebula.glb' if id=='nebula' else f'public/models/residents/{id}.glb')
  z.write(glb,f'models/{id}.glb');z.write(root/f'assets/art/residents-final/{id}.blend',f'blender/{id}.blend')
 for p in (root/'artifacts/resident-final').glob('*'):
  if p.is_file():z.write(p,Path('comparisons')/p.name)
 for p in (root/'dist').rglob('*'):
  if p.is_file():z.write(p,Path('web')/p.relative_to(root/'dist'))
 z.write(root/'docs/archive/RESIDENT_MATERIALS.md','docs/archive/RESIDENT_MATERIALS.md')
 for f in ['finish-resident-materials.py','review-final-residents.mjs','compose-final-residents.py','check-final-residents.mjs','check-final-touch.mjs','report-final-residents.mjs']:
  z.write(root/'scripts'/f,Path('scripts')/f)
 for p in (root/'src/art').glob('*.ts*'):z.write(p,p.relative_to(root))
 z.writestr('START_HERE.txt','同頻星球：九角色彩色模型\n\ncomparisons/nine-front.png：實際 R3F 九宮格。\nmodels：九份可獨立載入的 GLB。\nblender：九份可編輯原檔。\n\n瀏覽器實際效果：進入 web 資料夾，執行 python -m http.server 8081，開啟 http://localhost:8081/。\n旋轉檢視：http://localhost:8081/?art-review&companion=fern\n\n這是網站真正的正式前端建置，不是模型渲染圖片。靜態預覽不含 AI 後端，完整服務使用既有網站。\nGLB/Blender 提供基礎材質與相容蒙皮；自訂星雲 Shader、內部星點/氣泡與 Bloom 以瀏覽器版本為準。\n已確認的身體幾何保持原樣，沿用現有行為與互動，沒有新增動畫 clips。\n')
print(out/'companion-planet-nine-colored-residents.zip')
