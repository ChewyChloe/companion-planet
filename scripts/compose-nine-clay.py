"""Same-scale, same-light actual clay renders; no image-generated models."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
out=Path('artifacts/clay-review');font=ImageFont.truetype('public/fonts/Huninn-Regular.woff2',28)
ids=['nebula','sprout','fern','mushroom','aurora','blossom','stardust','water','puff']
names=['星雲仔','小星草','蕨蕨子','菇菇獸','極光仔','花苞寶','星塵獸','水球仔','蓬蓬仔']
for view in ['front','quarter','side','back','body-only']:
 sheet=Image.new('RGB',(1920,2070),'#eeece7');draw=ImageDraw.Draw(sheet)
 for i,id in enumerate(ids):
  x=i%3*640;y=i//3*690;sheet.paste(Image.open(out/f'{id}-{view}.png').convert('RGB'),(x,y))
  draw.text((x+320,y+663),names[i],font=font,fill='#454c51',anchor='mm')
 sheet.save(out/f'nine-clay-{view}.png')
for id in ids:
 sheet=Image.new('RGB',(1920,690),'#eeece7');draw=ImageDraw.Draw(sheet)
 for i,view in enumerate(['front','side','back']):
  sheet.paste(Image.open(out/f'{id}-{view}.png').convert('RGB'),(i*640,0))
  draw.text((i*640+320,663),['正面','側面','背面'][i],font=font,fill='#454c51',anchor='mm')
 sheet.save(out/f'{id}-three-views.png')
