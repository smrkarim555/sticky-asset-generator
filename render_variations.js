import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

export function render4KVariations(specs, outputDir, publicDir, assetType = 'auto') {
  const width = 3840;
  const height = 2160;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const results = [];

  specs.forEach((item, idx) => {
    const filename = `output_variation_v${idx + 1}.png`;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 100% Clear transparent canvas (zero background shadow / zero black boxes)
    ctx.clearRect(0, 0, width, height);

    let seed = (idx + 1) * 777333 + (item.name ? item.name.length * 1234 : 4567);
    function random() {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    const colorMain = item.primaryColor || '#00D2FF';
    const colorLight = item.secondaryColor || '#FFFFFF';
    const colorDark = item.darkColor || '#0044AA';

    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 210, b: 255 };
    }

    const pRgb = hexToRgb(colorMain);
    const sRgb = hexToRgb(colorLight);
    const dRgb = hexToRgb(colorDark);

    const descLower = ((item.name || '') + ' ' + (item.styleDesc || '') + ' ' + (item.patternType || '') + ' ' + assetType).toLowerCase();

    const isFlare = descLower.includes('flare') || descLower.includes('lens') || descLower.includes('streak') || descLower.includes('anamorphic') || descLower.includes('beam') || descLower.includes('laser') || descLower.includes('glow_streak') || descLower.includes('spark');
    const isFrame = descLower.includes('frame') || descLower.includes('border') || descLower.includes('certificate') || descLower.includes('diploma');
    const isNote = descLower.includes('sticky') || descLower.includes('note') || descLower.includes('memo') || descLower.includes('paper');
    const isBadge = descLower.includes('badge') || descLower.includes('shield') || descLower.includes('seal') || descLower.includes('medal') || descLower.includes('guarantee');
    const isSpotlight = descLower.includes('spotlight') || descLower.includes('shaft') || descLower.includes('conical');

    if (isFlare || (!isFrame && !isNote && !isBadge && !isSpotlight)) {
      // =========================================================================
      // 1. RENDER OPTICAL LENS FLARE / ANAMORPHIC HORIZONTAL LIGHT STREAK (IMAGE 1 STYLE)
      // =========================================================================
      const cx = width / 2;
      const cy = height / 2;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // 1. Horizontal Anamorphic Streak Line (Broad Soft Glow)
      const streakGradBroad = ctx.createLinearGradient(0, cy, width, cy);
      streakGradBroad.addColorStop(0, 'rgba(0,0,0,0)');
      streakGradBroad.addColorStop(0.15, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.05)`);
      streakGradBroad.addColorStop(0.4, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.6)`);
      streakGradBroad.addColorStop(0.5, `rgba(255, 255, 255, 0.95)`);
      streakGradBroad.addColorStop(0.6, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.6)`);
      streakGradBroad.addColorStop(0.85, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.05)`);
      streakGradBroad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = streakGradBroad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, width * 0.48, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Razor Sharp Core Anamorphic Needle Streak
      const streakGradSharp = ctx.createLinearGradient(cx - width * 0.42, cy, cx + width * 0.42, cy);
      streakGradSharp.addColorStop(0, 'rgba(255,255,255,0)');
      streakGradSharp.addColorStop(0.3, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.5)`);
      streakGradSharp.addColorStop(0.48, 'rgba(255, 255, 255, 0.98)');
      streakGradSharp.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
      streakGradSharp.addColorStop(0.52, 'rgba(255, 255, 255, 0.98)');
      streakGradSharp.addColorStop(0.7, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.5)`);
      streakGradSharp.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.fillStyle = streakGradSharp;
      ctx.beginPath();
      ctx.ellipse(cx, cy, width * 0.40, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Central Soft Radial Color Bloom
      const bloomGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 550);
      bloomGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      bloomGrad.addColorStop(0.12, `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, 0.8)`);
      bloomGrad.addColorStop(0.35, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.45)`);
      bloomGrad.addColorStop(0.7, `rgba(${dRgb.r}, ${dRgb.g}, ${dRgb.b}, 0.1)`);
      bloomGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = bloomGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 550, 0, Math.PI * 2);
      ctx.fill();

      // 4. Multi-Point Diffraction Starburst Rays (Diamond Spikes)
      const numRays = 8;
      for (let r = 0; r < numRays; r++) {
        const angle = (r * Math.PI) / numRays + (idx * 0.1);
        const rayLen = r % 2 === 0 ? 600 : 380;
        const rayThickness = r % 2 === 0 ? 12 : 6;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        const rayGrad = ctx.createLinearGradient(-rayLen, 0, rayLen, 0);
        rayGrad.addColorStop(0, 'rgba(255,255,255,0)');
        rayGrad.addColorStop(0.35, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.4)`);
        rayGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
        rayGrad.addColorStop(0.65, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.4)`);
        rayGrad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rayLen, rayThickness, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Intense White-Hot Core Flare Center
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      coreGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.95)');
      coreGrad.addColorStop(0.65, `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, 0.7)`);
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.fill();

      // 6. Secondary Optical Ring Halo
      ctx.beginPath();
      ctx.arc(cx, cy, 320, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.25)`;
      ctx.stroke();

      // 7. Subtle Bokeh & Stardust Particles
      for (let p = 0; p < 45; p++) {
        const px = cx + (random() - 0.5) * 1600;
        const py = cy + (random() - 0.5) * 280;
        const pr = 1.5 + random() * 4.5;
        const pa = 0.2 + random() * 0.6;

        ctx.fillStyle = `rgba(${random() > 0.4 ? '255,255,255' : `${pRgb.r},${pRgb.g},${pRgb.b}`}, ${pa})`;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

    } else if (isFrame) {
      // =========================================================================
      // 2. RENDER LUXURY BORDER FRAME (ONLY IF EXPLICITLY DETECTED AS FRAME)
      // =========================================================================
      const margin = 90;
      const cornerSize = 700;

      ctx.save();
      ctx.lineWidth = 14;
      const borderGrad = ctx.createLinearGradient(0, 0, width, height);
      borderGrad.addColorStop(0, colorLight);
      borderGrad.addColorStop(0.5, colorMain);
      borderGrad.addColorStop(1, colorDark);
      ctx.strokeStyle = borderGrad;
      ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

      // Inner thin pinstripe
      ctx.lineWidth = 4;
      ctx.strokeRect(margin + 25, margin + 25, width - (margin + 25) * 2, height - (margin + 25) * 2);

      // Corner vector accents
      function drawCorner(cx, cy, angle) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(cornerSize, 0);
        ctx.bezierCurveTo(cornerSize * 0.7, cornerSize * 0.15, cornerSize * 0.35, cornerSize * 0.45, cornerSize * 0.25, cornerSize * 0.85);
        ctx.lineTo(0, cornerSize * 0.85);
        ctx.closePath();
        ctx.fillStyle = colorMain;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cornerSize, 0);
        ctx.bezierCurveTo(cornerSize * 0.7, cornerSize * 0.15, cornerSize * 0.35, cornerSize * 0.45, cornerSize * 0.25, cornerSize * 0.85);
        ctx.lineWidth = 20;
        ctx.strokeStyle = colorLight;
        ctx.stroke();
        ctx.restore();
      }

      drawCorner(margin, margin, 0);
      drawCorner(width - margin, margin, Math.PI / 2);
      drawCorner(width - margin, height - margin, Math.PI);
      drawCorner(margin, height - margin, -Math.PI / 2);
      ctx.restore();

    } else if (isNote) {
      // =========================================================================
      // 3. RENDER PINNED STICKY NOTE
      // =========================================================================
      const noteW = 1600;
      const noteH = 1600;
      const nx = (width - noteW) / 2;
      const ny = (height - noteH) / 2;
      const curl = 140;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(nx + noteW, ny);
      ctx.lineTo(nx + noteW, ny + noteH - curl);
      ctx.bezierCurveTo(nx + noteW - curl * 0.4, ny + noteH - curl * 0.2, nx + noteW - curl * 0.8, ny + noteH, nx + noteW - curl, ny + noteH);
      ctx.lineTo(nx, ny + noteH);
      ctx.closePath();

      const noteGrad = ctx.createLinearGradient(nx, ny, nx + noteW, ny + noteH);
      noteGrad.addColorStop(0, colorMain);
      noteGrad.addColorStop(1, colorLight);
      ctx.fillStyle = noteGrad;
      ctx.fill();

      // Pin
      ctx.beginPath();
      ctx.arc(width / 2, ny + 70, 42, 0, Math.PI * 2);
      ctx.fillStyle = '#E63946';
      ctx.fill();
      ctx.restore();

    } else if (isBadge) {
      // =========================================================================
      // 4. RENDER 3D ROSETTE GUARANTEE BADGE
      // =========================================================================
      const cx = width / 2;
      const cy = height / 2;
      const r = 700;

      ctx.save();
      ctx.beginPath();
      const points = 36;
      for (let p = 0; p < points * 2; p++) {
        const rad = p % 2 === 0 ? r : r * 0.92;
        const ang = (p * Math.PI) / points;
        const px = cx + Math.cos(ang) * rad;
        const py = cy + Math.sin(ang) * rad;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const badgeGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      badgeGrad.addColorStop(0, colorLight);
      badgeGrad.addColorStop(0.5, colorMain);
      badgeGrad.addColorStop(1, colorDark);
      ctx.fillStyle = badgeGrad;
      ctx.fill();
      ctx.restore();

    } else {
      // =========================================================================
      // 5. RENDER VOLUMETRIC SPOTLIGHT
      // =========================================================================
      const targetX = width * 0.50;
      const targetY = height * 0.05;
      const floorY = height * 0.88;
      const topWidth = width * 0.03;
      const bottomWidth = width * 0.38;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createLinearGradient(targetX, targetY, targetX, floorY);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.2, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.85)`);
      grad.addColorStop(0.8, `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, 0.25)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.moveTo(targetX - topWidth / 2, targetY);
      ctx.lineTo(targetX + topWidth / 2, targetY);
      ctx.lineTo(targetX + bottomWidth / 2, floorY);
      ctx.lineTo(targetX - bottomWidth / 2, floorY);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }

    // Save PNG buffers
    const buffer = canvas.toBuffer('image/png');
    const filePath1 = path.join(outputDir, filename);
    const filePath2 = path.join(publicDir, filename);

    fs.writeFileSync(filePath1, buffer);
    fs.writeFileSync(filePath2, buffer);

    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    results.push({
      id: `variation_v${idx + 1}`,
      filename,
      fileSize: `${sizeMB} MB`,
      name: item.name || `4K PNG Asset Variation ${idx + 1}`,
      primaryColor: colorMain,
      secondaryColor: colorLight,
      styleDesc: item.styleDesc || "Adobe Stock 4K UHD Transparent PNG Asset",
      resolution: "3840 x 2160 px"
    });
  });

  return results;
}
