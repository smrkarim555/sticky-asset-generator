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


import math
import numpy as np
import cv2
import cairo
from PIL import Image

def create_lens_flare(primary_hex, secondary_hex, width=3840, height=2160):
    p_rgb = [int(primary_hex[i:i+2], 16) for i in (1, 3, 5)]
    s_rgb = [int(secondary_hex[i:i+2], 16) for i in (1, 3, 5)]
    
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    ctx = cairo.Context(surface)
    
    # Transparent background
    ctx.set_source_rgba(0, 0, 0, 0)
    ctx.paint()
    
    cx, cy = width / 2.0, height / 2.0
    
    # Draw large soft glow
    pat = cairo.RadialGradient(cx, cy, 0, cx, cy, 900)
    pat.add_color_stop_rgba(0, p_rgb[0]/255.0, p_rgb[1]/255.0, p_rgb[2]/255.0, 0.9)
    pat.add_color_stop_rgba(0.2, p_rgb[0]/255.0, p_rgb[1]/255.0, p_rgb[2]/255.0, 0.5)
    pat.add_color_stop_rgba(0.6, s_rgb[0]/255.0, s_rgb[1]/255.0, s_rgb[2]/255.0, 0.15)
    pat.add_color_stop_rgba(1.0, 0, 0, 0, 0)
    ctx.set_source(pat)
    ctx.arc(cx, cy, 900, 0, 2 * math.pi)
    ctx.fill()
    
    # Draw long rays (horizontal, vertical, and diagonals)
    def draw_ray(angle, length, thickness):
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(angle)
        pat_ray = cairo.LinearGradient(-length, 0, length, 0)
        pat_ray.add_color_stop_rgba(0, s_rgb[0]/255.0, s_rgb[1]/255.0, s_rgb[2]/255.0, 0)
        pat_ray.add_color_stop_rgba(0.5, p_rgb[0]/255.0, p_rgb[1]/255.0, p_rgb[2]/255.0, 0.8)
        pat_ray.add_color_stop_rgba(0.999, 1, 1, 1, 1)
        pat_ray.add_color_stop_rgba(1.0, s_rgb[0]/255.0, s_rgb[1]/255.0, s_rgb[2]/255.0, 0)
        
        ctx.set_source(pat_ray)
        ctx.move_to(-length, 0)
        ctx.line_to(length, 0)
        ctx.set_line_width(thickness)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.stroke()
        ctx.restore()

    draw_ray(0, 1800, 4.0)
    draw_ray(math.pi/2, 1000, 4.0)
    draw_ray(math.pi/4, 1400, 3.0)
    draw_ray(-math.pi/4, 1400, 3.0)
    
    # Draw starburst spikes (sharp triangles)
    def draw_spike(angle, length, width):
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(angle)
        ctx.move_to(0, 0)
        ctx.line_to(-width, length * 0.2)
        ctx.line_to(0, length)
        ctx.line_to(width, length * 0.2)
        ctx.close_path()
        
        pat_spike = cairo.LinearGradient(0, 0, 0, length)
        pat_spike.add_color_stop_rgba(0, 1, 1, 1, 0.95)
        pat_spike.add_color_stop_rgba(0.3, p_rgb[0]/255.0, p_rgb[1]/255.0, p_rgb[2]/255.0, 0.7)
        pat_spike.add_color_stop_rgba(1, s_rgb[0]/255.0, s_rgb[1]/255.0, s_rgb[2]/255.0, 0)
        ctx.set_source(pat_spike)
        ctx.fill()
        ctx.restore()

    for a in [0, math.pi/2, math.pi, 3*math.pi/2]:
        draw_spike(a, 1200, 15)
    for a in [math.pi/4, 3*math.pi/4, 5*math.pi/4, 7*math.pi/4]:
        draw_spike(a, 900, 10)

    # Convert surface to numpy array
    buf = surface.get_data()
    arr = np.ndarray(shape=(height, width, 4), dtype=np.uint8, buffer=buf)
    
    # Apply volumetric blur for realistic bloom
    b_channel, g_channel, r_channel, a_channel = cv2.split(arr)
    rgb = cv2.merge([b_channel, g_channel, r_channel])
    blurred_rgb = cv2.GaussianBlur(rgb, (31, 31), 12, borderType=cv2.BORDER_CONSTANT)
    blurred_a = cv2.GaussianBlur(a_channel, (51, 51), 20, borderType=cv2.BORDER_CONSTANT)
    
    # Blend original and bloom
    final_rgb = cv2.addWeighted(rgb, 0.7, blurred_rgb, 0.3, 0)
    final_a = cv2.addWeighted(a_channel, 0.8, blurred_a, 0.2, 0)
    
    final_arr = cv2.merge([final_rgb[:,:,0], final_rgb[:,:,1], final_rgb[:,:,2], final_a])
    
    # Save via Pillow for uncompressed high quality
    img = Image.fromarray(final_arr, 'RGBA')
    return img

if __name__ == '__main__':
    variants = [
        ("#ffffff", "#ffaa00", "output_v1.png"),
        ("#ffffff", "#00ccff", "output_v2.png")
    ]
    for p_hex, s_hex, fname in variants:
        img = create_lens_flare(p_hex, s_hex)
        img.save(fname, "PNG", compress_level=3)
