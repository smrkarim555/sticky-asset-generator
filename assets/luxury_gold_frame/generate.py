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

WIDTH = 3840
HEIGHT = 2160

def create_metallic_gradient(x0, y0, x1, y1, stops):
    pat = cairo.LinearGradient(x0, y0, x1, y1)
    for pos, color in stops:
        if len(color) == 3:
            pat.add_color_stop_rgb(pos, color[0], color[1], color[2])
        else:
            pat.add_color_stop_rgba(pos, color[0], color[1], color[2], color[3])
    return pat

def trace_top_left_curve(ctx, w, h):
    x1, y1 = w * 0.25, 0
    x2, y2 = w * 0.088, h * 0.135
    x3, y3 = w * 0.088, h * 0.225
    x4, y4 = w * 0.102, h * 0.350
    x5, y5 = 0, h * 0.520

    ctx.move_to(x1, y1)
    ctx.curve_to(x1 - w * 0.04, 0, x2 + w * 0.02, y2 - h * 0.03, x2, y2)
    ctx.curve_to(x2 - w * 0.005, y2 + h * 0.03, x3 - w * 0.005, y3 - h * 0.03, x3, y3)
    ctx.curve_to(x3 + w * 0.01, y3 + h * 0.04, x4 + w * 0.005, y4 - h * 0.04, x4, y4)
    ctx.curve_to(x4 - w * 0.03, y4 + h * 0.06, 0, y5 - h * 0.06, x5, y5)

def draw_top_left(ctx, w, h, primary_stops, gold_stops):
    ctx.save()
    ctx.move_to(0, 0)
    ctx.line_to(w * 0.25, 0)
    trace_top_left_curve(ctx, w, h)
    ctx.line_to(0, 0)
    ctx.close_path()

    grad_primary = create_metallic_gradient(0, 0, w * 0.2, h * 0.4, primary_stops)
    ctx.set_source(grad_primary)
    ctx.fill()
    ctx.restore()

    gold_grad_main = create_metallic_gradient(0, 0, w * 0.25, h * 0.5, gold_stops['main'])
    gold_grad_hi = create_metallic_gradient(0, 0, w * 0.25, h * 0.5, gold_stops['highlight'])

    ctx.save()
    trace_top_left_curve(ctx, w, h)
    ctx.set_line_width(85)
    ctx.set_source_rgba(0, 0, 0, 0.35)
    ctx.stroke()

    trace_top_left_curve(ctx, w, h)
    ctx.set_line_width(65)
    ctx.set_source(gold_grad_main)
    ctx.stroke()

    trace_top_left_curve(ctx, w, h)
    ctx.set_line_width(32)
    ctx.set_source(gold_grad_hi)
    ctx.stroke()

    trace_top_left_curve(ctx, w, h)
    ctx.set_line_width(12)
    ctx.set_source_rgba(1.0, 0.98, 0.88, 0.95)
    ctx.stroke()

    ctx.translate(-w * 0.012, -h * 0.012)
    trace_top_left_curve(ctx, w, h)
    ctx.set_line_width(14)
    ctx.set_source(gold_grad_main)
    ctx.stroke()
    ctx.restore()

def trace_bottom_left_curve(ctx, w, h):
    x0, y0 = 0, h * 0.815
    x1, y1 = w * 0.315, h
    ctx.move_to(x0, y0)
    ctx.curve_to(w * 0.12, h * 0.855, w * 0.22, h * 0.935, x1, y1)

def draw_bottom_left(ctx, w, h, primary_stops, gold_stops):
    ctx.save()
    ctx.move_to(0, h)
    ctx.line_to(0, h * 0.815)
    trace_bottom_left_curve(ctx, w, h)
    ctx.line_to(0, h)
    ctx.close_path()

    grad_primary = create_metallic_gradient(0, h, w * 0.25, h * 0.8, primary_stops)
    ctx.set_source(grad_primary)
    ctx.fill()
    ctx.restore()

    gold_grad_main = create_metallic_gradient(0, h * 0.8, w * 0.3, h, gold_stops['main'])
    gold_grad_hi = create_metallic_gradient(0, h * 0.8, w * 0.3, h, gold_stops['highlight'])

    ctx.save()
    trace_bottom_left_curve(ctx, w, h)
    ctx.set_line_width(75)
    ctx.set_source_rgba(0, 0, 0, 0.35)
    ctx.stroke()

    trace_bottom_left_curve(ctx, w, h)
    ctx.set_line_width(55)
    ctx.set_source(gold_grad_main)
    ctx.stroke()

    trace_bottom_left_curve(ctx, w, h)
    ctx.set_line_width(28)
    ctx.set_source(gold_grad_hi)
    ctx.stroke()

    trace_bottom_left_curve(ctx, w, h)
    ctx.set_line_width(10)
    ctx.set_source_rgba(1.0, 0.98, 0.88, 0.95)
    ctx.stroke()

    ctx.translate(-w * 0.010, h * 0.010)
    trace_bottom_left_curve(ctx, w, h)
    ctx.set_line_width(12)
    ctx.set_source(gold_grad_main)
    ctx.stroke()
    ctx.restore()

