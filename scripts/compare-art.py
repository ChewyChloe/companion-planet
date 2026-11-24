"""Compose evidence boards from real captures (Pillow); never substitutes for 3D."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont,ImageChops
root=Path(__file__).resolve().parents[1]/'artifacts/art'
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
def board(name,items,columns,size):
 w,h=size;out=Image.new('RGB',(w*columns,h*((len(items)+columns-1)//columns)),(244,241,232));d=ImageDraw.Draw(out)
 for i,(path,title) in enumerate(items):
  image=Image.open(root/path).convert('RGB')
  if Path(path).stem in ['front','side','back','quarter']:
   image=image.crop((8,8,image.width-8,image.height-8));mask=ImageChops.difference(image,Image.new('RGB',image.size,(244,241,232))).convert('L').point(lambda p:255 if p>24 else 0);bounds=mask.getbbox()
   if bounds:image=image.crop((max(0,bounds[0]-16),max(0,bounds[1]-16),min(image.width,bounds[2]+16),min(image.height,bounds[3]+16)))
  image=ImageOps.contain(image,(w-24,h-60));x=(i%columns)*w+(w-image.width)//2;y=(i//columns)*h+46+(h-60-image.height)//2;out.paste(image,(x,y));d.text(((i%columns)*w+12,(i//columns)*h+12),title,font=font,fill=(54,73,59))
 out.save(root/name)
views=['front','side','back','quarter']
board('character-before-after.png',[(f'{phase}/{view}.png',f'{phase.upper()} / {view}')for phase in ['before','after']for view in views],4,(400,470))
board('planet-before-after.png',[(f'{phase}/planet.png',f'{phase.upper()} / real app')for phase in ['before','after']],2,(900,620))
board('reference-comparison.png',[('reference/proposal-scene.png','PDF reference: ONE designed angle'),('after/quarter.png','R3F sculpt: inferred 45 degree view'),('after/read.png','R3F scene: actual seated reading')],3,(600,680))

board("new-reference-comparison.png",[("reference/tripo-2/frame-0.jpg","New Tripo reference / front"),("reference/tripo-2/frame-4.jpg","New Tripo reference / back"),("after/quarter.png","Updated real sculpt"),("after/read-contact.png","Updated real seated scene")],4,(460,580))

board("depth-before-after.png",[("round-4/side.png","BEFORE: shallow side"),("after/side.png","AFTER: deeper sculpt")],2,(600,700))
