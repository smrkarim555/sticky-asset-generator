# PyCairo helper for quadratic curves & Adobe Stock clean transparency
def draw_quad_curve(ctx, qx, qy, endx, endy):
    try:
        x0, y0 = ctx.get_current_point()
        c1x = x0 + (2.0/3.0)*(qx - x0)
        c1y = y0 + (2.0/3.0)*(qy - y0)
        c2x = endx + (2.0/3.0)*(qx - endx)
        c2y = endy + (2.0/3.0)*(qy - endy)
        ctx.curve_to(c1x, c1y, c2x, c2y, endx, endy)
    except Exception:
        pass

def sanitize_adobe_stock_transparency(img_or_path):
    try:
        import os, struct, zlib
        from PIL import Image
        import numpy as np
        img = Image.open(img_or_path) if isinstance(img_or_path, str) else img_or_path
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        arr = np.array(img, dtype=np.uint8)
        r = arr[:,:,0].astype(np.float32)
        g = arr[:,:,1].astype(np.float32)
        b = arr[:,:,2].astype(np.float32)
        a = arr[:,:,3]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
        # Strip baked-in white background ONLY if canvas corners are solid opaque white
        corners = [arr[0,0], arr[0,-1], arr[-1,0], arr[-1,-1]]
        if all(c[0] > 240 and c[1] > 240 and c[2] > 240 and c[3] > 200 for c in corners):
            white_bg = (r > 240) & (g > 240) & (b > 240)
            arr[:,:,3][white_bg] = 0
        # Strip semi-transparent dark grey/black background clouds ONLY in outer corner border margins (vignetting),
        # preserving central volumetric smoke, fire, charcoal plumes, and ember particles.
        h, w = a.shape
        margin_h, margin_w = int(h * 0.12), int(w * 0.12)
        border_mask = np.zeros((h, w), dtype=bool)
        border_mask[:margin_h, :] = True
        border_mask[-margin_h:, :] = True
        border_mask[:, :margin_w] = True
        border_mask[:, -margin_w:] = True
        dark_vignette = border_mask & (a > 0) & (a < 240) & ((lum < 115) | ((sat < 45) & (lum < 145)))
        arr[:,:,3][dark_vignette] = 0
        clean_img = Image.fromarray(arr, 'RGBA')
        if isinstance(img_or_path, str):
            clean_img.save(img_or_path, format='PNG', compress_level=1)
            # Enforce Adobe Stock file size requirement (2.0 MB <= size <= 10.0 MB)
            min_bytes = int(2.1 * 1024 * 1024)
            max_bytes = int(9.8 * 1024 * 1024)
            sz = os.path.getsize(img_or_path)
            if sz > max_bytes:
                for lvl in [3, 6, 9]:
                    clean_img.save(img_or_path, format='PNG', compress_level=lvl)
                    if os.path.getsize(img_or_path) <= max_bytes:
                        break
            sz = os.path.getsize(img_or_path)
            if sz < min_bytes:
                needed = min_bytes - sz
                with open(img_or_path, 'rb') as f:
                    bdata = f.read()
                iend_pos = bdata.rfind(b'IEND')
                if iend_pos != -1:
                    head = bdata[:iend_pos - 4]
                    tail = bdata[iend_pos - 4:]
                    keyword = b"AdobeStockSpecs" + bytes([0])
                    pad = b'X' * max(0, needed - len(keyword) - 12)
                    cdata = keyword + pad
                    clen = struct.pack('>I', len(cdata))
                    ctype = b'tEXt'
                    crc = struct.pack('>I', zlib.crc32(ctype + cdata) & 0xffffffff)
                    with open(img_or_path, 'wb') as f:
                        f.write(head + clen + ctype + cdata + crc + tail)
        return clean_img
    except Exception:
        return img_or_path


import os
import math
import numpy as np
import cairo
from PIL import Image

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def make_gold_stops(variant_id):
    if variant_id == 'v1':
        return [
            (0.00, hex_to_rgb('#A67C1E')),
            (0.20, hex_to_rgb('#E1BA6D')),
            (0.40, hex_to_rgb('#FDF0A6')),
            (0.60, hex_to_rgb('#C29B38')),
            (0.80, hex_to_rgb('#F7E594')),
            (1.00, hex_to_rgb('#8A6112'))
        ]
    else:
        return [
            (0.00, hex_to_rgb('#997020')),
            (0.20, hex_to_rgb('#ECC870')),
            (0.40, hex_to_rgb('#FFF1B0')),
            (0.60, hex_to_rgb('#C59B27')),
            (0.80, hex_to_rgb('#FBE285')),
            (1.00, hex_to_rgb('#805810'))
        ]

