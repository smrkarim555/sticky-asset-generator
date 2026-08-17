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


import cairo
import math
import random

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def render_network(filename, primary_hex, secondary_hex):
    width, height = 3840, 3840
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    ctx = cairo.Context(surface)
    
    # Transparent background
    ctx.set_source_rgba(0, 0, 0, 0)
    ctx.paint()
    
    p_rgb = hex_to_rgb(primary_hex)
    s_rgb = hex_to_rgb(secondary_hex)
    
    random.seed(42)
    
    # Draw overlapping geometric grid lines (diamond pattern inspired by reference)
    ctx.set_line_width(4.0)
    
    # Generate base diagonal grid
    step = 240
    start_y = height * 0.4
    
    for i in range(-10, 25):
        # Diagonal up-right
        ctx.begin_path()
        x_start = i * step
        y_start = height
        ctx.move_to(x_start, y_start)
        ctx.line_to(x_start + height - start_y, start_y)
        
        # Add gradient or semi-transparent stroke
        pattern = cairo.LinearGradient(x_start, y_start, x_start + height - start_y, start_y)
        pattern.add_color_stop_rgba(0.0, p_rgb[0], p_rgb[1], p_rgb[2], 0.1)
        pattern.add_color_stop_rgba(0.5, p_rgb[0], p_rgb[1], p_rgb[2], 0.8)
        pattern.add_color_stop_rgba(1.0, p_rgb[0], p_rgb[1], p_rgb[2], 0.0)
        
        ctx.set_source(pattern)
        ctx.stroke()
        
        # Diagonal up-left
        ctx.begin_path()
        x_start2 = width - (i * step)
        ctx.move_to(x_start2, y_start)
        ctx.line_to(x_start2 - (height - start_y), start_y)
        
        pattern2 = cairo.LinearGradient(x_start2, y_start, x_start2 - (height - start_y), start_y)
        pattern2.add_color_stop_rgba(0.0, s_rgb[0], s_rgb[1], s_rgb[2], 0.1)
        pattern2.add_color_stop_rgba(0.5, s_rgb[0], s_rgb[1], s_rgb[2], 0.8)
        pattern2.add_color_stop_rgba(1.0, s_rgb[0], s_rgb[1], s_rgb[2], 0.0)
        
        ctx.set_source(pattern2)
        ctx.stroke()

    # Draw nodes and intersections
    for _ in range(120):
        nx = random.randint(200, width - 200)
        ny = random.randint(int(height * 0.45), height - 100)
        radius = random.randint(12, 35)
        
        # Radial glow for nodes
        rad_pat = cairo.RadialGradient(nx, ny, 0, nx, ny, radius * 2)
        rad_pat.add_color_stop_rgba(0.0, p_rgb[0], p_rgb[1], p_rgb[2], 0.9)
        rad_pat.add_color_stop_rgba(0.5, s_rgb[0], s_rgb[1], s_rgb[2], 0.5)
        rad_pat.add_color_stop_rgba(1.0, s_rgb[0], s_rgb[1], s_rgb[2], 0.0)
        
        ctx.set_source(rad_pat)
        ctx.arc(nx, ny, radius * 2, 0, 2 * math.pi)
        ctx.fill()
        
        # Core bright dot
        ctx.set_source_rgba(1, 1, 1, 0.9)
        ctx.arc(nx, ny, radius * 0.3, 0, 2 * math.pi)
        ctx.fill()
        
    # Scatter stardust particles
    for _ in range(300):
        px = random.randint(100, width - 100)
        py = random.randint(int(height * 0.2), height - 50)
        pr = random.uniform(2, 6)
        alpha = random.uniform(0.2, 0.7)
        
        ctx.set_source_rgba(p_rgb[0], p_rgb[1], p_rgb[2], alpha)
        ctx.arc(px, py, pr, 0, 2 * math.pi)
        ctx.fill()

    surface.write_to_png(filename)

render_network('output_v1.png', '#00b4ff', '#0077ff')
render_network('output_v2.png', '#00e5ff', '#7c4dff')
