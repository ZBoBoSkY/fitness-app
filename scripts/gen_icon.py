# 生成 PWA 图标：橙色圆角背景 + 白色哑铃图形
from PIL import Image, ImageDraw

def make_icon(size):
    scale = size / 512.0
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 圆角背景
    r = int(96 * scale)
    d.rounded_rectangle([0, 0, size, size], radius=r, fill=(255, 107, 44, 255))  # #FF6B2C
    # 哑铃
    cx = size / 2
    cy = size / 2
    bar_w = int(26 * scale)      # 杆直径
    bar_len = int(180 * scale)   # 杆长
    plate_w = int(56 * scale)    # 铃片宽
    plate_h = int(120 * scale)   # 铃片高
    white = (255, 255, 255, 255)
    # 横杆
    d.rounded_rectangle([cx - bar_len/2, cy - bar_w/2, cx + bar_len/2, cy + bar_w/2], radius=int(bar_w/2), fill=white)
    # 左铃片
    d.rounded_rectangle([cx - bar_len/2 - plate_w, cy - plate_h/2, cx - bar_len/2, cy + plate_h/2], radius=int(14*scale), fill=white)
    # 右铃片
    d.rounded_rectangle([cx + bar_len/2, cy - plate_h/2, cx + bar_len/2 + plate_w, cy + plate_h/2], radius=int(14*scale), fill=white)
    # 内圈细线（铃片分隔线）
    line_gap = int(14 * scale)
    lx = cx - bar_len/2 - plate_w + line_gap
    d.line([lx, cy - plate_h/2 + 10*scale, lx, cy + plate_h/2 - 10*scale], fill=(255, 107, 44, 255), width=int(6*scale))
    rx = cx + bar_len/2 + plate_w - line_gap
    d.line([rx, cy - plate_h/2 + 10*scale, rx, cy + plate_h/2 - 10*scale], fill=(255, 107, 44, 255), width=int(6*scale))
    return img

for s in (192, 512):
    make_icon(s).save(f'public/icons/icon-{s}.png')

print('icons generated')
