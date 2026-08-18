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

    // Pattern detection - ORDER MATTERS: specific semantic subjects first
    const isNote = descLower.includes('paper') || descLower.includes('note') || descLower.includes('memo') || descLower.includes('sticky') || descLower.includes('torn') || descLower.includes('notebook') || descLower.includes('sheet') || descLower.includes('binder');
    const isNetworkGrid = !isNote && (descLower.includes('network') || descLower.includes('plexus') || descLower.includes('circuit') || descLower.includes('tech') || descLower.includes('cyber') || descLower.includes('diamond') || descLower.includes('node') || descLower.includes('network_grid'));
    const isHexGrid = !isNote && (descLower.includes('hexagon') || descLower.includes('honeycomb') || descLower.includes('hexagon_grid'));
    const isWavePattern = descLower.includes('wave') || descLower.includes('curve') || descLower.includes('ribbon') || descLower.includes('swirl') || descLower.includes('flow') || descLower.includes('wave_pattern');
    const isParticleScatter = descLower.includes('particle') || descLower.includes('scatter') || descLower.includes('bokeh') || descLower.includes('confetti') || descLower.includes('dust') || descLower.includes('particle_scatter');
    const isAbstractGeo = !isNote && (descLower.includes('abstract_geometric') || descLower.includes('geometric') || descLower.includes('polygon'));
    const isFlare = descLower.includes('flare') || descLower.includes('lens') || descLower.includes('streak') || descLower.includes('anamorphic') || descLower.includes('beam') || descLower.includes('laser') || descLower.includes('glow_streak') || descLower.includes('spark');
    const isFrame = descLower.includes('frame') || descLower.includes('border') || descLower.includes('certificate') || descLower.includes('diploma');
    const isBadge = descLower.includes('badge') || descLower.includes('shield') || descLower.includes('seal') || descLower.includes('medal') || descLower.includes('guarantee');
    const isSpotlight = descLower.includes('spotlight') || descLower.includes('shaft') || descLower.includes('conical');

    if (isNetworkGrid || isHexGrid || isAbstractGeo) {
      // =========================================================================
      // RENDER TECHNOLOGY NETWORK GRID (Diamond/Hexagon shapes + Glowing Nodes)
      // =========================================================================
      ctx.save();

      const gridType = isHexGrid ? 'hex' : 'diamond';
      const spacingX = isHexGrid ? 220 : 200;
      const spacingY = isHexGrid ? 190 : 180;
      const shapeSize = isHexGrid ? 70 : 60;

      // Offset for variation uniqueness
      const offsetX = (idx * 37) % 60;
      const offsetY = (idx * 23) % 50;

      ctx.globalCompositeOperation = 'lighter';

      const nodePositions = [];

      // Calculate all node positions - concentrated toward bottom half (like reference)
      for (let row = -2; row < Math.ceil(height / spacingY) + 2; row++) {
        for (let col = -2; col < Math.ceil(width / spacingX) + 2; col++) {
          let nx = col * spacingX + offsetX + (row % 2 === 0 ? spacingX / 2 : 0);
          let ny = row * spacingY + offsetY;

          // Density increases toward bottom (matching reference image style)
          const verticalFactor = ny / height;
          if (verticalFactor < 0.3 && random() > 0.25) continue;
          if (verticalFactor < 0.5 && random() > 0.55) continue;

          // Random offset for organic feel
          nx += (random() - 0.5) * 40;
          ny += (random() - 0.5) * 35;

          if (nx > -100 && nx < width + 100 && ny > -100 && ny < height + 100) {
            const nodeAlpha = Math.min(1.0, 0.15 + verticalFactor * 0.85);
            nodePositions.push({ x: nx, y: ny, alpha: nodeAlpha, size: shapeSize * (0.5 + random() * 0.8) });
          }
        }
      }

      // Draw connection lines between nearby nodes
      for (let i = 0; i < nodePositions.length; i++) {
        for (let j = i + 1; j < nodePositions.length; j++) {
          const dx = nodePositions[j].x - nodePositions[i].x;
          const dy = nodePositions[j].y - nodePositions[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < spacingX * 1.8 && dist > 30) {
            const lineAlpha = Math.max(0.03, (1 - dist / (spacingX * 1.8)) * 0.4 * Math.min(nodePositions[i].alpha, nodePositions[j].alpha));
            ctx.beginPath();
            ctx.moveTo(nodePositions[i].x, nodePositions[i].y);
            ctx.lineTo(nodePositions[j].x, nodePositions[j].y);
            ctx.strokeStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${lineAlpha})`;
            ctx.lineWidth = 1.5 + random() * 1.5;
            ctx.stroke();
          }
        }
      }

      // Draw shapes at each node
      for (const node of nodePositions) {
        const { x, y, alpha, size } = node;

        if (gridType === 'diamond') {
          // Diamond / Rhombus shape (rotated square)
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 4);

          ctx.beginPath();
          ctx.rect(-size / 2, -size / 2, size, size);
          ctx.strokeStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${alpha * 0.6})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Some diamonds have a second inner diamond
          if (random() > 0.5) {
            const innerSize = size * 0.6;
            ctx.beginPath();
            ctx.rect(-innerSize / 2, -innerSize / 2, innerSize, innerSize);
            ctx.strokeStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${alpha * 0.35})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          ctx.restore();
        } else {
          // Hexagon shape
          ctx.beginPath();
          for (let h = 0; h < 6; h++) {
            const angle = (Math.PI / 3) * h - Math.PI / 6;
            const hx = x + Math.cos(angle) * size / 2;
            const hy = y + Math.sin(angle) * size / 2;
            if (h === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${alpha * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Glowing node dot at center
        const dotSize = 3 + random() * 10;
        const hasGlow = random() > 0.35;

        if (hasGlow) {
          // Outer glow halo
          const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, dotSize * 4);
          glowGrad.addColorStop(0, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${alpha * 0.6})`);
          glowGrad.addColorStop(0.3, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${alpha * 0.25})`);
          glowGrad.addColorStop(1, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0)`);
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(x, y, dotSize * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core dot
        const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, dotSize);
        coreGrad.addColorStop(0, `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, ${alpha * 0.95})`);
        coreGrad.addColorStop(0.5, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${alpha * 0.8})`);
        coreGrad.addColorStop(1, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0)`);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Scatter some tiny particles/dots for ambiance
      for (let p = 0; p < 120; p++) {
        const px = random() * width;
        const py = random() * height;
        const pr = 1 + random() * 3;
        const pa = 0.1 + random() * 0.5 * (py / height);

        ctx.fillStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${pa})`;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

    } else if (isWavePattern) {
      // =========================================================================
      // RENDER ABSTRACT WAVE PATTERN (Flowing curves, ribbons, swirls)
      // =========================================================================
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const numWaves = 6 + idx * 2;

      for (let w = 0; w < numWaves; w++) {
        const waveY = height * 0.15 + (w / numWaves) * height * 0.7;
        const amplitude = 80 + random() * 200;
        const frequency = 0.002 + random() * 0.004;
        const phase = random() * Math.PI * 2 + idx * 0.8;
        const thickness = 2 + random() * 6;
        const waveAlpha = 0.15 + random() * 0.45;

        ctx.beginPath();
        for (let x = 0; x <= width; x += 3) {
          const y = waveY + Math.sin(x * frequency + phase) * amplitude + Math.cos(x * frequency * 0.5 + phase * 1.3) * amplitude * 0.3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${waveAlpha})`;
        ctx.lineWidth = thickness;
        ctx.stroke();

        // Add glow to some waves
        if (random() > 0.4) {
          ctx.strokeStyle = `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, ${waveAlpha * 0.3})`;
          ctx.lineWidth = thickness * 4;
          ctx.stroke();
        }
      }

      // Add glowing intersection dots
      for (let d = 0; d < 40; d++) {
        const dx = random() * width;
        const dy = random() * height;
        const dr = 3 + random() * 12;

        const dotGlow = ctx.createRadialGradient(dx, dy, 0, dx, dy, dr * 3);
        dotGlow.addColorStop(0, `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, 0.8)`);
        dotGlow.addColorStop(0.4, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.3)`);
        dotGlow.addColorStop(1, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0)`);
        ctx.fillStyle = dotGlow;
        ctx.beginPath();
        ctx.arc(dx, dy, dr * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

    } else if (isParticleScatter) {
      // =========================================================================
      // RENDER PARTICLE SCATTER / BOKEH (Scattered glowing particles and dots)
      // =========================================================================
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const numParticles = 180 + idx * 30;

      for (let p = 0; p < numParticles; p++) {
        const px = random() * width;
        const py = random() * height;
        const pSize = 2 + random() * 25;
        const pa = 0.1 + random() * 0.7;

        const bokehGrad = ctx.createRadialGradient(px, py, 0, px, py, pSize);
        const useSecondary = random() > 0.6;
        const cR = useSecondary ? sRgb.r : pRgb.r;
        const cG = useSecondary ? sRgb.g : pRgb.g;
        const cB = useSecondary ? sRgb.b : pRgb.b;

        bokehGrad.addColorStop(0, `rgba(${cR}, ${cG}, ${cB}, ${pa})`);
        bokehGrad.addColorStop(0.6, `rgba(${cR}, ${cG}, ${cB}, ${pa * 0.5})`);
        bokehGrad.addColorStop(1, `rgba(${cR}, ${cG}, ${cB}, 0)`);

        ctx.fillStyle = bokehGrad;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();

        if (random() > 0.7) {
          ctx.fillStyle = `rgba(255, 255, 255, ${pa * 0.8})`;
          ctx.beginPath();
          ctx.arc(px, py, pSize * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Tiny dust specks
      for (let d = 0; d < 300; d++) {
        const dx = random() * width;
        const dy = random() * height;
        const dr = 0.5 + random() * 2;
        ctx.fillStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${0.2 + random() * 0.5})`;
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

    } else if (isFlare) {
      // =========================================================================
      // RENDER OPTICAL LENS FLARE / ANAMORPHIC HORIZONTAL LIGHT STREAK
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

      // 4. Starburst Rays
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

      // 5. Core Flare Center
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      coreGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.95)');
      coreGrad.addColorStop(0.65, `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, 0.7)`);
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.fill();

      // 6. Ring Halo
      ctx.beginPath();
      ctx.arc(cx, cy, 320, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.25)`;
      ctx.stroke();

      // 7. Stardust Particles
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
      // RENDER LUXURY BORDER FRAME
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

      ctx.lineWidth = 4;
      ctx.strokeRect(margin + 25, margin + 25, width - (margin + 25) * 2, height - (margin + 25) * 2);

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
      // RENDER 4K TORN GRID NOTEBOOK PAPER / STICKY MEMO
      // =========================================================================
      ctx.save();
      const isTornGrid = descLower.includes('grid') || descLower.includes('torn') || descLower.includes('notebook') || descLower.includes('sheet') || descLower.includes('binder');
      
      if (isTornGrid) {
        // Dimensions matching standard 4K reference canvas
        const paperW = 2800;
        const paperH = 1750;
        const px = (width - paperW) / 2 + 100;
        const py = (height - paperH) / 2;
        const numHoles = 14;
        const holeSpacing = paperH / (numHoles + 1);
        const holeRadius = 26;

        // Draw Paper base path with torn ragged left margin
        ctx.beginPath();
        // Top edge
        ctx.moveTo(px, py);
        ctx.lineTo(px + paperW, py);
        // Right edge
        ctx.lineTo(px + paperW, py + paperH);
        // Bottom edge
        ctx.lineTo(px, py + paperH);

        // Left torn edge with spiral notebook holes
        const segSteps = 300;
        for (let s = segSteps; s >= 0; s--) {
          const curY = py + (s / segSteps) * paperH;
          let curX = px + (random() - 0.5) * 8;

          // Check if near a punched ring hole
          for (let h = 1; h <= numHoles; h++) {
            const hy = py + h * holeSpacing;
            const dist = Math.abs(curY - hy);
            if (dist < holeRadius) {
              const dx = Math.sqrt(Math.max(0, holeRadius * holeRadius - dist * dist));
              curX = px + dx + (random() - 0.5) * 6;
              break;
            }
          }
          ctx.lineTo(curX, curY);
        }
        ctx.closePath();

        // Paper base fill (Crisp White / Ivory Paper Texture)
        const paperGrad = ctx.createLinearGradient(px, py, px + paperW, py + paperH);
        paperGrad.addColorStop(0, '#FAFAFA');
        paperGrad.addColorStop(1, '#F0F0F0');
        ctx.fillStyle = paperGrad;
        ctx.fill();

        // Subtle paper perimeter border
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(210, 210, 210, 0.6)';
        ctx.stroke();

        // Draw Precise Graph Grid Lines across the paper
        ctx.save();
        ctx.clip(); // Keep grid within paper boundary

        const gridStep = 40; // 40px square grid in 4K
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(180, 195, 210, 0.45)'; // Realistic notebook blue/gray grid
        ctx.beginPath();

        for (let gx = px + 60; gx < px + paperW; gx += gridStep) {
          ctx.moveTo(gx, py);
          ctx.lineTo(gx, py + paperH);
        }
        for (let gy = py; gy < py + paperH; gy += gridStep) {
          ctx.moveTo(px, gy);
          ctx.lineTo(px + paperW, gy);
        }
        ctx.stroke();

        // Render Punched Spiral Binder Holes with realistic paper fibers
        for (let h = 1; h <= numHoles; h++) {
          const hy = py + h * holeSpacing;
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(px + 4, hy, holeRadius - 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Hole inner rim shadow
          ctx.beginPath();
          ctx.arc(px + 4, hy, holeRadius - 2, 0, Math.PI * 2);
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
          ctx.stroke();
        }

        ctx.restore();
      } else {
        const noteW = 1600;
        const noteH = 1600;
        const nx = (width - noteW) / 2;
        const ny = (height - noteH) / 2;
        const curl = 140;

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

        ctx.beginPath();
        ctx.arc(width / 2, ny + 70, 42, 0, Math.PI * 2);
        ctx.fillStyle = '#E63946';
        ctx.fill();
      }
      ctx.restore();

    } else if (isBadge) {
      // =========================================================================
      // RENDER 3D ROSETTE GUARANTEE BADGE
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

    } else if (isSpotlight) {
      // =========================================================================
      // RENDER VOLUMETRIC SPOTLIGHT
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

    } else {
      // =========================================================================
      // FALLBACK: Generic abstract graphic (NOT lens flare by default)
      // =========================================================================
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < 15; i++) {
        const cx = random() * width;
        const cy = random() * height;
        const cr = 50 + random() * 300;
        const ca = 0.1 + random() * 0.3;

        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${ca})`;
        ctx.lineWidth = 1 + random() * 3;
        ctx.stroke();

        const gGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 0.3);
        gGrad.addColorStop(0, `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, ${ca * 0.8})`);
        gGrad.addColorStop(1, `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0)`);
        ctx.fillStyle = gGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, cr * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let p = 0; p < 200; p++) {
        const px = random() * width;
        const py = random() * height;
        const pr = 1 + random() * 5;
        ctx.fillStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${0.15 + random() * 0.5})`;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

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
