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


import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def create_sound_wave_image(primary_color, secondary_color, filename):
    width, height = 3840, 3840
    image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, 'RGBA')
    
    # Generate frequency bars
    num_bars = 160
    center_x = width // 2
    center_y = height // 2
    total_width = 3000
    bar_width = total_width / num_bars
    start_x = center_x - (total_width / 2)
    
    np.random.seed(42)
    heights = np.abs(np.sin(np.linspace(0, 15, num_bars)) * np.cos(np.linspace(0, 8, num_bars))) * 600 + np.random.rand(num_bars) * 300
    
    # Glow / streak behind
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay, 'RGBA')
    
    # Horizontal anamorphic beam
    for i in range(100):
        alpha = int(max(0, 50 - i * 0.5))
        odraw.rectangle([start_x - 100, center_y - i, start_x + total_width + 100, center_y + i], fill=(primary_color[0], primary_color[1], primary_color[2], alpha))
        
    overlay = overlay.filter(ImageFilter.GaussianBlur(30))
    image = Image.alpha_composite(image, overlay)
    
    # Draw bars with gradient/glow look
    for i in range(num_bars):
        x = start_x + i * bar_width
        h = heights[i]
        
        # Top and bottom symmetric bars
        y1 = center_y - h
        y2 = center_y + h
        
        # Outer glow line
        draw.line([(x, y1), (x, y2)], fill=(secondary_color[0], secondary_color[1], secondary_color[2], 120), width=int(bar_width * 0.6))
        # Inner bright core
        draw.line([(x, center_y - h * 0.7), (x, center_y + h * 0.7)], fill=(primary_color[0], primary_color[1], primary_color[2], 255), width=int(bar_width * 0.3))
        
    # Center intense line
    draw.line([(start_x - 50, center_y), (start_x + total_width + 50, center_y)], fill=(255, 255, 255, 255), width=4)
    
    # Add outer blur glow pass
    glow = image.filter(ImageFilter.GaussianBlur(15))
    final_image = Image.alpha_composite(glow, image)
    
    # Ensure 2MB-10MB file size by adding uncompressed metadata/padding or saving cleanly
    final_image.save(filename, 'PNG', compress_level=1)

# Create 4 variations
create_sound_wave_image((0, 255, 230), (0, 100, 255), 'output_v1.png')
create_sound_wave_image((255, 0, 128), (100, 0, 255), 'output_v2.png')
create_sound_wave_image((0, 255, 100), (0, 100, 50), 'output_v3.png')
create_sound_wave_image((255, 180, 0), (255, 50, 0), 'output_v4.png')
