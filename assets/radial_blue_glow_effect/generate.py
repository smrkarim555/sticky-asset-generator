# PyCairo helper for quadratic curves & clean transparency
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


import math
import numpy as np
from PIL import Image
import cairo

def create_glow_asset(primary_hex, secondary_hex, filename):
    width, height = 3840, 2160
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    ctx = cairo.Context(surface)
    
    ctx.set_source_rgba(0, 0, 0, 0)
    ctx.paint()
    
    cx, cy = width / 2.0, height / 2.0
    max_radius = 1200.0
    
    def hex_to_rgb(hex_str):
        h = hex_str.lstrip('#')
        return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))
    
    p_rgb = hex_to_rgb(primary_hex)
    s_rgb = hex_to_rgb(secondary_hex)
    
    pat = cairo.RadialGradient(cx, cy, 0, cx, cy, max_radius)
    pat.add_color_stop_rgba(0.0, 1.0, 1.0, 1.0, 1.0)
    pat.add_color_stop_rgba(0.15, p_rgb[0], p_rgb[1], p_rgb[2], 0.95)
    pat.add_color_stop_rgba(0.5, s_rgb[0], s_rgb[1], s_rgb[2], 0.6)
    pat.add_color_stop_rgba(0.8, s_rgb[0], s_rgb[1], s_rgb[2], 0.15)
    pat.add_color_stop_rgba(1.0, 0.0, 0.0, 0.0, 0.0)
    
    ctx.set_source(pat)
    ctx.arc(cx, cy, max_radius, 0, 2 * math.pi)
    ctx.fill()
    
    surface.flush()
    buf = surface.get_data()
    img = np.ndarray(shape=(height, width, 4), dtype=np.uint8, buffer=buf)
    
    img_rgba = img[:, :, [2, 1, 0, 3]].copy()
    
    pil_img = Image.fromarray(img_rgba, 'RGBA')
    pil_img.save(filename, 'PNG', compress_level=1)

if __name__ == '__main__':
    create_glow_asset('#FFFFFF', '#3b9eff', 'output_v1.png')
    create_glow_asset('#FFFFFF', '#ff3b9e', 'output_v2.png')
    create_glow_asset('#FFFFFF', '#3bff9e', 'output_v3.png')
    create_glow_asset('#FFFFFF', '#ffde3b', 'output_v4.png')
