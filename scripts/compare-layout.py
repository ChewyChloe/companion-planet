"""Compose the saved real app captures; no generated illustration replaces the scene."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1]/'artifacts/layout'
board=Image.new('RGB',(1600,550),'#f4f2f5')
draw=ImageDraw.Draw(board);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
for i,(file,title) in enumerate([('before.png','BEFORE / three-column page'),('desktop.png','AFTER / full-screen lakeside')]):
 im=ImageOps.contain(Image.open(root/file).convert('RGB'),(780,490));board.paste(im,(i*800+(800-im.width)//2,48+(490-im.height)//2));draw.text((i*800+18,14),title,font=font,fill='#42485c')
board.save(root/'before-after.png')
