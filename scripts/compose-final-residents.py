from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
out=Path('artifacts/resident-final');font=ImageFont.truetype('public/fonts/Huninn-Regular.woff2',27)
ids=['nebula','sprout','fern','mushroom','aurora','blossom','stardust','water','puff'];names=['星雲仔','小星草','蕨蕨子','菇菇獸','極光仔','花苞寶','星塵獸','水球仔','蓬蓬仔']
for view in ['front','quarter','side','back']:
 sheet=Image.new('RGB',(1920,2430),'#f4f1e8');d=ImageDraw.Draw(sheet)
 for i,id in enumerate(ids):
  x=i%3*640;y=i//3*810;im=Image.open(out/f'{id}-{view}.png').convert('RGB').crop((160,0,800,760));sheet.paste(im,(x,y));d.text((x+320,y+785),names[i],font=font,fill='#505b64',anchor='mm')
 sheet.save(out/f'nine-{view}.png')
for id in ids:
 sheet=Image.new('RGB',(1920,810),'#f4f1e8');d=ImageDraw.Draw(sheet)
 for j,view in enumerate(['front','side','back']):
  im=Image.open(out/f'{id}-{view}.png').convert('RGB').crop((160,0,800,760));sheet.paste(im,(j*640,0));d.text((j*640+320,785),['正面','側面','背面'][j],font=font,fill='#505b64',anchor='mm')
 sheet.save(out/f'{id}-three-views.png')
 # Picker image is a faithful crop of the real rendering, no generated portrait.
 im=Image.open(out/f'{id}-front.png').convert('RGB').crop((190,80,770,660)).resize((256,256))
 im.save(Path('public/portraits')/(id+'.png'))
