from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[2];A=ROOT/'artifacts/planet-rebuild/capability-v2';S=ROOT/'assets/art/planet-rebuild/capability-v2'
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',23);small=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',17)
labels={'treehouse':'巨樹與樹屋 第二版'}
def framed(im,size,alpha=False):
 if alpha:
  im=im.convert('RGBA');mask=im.getchannel('A').point(lambda x:255 if x>45 else 0);b=mask.getbbox()
  if b:im=im.crop(b)
 im=ImageOps.contain(im,(size[0]-40,size[1]-40),Image.Resampling.LANCZOS);bg=Image.new('RGB',size,'#efedf1');pos=((size[0]-im.width)//2,(size[1]-im.height)//2)
 if im.mode=='RGBA':bg.paste(im,pos,im)
 else:bg.paste(im,pos)
 return bg
for name,label in labels.items():
 folder=A/name
 grid=Image.new('RGB',(1100,1080),'#efedf1');d=ImageDraw.Draw(grid)
 for i,(view,text) in enumerate([('quarter','45 度'),('front','正面'),('side','側面'),('back','背面')]):
  x=(i%2)*550;y=(i//2)*540;grid.paste(framed(Image.open(folder/(view+'.png')),(550,500),True),(x,y+35));d.text((x+20,y+8),text,font=font,fill='#34323c')
 grid.save(folder/'four-views.jpg',quality=94)
 comparison=Image.new('RGB',(1400,850),'#efedf1');d=ImageDraw.Draw(comparison)
 ref=ROOT/'artifacts/planet-rebuild/capability-v1/references/treehouse-hero.png';comparison.paste(framed(Image.open(ref),(680,680)),(10,65));comparison.paste(framed(Image.open(folder/'quarter.png'),(680,680),True),(710,65))
 d.text((25,15),label+'｜原圖裁切',font=font,fill='#34323c');d.text((725,15),'Blender 灰模試件｜45 度',font=font,fill='#34323c');d.text((25,770),'原圖與試件分別置中縮放；不是相機標定或逐像素還原。',font=small,fill='#514d5b');d.text((25,803),'島體試件僅含地形／岩體／下層水域；原圖中的建築不屬本試件。' if name=='island' else '原始設計圖已封裝於 .blend；方法與差距見 REVIEW.md。',font=small,fill='#514d5b')
 comparison.save(folder/'reference-comparison.jpg',quality=95)
 r=json.loads((S/name/'report.json').read_text());r['reference_fidelity_self_assessment']='Failed';r['user_approval']='Rejected';(S/name/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
print('TREE_V2_COMPARISON_READY')
