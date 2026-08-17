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
cairo = None
try:
    import cairo
except ImportError:
    import cairocffi as cairo

def create_visualizer(filename, primary_color, secondary_color):
    width, height = 3840, 3840
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    ctx = cairo.Context(surface)
    
    # Clear background to transparent
    ctx.set_source_rgba(0, 0, 0, 0)
    ctx.paint()
    
    cx, cy = width / 2.0, height / 2.0
    radius = 900.0
    
    # Draw inner gradient glow
    pat = cairo.RadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.1)
    pat.add_color_stop_rgba(0.0, primary_color[0], primary_color[1], primary_color[2], 0.9)
    pat.add_color_stop_rgba(0.6, secondary_color[0], secondary_color[1], secondary_color[2], 0.4)
    pat.add_color_stop_rgba(1.0, 0, 0, 0, 0.0)
    ctx.set_source(pat)
    ctx.arc(cx, cy, radius * 1.1, 0, 2 * math.pi)
    ctx.fill()
    
    # Draw circular audio bars and spikes
    np.random.seed(42)
    num_bars = 360
    for i in range(num_bars):
        angle = (i / num_bars) * 2 * math.pi
        # pseudo-random height variation mimicking frequency spectrum
        val = abs(math.sin(i * 0.1) * math.cos(i * 0.05) + np.random.normal(0, 0.2))
        bar_height = 80 + val * 450
        
        x1 = cx + (radius) * math.cos(angle)
        y1 = cy + (radius) * math.sin(angle)
        x2 = cx + (radius + bar_height) * math.cos(angle)
        y2 = cy + (radius + bar_height) * math.sin(angle)
        
        ctx.set_source_rgb(primary_color[0], primary_color[1], primary_color[2])
        ctx.set_line_width(8.0)
        ctx.move_to(x1, y1)
        ctx.line_to(x2, y2)
        ctx.stroke()
        
        # Outer radiating sharp needle lines
        if i % 3 == 0:
            spike_len = bar_height * (1.2 + abs(np.random.normal(0, 0.5)))
            x3 = cx + (radius + bar_height) * math.cos(angle)
            y3 = cy + (radius + bar_height) * math.sin(angle)
            x4 = cx + (radius + spike_len) * math.cos(angle)
            y4 = cy + (radius + spike_len) * math.sin(angle)
            
            ctx.set_source_rgba(secondary_color[0], secondary_color[1], secondary_color[2], 0.7)
            ctx.set_line_width(2.0)
            ctx.move_to(x3, y3)
            ctx.line_to(x4, y4)
            ctx.stroke()

    surface.write_to_png(filename)

create_visualizer('output_v1.png', (0.05, 0.05, 0.05), (0.3, 0.3, 0.3))
create_visualizer('output_v2.png', (0.1, 0.2, 0.5), (0.2, 0.6, 0.9))
