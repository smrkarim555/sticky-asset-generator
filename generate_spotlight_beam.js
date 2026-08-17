import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

function generateSpotlightAsset(variant) {
  const width = 3840;
  const height = 3840;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Clear canvas for 100% pristine true 32-bit RGBA alpha transparency
  ctx.clearRect(0, 0, width, height);

  const { id, name, filepath, primaryColor, secondaryColor, mode } = variant;

  ctx.save();

  // Seeded pseudo-randomness
  let seed = 11223344;
  function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 208, g: 85, b: 255 };
  }

  const pRgb = hexToRgb(primaryColor || '#00E5FF');
  const sRgb = hexToRgb(secondaryColor || '#0088FF');

  // Draw 100% clean volumetric cone spotlight beam
  function drawCleanVolumetricCone(startX, startY, targetX, targetY, topWidth, bottomWidth) {
    ctx.save();

    const dx = targetX - startX;
    const dy = targetY - startY;
    const mainAngle = Math.atan2(dy, dx);
    const perpAngle = mainAngle + Math.PI / 2;

    ctx.globalCompositeOperation = 'screen';

    // 1. Soft Ambient Volumetric Gaussian Cone Layers
    const layers = 60;
    for (let i = layers; i >= 1; i--) {
      const norm = i / layers;
      const curTopW = topWidth + (1 - norm) * 80;
      const curBottomW = bottomWidth + (1 - norm) * 200;

      const tX1 = startX + Math.cos(perpAngle) * (curTopW / 2);
      const tY1 = startY + Math.sin(perpAngle) * (curTopW / 2);
      const tX2 = startX - Math.cos(perpAngle) * (curTopW / 2);
      const tY2 = startY - Math.sin(perpAngle) * (curTopW / 2);

      const bX1 = targetX + Math.cos(perpAngle) * (curBottomW / 2);
      const bY1 = targetY + Math.sin(perpAngle) * (curBottomW / 2);
      const bX2 = targetX - Math.cos(perpAngle) * (curBottomW / 2);
      const bY2 = targetY - Math.sin(perpAngle) * (curBottomW / 2);

      const alphaVal = 0.025 * Math.pow(Math.sin(norm * Math.PI / 2), 2.2);

      const grad = ctx.createLinearGradient(startX, startY, targetX, targetY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alphaVal * 5.0})`);
      grad.addColorStop(0.15, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${alphaVal * 4.0})`);
      grad.addColorStop(0.5, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${alphaVal * 2.2})`);
      grad.addColorStop(0.8, `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, ${alphaVal * 1.0})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.moveTo(tX1, tY1);
      ctx.lineTo(bX1, bY1);
      ctx.lineTo(bX2, bY2);
      ctx.lineTo(tX2, tY2);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // 2. High Intensity Inner Core Volumetric Cone
    const coreLayers = 40;
    for (let c = 1; c <= coreLayers; c++) {
      const coreNorm = c / coreLayers;
      const cTopW = topWidth * (0.2 + coreNorm * 0.8);
      const cBottomW = bottomWidth * (0.2 + coreNorm * 0.8);

      const tX1 = startX + Math.cos(perpAngle) * (cTopW / 2);
      const tY1 = startY + Math.sin(perpAngle) * (cTopW / 2);
      const tX2 = startX - Math.cos(perpAngle) * (cTopW / 2);
      const tY2 = startY - Math.sin(perpAngle) * (cTopW / 2);

      const bX1 = targetX + Math.cos(perpAngle) * (cBottomW / 2);
      const bY1 = targetY + Math.sin(perpAngle) * (cBottomW / 2);
      const bX2 = targetX - Math.cos(perpAngle) * (cBottomW / 2);
      const bY2 = targetY - Math.sin(perpAngle) * (cBottomW / 2);

      const coreAlpha = 0.032 * Math.pow(coreNorm, 1.3);
      const coreGrad = ctx.createLinearGradient(startX, startY, targetX, targetY);
      coreGrad.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha * 4.5})`);
      coreGrad.addColorStop(0.2, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${coreAlpha * 3.2})`);
      coreGrad.addColorStop(0.7, `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, ${coreAlpha * 1.5})`);
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.moveTo(tX1, tY1);
      ctx.lineTo(bX1, bY1);
      ctx.lineTo(bX2, bY2);
      ctx.lineTo(tX2, tY2);
      ctx.closePath();
      ctx.fillStyle = coreGrad;
      ctx.fill();
    }

    // 3. Fine Organic Streaming Rays (ONLY inside beam)
    const numRays = 600;
    for (let r = 0; r < numRays; r++) {
      const offset = (random() - 0.5) * (bottomWidth * 0.92);
      const rayTargetX = targetX + Math.cos(perpAngle) * offset;
      const rayTargetY = targetY + Math.sin(perpAngle) * offset;

      const rayGrad = ctx.createLinearGradient(startX, startY, rayTargetX, rayTargetY);
      const rayAlpha = (random() * 0.08 + 0.02);

      rayGrad.addColorStop(0, `rgba(255, 255, 255, ${rayAlpha * 1.5})`);
      rayGrad.addColorStop(0.3, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${rayAlpha})`);
      rayGrad.addColorStop(0.7, `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, ${rayAlpha * 0.4})`);
      rayGrad.addColorStop(1, 'rgba(0,0,0,0)');

      const raySpread = (random() * 0.008 + 0.002) * width;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(rayTargetX - raySpread, rayTargetY);
      ctx.lineTo(rayTargetX + raySpread, rayTargetY);
      ctx.closePath();
      ctx.fillStyle = rayGrad;
      ctx.fill();
    }

    // 4. Air Dust Particles STRICTLY INSIDE THE LIGHT BEAM CONE (No particles outside!)
    ctx.save();
    // Clip path to exact cone bounds
    const maxTopW = topWidth + 80;
    const maxBottomW = bottomWidth + 200;
    const ctX1 = startX + Math.cos(perpAngle) * (maxTopW / 2);
    const ctY1 = startY + Math.sin(perpAngle) * (maxTopW / 2);
    const ctX2 = startX - Math.cos(perpAngle) * (maxTopW / 2);
    const ctY2 = startY - Math.sin(perpAngle) * (maxTopW / 2);
    const cbX1 = targetX + Math.cos(perpAngle) * (maxBottomW / 2);
    const cbY1 = targetY + Math.sin(perpAngle) * (maxBottomW / 2);
    const cbX2 = targetX - Math.cos(perpAngle) * (maxBottomW / 2);
    const cbY2 = targetY - Math.sin(perpAngle) * (maxBottomW / 2);

    ctx.beginPath();
    ctx.moveTo(ctX1, ctY1);
    ctx.lineTo(cbX1, cbY1);
    ctx.lineTo(cbX2, cbY2);
    ctx.lineTo(ctX2, ctY2);
    ctx.closePath();
    ctx.clip();

    const beamDustCount = 80000;
    for (let d = 0; d < beamDustCount; d++) {
      const t = random(); // 0 (top) to 1 (bottom)
      const curW = topWidth + (bottomWidth - topWidth) * t;
      const posX = startX + (targetX - startX) * t + (random() - 0.5) * curW * 0.95;
      const posY = startY + (targetY - startY) * t;

      const pAlpha = (random() * 0.35 + 0.08) * (1 - t * 0.4);
      const pSize = 0.8 + random() * 2.2;

      ctx.globalAlpha = pAlpha;
      ctx.beginPath();
      ctx.arc(posX, posY, pSize, 0, Math.PI * 2);
      ctx.fillStyle = random() < 0.7 ? '#FFFFFF' : `rgb(${pRgb.r}, ${pRgb.g}, ${pRgb.b})`;
      ctx.fill();
    }
    ctx.restore();

    // 5. Sleek Top Lens Fixture Glow
    ctx.save();
    ctx.translate(startX, startY);
    const lensRadiusX = topWidth * 1.2;
    const lensRadiusY = topWidth * 0.45;
    const lensGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, lensRadiusX);
    lensGrad.addColorStop(0, '#FFFFFF');
    lensGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.95)');
    lensGrad.addColorStop(0.7, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.8)`);
    lensGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.ellipse(0, 0, lensRadiusX, lensRadiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = lensGrad;
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // Draw Clean Floor Stage Spotlight Pool (Solid smooth filled oval hotspot)
  function drawCleanFloorPool(cx, cy, rx, ry) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const floorGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    floorGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    floorGrad.addColorStop(0.25, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.95)`);
    floorGrad.addColorStop(0.6, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.45)`);
    floorGrad.addColorStop(0.85, `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, 0.15)`);
    floorGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = floorGrad;
    ctx.fill();

    // Hotspot Core
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 0.45);
    coreGrad.addColorStop(0, '#FFFFFF');
    coreGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.9)');
    coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.45, ry * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // Floor dust strictly inside floor pool
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();

    const floorDustCount = 30000;
    for (let f = 0; f < floorDustCount; f++) {
      const ang = random() * Math.PI * 2;
      const rad = Math.sqrt(random()) * rx * 0.9;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad * (ry / rx);

      ctx.globalAlpha = 0.1 + random() * 0.35;
      ctx.beginPath();
      ctx.arc(px, py, 0.8 + random() * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  if (mode === 'dual' || mode === 'dual_gold' || mode === 'dual_cyan' || mode === 'royal_magenta_stage_spotlight') {
    // Symmetrical Dual Stage Spotlights
    const targetX = width * 0.50;
    const targetY = height * 0.88;

    drawCleanFloorPool(targetX, targetY, width * 0.30, height * 0.065);
    drawCleanVolumetricCone(width * 0.22, height * 0.05, targetX, targetY, width * 0.025, width * 0.28);
    drawCleanVolumetricCone(width * 0.78, height * 0.05, targetX, targetY, width * 0.025, width * 0.28);

  } else if (mode === 'triple') {
    const targetX = width * 0.50;
    const targetY = height * 0.88;

    drawCleanFloorPool(targetX, targetY, width * 0.36, height * 0.07);

    drawCleanVolumetricCone(width * 0.50, height * 0.05, targetX, targetY, width * 0.03, width * 0.32);
    drawCleanVolumetricCone(width * 0.20, height * 0.12, targetX, targetY, width * 0.025, width * 0.26);
    drawCleanVolumetricCone(width * 0.80, height * 0.12, targetX, targetY, width * 0.025, width * 0.26);

  } else {
    // Single beam
    const targetX = width * 0.50;
    const targetY = height * 0.05;
    const floorY = height * 0.88;

    drawCleanFloorPool(targetX, floorY, width * 0.34, height * 0.065);
    drawCleanVolumetricCone(targetX, targetY, targetX, floorY, width * 0.03, width * 0.38);
  }

  ctx.restore();

  // Save PNG file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filepath, buffer);
  const stats = fs.statSync(filepath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`Generated ${name} -> ${filepath} (${sizeInMB} MB)`);
}

function main() {
  const outDir = path.join(process.cwd(), 'spotlight_studio');
  const publicDir = path.join(process.cwd(), 'public', 'images');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('Generating 4K Pristine Clean Volumetric Stage Spotlight Assets (Zero Background Noise)...');

  const variations = [
    {
      id: 'cyber_cyan_stage_spotlight',
      name: 'Cyberpunk Electric Cyan Concert Spotlight',
      filepath: path.join(outDir, 'output_cyan_spotlight.png'),
      primaryColor: '#00E5FF',
      secondaryColor: '#0088FF',
      mode: 'single'
    },
    {
      id: 'royal_magenta_stage_spotlight',
      name: 'Dual Stage Royal Purple & Magenta Volumetric Spotlight',
      filepath: path.join(outDir, 'output_magenta_spotlight.png'),
      primaryColor: '#D055FF',
      secondaryColor: '#E899FF',
      mode: 'dual'
    },
    {
      id: 'bright_white_stage_spotlight',
      name: 'Triple Beam Studio White Stage Spotlight',
      filepath: path.join(outDir, 'output_white_spotlight.png'),
      primaryColor: '#FFFFFF',
      secondaryColor: '#E0E0E0',
      mode: 'triple'
    },
    {
      id: 'golden_warm_stage_spotlight',
      name: 'Warm Golden Theater & Award Show Spotlight',
      filepath: path.join(outDir, 'output_gold_spotlight.png'),
      primaryColor: '#FFC107',
      secondaryColor: '#FF8F00',
      mode: 'single'
    }
  ];

  variations.forEach((v) => {
    generateSpotlightAsset(v);
    const pubPath = path.join(publicDir, path.basename(v.filepath));
    fs.copyFileSync(v.filepath, pubPath);
  });

  // Default copy
  const defaultSrc = path.join(outDir, 'output_cyan_spotlight.png');
  const defaultDst = path.join(outDir, 'output.png');
  if (fs.existsSync(defaultSrc)) {
    fs.copyFileSync(defaultSrc, defaultDst);
    fs.copyFileSync(defaultSrc, path.join(publicDir, 'output.png'));
    console.log(`Copied default asset -> ${defaultDst}`);
  }

  console.log('All 4K Pristine Clean Stage Spotlight Assets generated successfully!');
}

main();
