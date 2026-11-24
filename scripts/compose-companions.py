"""Compose the actual R3F screenshots after review-companions.mjs (requires Pillow)."""
from PIL import Image, ImageDraw, ImageFont

residents = [
    ('nebula', '星雲仔'), ('sprout', '小星草'), ('fern', '蕨蕨子'),
    ('mushroom', '菇菇獸'), ('aurora', '極光仔'), ('blossom', '花苞寶'),
    ('stardust', '星塵獸'), ('water', '水球仔'), ('puff', '蓬蓬仔'),
]
canvas = Image.new('RGB', (1440, 1740), '#f4f1e8')
font = ImageFont.truetype('public/fonts/Huninn-Regular.woff2', 24)
draw = ImageDraw.Draw(canvas)
for i, (name, label) in enumerate(residents):
    image = Image.open(f'artifacts/interaction/{name}-front.png').convert('RGB')
    x, y = (i % 3) * 480, (i // 3) * 580
    canvas.paste(image, (x, y))
    draw.text((x + 240, y + 550), label, font=font, fill='#514b61', anchor='mm')
canvas.save('artifacts/interaction/nine-residents.png')
