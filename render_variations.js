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

    // Clear 100% transparent canvas
    ctx.clearRect(0, 0, width, height);

    let seed = (idx + 1) * 777333 + (item.name ? item.name.length * 1234 : 4567);
    function random() {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    const colorMain = item.primaryColor || '#0A1931';
    const colorLight = item.secondaryColor || '#D4AF37';
    const colorDark = item.darkColor || '#050D1A';

    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 10, g: 25, b: 49 };
    }

    const pRgb = hexToRgb(colorMain);
    const sRgb = hexToRgb(colorLight);
    const dRgb = hexToRgb(colorDark);

    const descLower = ((item.name || '') + ' ' + (item.styleDesc || '') + ' ' + assetType).toLowerCase();
    const isFrame = descLower.includes('frame') || descLower.includes('border') || descLower.includes('certificate') || descLower.includes('diploma') || descLower.includes('corner');
    const isNote = descLower.includes('sticky') || descLower.includes('note') || descLower.includes('memo') || descLower.includes('paper');
    const isBadge = descLower.includes('badge') || descLower.includes('shield') || descLower.includes('seal') || descLower.includes('medal') || descLower.includes('guarantee');
    const isSpotlight = descLower.includes('spotlight') || descLower.includes('beam') || descLower.includes('shaft') || descLower.includes('light');

    if (isFrame || (!isNote && !isBadge && !isSpotlight)) {
      // =========================================================================
      // 1. RENDER LUXURY CERTIFICATE / DIPLOMA ORNATE BORDER FRAME (WITH TRANSPARENT CENTER)
      // =========================================================================
      
      const margin = 80;
      const cornerSize = 750;
      const goldTrim = 28;

      // Draw Outer Gold Border
      ctx.save();
      ctx.lineWidth = 14;
      const borderGrad = ctx.createLinearGradient(0, 0, width, height);
      borderGrad.addColorStop(0, '#FFE89E');
      borderGrad.addColorStop(0.3, '#D4AF37');
      borderGrad.addColorStop(0.7, '#FFF2B2');
      borderGrad.addColorStop(1, '#AA8010');
      ctx.strokeStyle = borderGrad;
      ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

      // Inner thin gold pinstripe
      ctx.lineWidth = 4;
      ctx.strokeRect(margin + 30, margin + 30, width - (margin + 30) * 2, height - (margin + 30) * 2);
      ctx.restore();

      // Function to render 4 Ornate Curved Corner Ribbons & Metallic Accents
      function drawCornerAccents(cx, cy, angle) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // 1. Outer Deep Accent Shape (Curved Multi-layered Ribbon Wing)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(cornerSize, 0);
        ctx.bezierCurveTo(cornerSize * 0.7, cornerSize * 0.15, cornerSize * 0.35, cornerSize * 0.45, cornerSize * 0.25, cornerSize * 0.85);
        ctx.lineTo(0, cornerSize * 0.85);
        ctx.closePath();

        const mainFillGrad = ctx.createLinearGradient(0, 0, cornerSize * 0.6, cornerSize * 0.6);
        mainFillGrad.addColorStop(0, `rgb(${pRgb.r}, ${pRgb.g}, ${pRgb.b})`);
        mainFillGrad.addColorStop(0.5, `rgb(${Math.max(0, pRgb.r - 20)}, ${Math.max(0, pRgb.g - 20)}, ${Math.max(0, pRgb.b - 20)})`);
        mainFillGrad.addColorStop(1, `rgb(${dRgb.r}, ${dRgb.g}, ${dRgb.b})`);
        ctx.fillStyle = mainFillGrad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 35;
        ctx.shadowOffsetX = 15;
        ctx.shadowOffsetY = 15;
        ctx.fill();

        // 2. Beveled Metallic Gold Border on the Inner Wave
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        ctx.moveTo(cornerSize, 0);
        ctx.bezierCurveTo(cornerSize * 0.7, cornerSize * 0.15, cornerSize * 0.35, cornerSize * 0.45, cornerSize * 0.25, cornerSize * 0.85);
        ctx.lineWidth = goldTrim;
        const cornerGoldGrad = ctx.createLinearGradient(cornerSize, 0, cornerSize * 0.25, cornerSize * 0.85);
        cornerGoldGrad.addColorStop(0, '#FFE89E');
        cornerGoldGrad.addColorStop(0.3, '#D4AF37');
        cornerGoldGrad.addColorStop(0.6, '#FFF8CC');
        cornerGoldGrad.addColorStop(0.85, '#997300');
        cornerGoldGrad.addColorStop(1, '#FFE89E');
        ctx.strokeStyle = cornerGoldGrad;
        ctx.stroke();

        // 3. Secondary Inner Layer Ribbon (Darker Saturation Contrast)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(cornerSize * 0.65, 0);
        ctx.bezierCurveTo(cornerSize * 0.45, cornerSize * 0.1, cornerSize * 0.25, cornerSize * 0.3, cornerSize * 0.15, cornerSize * 0.6);
        ctx.lineTo(0, cornerSize * 0.6);
        ctx.closePath();

        const innerRibbonGrad = ctx.createLinearGradient(0, 0, cornerSize * 0.4, cornerSize * 0.4);
        innerRibbonGrad.addColorStop(0, `rgb(${Math.min(255, pRgb.r + 30)}, ${Math.min(255, pRgb.g + 30)}, ${Math.min(255, pRgb.b + 40)})`);
        innerRibbonGrad.addColorStop(1, `rgb(${pRgb.r}, ${pRgb.g}, ${pRgb.b})`);
        ctx.fillStyle = innerRibbonGrad;
        ctx.fill();

        // Secondary gold accent line
        ctx.beginPath();
        ctx.moveTo(cornerSize * 0.65, 0);
        ctx.bezierCurveTo(cornerSize * 0.45, cornerSize * 0.1, cornerSize * 0.25, cornerSize * 0.3, cornerSize * 0.15, cornerSize * 0.6);
        ctx.lineWidth = 8;
        ctx.strokeStyle = cornerGoldGrad;
        ctx.stroke();

        // 4. Subtle Ornate Guilloche Geometric Accent Lines in Corner
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 232, 158, 0.4)';
        for (let l = 1; l <= 5; l++) {
          const offset = l * 16;
          ctx.beginPath();
          ctx.moveTo(offset, offset);
          ctx.lineTo(cornerSize * 0.35 + offset, offset);
          ctx.bezierCurveTo(cornerSize * 0.25 + offset, offset + 20, cornerSize * 0.15 + offset, cornerSize * 0.15 + offset, offset, cornerSize * 0.35 + offset);
          ctx.closePath();
          ctx.stroke();
        }

        ctx.restore();
        ctx.restore();
      }

      // Draw Top-Left Corner
      drawCornerAccents(margin, margin, 0);
      // Draw Top-Right Corner
      drawCornerAccents(width - margin, margin, Math.PI / 2);
      // Draw Bottom-Right Corner
      drawCornerAccents(width - margin, height - margin, Math.PI);
      // Draw Bottom-Left Corner
      drawCornerAccents(margin, height - margin, -Math.PI / 2);

      // Top & Bottom Center Gold Header Plaque Accent
      ctx.save();
      const topPlaqueW = 500;
      const topPlaqueH = 36;
      const topPlaqueGrad = ctx.createLinearGradient((width - topPlaqueW) / 2, 0, (width + topPlaqueW) / 2, 0);
      topPlaqueGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
      topPlaqueGrad.addColorStop(0.2, '#FFE89E');
      topPlaqueGrad.addColorStop(0.5, '#D4AF37');
      topPlaqueGrad.addColorStop(0.8, '#FFE89E');
      topPlaqueGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');

      ctx.fillStyle = topPlaqueGrad;
      ctx.fillRect((width - topPlaqueW) / 2, margin - 18, topPlaqueW, topPlaqueH);
      ctx.fillRect((width - topPlaqueW) / 2, height - margin - 18, topPlaqueW, topPlaqueH);
      ctx.restore();

    } else if (isNote) {
      // =========================================================================
      // 2. RENDER PINNED STICKY NOTE
      // =========================================================================
      const noteW = 1600;
      const noteH = 1600;
      const nx = (width - noteW) / 2;
      const ny = (height - noteH) / 2;
      const curl = 140;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 45;
      ctx.shadowOffsetX = 15;
      ctx.shadowOffsetY = 25;

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
      ctx.restore();

      // Pin
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, ny + 70, 42, 0, Math.PI * 2);
      ctx.fillStyle = '#E63946';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 12;
      ctx.fill();
      ctx.restore();

    } else if (isBadge) {
      // =========================================================================
      // 3. RENDER 3D GOLD ROSETTE GUARANTEE BADGE
      // =========================================================================
      const cx = width / 2;
      const cy = height / 2;
      const r = 700;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 30;

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
      badgeGrad.addColorStop(0, '#FFE89E');
      badgeGrad.addColorStop(0.5, '#D4AF37');
      badgeGrad.addColorStop(1, '#997300');
      ctx.fillStyle = badgeGrad;
      ctx.fill();
      ctx.restore();

    } else {
      // =========================================================================
      // 4. RENDER VOLUMETRIC STAGE SPOTLIGHT
      // =========================================================================
      const targetX = width * 0.50;
      const targetY = height * 0.05;
      const floorY = height * 0.88;
      const topWidth = width * 0.03;
      const bottomWidth = width * 0.38;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const grad = ctx.createLinearGradient(targetX, targetY, targetX, floorY);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.2, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.8)`);
      grad.addColorStop(0.8, `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, 0.2)`);
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
