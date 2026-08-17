import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

function generateComicSpeedLineBurstAssets() {
  const width = 3840;
  const height = 2160;
  const outputDir = path.join(process.cwd(), 'spotlight_studio');
  const publicDir = path.join(process.cwd(), 'public', 'images');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const variations = [
    {
      id: "output_gold_spotlight_v1.png",
      name: "Classic Crimson Maroon Comic Radial Speed Line Action Burst Frame",
      style: "classic_crimson_maroon",
      desc: "Deep crimson maroon manga action burst lines radiating outward with sharp tapered wedge spikes & clean central oval cutout"
    },
    {
      id: "output_gold_spotlight_v2.png",
      name: "Vivid Vermilion & Fiery Scarlet Manga Explosive Speed Line Focus Frame",
      style: "vivid_vermilion_scarlet",
      desc: "Intense vermilion & scarlet red radial impact speed spikes framing a high-energy center focal window"
    },
    {
      id: "output_gold_spotlight_v3.png",
      name: "High-Contrast Onyx Charcoal & Ink Black Manga Speed Burst Vignette",
      style: "onyx_ink_black",
      desc: "Bold ink black & charcoal manga action line burst with razor-sharp pen hatching and speed line impact rays"
    },
    {
      id: "output_gold_spotlight_v4.png",
      name: "Shimmering 24K Gold & Metallic Bronze Comic Speed Ray Frame",
      style: "metallic_24k_gold",
      desc: "Luminous metallic 24K gold & bronze radial speed rays with sparkling gold dust particles"
    }
  ];

  console.log("Generating 4K Comic Radial Speed Line Action Burst Frame PNG Assets...");

  // Draw a sharp tapered manga speed line wedge radiating from center
  function drawRadialSpeedSpike(ctx, cx, cy, innerR, outerR, angleRad, innerWidth, outerWidth, colorMain, colorDark) {
    ctx.save();

    const x1 = cx + Math.cos(angleRad) * innerR;
    const y1 = cy + Math.sin(angleRad) * innerR;

    const x2 = cx + Math.cos(angleRad) * outerR;
    const y2 = cy + Math.sin(angleRad) * outerR;

    // Perpendicular angle for width offset
    const perpAngle = angleRad + Math.PI / 2;
    const cosP = Math.cos(perpAngle);
    const sinP = Math.sin(perpAngle);

    // Polygon 4 points for tapered wedge
    const p1x = x1 - cosP * (innerWidth / 2);
    const p1y = y1 - sinP * (innerWidth / 2);

    const p2x = x1 + cosP * (innerWidth / 2);
    const p2y = y1 + sinP * (innerWidth / 2);

    const p3x = x2 + cosP * (outerWidth / 2);
    const p3y = y2 + sinP * (outerWidth / 2);

    const p4x = x2 - cosP * (outerWidth / 2);
    const p4y = y2 - sinP * (outerWidth / 2);

    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.lineTo(p3x, p3y);
    ctx.lineTo(p4x, p4y);
    ctx.closePath();

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, colorMain);
    grad.addColorStop(0.7, colorMain);
    grad.addColorStop(1, colorDark);

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
  }

  variations.forEach((variant) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 100% transparent canvas background
    ctx.clearRect(0, 0, width, height);

    let seed = 888111 + variant.name.length * 999;
    function random() {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    const cx = width / 2;
    const cy = height / 2;

    // Oval radii for central opening cutout
    const rxInner = 520; // horizontal inner gap
    const ryInner = 360; // vertical inner gap

    // Set colors based on style
    let colorMain, colorLight, colorDark;

    if (variant.style === 'classic_crimson_maroon') {
      colorMain = '#800000';     // Deep Maroon (matching exact image)
      colorLight = '#B3001B';    // Crimson
      colorDark = '#4D0000';     // Dark Cherry
    } else if (variant.style === 'vivid_vermilion_scarlet') {
      colorMain = '#E61900';     // Vivid Vermilion
      colorLight = '#FF4D33';    // Bright Scarlet
      colorDark = '#991000';     // Dark Red
    } else if (variant.style === 'onyx_ink_black') {
      colorMain = '#141416';     // Ink Black
      colorLight = '#33363D';    // Charcoal
      colorDark = '#050506';     // Onyx Black
    } else { // metallic_24k_gold
      colorMain = '#D4AF37';     // Metallic Gold
      colorLight = '#FFD700';    // 24K Gold
      colorDark = '#8C6D1F';     // Antique Bronze
    }

    // 1. DENSE INNER LAYER: Fine razor speed lines around inner oval boundary
    const innerSpikeCount = 280;
    for (let i = 0; i < innerSpikeCount; i++) {
      const angle = (i / innerSpikeCount) * Math.PI * 2 + (random() - 0.5) * 0.02;

      // Distance to ellipse boundary at this angle
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const normDist = Math.sqrt((cosA * cosA) / (rxInner * rxInner) + (sinA * sinA) / (ryInner * ryInner));
      const baseR = 1 / normDist + (random() - 0.5) * 80;

      const lineLen = 300 + random() * 900;
      const innerW = 1.0 + random() * 6.0;
      const outerW = 0.2 + random() * 2.0;

      const c = random() < 0.6 ? colorMain : (random() < 0.85 ? colorLight : colorDark);
      drawRadialSpeedSpike(ctx, cx, cy, baseR, baseR + lineLen, angle, innerW, outerW, c, colorDark);
    }

    // 2. MIDGROUND LAYER: Bold wedge-shaped impact spikes (matching reference image)
    const wedgeCount = 120;
    for (let w = 0; w < wedgeCount; w++) {
      const angle = (w / wedgeCount) * Math.PI * 2 + (random() - 0.5) * 0.04;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const normDist = Math.sqrt((cosA * cosA) / (rxInner * rxInner) + (sinA * sinA) / (ryInner * ryInner));
      const baseR = 1 / normDist + random() * 120;

      const lineLen = 500 + random() * 1200;
      const innerW = 12 + random() * 32; // Thick wedge base
      const outerW = 1.0 + random() * 4.0; // Tapering out

      const c = random() < 0.7 ? colorMain : colorLight;
      drawRadialSpeedSpike(ctx, cx, cy, baseR, baseR + lineLen, angle, innerW, outerW, c, colorDark);
    }

    // 3. FOREGROUND LAYER: Long sweeping speed rays extending to edge of 4K canvas
    const rayCount = 90;
    for (let r = 0; r < rayCount; r++) {
      const angle = random() * Math.PI * 2;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const normDist = Math.sqrt((cosA * cosA) / (rxInner * rxInner) + (sinA * sinA) / (ryInner * ryInner));
      const baseR = 1 / normDist + random() * 60;

      const lineLen = 1200 + random() * 1400;
      const innerW = 18 + random() * 48;
      const outerW = 0.5 + random() * 3.0;

      drawRadialSpeedSpike(ctx, cx, cy, baseR, baseR + lineLen, angle, innerW, outerW, colorMain, colorDark);
    }

    // 4. MICRO INK SPLATTER & ACTION DUST GRAIN SPRAY (Target PNG file size: 2.0 MB - 10.0 MB)
    console.log(`Applying manga action micro-grain particle texture for ${variant.name}...`);
    ctx.save();
    const dustCount = 160000;

    for (let d = 0; d < dustCount; d++) {
      const angle = random() * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const normDist = Math.sqrt((cosA * cosA) / (rxInner * rxInner) + (sinA * sinA) / (ryInner * ryInner));
      const baseR = 1 / normDist + random() * 1400;

      const px = cx + Math.cos(angle) * baseR;
      const py = cy + Math.sin(angle) * baseR;

      if (px < 0 || px > width || py < 0 || py > height) continue;

      const sz = 1.5 + random() * 4.5;
      ctx.globalAlpha = 0.25 + random() * 0.65;
      ctx.fillStyle = random() < 0.5 ? colorMain : (random() < 0.8 ? colorLight : colorDark);
      ctx.fillRect(px, py, sz, sz);
    }
    ctx.restore();

    // Save PNG files
    const buffer = canvas.toBuffer('image/png');

    const filePath1 = path.join(outputDir, variant.id);
    fs.writeFileSync(filePath1, buffer);

    const filePath2 = path.join(publicDir, variant.id);
    fs.writeFileSync(filePath2, buffer);

    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    console.log(`Generated 4K PNG (${variant.name}) -> ${filePath1} (${sizeMB} MB)`);
  });

  // Copy default assets
  const defaultPath = path.join(outputDir, 'output_gold_spotlight_v1.png');
  if (fs.existsSync(defaultPath)) {
    fs.copyFileSync(defaultPath, path.join(outputDir, 'output_gold_spotlight.png'));
    fs.copyFileSync(defaultPath, path.join(outputDir, 'output.png'));
    fs.copyFileSync(defaultPath, path.join(publicDir, 'output_gold_spotlight.png'));
    fs.copyFileSync(defaultPath, path.join(publicDir, 'output.png'));
  }

  console.log("All 4K Comic Radial Speed Line Action Burst Frame PNG Assets generated successfully!");
}

generateComicSpeedLineBurstAssets();
