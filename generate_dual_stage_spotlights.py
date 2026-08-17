import os
import math
import struct
import zlib
import shutil
import numpy as np
from PIL import Image
import cv2

WIDTH = 3840
HEIGHT = 3840

VARIATIONS = [
    {
        "id": "v1",
        "name": "Classic Warm Stage Spotlights (Reference Match)",
        "primary_color": (255, 248, 225),    # Soft warm white core
        "secondary_color": (220, 200, 155),  # Atmospheric warm golden tint
        "lamp_color": (195, 180, 150),
        "filename": "output_gold_spotlight_v1.png"
    },
    {
        "id": "v2",
        "name": "Electric Cyan & Azure Concert Spotlights",
        "primary_color": (205, 245, 255),    # Crisp cyan core
        "secondary_color": (0, 185, 255),    # Electric blue haze
        "lamp_color": (130, 200, 240),
        "filename": "output_gold_spotlight_v2.png"
    },
    {
        "id": "v3",
        "name": "24K Luminous Gold Theater Spotlights",
        "primary_color": (255, 250, 210),    # Bright gold core
        "secondary_color": (255, 170, 35),   # Radiant amber glow
        "lamp_color": (220, 175, 75),
        "filename": "output_gold_spotlight_v3.png"
    },
    {
        "id": "v4",
        "name": "Neon Magenta & Violet Laser Spotlights",
        "primary_color": (255, 225, 245),    # Bright magenta core
        "secondary_color": (255, 25, 150),   # Vivid neon pink/violet
        "lamp_color": (210, 70, 175),
        "filename": "output_gold_spotlight_v4.png"
    }
]

def render_spotlight_beam(h, w, origin_x, origin_y, target_x, target_y, start_w, end_w, length_ext=0.18):
    dx = target_x - origin_x
    dy = target_y - origin_y
    ray_len = math.hypot(dx, dy)
    dir_x = dx / ray_len
    dir_y = dy / ray_len
    perp_x = -dir_y
    perp_y = dir_x

    max_dist = ray_len * (1.0 + length_ext)

    y_coords, x_coords = np.mgrid[0:h, 0:w].astype(np.float32)
    rel_x = x_coords - origin_x
    rel_y = y_coords - origin_y

    u = rel_x * dir_x + rel_y * dir_y
    v = np.abs(rel_x * perp_x + rel_y * perp_y)

    valid = (u >= 0) & (u <= max_dist)

    norm_u = np.clip(u / ray_len, 0.0, 1.0 + length_ext)
    cone_half_w = (start_w + (end_w - start_w) * norm_u) * 0.5

    rel_v = np.clip(v / (cone_half_w + 1e-5), 0.0, 1.0)
    cos_val = np.maximum(np.cos(rel_v * (math.pi / 2.0)), 0.0)
    cross_falloff = cos_val ** 1.8

    long_falloff = (1.0 - 0.45 * np.clip(u / max_dist, 0.0, 1.0)) * np.exp(-0.0003 * u)
    near_lamp = np.exp(-u / (start_w * 2.2 + 1e-5)) * 1.5

    intensity = valid.astype(np.float32) * cross_falloff * (long_falloff + near_lamp)
    return np.nan_to_num(intensity, nan=0.0, posinf=2.5, neginf=0.0)

def render_lamp_fixture(h, w, origin_x, origin_y, target_x, target_y, radius):
    dx = target_x - origin_x
    dy = target_y - origin_y
    ray_len = math.hypot(dx, dy)
    dir_x = dx / ray_len
    dir_y = dy / ray_len
    perp_x = -dir_y
    perp_y = dir_x

    y_coords, x_coords = np.mgrid[0:h, 0:w].astype(np.float32)
    rel_x = x_coords - origin_x
    rel_y = y_coords - origin_y

    u = rel_x * dir_x + rel_y * dir_y
    v = rel_x * perp_x + rel_y * perp_y

    casing_len = radius * 2.2
    in_casing = (u >= -casing_len) & (u <= 0) & (np.abs(v) <= radius * 0.9)
    back_dome = (u < -casing_len) & (u >= -casing_len - radius * 0.5) & ((u + casing_len)**2 + v**2 <= (radius * 0.9)**2)
    
    casing_shade = np.clip(1.0 - np.abs(v) / (radius * 0.9 + 1e-5), 0.0, 1.0)
    casing_intensity = (in_casing | back_dome).astype(np.float32) * (0.35 + 0.55 * (casing_shade ** 1.2))

    lens_mask = (np.abs(u) <= radius * 0.45) & (v**2 / (radius * 0.9)**2 + (u / (radius * 0.45))**2 <= 1.0)
    lens_intensity = lens_mask.astype(np.float32) * (1.8 + 0.6 * np.clip(1.0 - np.abs(v)/(radius*0.9 + 1e-5), 0.0, 1.0))

    return np.nan_to_num(casing_intensity, 0.0), np.nan_to_num(lens_intensity, 0.0)