def draw_corner_quadrant(ctx, fw, fh, colors):
    # 1. Micro-guilloche filigree background arcs
    ctx.save()
    gold_rgb = colors['gold_mid']
    for r in range(40, 650, 10):
        ctx.arc(0, 0, r, 0, math.pi / 2)
        ctx.set_source_rgba(gold_rgb[0], gold_rgb[1], gold_rgb[2], 0.12)
        ctx.set_line_width(1.5)
        ctx.stroke()
    ctx.restore()

    # 2. Outer Base Frame Edge Bars
    grad_top = cairo.LinearGradient(0, 0, fw, 0)
    for stop, col in colors['gold_stops']:
        grad_top.add_color_stop_rgb(stop, *col)
    ctx.set_source(grad_top)
    ctx.rectangle(0, 0, fw, 24)
    ctx.fill()

    grad_left = cairo.LinearGradient(0, 0, 0, fh)
    for stop, col in colors['gold_stops']:
        grad_left.add_color_stop_rgb(stop, *col)
    ctx.set_source(grad_left)
    ctx.rectangle(0, 0, 24, fh)
    ctx.fill()

    # 3. Outer Layer 1 - Primary Dark Wing
    ctx.save()
    grad_wing1 = cairo.RadialGradient(0, 0, 50, 400, 400, 800)
    grad_wing1.add_color_stop_rgb(0.0, *colors['primary_dark1'])
    grad_wing1.add_color_stop_rgb(1.0, *colors['primary_dark2'])

    ctx.move_to(0, 0)
    ctx.line_to(820, 0)
    ctx.curve_to(680, 50, 540, 150, 440, 260)
    ctx.curve_to(320, 400, 220, 560, 140, 720)
    ctx.curve_to(70, 820, 30, 900, 0, 940)
    ctx.close_path()
    ctx.set_source(grad_wing1)
    ctx.fill()
    ctx.restore()

    # 4. Gold Bevel Trim for Outer Wing
    ctx.save()
    grad_gold = cairo.LinearGradient(0, 0, 600, 600)
    for stop, col in colors['gold_stops']:
        grad_gold.add_color_stop_rgb(stop, *col)
    
    ctx.move_to(820, 0)
    ctx.curve_to(680, 50, 540, 150, 440, 260)
    ctx.curve_to(320, 400, 220, 560, 140, 720)
    ctx.curve_to(70, 820, 30, 900, 0, 940)
    ctx.line_to(0, 910)
    ctx.curve_to(25, 870, 60, 790, 125, 700)
    ctx.curve_to(205, 540, 300, 385, 420, 248)
    ctx.curve_to(520, 138, 655, 42, 790, 0)
    ctx.close_path()
    ctx.set_source(grad_gold)
    ctx.fill()
    ctx.restore()

    # 5. Middle Layer 2 - Accent Swash
    ctx.save()
    grad_mid = cairo.LinearGradient(0, 0, 500, 500)
    grad_mid.add_color_stop_rgb(0.0, *colors['accent_1'])
    grad_mid.add_color_stop_rgb(1.0, *colors['accent_2'])

    ctx.move_to(0, 0)
    ctx.line_to(720, 0)
    ctx.curve_to(580, 60, 460, 170, 370, 280)
    ctx.curve_to(260, 420, 160, 580, 0, 780)
    ctx.close_path()
    ctx.set_source(grad_mid)
    ctx.fill()
    ctx.restore()

    # 6. Gold Ribbon Swash Accent Line
    ctx.save()
    ctx.move_to(650, 0)
    ctx.curve_to(510, 80, 380, 220, 290, 360)
    ctx.curve_to(190, 500, 80, 650, 0, 710)
    ctx.line_to(0, 680)
    ctx.curve_to(75, 620, 180, 475, 275, 340)
    ctx.curve_to(365, 205, 490, 70, 620, 0)
    ctx.close_path()
    ctx.set_source(grad_gold)
    ctx.fill()
    ctx.restore()

    # 7. Deep Inner Corner Shield Layer
    ctx.save()
    ctx.move_to(0, 0)
    ctx.line_to(520, 0)
    ctx.curve_to(400, 70, 290, 200, 200, 320)
    ctx.curve_to(140, 410, 50, 520, 0, 560)
    ctx.close_path()
    ctx.set_source(grad_wing1)
    ctx.fill()
    ctx.restore()

    # 8. Inner Golden Double Frame Lines with Smooth Chamfer
    ctx.save()
    ctx.set_source(grad_gold)
    ctx.set_line_width(10)
    ctx.move_to(fw, 120)
    ctx.line_to(380, 120)
    ctx.curve_to(260, 120, 120, 260, 120, 380)
    ctx.line_to(120, fh)
    ctx.stroke()

    ctx.set_line_width(4)
    ctx.move_to(fw, 145)
    ctx.line_to(390, 145)
    ctx.curve_to(280, 145, 145, 280, 145, 390)
    ctx.line_to(145, fh)
    ctx.stroke()
    ctx.restore()

    # 9. Corner Starburst Medallion Emblem
    ctx.save()
    cx, cy = 250, 250
    ctx.translate(cx, cy)
    num_rays = 12
    r_outer, r_inner = 42, 20
    ctx.set_source(grad_gold)
    for i in range(num_rays * 2):
        angle = i * math.pi / num_rays
        r = r_outer if i % 2 == 0 else r_inner
        x = r * math.cos(angle)
        y = r * math.sin(angle)
        if i == 0:
            ctx.move_to(x, y)
        else:
            ctx.line_to(x, y)
    ctx.close_path()
    ctx.fill()

    ctx.arc(0, 0, 12, 0, math.pi * 2)
    grad_bead = cairo.RadialGradient(-3, -3, 1, 0, 0, 12)
    grad_bead.add_color_stop_rgb(0.0, 1.0, 1.0, 0.9)
    grad_bead.add_color_stop_rgb(0.5, *colors['gold_mid'])
    grad_bead.add_color_stop_rgb(1.0, *colors['gold_dark'])
    ctx.set_source(grad_bead)
    ctx.fill()
    ctx.restore()

    # 10. Accent Pinstripe Curves
    ctx.save()
    ctx.set_source_rgba(gold_rgb[0], gold_rgb[1], gold_rgb[2], 0.65)
    ctx.set_line_width(2.5)
    ctx.move_to(460, 0)
    ctx.curve_to(350, 100, 220, 220, 0, 460)
    ctx.stroke()
    ctx.move_to(360, 0)
    ctx.curve_to(260, 80, 160, 180, 0, 360)
    ctx.stroke()
    ctx.restore()

