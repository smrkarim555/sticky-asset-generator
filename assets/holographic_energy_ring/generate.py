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

def create_ring_asset(primary_color, secondary_color, filename):
    width, height = 3840, 3840
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    ctx = cairo.Context(surface)
    
    ctx.set_operator(cairo.OPERATOR_CLEAR)
    ctx.paint()
    ctx.set_operator(cairo.OPERATOR_OVER)
    
    cx, cy = width / 2.0, height / 2.0
    radius_x = 1200
    radius_y = 1000
    
    num_layers = 250
    for i in range(num_layers):
        fraction = i / float(num_layers)
        angle_offset = fraction * math.pi * 4.0
        
        ctx.begin_path()
        steps = 300
        for s in range(steps):
            theta = (s / float(steps)) * 2.0 * math.pi
            
            r_mod = 1.0 + 0.12 * math.sin(3.0 * theta + angle_offset) + 0.05 * math.cos(5.0 * theta - angle_offset * 1.5)
            curr_rx = radius_x * r_mod
            curr_ry = radius_y * r_mod
            
            x = cx + curr_rx * math.cos(theta)
            y = cy + curr_ry * math.sin(theta)
            
            if s == 0:
                ctx.move_to(x, y)
            else:
                ctx.line_to(x, y)
        ctx.close_path()
        
        r1, g1, b1 = primary_color
        r2, g2, b2 = secondary_color
        
        interp_r = r1 + (r2 - r1) * fraction
        interp_g = g1 + (g2 - g1) * fraction
        interp_b = b1 + (b2 - b1) * fraction
        alpha = 0.015 + 0.035 * math.sin(fraction * math.pi)
        
        ctx.set_source_rgba(interp_r, interp_g, interp_b, alpha)
        ctx.set_line_width(2.5)
        ctx.stroke()
        
    buf = surface.get_data()
    img = Image.frombuffer('RGBA', (width, height), buf, 'raw', 'BGRA', 0, 1)
    img.save(filename, 'PNG', optimize=False)

create_ring_asset((255/255.0, 100/255.0, 200/255.0), (100/255.0, 200/255.0, 255/255.0), 'output_v1.png')
create_ring_asset((150/255.0, 50/255.0, 255/255.0), (0/255.0, 255/255.0, 200/255.0), 'output_v2.png')
