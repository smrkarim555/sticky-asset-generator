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
import cairo
import numpy as np
from PIL import Image

def create_aura(primary_color, secondary_color, filename):
    width, height = 3840, 3840
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    ctx = cairo.Context(surface)
    
    ctx.set_operator(cairo.OPERATOR_CLEAR)
    ctx.paint()
    ctx.set_operator(cairo.OPERATOR_OVER)
    
    cx, cy = width / 2.0, height / 2.0
    max_radius = width * 0.45
    
    pattern = cairo.RadialGradient(cx, cy, 0, cx, cy, max_radius)
    pattern.add_color_stop_rgba(0.0, 1.0, 1.0, 1.0, 0.95)
    pattern.add_color_stop_rgba(0.2, primary_color[0], primary_color[1], primary_color[2], 0.85)
    pattern.add_color_stop_rgba(0.5, secondary_color[0], secondary_color[1], secondary_color[2], 0.5)
    pattern.add_color_stop_rgba(0.8, secondary_color[0], secondary_color[1], secondary_color[2], 0.15)
    pattern.add_color_stop_rgba(1.0, secondary_color[0], secondary_color[1], secondary_color[2], 0.0)
    
    ctx.set_source(pattern)
    ctx.arc(cx, cy, max_radius, 0, 2 * math.pi)
    ctx.fill()
    
    # Inner core intense glow
    inner_pattern = cairo.RadialGradient(cx, cy, 0, cx, cy, max_radius * 0.2)
    inner_pattern.add_color_stop_rgba(0.0, 1.0, 1.0, 1.0, 1.0)
    inner_pattern.add_color_stop_rgba(1.0, 1.0, 1.0, 1.0, 0.0)
    
    ctx.set_source(inner_pattern)
    ctx.arc(cx, cy, max_radius * 0.2, 0, 2 * math.pi)
    ctx.fill()
    
    surface.flush()
    buf = surface.get_data()
    img = Image.frombuffer("RGBA", (width, height), buf, "raw", "BGRA", 0, 1)
    img.save(filename, "PNG", compress_level=1)

create_aura((0.3, 0.7, 1.0), (0.1, 0.4, 0.9), "output_v1.png")
create_aura((0.9, 0.4, 0.8), (0.5, 0.1, 0.6), "output_v2.png")
create_aura((0.2, 0.9, 0.5), (0.0, 0.5, 0.2), "output_v3.png")
create_aura((1.0, 0.8, 0.2), (0.9, 0.4, 0.0), "output_v4.png")
