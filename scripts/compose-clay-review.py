"""Unretouched, equal-scale actual 3D captures for human shape approval."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
out=Path('artifacts/clay-review');font=ImageFont.truetype('public/fonts/Huninn-Regular.woff2',27)
ids=['nebula','fern','mushroom'];names=['星雲仔','蕨蕨子','菇菇獸']
sheet=Image.new('RGB',(1920,1380),'#eeece7');d=ImageDraw.Draw(sheet)
for row,view in enumerate(['front','quarter']):
 for col,id in enumerate(ids):
  sheet.paste(Image.open(out/f'{id}-{view}.png').convert('RGB'),(col*640,row*690))
  d.text((col*640+320,row*690+663),names[col]+('・正面' if row==0 else '・45 度'),font=font,fill='#454c51',anchor='mm')
sheet.save(out/'three-clay-front-quarter.png')
sheet=Image.new('RGB',(1920,690),'#eeece7');d=ImageDraw.Draw(sheet)
for col,id in enumerate(ids):
 sheet.paste(Image.open(out/f'{id}-body-only.png').convert('RGB'),(col*640,0))
 d.text((col*640+320,663),names[col]+'・無頭飾',font=font,fill='#454c51',anchor='mm')
sheet.save(out/'three-bare-bodies.png')
