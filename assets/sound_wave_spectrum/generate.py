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

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def draw_sound_wave(filename, color_stops):
    width, height = 3840, 3840
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    ctx = cairo.Context(surface)
    
    # Clear transparent
    ctx.set_source_rgba(0, 0, 0, 0)
    ctx.paint()
    
    num_bars = 90
    center_x = width / 2
    center_y = height / 2
    max_width = 2400
    bar_width = max_width / num_bars
    
    np.random.seed(42)
    heights = [np.sin(i * 0.1) * 400 + np.cos(i * 0.3) * 300 + 600 for i in range(num_bars)]
    
    for i in range(num_bars):
        x = center_x - (max_width / 2) + i * bar_width
        h = heights[i]
        
        # Gradient color interpolation along x
        t = i / float(num_bars - 1)
        # find color stop
        idx = t * (len(color_stops) - 1)
        idx_low = int(np.floor(idx))
        idx_high = min(idx_low + 1, len(color_stops) - 1)
        blend = idx - idx_low
        
        c1 = hex_to_rgb(color_stops[idx_low])
        c2 = hex_to_rgb(color_stops[idx_high])
        r = c1[0] * (1 - blend) + c2[0] * blend
        g = c1[1] * (1 - blend) + c2[1] * blend
        b = c1[2] * (1 - blend) + c2[2] * blend
        
        pat = cairo.LinearGradient(x, center_y - h/2, x, center_y + h/2)
        pat.add_color_stop_rgba(0, r, g, b, 0.0)
        pat.add_color_stop_rgba(0.2, r, g, b, 0.8)
        pat.add_color_stop_rgba(0.5, r, g, b, 1.0)
        pat.add_color_stop_rgba(0.8, r, g, b, 0.8)
        pat.add_color_stop_rgba(1, r, g, b, 0.0)
        
        ctx.set_source(pat)
        ctx.set_line_width(bar_width * 0.6)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.move_to(x, center_y - h/2)
        ctx.line_to(x, center_y + h/2)
        ctx.stroke()
        
    surface.write_to_png(filename)

draw_sound_wave('output_v1.png', ['#FF6B6B', '#FFE66D', '#4ECDC4', '#556270'])
draw_sound_wave('output_v2.png', ['#8A2387', '#E94057', '#F27121', '#FDC830'])
