from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
out=Path('artifacts/nebula-material');font=ImageFont.truetype('public/fonts/Huninn-Regular.woff2',25)
labels=['A・柔霧','B・星雲果凍','C・清透果凍']
# Same crop of actual browser screenshots; no generated/retouched appearance.
sheet=Image.new('RGB',(1800,650),'#f4f1e8');d=ImageDraw.Draw(sheet)
for i,id in enumerate(['soft','mist','gel']):
 im=Image.open(out/f'{id}-close.png').convert('RGB').crop((270,135,750,735)).resize((480,600))
 sheet.paste(im,(i*600+60,0));d.text((i*600+300,625),labels[i],font=font,fill='#505a62',anchor='mm')
sheet.save(out/'three-browser-materials.png')
sheet=Image.new('RGB',(2160,500),'#f4f1e8');d=ImageDraw.Draw(sheet)
for i,id in enumerate(['soft','mist','gel']):
 sheet.paste(Image.open(out/f'{id}-planet.png').convert('RGB').resize((720,450)),(i*720,0));d.text((i*720+360,476),labels[i]+'・實際星球',font=font,fill='#505a62',anchor='mm')
sheet.save(out/'three-live-planets.png')
sheet=Image.new('RGB',(1800,650),'#f4f1e8');d=ImageDraw.Draw(sheet)
for i,id in enumerate(['soft','mist','gel']):
 im=Image.open(out/f'{id}-transmission-probe.png').convert('RGB').crop((270,135,750,735))
 sheet.paste(im,(i*600+60,0));d.text((i*600+300,625),labels[i]+'・相同背景卡',font=font,fill='#505a62',anchor='mm')
sheet.save(out/'three-transmission-probes.png')