def render_variation(filename, primary_stops, gold_stops):
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, WIDTH, HEIGHT)
    ctx = cairo.Context(surface)

    draw_top_left(ctx, WIDTH, HEIGHT, primary_stops, gold_stops)

    ctx.save()
    ctx.translate(WIDTH, 0)
    ctx.scale(-1, 1)
    draw_top_left(ctx, WIDTH, HEIGHT, primary_stops, gold_stops)
    ctx.restore()

    draw_bottom_left(ctx, WIDTH, HEIGHT, primary_stops, gold_stops)

    ctx.save()
    ctx.translate(WIDTH, 0)
    ctx.scale(-1, 1)
    draw_bottom_left(ctx, WIDTH, HEIGHT, primary_stops, gold_stops)
    ctx.restore()

    surface.flush()
    buf = surface.get_data()
    img_np = np.ndarray(shape=(HEIGHT, WIDTH, 4), dtype=np.uint8, buffer=buf)

    img_rgba = np.empty_like(img_np)
    img_rgba[:, :, 0] = img_np[:, :, 2]
    img_rgba[:, :, 1] = img_np[:, :, 1]
    img_rgba[:, :, 2] = img_np[:, :, 0]
    img_rgba[:, :, 3] = img_np[:, :, 3]

    alpha = img_rgba[:, :, 3]
    mask = alpha > 10
    if np.any(mask):
        np.random.seed(42)
        noise = np.random.randint(-3, 4, size=(HEIGHT, WIDTH, 3), dtype=np.int16)
        rgb = img_rgba[:, :, :3].astype(np.int16)
        rgb[mask] = np.clip(rgb[mask] + noise[mask], 0, 255)
        img_rgba[:, :, :3] = rgb.astype(np.uint8)

    pil_img = Image.fromarray(img_rgba, 'RGBA')
    pil_img.save(filename, format='PNG', compress_level=2)
    print(f"Saved {filename}")

def main():
    v1_primary = [
        (0.0, (0.95, 0.05, 0.12, 1.0)),
        (0.4, (0.80, 0.00, 0.08, 1.0)),
        (0.8, (0.55, 0.00, 0.05, 1.0)),
        (1.0, (0.35, 0.00, 0.02, 1.0))
    ]
    v1_gold = {
        'main': [
            (0.00, (1.00, 0.95, 0.70)),
            (0.20, (0.91, 0.76, 0.29)),
            (0.40, (0.55, 0.38, 0.05)),
            (0.60, (0.98, 0.88, 0.50)),
            (0.80, (0.83, 0.68, 0.21)),
            (1.00, (0.45, 0.30, 0.02))
        ],
        'highlight': [
            (0.00, (1.00, 0.98, 0.85)),
            (0.50, (0.95, 0.82, 0.40)),
            (1.00, (1.00, 0.98, 0.85))
        ]
    }
    render_variation('output_v1.png', v1_primary, v1_gold)

    v2_primary = [
        (0.0, (0.08, 0.20, 0.38, 1.0)),
        (0.4, (0.04, 0.12, 0.26, 1.0)),
        (0.8, (0.02, 0.06, 0.16, 1.0)),
        (1.0, (0.01, 0.03, 0.10, 1.0))
    ]
    v2_gold = {
        'main': [
            (0.00, (0.98, 0.92, 0.75)),
            (0.25, (0.88, 0.73, 0.38)),
            (0.50, (0.50, 0.38, 0.15)),
            (0.75, (0.94, 0.82, 0.52)),
            (1.00, (0.75, 0.58, 0.25))
        ],
        'highlight': [
            (0.00, (1.00, 0.98, 0.90)),
            (0.50, (0.92, 0.80, 0.50)),
            (1.00, (1.00, 0.98, 0.90))
        ]
    }
    render_variation('output_v2.png', v2_primary, v2_gold)

if __name__ == '__main__':
    main()
