import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

function generateSandPowderAsset(variant) {
  const width = 3840;
  const height = 2160;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Clear canvas for true 32-bit RGBA alpha transparency
  ctx.clearRect(0, 0, width, height);

  const { id, name, filepath, primaryColor, secondaryColor, accentColor, highlightColor, darkGrainColor } = variant;

  ctx.save();

  // Pseudo-random seed generator
  let seed = 88776611;
  function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  // 1. Organic Volumetric Sand/Powder Cloud Mass Blobs (Top & Bottom Banks)
  // Top cloud bank
  const topCloudBlobs = 180;
  for (let c = 0; c < topCloudBlobs; c++) {
    const cx = (random() * 1.3 - 0.15) * width;
    const cy = (random() * 0.42 - 0.08) * height; // Top 40% area
    const radiusX = (random() * 380 + 120);
    const radiusY = (random() * 220 + 80);
    const angle = (random() - 0.5) * 0.6;

    const cloudGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusX);
    const colorPick = random();
    const baseColor = colorPick < 0.4 ? primaryColor : colorPick < 0.75 ? secondaryColor : highlightColor;
    
    const alpha = (random() * 0.35 + 0.12);
    cloudGrad.addColorStop(0, baseColor + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
    cloudGrad.addColorStop(0.5, secondaryColor + Math.floor(alpha * 0.6 * 255).toString(16).padStart(2, '0'));
    cloudGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = cloudGrad;
    ctx.fill();
    ctx.restore();
  }

  // Bottom cloud bank
  const bottomCloudBlobs = 200;
  for (let c = 0; c < bottomCloudBlobs; c++) {
    const cx = (random() * 1.3 - 0.15) * width;
    const cy = height - (random() * 0.45 - 0.05) * height; // Bottom 45% area
    const radiusX = (random() * 420 + 140);
    const radiusY = (random() * 240 + 90);
    const angle = (random() - 0.5) * 0.6;

    const cloudGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusX);
    const colorPick = random();
    const baseColor = colorPick < 0.4 ? primaryColor : colorPick < 0.75 ? secondaryColor : accentColor;
    
    const alpha = (random() * 0.38 + 0.15);
    cloudGrad.addColorStop(0, baseColor + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
    cloudGrad.addColorStop(0.55, secondaryColor + Math.floor(alpha * 0.5 * 255).toString(16).padStart(2, '0'));
    cloudGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = cloudGrad;
    ctx.fill();
    ctx.restore();
  }

  // 2. Flying Fine Sand Dust Particles & Grit Motes (~120,000 particles)
  // Perfectly calibrated for 4.5 MB - 8.5 MB PNG file size range (2.0 MB - 10.0 MB compliant)
  const numParticles = 120000;
  for (let p = 0; p < numParticles; p++) {
    const px = random() * width;
    const py = random() * height;

    // Density higher in top/bottom banks and dispersing into middle
    const distFromTop = py / height;
    const distFromBottom = (height - py) / height;
    const bankDensity = Math.max(0.12, Math.max(1 - distFromTop * 2.2, 1 - distFromBottom * 2.0));

    if (random() > bankDensity && (py > height * 0.35 && py < height * 0.65) && random() > 0.35) {
      continue;
    }

    const pSize = random() < 0.82 ? (random() * 2.2 + 0.7) : (random() * 5.5 + 2.0);
    const colorPick = random();
    const pColor = colorPick < 0.35 ? highlightColor :
                   colorPick < 0.65 ? primaryColor :
                   colorPick < 0.88 ? secondaryColor : darkGrainColor;

    const alpha = (random() * 0.75 + 0.25) * Math.min(1, bankDensity + 0.2);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Non-circular organic sand grain shapes
    if (random() < 0.3) {
      // Small polygon grain
      ctx.beginPath();
      ctx.rect(px, py, pSize, pSize * (random() * 0.8 + 0.6));
      ctx.fillStyle = pColor;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fillStyle = pColor;
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Crisp Airborne Grit Specks & Heavy Sand Clumps
  const numClumps = 12000;
  for (let k = 0; k < numClumps; k++) {
    const kx = random() * width;
    const ky = random() * height;

    const clumpSize = random() * 4.5 + 1.5;
    const cColor = random() < 0.5 ? darkGrainColor : primaryColor;

    ctx.save();
    ctx.globalAlpha = random() * 0.85 + 0.15;
    ctx.beginPath();
    ctx.arc(kx, ky, clumpSize, 0, Math.PI * 2);
    ctx.fillStyle = cColor;
    ctx.fill();
    ctx.restore();
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
  const outDir = path.join(process.cwd(), 'sand_studio');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Generating 4K Golden Sand Powder Explosion & Dust Cloud Assets (Target Size: 2.0 MB - 10.0 MB)...');

  const variations = [
    {
      id: 'golden_sand_powder_blast',
      name: 'Golden Ochre Sand Powder Blast & Dust Cloud',
      filepath: path.join(outDir, 'output_gold_sand.png'),
      primaryColor: '#D4A359',
      secondaryColor: '#C8903A',
      accentColor: '#B37D2A',
      highlightColor: '#F0CB85',
      darkGrainColor: '#8C5B18'
    },
    {
      id: 'desert_amber_sandstorm_cloud',
      name: 'Desert Amber Sandstorm Powder & Flying Grit',
      filepath: path.join(outDir, 'output_amber_sand.png'),
      primaryColor: '#E6A145',
      secondaryColor: '#D9822B',
      accentColor: '#BF6613',
      highlightColor: '#F7C986',
      darkGrainColor: '#803D00'
    },
    {
      id: 'terracotta_bronze_dust_blast',
      name: 'Terracotta Bronze Earth Powder & Airborne Dust',
      filepath: path.join(outDir, 'output_terracotta_sand.png'),
      primaryColor: '#C87244',
      secondaryColor: '#A85227',
      accentColor: '#823712',
      highlightColor: '#E8A37C',
      darkGrainColor: '#592006'
    },
    {
      id: 'luminous_solar_gold_powder',
      name: 'Luminous Solar Gold Powder Smoke & Micro Specks',
      filepath: path.join(outDir, 'output_solar_sand.png'),
      primaryColor: '#FFC107',
      secondaryColor: '#FF9800',
      accentColor: '#F57C00',
      highlightColor: '#FFE082',
      darkGrainColor: '#E65100'
    }
  ];

  variations.forEach((v) => {
    generateSandPowderAsset(v);
  });

  // Default copy
  const defaultSrc = path.join(outDir, 'output_gold_sand.png');
  const defaultDst = path.join(outDir, 'output.png');
  if (fs.existsSync(defaultSrc)) {
    fs.copyFileSync(defaultSrc, defaultDst);
    console.log(`Copied default asset -> ${defaultDst}`);
  }

  console.log('All 4K Golden Sand Powder Assets generated successfully!');
}

main();