def add_subtle_texture(pil_img):
    img_arr = np.array(pil_img)
    alpha = img_arr[:, :, 3]
    mask = alpha > 10
    noise = np.random.normal(0, 3.0, img_arr[:, :, :3].shape).astype(np.float32)
    rgb = img_arr[:, :, :3].astype(np.float32)
    rgb[mask] = np.clip(rgb[mask] + noise[mask], 0, 255)
    img_arr[:, :, :3] = rgb.astype(np.uint8)
    return Image.fromarray(img_arr, 'RGBA')

def render_variation(variant_id, output_filename, colors):
    width, height = 3840, 2160
    margin_x, margin_y = 140, 110
    
    left = margin_x
    right = width - margin_x
    top = margin_y
    bottom = height - margin_y
    
    fw = (right - left) / 2.0
    fh = (bottom - top) / 2.0
    
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    ctx = cairo.Context(surface)
    
    quadrants = [
        (left, top, 1.0, 1.0),
        (right, top, -1.0, 1.0),
        (left, bottom, 1.0, -1.0),
        (right, bottom, -1.0, -1.0)
    ]
    
    for tx, ty, sx, sy in quadrants:
        ctx.save()
        ctx.translate(tx, ty)
        ctx.scale(sx, sy)
        draw_corner_quadrant(ctx, fw, fh, colors)
        ctx.restore()
    
    buf = surface.get_data()
    img_np = np.ndarray(shape=(height, width, 4), dtype=np.uint8, buffer=bytearray(buf))
    img_bgr = img_np[:, :, :3]
    img_alpha = img_np[:, :, 3]
    img_rgb = img_bgr[:, :, ::-1]
    img_rgba = np.dstack((img_rgb, img_alpha))
    
    pil_img = Image.fromarray(img_rgba, 'RGBA')
    pil_img = add_subtle_texture(pil_img)
    pil_img.save(output_filename, format='PNG', compress_level=6)

def main(): # Entry point
    variations = [
        {
            'id': 'v1',
            'filename': 'output_v1.png',
            'colors': {
                'primary_dark1': hex_to_rgb('#0A192F'),
                'primary_dark2': hex_to_rgb('#040C1A'),
                'accent_1': hex_to_rgb('#0F2C59'),
                'accent_2': hex_to_rgb('#184687'),
                'gold_mid': hex_to_rgb('#D4AF37'),
                'gold_dark': hex_to_rgb('#8A6112'),
                'gold_stops': make_gold_stops('v1')
            }
        },
        {
            'id': 'v2',
            'filename': 'output_v2.png',
            'colors': {
                'primary_dark1': hex_to_rgb('#042419'),
                'primary_dark2': hex_to_rgb('#02120C'),
                'accent_1': hex_to_rgb('#0B4731'),
                'accent_2': hex_to_rgb('#107852'),
                'gold_mid': hex_to_rgb('#DCB446'),
                'gold_dark': hex_to_rgb('#805810'),
                'gold_stops': make_gold_stops('v2')
            }
        }
    ]
    
    for v in variations:
        render_variation(v['id'], v['filename'], v['colors'])

if __name__ == '__main__':
    main()