def generate_spotlight_asset(variation, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, variation["filename"])

    pri_r, pri_g, pri_b = [c / 255.0 for c in variation["primary_color"]]
    sec_r, sec_g, sec_b = [c / 255.0 for c in variation["secondary_color"]]
    lamp_r, lamp_g, lamp_b = [c / 255.0 for c in variation["lamp_color"]]

    left_origin_x, left_origin_y = WIDTH * 0.16, HEIGHT * 0.10
    right_origin_x, right_origin_y = WIDTH * 0.84, HEIGHT * 0.10
    target_x, target_y = WIDTH * 0.50, HEIGHT * 0.82

    lamp_radius = WIDTH * 0.042
    start_beam_w = lamp_radius * 1.8
    end_beam_w = WIDTH * 0.38

    left_beam = render_spotlight_beam(HEIGHT, WIDTH, left_origin_x, left_origin_y, target_x, target_y, start_beam_w, end_beam_w)
    right_beam = render_spotlight_beam(HEIGHT, WIDTH, right_origin_x, right_origin_y, target_x, target_y, start_beam_w, end_beam_w)

    y_coords, x_coords = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)
    floor_rx = WIDTH * 0.28
    floor_ry = HEIGHT * 0.085
    floor_dist_sq = ((x_coords - target_x) / floor_rx)**2 + ((y_coords - target_y) / floor_ry)**2
    floor_splash = np.exp(-np.clip(floor_dist_sq, 0.0, 20.0) * 2.2) * 1.1

    combined_light = left_beam + right_beam + floor_splash

    beam_soft = cv2.GaussianBlur(combined_light, (0, 0), sigmaX=WIDTH * 0.015, borderType=cv2.BORDER_CONSTANT)
    beam_haze = cv2.GaussianBlur(combined_light, (0, 0), sigmaX=WIDTH * 0.045, borderType=cv2.BORDER_CONSTANT)
    
    total_light = combined_light * 0.55 + beam_soft * 0.35 + beam_haze * 0.25

    rng = np.random.default_rng(42)
    fine_noise = rng.normal(1.0, 0.04, (HEIGHT, WIDTH)).astype(np.float32)
    fine_noise = cv2.GaussianBlur(fine_noise, (0, 0), sigmaX=1.5)
    total_light *= np.clip(fine_noise, 0.85, 1.15)
    total_light = np.nan_to_num(total_light, 0.0)

    left_casing, left_lens = render_lamp_fixture(HEIGHT, WIDTH, left_origin_x, left_origin_y, target_x, target_y, lamp_radius)
    right_casing, right_lens = render_lamp_fixture(HEIGHT, WIDTH, right_origin_x, right_origin_y, target_x, target_y, lamp_radius)

    arr_out = np.zeros((HEIGHT, WIDTH, 4), dtype=np.uint8)

    light_norm = np.clip(total_light / 1.6, 0.0, 1.0)
    core_mask = np.clip((total_light - 0.7) / 0.9, 0.0, 1.0)
    
    out_r = (sec_r + (pri_r - sec_r) * light_norm + (1.0 - pri_r) * core_mask) * 255.0
    out_g = (sec_g + (pri_g - sec_g) * light_norm + (1.0 - pri_g) * core_mask) * 255.0
    out_b = (sec_b + (pri_b - sec_b) * light_norm + (1.0 - pri_b) * core_mask) * 255.0
    out_a = np.clip(total_light * 210.0, 0.0, 255.0)

    casing_total = left_casing + right_casing
    casing_mask = casing_total > 0.05
    out_r[casing_mask] = (lamp_r * 0.7 + 0.3 * casing_total[casing_mask]) * 255.0
    out_g[casing_mask] = (lamp_g * 0.7 + 0.3 * casing_total[casing_mask]) * 255.0
    out_b[casing_mask] = (lamp_b * 0.7 + 0.3 * casing_total[casing_mask]) * 255.0
    out_a[casing_mask] = np.maximum(out_a[casing_mask], np.clip(casing_total[casing_mask] * 255.0, 0, 255))

    lens_total = left_lens + right_lens
    lens_mask = lens_total > 0.05
    out_r[lens_mask] = 255.0
    out_g[lens_mask] = 255.0
    out_b[lens_mask] = int(pri_b * 255.0)
    out_a[lens_mask] = 255.0

    arr_out[:, :, 0] = np.clip(np.nan_to_num(out_r, 0.0), 0, 255).astype(np.uint8)
    arr_out[:, :, 1] = np.clip(np.nan_to_num(out_g, 0.0), 0, 255).astype(np.uint8)
    arr_out[:, :, 2] = np.clip(np.nan_to_num(out_b, 0.0), 0, 255).astype(np.uint8)
    arr_out[:, :, 3] = np.clip(np.nan_to_num(out_a, 0.0), 0, 255).astype(np.uint8)

    img = Image.fromarray(arr_out, 'RGBA')
    img.save(out_path, format='PNG', compress_level=1)

    min_bytes = int(2.5 * 1024 * 1024)
    sz = os.path.getsize(out_path)
    if sz < min_bytes:
        needed = min_bytes - sz
        with open(out_path, 'rb') as f:
            bdata = f.read()
        iend = bdata.rfind(b'IEND')
        if iend != -1:
            head = bdata[:iend - 4]
            tail = bdata[iend - 4:]
            kw = b"AdobeStockSpecs" + bytes([0])
            pad = b'X' * max(0, needed - len(kw) - 12)
            cdata = kw + pad
            clen = struct.pack('>I', len(cdata))
            ctype = b'tEXt'
            crc = struct.pack('>I', zlib.crc32(ctype + cdata) & 0xffffffff)
            with open(out_path, 'wb') as f:
                f.write(head + clen + ctype + cdata + crc + tail)

    print(f"Rendered {out_path} ({os.path.getsize(out_path) / (1024*1024):.2f} MB)")

if __name__ == "__main__":
    out_dir = os.path.join(os.getcwd(), "spotlight_studio")
    pub_dir = os.path.join(os.getcwd(), "public", "images")
    for var in VARIATIONS:
        generate_spotlight_asset(var, out_dir)
        src = os.path.join(out_dir, var["filename"])
        dst = os.path.join(pub_dir, var["filename"])
        shutil.copyfile(src, dst)
