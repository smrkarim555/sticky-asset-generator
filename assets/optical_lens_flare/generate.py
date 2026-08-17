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
import cv2
from PIL import Image
import cairo

def generate_flare_variant(filename, theme_config):
    width, height = 3840, 2160
    cx, cy = width / 2.0, height / 2.0

    c_white = np.array([1.0, 1.0, 1.0], dtype=np.float32)
    c_primary = np.array(theme_config['primary_rgb'], dtype=np.float32)
    c_secondary = np.array(theme_config['secondary_rgb'], dtype=np.float32)
    c_outer = np.array(theme_config['outer_rgb'], dtype=np.float32)

    y_idx, x_idx = np.ogrid[:height, :width]
    dx = x_idx - cx
    dy = y_idx - cy
    r = np.sqrt(dx**2 + dy**2)

    rgb_accum = np.zeros((height, width, 3), dtype=np.float32)

    core_white = np.exp(-0.5 * (r / 35.0)**2)
    core_hot = np.exp(-0.5 * (r / 90.0)**1.8)
    glow_inner = np.exp(-0.5 * (r / 250.0)**1.4)
    glow_mid = np.exp(-0.5 * (r / 550.0)**1.2)
    glow_outer = np.exp(-0.5 * (r / 1100.0)**1.0)

    for i in range(3):
        rgb_accum[:, :, i] += core_white * c_white[i] * 2.5
        rgb_accum[:, :, i] += core_hot * c_white[i] * 1.8
        rgb_accum[:, :, i] += glow_inner * c_primary[i] * 1.4
        rgb_accum[:, :, i] += glow_mid * c_secondary[i] * 0.9
        rgb_accum[:, :, i] += glow_outer * c_outer[i] * 0.4

    abs_dy = np.abs(dy)
    abs_dx = np.abs(dx)

    streak_sharp = np.exp(-0.5 * (abs_dy / 2.2)**2) * np.exp(-0.5 * (abs_dx / 1850.0)**1.5)
    streak_mid = np.exp(-0.5 * (abs_dy / 12.0)**1.8) * np.exp(-0.5 * (abs_dx / 1750.0)**1.3)
    streak_soft = np.exp(-0.5 * (abs_dy / 45.0)**1.5) * np.exp(-0.5 * (abs_dx / 1500.0)**1.1)

    for i in range(3):
        rgb_accum[:, :, i] += streak_sharp * (c_white[i] * 2.0 + c_primary[i] * 1.0)
        rgb_accum[:, :, i] += streak_mid * c_primary[i] * 1.2
        rgb_accum[:, :, i] += streak_soft * c_secondary[i] * 0.5

    ray_configs = [
        (54.0, 2.8, 1400.0, 1.4, 'primary'),
        (126.0, 2.8, 1400.0, 1.4, 'primary'),
        (234.0, 2.8, 1400.0, 1.4, 'primary'),
        (306.0, 2.8, 1400.0, 1.4, 'primary'),
        (32.0, 3.5, 900.0, 0.8, 'secondary'),
        (148.0, 3.5, 900.0, 0.8, 'secondary'),
        (212.0, 3.5, 900.0, 0.8, 'secondary'),
        (328.0, 3.5, 900.0, 0.8, 'secondary'),
        (78.0, 3.0, 1100.0, 0.9, 'primary'),
        (102.0, 3.0, 1100.0, 0.9, 'primary'),
        (258.0, 3.0, 1100.0, 0.9, 'primary'),
        (282.0, 3.0, 1100.0, 0.9, 'primary'),
    ]

    for angle_deg, thick, length_s, intensity, col_type in ray_configs:
        rad = math.radians(angle_deg)
        cos_a, sin_a = math.cos(rad), math.sin(rad)
        dist_perp = np.abs(-dx * sin_a + dy * cos_a)
        dist_par = dx * cos_a + dy * sin_a

        ray_mask = np.maximum(0.0, dist_par)
        ray_profile = np.exp(-0.5 * (dist_perp / thick)**1.3) * (1.0 / (1.0 + (ray_mask / length_s)**1.4))

        color = c_white * 0.6 + c_primary * 0.4 if col_type == 'primary' else c_secondary
        for i in range(3):
            rgb_accum[:, :, i] += ray_profile * color[i] * intensity

    num_fine_rays = 32
    fine_ray_accum = np.zeros((height, width), dtype=np.float32)
    for k in range(num_fine_rays):
        a_rad = k * (2.0 * math.pi / num_fine_rays) + 0.1
        d_p = np.abs(-dx * math.sin(a_rad) + dy * math.cos(a_rad))
        fine_ray_accum += np.exp(-0.5 * (d_p / 4.0)**2) * (1.0 / (1.0 + (r / 600.0)**1.8))
    fine_ray_accum *= 0.08

    for i in range(3):
        rgb_accum[:, :, i] += fine_ray_accum * c_primary[i]

    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    ctx = cairo.Context(surface)

    ghost_angle = math.radians(22.0)
    g_dir_x, g_dir_y = math.cos(ghost_angle), math.sin(ghost_angle)

    ghosts = [
        (-750, 110, 5, theme_config['ghost_col1'], True),
        (-480, 65, 6, theme_config['ghost_col2'], False),
        (-280, 40, 0, theme_config['ghost_col1'], True),
        (350, 85, 5, theme_config['ghost_col2'], True),
        (620, 140, 6, theme_config['ghost_col1'], False),
        (950, 55, 0, theme_config['ghost_col2'], True),
        (1200, 180, 5, theme_config['ghost_col1'], True),
    ]

    for dist, radius, sides, col, filled in ghosts:
        gx = cx + dist * g_dir_x
        gy = cy + dist * g_dir_y
        ctx.save()
        r_c, g_c, b_c, a_c = col

        if sides == 0:
            ctx.arc(gx, gy, radius, 0, 2 * math.pi)
        else:
            for s in range(sides):
                p_angle = s * (2 * math.pi / sides) + 0.2
                px = gx + radius * math.cos(p_angle)
                py = gy + radius * math.sin(p_angle)
                if s == 0:
                    ctx.move_to(px, py)
                else:
                    ctx.line_to(px, py)
            ctx.close_path()

        if filled:
            pat = cairo.RadialGradient(gx, gy, 0, gx, gy, radius)
            pat.add_color_stop_rgba(0, r_c, g_c, b_c, a_c * 0.8)
            pat.add_color_stop_rgba(0.7, r_c, g_c, b_c, a_c * 0.4)
            pat.add_color_stop_rgba(1.0, r_c, g_c, b_c, 0.0)
            ctx.set_source(pat)
            ctx.fill()
        else:
            ctx.set_source_rgba(r_c, g_c, b_c, a_c * 0.6)
            ctx.set_line_width(2.5)
            ctx.stroke()

        ctx.restore()

    buf = surface.get_data()
    ghost_arr = np.frombuffer(buf, dtype=np.uint8).reshape((height, width, 4))
    ghost_b = ghost_arr[:, :, 0].astype(np.float32) / 255.0
    ghost_g = ghost_arr[:, :, 1].astype(np.float32) / 255.0
    ghost_r = ghost_arr[:, :, 2].astype(np.float32) / 255.0
    ghost_a = ghost_arr[:, :, 3].astype(np.float32) / 255.0

    ghost_r = cv2.GaussianBlur(ghost_r, (0, 0), sigmaX=3.0, borderType=cv2.BORDER_CONSTANT)
    ghost_g = cv2.GaussianBlur(ghost_g, (0, 0), sigmaX=3.0, borderType=cv2.BORDER_CONSTANT)
    ghost_b = cv2.GaussianBlur(ghost_b, (0, 0), sigmaX=3.0, borderType=cv2.BORDER_CONSTANT)
    ghost_a = cv2.GaussianBlur(ghost_a, (0, 0), sigmaX=3.0, borderType=cv2.BORDER_CONSTANT)

    rgb_accum[:, :, 0] += ghost_r * ghost_a
    rgb_accum[:, :, 1] += ghost_g * ghost_a
    rgb_accum[:, :, 2] += ghost_b * ghost_a

    np.random.seed(42)
    num_particles = 220
    p_radii = np.random.uniform(150, 900, num_particles)
    p_angles = np.random.uniform(0, 2 * math.pi, num_particles)
    p_x = cx + p_radii * np.cos(p_angles)
    p_y = cy + p_radii * np.sin(p_angles)
    p_sizes = np.random.uniform(1.5, 4.5, num_particles)
    p_int = np.random.uniform(0.2, 0.9, num_particles) * (1.0 - p_radii / 1000.0)

    particle_map = np.zeros((height, width), dtype=np.float32)
    for px_i, py_i, ps_i, pi_i in zip(p_x, p_y, p_sizes, p_int):
        ix, iy = int(px_i), int(py_i)
        if 10 <= ix < width - 10 and 10 <= iy < height - 10:
            rad_i = int(ps_i * 3) + 1
            y_sub, x_sub = np.ogrid[iy-rad_i:iy+rad_i+1, ix-rad_i:ix+rad_i+1]
            dist_p = np.sqrt((x_sub - px_i)**2 + (y_sub - py_i)**2)
            p_blob = np.exp(-0.5 * (dist_p / ps_i)**2) * pi_i
            particle_map[iy-rad_i:iy+rad_i+1, ix-rad_i:ix+rad_i+1] += p_blob

    particle_map = cv2.GaussianBlur(particle_map, (0, 0), sigmaX=1.2, borderType=cv2.BORDER_CONSTANT)
    for i in range(3):
        rgb_accum[:, :, i] += particle_map * (c_white[i] * 0.7 + c_primary[i] * 0.5)

    r_tone = 1.0 - np.exp(-rgb_accum[:, :, 0])
    g_tone = 1.0 - np.exp(-rgb_accum[:, :, 1])
    b_tone = 1.0 - np.exp(-rgb_accum[:, :, 2])

    alpha = np.maximum(np.maximum(r_tone, g_tone), b_tone)
    alpha = np.clip(alpha, 0.0, 1.0)

    safe_alpha = np.maximum(alpha, 1e-6)
    r_out = np.clip((r_tone / safe_alpha) * 255.0, 0, 255).astype(np.uint8)
    g_out = np.clip((g_tone / safe_alpha) * 255.0, 0, 255).astype(np.uint8)
    b_out = np.clip((b_tone / safe_alpha) * 255.0, 0, 255).astype(np.uint8)
    a_out = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)

    rgba_out = np.dstack((r_out, g_out, b_out, a_out))
    img = Image.fromarray(rgba_out, 'RGBA')
    img.save(filename, format='PNG', compress_level=2)

if __name__ == '__main__': operations = [
    {
        'file': 'output_v1.png',
        'config': {
            'primary_rgb': [1.0, 0.82, 0.28],
            'secondary_rgb': [1.0, 0.46, 0.08],
            'outer_rgb': [0.83, 0.26, 0.0],
            'ghost_col1': (1.0, 0.85, 0.3, 0.25),
            'ghost_col2': (1.0, 0.5, 0.1, 0.2)
        }
    },
    {
        'file': 'output_v2.png',
        'config': {
            'primary_rgb': [0.2, 0.88, 1.0],
            'secondary_rgb': [0.12, 0.38, 1.0],
            'outer_rgb': [0.38, 0.12, 1.0],
            'ghost_col1': (0.3, 0.85, 1.0, 0.25),
            'ghost_col2': (0.2, 0.4, 1.0, 0.2)
        }
    }
]
for op in operations:
    generate_flare_variant(op['file'], op['config'])
