"""Compose unmodified renderer captures for human review; requires Pillow."""
from PIL import Image, ImageDraw, ImageFont
font = ImageFont.truetype('public/fonts/Huninn-Regular.woff2', 28)
base = 'artifacts/universe/'
before = Image.open(base + 'before-bowl.png').convert('RGB')
after = Image.open(base + 'companion-planet-desk.png').convert('RGB')
canvas = Image.new('RGB', (2880, 960), '#f4f1e8')
draw = ImageDraw.Draw(canvas)
for i, (label, image) in enumerate([('修改前：拒收的碗狀地形', before), ('修改後：同頻星球', after)]):
    canvas.paste(image.resize((1440, 900)), (i * 1440, 60))
    draw.text((i * 1440 + 720, 30), label, font=font, fill='#625e78', anchor='mm')
canvas.save(base + 'before-after.png')
canvas = Image.new('RGB', (1440, 980), '#f4f1e8')
draw = ImageDraw.Draw(canvas)
for i, (label, filename) in enumerate([
    ('同頻星球', 'companion-planet-desk'), ('玫瑰花園', 'world-rose'),
    ('微風森林', 'world-forest'), ('月光書原', 'world-moon'),
]):
    x, y = i % 2 * 720, i // 2 * 490
    canvas.paste(Image.open(base + filename + '.png').convert('RGB').resize((720, 450)), (x, y + 40))
    draw.text((x + 360, y + 20), label, font=font, fill='#625e78', anchor='mm')
canvas.save(base + 'four-worlds.png')
