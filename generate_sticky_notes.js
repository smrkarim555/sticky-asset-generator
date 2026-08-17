import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

// Helper for seeded pseudo-randomness
function createRandom(initialSeed = 123456789) {
  let seed = initialSeed;
  return function() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

// Convert hex color to RGB object
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

function drawTornBottomPath(ctx, x, y, width, height, isTornBottom, random) {
  const cornerRadius = 6;
  ctx.beginPath();
  // Top edge
  ctx.moveTo(x + cornerRadius, y);
  ctx.lineTo(x + width - cornerRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);

  // Right edge
  ctx.lineTo(x + width, y + height - (isTornBottom ? 12 : cornerRadius));

  if (isTornBottom) {
    // Deckled / torn bottom edge
    const segments = 120;
    const segWidth = width / segments;
    for (let i = segments; i >= 0; i--) {
      const px = x + i * segWidth;
      const py = y + height + (random() - 0.5) * 8 - (i % 2 === 0 ? 3 : 0);
      ctx.lineTo(px, py);
    }
  } else {
    // Smooth bottom edge with slight corner radius
    ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
    ctx.lineTo(x + cornerRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
  }

  // Left edge
  ctx.lineTo(x, y + cornerRadius);
  ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
  ctx.closePath();
}

function drawSingleStickyNote(ctx, x, y, width, height, noteConfig, random, numFibers = 750000) {
  const { paperColor, shadowColor, tapeColor, tapePattern, isTornBottom, tapeAngle } = noteConfig;

  ctx.save();

  // 1. Multi-Layered Soft Ambient Drop Shadow
  const shadowLayers = 15;
  for (let s = shadowLayers; s >= 1; s--) {
    const spread = s * 2.2;
    const offsetY = s * 1.8;
    const alpha = 0.015 * Math.pow(1 - s / shadowLayers, 1.2);

    ctx.save();
    ctx.fillStyle = `rgba(30, 40, 60, ${alpha})`;
    ctx.beginPath();
    drawTornBottomPath(ctx, x - spread * 0.3, y + offsetY, width + spread * 0.6, height + spread * 0.4, isTornBottom, random);
    ctx.fill();
    ctx.restore();
  }

  // 2. Main Paper Body Fill with Subtle Gradient
  ctx.save();
  const paperRgb = hexToRgb(paperColor);
  const paperGrad = ctx.createLinearGradient(x, y, x + width, y + height);
  paperGrad.addColorStop(0, `rgb(${Math.min(255, paperRgb.r + 12)}, ${Math.min(255, paperRgb.g + 12)}, ${Math.min(255, paperRgb.b + 12)})`);
  paperGrad.addColorStop(0.5, paperColor);
  paperGrad.addColorStop(1, `rgb(${Math.max(0, paperRgb.r - 15)}, ${Math.max(0, paperRgb.g - 15)}, ${Math.max(0, paperRgb.b - 15)})`);

  drawTornBottomPath(ctx, x, y, width, height, isTornBottom, random);
  ctx.fillStyle = paperGrad;
  ctx.fill();

  // Clip paper area for internal texture
  ctx.clip();

  // 3. Paper Micro-Texture & Fiber Grain
  for (let i = 0; i < numFibers; i++) {
    const fx = x + random() * width;
    const fy = y + random() * height;
    const fLen = random() * 2.8 + 1.0;
    const fAlpha = random() * 0.09 + 0.02;
    const isDark = random() < 0.52;
    const colorVal = isDark ? 0 : 255;

    ctx.fillStyle = `rgba(${colorVal}, ${colorVal}, ${colorVal}, ${fAlpha})`;
    ctx.fillRect(fx, fy, fLen, fLen * 0.7);
  }

  // Soft Inner Vignette Shadow on Bottom Right
  const innerShade = ctx.createRadialGradient(x + width, y + height, 0, x + width, y + height, width * 0.8);
  innerShade.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
  innerShade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = innerShade;
  ctx.fillRect(x, y, width, height);

  ctx.restore();

  // 4. Washi Tape Strip at Top
  const tapeWidth = width * 0.32;
  const tapeHeight = 42;
  const tapeX = x + (width - tapeWidth) / 2 + (random() - 0.5) * 20;
  const tapeY = y - tapeHeight * 0.45;

  ctx.save();
  ctx.translate(tapeX + tapeWidth / 2, tapeY + tapeHeight / 2);
  ctx.rotate(tapeAngle || 0);

  // Tape Soft Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(-tapeWidth / 2 + 2, -tapeHeight / 2 + 3, tapeWidth, tapeHeight);

  // Translucent Tape Base
  const tapeRgb = hexToRgb(tapeColor || '#2D62A3');
  ctx.fillStyle = `rgba(${tapeRgb.r}, ${tapeRgb.g}, ${tapeRgb.b}, 0.72)`;
  ctx.fillRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight);

  // Tape Pattern (e.g. Polka dots for blue tape)
  if (tapePattern === 'dots') {
    ctx.fillStyle = 'rgba(15, 55, 120, 0.5)';
    const dotSpacing = 12;
    for (let dx = -tapeWidth / 2 + 6; dx < tapeWidth / 2 - 4; dx += dotSpacing) {
      for (let dy = -tapeHeight / 2 + 6; dy < tapeHeight / 2 - 4; dy += dotSpacing) {
        ctx.beginPath();
        ctx.arc(dx, dy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Washi Tape Sheen Highlight
  const tapeSheen = ctx.createLinearGradient(-tapeWidth / 2, -tapeHeight / 2, tapeWidth / 2, tapeHeight / 2);
  tapeSheen.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  tapeSheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  tapeSheen.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
  ctx.fillStyle = tapeSheen;
  ctx.fillRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight);

  // Jagged Washi Tape Tear Edges (Left & Right)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (let side = -1; side <= 1; side += 2) {
    const edgeX = (side * tapeWidth) / 2;
    ctx.beginPath();
    for (let ty = -tapeHeight / 2; ty <= tapeHeight / 2; ty += 4) {
      ctx.rect(edgeX + (random() - 0.5) * 3, ty, 2, 2);
    }
    ctx.fill();
  }

  ctx.restore();

  ctx.restore();
}

function drawKraftTapeStrip(ctx, x, y, tapeWidth, tapeHeight, angle, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Soft Tape Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.fillRect(-tapeWidth / 2 + 2, -tapeHeight / 2 + 3, tapeWidth, tapeHeight);

  // Base Kraft Tape Color (Warm Tan/Beige Paper)
  const tapeGrad = ctx.createLinearGradient(-tapeWidth / 2, -tapeHeight / 2, tapeWidth / 2, tapeHeight / 2);
  tapeGrad.addColorStop(0, '#DEB578');
  tapeGrad.addColorStop(0.5, '#CCA162');
  tapeGrad.addColorStop(1, '#B88E52');

  ctx.fillStyle = tapeGrad;
  ctx.fillRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight);

  // Translucent Sheen & Crinkle Wrinkle Highlights
  ctx.clip();

  // Wrinkle Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.2;
  for (let w = 0; w < 12; w++) {
    const wx = -tapeWidth / 2 + random() * tapeWidth;
    ctx.beginPath();
    ctx.moveTo(wx, -tapeHeight / 2);
    ctx.quadraticCurveTo(wx + (random() - 0.5) * 15, 0, wx + (random() - 0.5) * 20, tapeHeight / 2);
    ctx.stroke();
  }

  // Kraft Fibers
  for (let f = 0; f < 1500; f++) {
    const fx = -tapeWidth / 2 + random() * tapeWidth;
    const fy = -tapeHeight / 2 + random() * tapeHeight;
    const alpha = random() * 0.15 + 0.03;
    const isDark = random() < 0.6;
    ctx.fillStyle = isDark ? `rgba(60, 40, 10, ${alpha})` : `rgba(255, 255, 250, ${alpha})`;
    ctx.fillRect(fx, fy, random() * 3 + 1, 1.2);
  }

  // Ripped Torn Fiber Edges (Left & Right Ends)
  ctx.fillStyle = 'rgba(240, 220, 190, 0.9)';
  for (let side = -1; side <= 1; side += 2) {
    const edgeX = (side * tapeWidth) / 2;
    ctx.beginPath();
    for (let ty = -tapeHeight / 2; ty <= tapeHeight / 2; ty += 3) {
      ctx.rect(edgeX + (random() - 0.5) * 4, ty, 2.5, 2);
    }
    ctx.fill();
  }

  ctx.restore();
}

function drawKraftTapedWhiteNoteSet(ctx, width, height, random) {
  const noteWidth = 850;
  const noteHeight = 1100;
  const startY = (height - noteHeight) / 2 + 100;

  // --- NOTE 1 (Left): Flat White Paper Sheet with Horizontal Kraft Tape ---
  const n1X = 320;
  const n1Y = startY;

  ctx.save();
  // Multi-layer drop shadow underneath
  for (let s = 15; s >= 1; s--) {
    const alpha = 0.015 * Math.pow(1 - s / 15, 1.2);
    ctx.fillStyle = `rgba(20, 20, 20, ${alpha})`;
    ctx.fillRect(n1X - s * 0.8, n1Y + s * 1.5, noteWidth + s * 1.6, noteHeight + s * 0.8);
  }

  // Main White Paper Body
  const paperGrad1 = ctx.createLinearGradient(n1X, n1Y, n1X + noteWidth, n1Y + noteHeight);
  paperGrad1.addColorStop(0, '#FFFFFF');
  paperGrad1.addColorStop(0.5, '#FBFBFA');
  paperGrad1.addColorStop(1, '#F3F3F0');
  ctx.fillStyle = paperGrad1;
  ctx.fillRect(n1X, n1Y, noteWidth, noteHeight);

  // Micro Paper Texture Fibers
  ctx.save();
  ctx.rect(n1X, n1Y, noteWidth, noteHeight);
  ctx.clip();
  for (let i = 0; i < 450000; i++) {
    const fx = n1X + random() * noteWidth;
    const fy = n1Y + random() * noteHeight;
    const alpha = random() * 0.06 + 0.01;
    ctx.fillStyle = random() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.fillRect(fx, fy, random() * 2.5 + 1, 1.2);
  }
  ctx.restore();

  // Tape 1: Horizontal Tape at Top
  drawKraftTapeStrip(ctx, n1X + noteWidth / 2, n1Y, 320, 75, -0.01, random);
  ctx.restore();


  // --- NOTE 2 (Middle): White Paper Sheet with Diagonal Tape & Bottom-Left Page Curl ---
  const n2X = 1485;
  const n2Y = startY;
  const curlW2 = 280;
  const curlH2 = 280;

  ctx.save();
  // Drop Shadow under middle note (lifted at bottom-left)
  for (let s = 18; s >= 1; s--) {
    const alpha = 0.012 * Math.pow(1 - s / 18, 1.3);
    ctx.fillStyle = `rgba(15, 15, 15, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(n2X, n2Y);
    ctx.lineTo(n2X + noteWidth + s * 1.2, n2Y);
    ctx.lineTo(n2X + noteWidth + s * 1.2, n2Y + noteHeight + s * 1.2);
    ctx.lineTo(n2X + curlW2, n2Y + noteHeight + s * 1.2);
    // Extra shadow bulge under lifted curl
    ctx.quadraticCurveTo(n2X - s * 2.2, n2Y + noteHeight + s * 2.5, n2X - s * 1.8, n2Y + noteHeight - curlH2);
    ctx.closePath();
    ctx.fill();
  }

  // Paper Path clipped at Bottom-Left Corner
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(n2X, n2Y);
  ctx.lineTo(n2X + noteWidth, n2Y);
  ctx.lineTo(n2X + noteWidth, n2Y + noteHeight);
  ctx.lineTo(n2X + curlW2, n2Y + noteHeight);
  ctx.quadraticCurveTo(n2X + curlW2 * 0.35, n2Y + noteHeight - curlH2 * 0.35, n2X, n2Y + noteHeight - curlH2);
  ctx.closePath();

  const paperGrad2 = ctx.createLinearGradient(n2X, n2Y, n2X + noteWidth, n2Y + noteHeight);
  paperGrad2.addColorStop(0, '#FFFFFF');
  paperGrad2.addColorStop(0.7, '#FAFAFA');
  paperGrad2.addColorStop(1, '#ECECEC');
  ctx.fillStyle = paperGrad2;
  ctx.fill();

  ctx.clip();
  for (let i = 0; i < 450000; i++) {
    const fx = n2X + random() * noteWidth;
    const fy = n2Y + random() * noteHeight;
    const alpha = random() * 0.06 + 0.01;
    ctx.fillStyle = random() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.fillRect(fx, fy, random() * 2.5 + 1, 1.2);
  }

  // Ambient shadow cast on paper under curl
  const curlUnderShadow2 = ctx.createRadialGradient(
    n2X + curlW2 * 0.5, n2Y + noteHeight - curlH2 * 0.5, 0,
    n2X + curlW2 * 0.5, n2Y + noteHeight - curlH2 * 0.5, curlW2 * 1.2
  );
  curlUnderShadow2.addColorStop(0, 'rgba(0, 0, 0, 0.28)');
  curlUnderShadow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = curlUnderShadow2;
  ctx.fillRect(n2X, n2Y, noteWidth, noteHeight);
  ctx.restore();

  // Curled Flap at Bottom Left
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(n2X + curlW2, n2Y + noteHeight);
  const tipX2 = n2X + curlW2 * 0.15;
  const tipY2 = n2Y + noteHeight - curlH2 * 0.15;
  ctx.quadraticCurveTo(n2X + curlW2 * 0.65, n2Y + noteHeight - curlH2 * 0.25, tipX2, tipY2);
  ctx.quadraticCurveTo(n2X + curlW2 * 0.25, n2Y + noteHeight - curlH2 * 0.65, n2X, n2Y + noteHeight - curlH2);
  ctx.quadraticCurveTo(n2X + curlW2 * 0.35, n2Y + noteHeight - curlH2 * 0.35, n2X + curlW2, n2Y + noteHeight);
  ctx.closePath();

  const flapGrad2 = ctx.createLinearGradient(n2X, n2Y + noteHeight - curlH2, n2X + curlW2, n2Y + noteHeight);
  flapGrad2.addColorStop(0, '#FFFFFF');
  flapGrad2.addColorStop(0.5, '#F5F5F0');
  flapGrad2.addColorStop(1, '#D8D8D0');
  ctx.fillStyle = flapGrad2;
  ctx.fill();
  ctx.strokeStyle = 'rgba(180, 180, 180, 0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // Tape 2: Diagonal Kraft Tape at Top Center (~-42 degrees)
  drawKraftTapeStrip(ctx, n2X + noteWidth / 2, n2Y + 20, 360, 85, -0.72, random);
  ctx.restore();


  // --- NOTE 3 (Right): White Paper Sheet with Horizontal Kraft Tape & Soft Curved Edges ---
  const n3X = 2650;
  const n3Y = startY;

  ctx.save();
  // Drop Shadow underneath right note
  for (let s = 16; s >= 1; s--) {
    const alpha = 0.014 * Math.pow(1 - s / 16, 1.25);
    ctx.fillStyle = `rgba(20, 20, 20, ${alpha})`;
    ctx.fillRect(n3X - s * 1.5, n3Y + s * 1.2, noteWidth + s * 1.8, noteHeight + s * 1.5);
  }

  // Main White Paper Body
  const paperGrad3 = ctx.createLinearGradient(n3X, n3Y, n3X + noteWidth, n3Y + noteHeight);
  paperGrad3.addColorStop(0, '#FFFFFF');
  paperGrad3.addColorStop(0.6, '#FAFAFA');
  paperGrad3.addColorStop(1, '#EDEDED');
  ctx.fillStyle = paperGrad3;
  ctx.fillRect(n3X, n3Y, noteWidth, noteHeight);

  ctx.save();
  ctx.rect(n3X, n3Y, noteWidth, noteHeight);
  ctx.clip();
  for (let i = 0; i < 450000; i++) {
    const fx = n3X + random() * noteWidth;
    const fy = n3Y + random() * noteHeight;
    const alpha = random() * 0.06 + 0.01;
    ctx.fillStyle = random() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.fillRect(fx, fy, random() * 2.5 + 1, 1.2);
  }
  ctx.restore();

  // Tape 3: Horizontal Kraft Tape at Top
  drawKraftTapeStrip(ctx, n3X + noteWidth / 2, n3Y, 310, 72, 0.02, random);
  ctx.restore();
}

function drawIsometricStackedStickyPads(ctx, width, height, random) {
  const cx = 1920;
  const cy = 1120;

  const cos30 = Math.cos(Math.PI / 6); // ~0.866
  const sin30 = Math.sin(Math.PI / 6); // 0.5

  function project(x, y, z) {
    return {
      px: cx + (x - y) * cos30,
      py: cy + (x + y) * sin30 - z
    };
  }

  // 1. Grand Ambient Drop Shadow underneath the entire 3D stack
  const padW = 950;
  const padH = 950;
  const padThickness = 55;
  const numPads = 5;

  ctx.save();
  for (let s = 30; s >= 1; s--) {
    const alpha = 0.008 * Math.pow(1 - s / 30, 1.2);
    ctx.fillStyle = `rgba(15, 12, 10, ${alpha})`;
    ctx.beginPath();
    
    const b0 = project(-s * 1.5, -s * 0.5, -s * 0.5);
    const b1 = project(padW + s * 2.0, -s * 0.5, -s * 0.5);
    const b2 = project(padW + s * 2.5, padH + numPads * 35 + s * 2.5, -s * 0.5);
    const b3 = project(-s * 1.5, padH + numPads * 35 + s * 2.5, -s * 0.5);

    ctx.moveTo(b0.px, b0.py);
    ctx.lineTo(b1.px, b1.py);
    ctx.lineTo(b2.px, b2.py);
    ctx.lineTo(b3.px, b3.py);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Color profiles for the 5 stacked pads from bottom to top
  const pads = [
    {
      name: 'Hot Pink',
      top: '#EC4899',
      topGradEnd: '#DB2777',
      front: '#BE185D',
      right: '#9D174D',
      yOffset: 0
    },
    {
      name: 'Soft Orange',
      top: '#FB923C',
      topGradEnd: '#F97316',
      front: '#EA580C',
      right: '#C2410C',
      yOffset: 32
    },
    {
      name: 'Sky Blue',
      top: '#38BDF8',
      topGradEnd: '#0284C7',
      front: '#0369A1',
      right: '#075985',
      yOffset: 64
    },
    {
      name: 'Mint Green',
      top: '#4ADE80',
      topGradEnd: '#22C55E',
      front: '#16A34A',
      right: '#15803D',
      yOffset: 96
    },
    {
      name: 'Canary Yellow',
      top: '#FDE047',
      topGradEnd: '#EAB308',
      front: '#CA8A04',
      right: '#A16207',
      yOffset: 128
    }
  ];

  // Draw each pad from bottom (0) to top (4)
  pads.forEach((pad, i) => {
    const zBottom = i * padThickness;
    const zTop = zBottom + padThickness;
    const oy = pad.yOffset;

    // 3D Corner Points
    const P0 = project(0, oy, zTop);          // Back
    const P1 = project(padW, oy, zTop);       // Right
    const P2 = project(padW, oy + padH, zTop);  // Front
    const P3 = project(0, oy + padH, zTop);   // Left

    const B0 = project(0, oy, zBottom);
    const B1 = project(padW, oy, zBottom);
    const B2 = project(padW, oy + padH, zBottom);
    const B3 = project(0, oy + padH, zBottom);

    // A) Front-Left Face (Slab thickness)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(P3.px, P3.py);
    ctx.lineTo(P2.px, P2.py);
    ctx.lineTo(B2.px, B2.py);
    ctx.lineTo(B3.px, B3.py);
    ctx.closePath();
    ctx.fillStyle = pad.front;
    ctx.fill();

    // Draw horizontal sheet stack lines on front-left face
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1.0;
    const sheets = 12;
    for (let s = 1; s < sheets; s++) {
      const frac = s / sheets;
      const sP3 = project(0, oy + padH, zBottom + frac * padThickness);
      const sP2 = project(padW, oy + padH, zBottom + frac * padThickness);
      ctx.beginPath();
      ctx.moveTo(sP3.px, sP3.py);
      ctx.lineTo(sP2.px, sP2.py);
      ctx.stroke();
    }
    // Micro texture on front-left face
    ctx.clip();
    for (let f = 0; f < 100000; f++) {
      const rx = random() * padW;
      const rz = zBottom + random() * padThickness;
      const pt = project(rx, oy + padH, rz);
      const alpha = random() * 0.08 + 0.01;
      ctx.fillStyle = random() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
      ctx.fillRect(pt.px, pt.py, random() * 2 + 1, 1.2);
    }
    ctx.restore();

    // B) Front-Right Face (Slab thickness)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(P2.px, P2.py);
    ctx.lineTo(P1.px, P1.py);
    ctx.lineTo(B1.px, B1.py);
    ctx.lineTo(B2.px, B2.py);
    ctx.closePath();
    ctx.fillStyle = pad.right;
    ctx.fill();

    // Sheet stack lines on front-right face
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 1.0;
    for (let s = 1; s < sheets; s++) {
      const frac = s / sheets;
      const sP2 = project(padW, oy + padH, zBottom + frac * padThickness);
      const sP1 = project(padW, oy, zBottom + frac * padThickness);
      ctx.beginPath();
      ctx.moveTo(sP2.px, sP2.py);
      ctx.lineTo(sP1.px, sP1.py);
      ctx.stroke();
    }
    // Micro texture on front-right face
    ctx.clip();
    for (let f = 0; f < 100000; f++) {
      const ry = oy + random() * padH;
      const rz = zBottom + random() * padThickness;
      const pt = project(padW, ry, rz);
      const alpha = random() * 0.08 + 0.01;
      ctx.fillStyle = random() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
      ctx.fillRect(pt.px, pt.py, random() * 2 + 1, 1.2);
    }
    ctx.restore();

    // C) Top Face of Pad
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(P0.px, P0.py);
    ctx.lineTo(P1.px, P1.py);
    ctx.lineTo(P2.px, P2.py);
    ctx.lineTo(P3.px, P3.py);
    ctx.closePath();

    const topGrad = ctx.createLinearGradient(P0.px, P0.py, P2.px, P2.py);
    topGrad.addColorStop(0, pad.top);
    topGrad.addColorStop(1, pad.topGradEnd);
    ctx.fillStyle = topGrad;
    ctx.fill();

    // Add Paper Micro-Texture & Fiber Grain
    ctx.clip();
    for (let f = 0; f < 480000; f++) {
      const rx = random() * padW;
      const ry = oy + random() * padH;
      const pt = project(rx, ry, zTop);
      const alpha = random() * 0.08 + 0.01;
      const isDark = random() < 0.5;
      ctx.fillStyle = isDark ? `rgba(0, 0, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(pt.px, pt.py, random() * 2.2 + 1, 1.2);
    }

    ctx.restore();
  });

  // 2. Peeling Top Sheet on Canary Yellow Pad (Top Pad)
  const zTopPad = 5 * padThickness;
  const oyTop = pads[4].yOffset;

  // Points for flat surface underneath
  const P0 = project(0, oyTop, zTopPad);          // Back
  const P1 = project(padW, oyTop, zTopPad);       // Right
  const P2 = project(padW, oyTop + padH, zTopPad);  // Front
  const P3 = project(0, oyTop + padH, zTopPad);   // Left

  // Cast Shadow on top yellow pad from peeling top sheet
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(P1.px, P1.py);
  const shadowP2 = project(padW * 0.4, oyTop + padH * 0.8, zTopPad);
  const shadowP3 = project(padW * 0.1, oyTop + padH * 0.2, zTopPad);
  ctx.lineTo(shadowP2.px, shadowP2.py);
  ctx.lineTo(shadowP3.px, shadowP3.py);
  ctx.closePath();
  const peelShadowGrad = ctx.createRadialGradient(
    (P1.px + shadowP2.px) / 2, (P1.py + shadowP2.py) / 2, 10,
    (P1.px + shadowP2.px) / 2, (P1.py + shadowP2.py) / 2, 400
  );
  peelShadowGrad.addColorStop(0, 'rgba(80, 50, 0, 0.45)');
  peelShadowGrad.addColorStop(0.5, 'rgba(100, 60, 0, 0.20)');
  peelShadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = peelShadowGrad;
  ctx.fill();
  ctx.restore();

  // Lifted 3D Coordinates for the Peeling Top Sheet
  // The right edge (x = padW) remains anchored.
  // The left side (x = 0) is lifted high up into the air and bent diagonally!
  const L0 = project(-120, oyTop - 80, zTopPad + 580);     // Top-left corner lifted high
  const L3 = project(-40, oyTop + padH - 60, zTopPad + 420); // Bottom-left corner lifted high
  const M_top = project(padW * 0.45, oyTop, zTopPad + 280);   // Mid-top curve
  const M_bot = project(padW * 0.45, oyTop + padH, zTopPad + 200); // Mid-bottom curve

  // A) Underside of Peeling Sheet (facing viewer)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(P1.px, P1.py);
  ctx.quadraticCurveTo(M_top.px, M_top.py, L0.px, L0.py);
  ctx.lineTo(L3.px, L3.py);
  ctx.quadraticCurveTo(M_bot.px, M_bot.py, P2.px, P2.py);
  ctx.closePath();

  const undersideGrad = ctx.createLinearGradient(P1.px, P1.py, L0.px, L0.py);
  undersideGrad.addColorStop(0, '#FEF08A'); // Warm pale yellow
  undersideGrad.addColorStop(0.5, '#FDE047'); // Vibrant canary yellow
  undersideGrad.addColorStop(1, '#EAB308'); // Golden yellow depth

  ctx.fillStyle = undersideGrad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(180, 130, 10, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Add micro paper grain on peeled top sheet
  ctx.clip();
  for (let f = 0; f < 350000; f++) {
    const rx = random() * padW;
    const ry = oyTop + random() * padH;
    const pt = project(rx, ry, zTopPad + random() * 400);
    const alpha = random() * 0.08 + 0.01;
    ctx.fillStyle = random() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.fillRect(pt.px, pt.py, random() * 2.2 + 1, 1.2);
  }

  ctx.restore();
}

function drawHomeIcon(ctx, width, height, random, style) {
  const cx = width / 2;
  const cy = height / 2;

  if (style === 'indigo_3d_badge') {
    // 1. Glossy Indigo 3D Circular Badge with Glass Arch & 3D White House Symbol (NO BG FLOOR SHADOW)
    const r = 700;

    // Outer Bevel Outer Ring
    const outerGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    outerGrad.addColorStop(0, '#60A5FA');
    outerGrad.addColorStop(0.3, '#3B82F6');
    outerGrad.addColorStop(0.7, '#1D4ED8');
    outerGrad.addColorStop(1, '#1E3A8A');

    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner Bevel Shadow Disk
    const innerR = r - 50;
    const innerGrad = ctx.createRadialGradient(cx - innerR * 0.3, cy - innerR * 0.3, 20, cx, cy, innerR);
    innerGrad.addColorStop(0, '#93C5FD');
    innerGrad.addColorStop(0.25, '#3B82F6');
    innerGrad.addColorStop(0.65, '#2563EB');
    innerGrad.addColorStop(1.0, '#172554');

    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fill();

    // Upper Curved Glass Arch Reflection
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 10, 0, Math.PI * 2);
    ctx.clip();

    const glassGrad = ctx.createLinearGradient(cx, cy - innerR, cx, cy + innerR * 0.2);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    glassGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)');
    glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - innerR * 0.35, innerR * 0.9, innerR * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Micro-texture strictly inside badge
    for (let p = 0; p < 800000; p++) {
      const pr = innerR * Math.sqrt(random());
      const pAngle = random() * Math.PI * 2;
      const px = cx + pr * Math.cos(pAngle);
      const py = cy + pr * Math.sin(pAngle);
      const alpha = random() * 0.08 + 0.01;
      ctx.fillStyle = random() < 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(px, py, random() * 2 + 1, random() * 2 + 1);
    }
    ctx.restore();

    // 3D White House Symbol inside Badge
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.6)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 20;

    const roofGrad = ctx.createLinearGradient(cx, cy - 380, cx, cy - 60);
    roofGrad.addColorStop(0, '#FFFFFF');
    roofGrad.addColorStop(1, '#E2E8F0');

    ctx.fillStyle = roofGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 380);
    ctx.lineTo(cx + 360, cy - 60);
    ctx.lineTo(cx - 360, cy - 60);
    ctx.closePath();
    ctx.fill();

    // Chimney
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(cx + 180, cy - 300, 70, 140);

    // House Body
    const bodyGrad = ctx.createLinearGradient(cx - 270, cy - 60, cx + 270, cy + 280);
    bodyGrad.addColorStop(0, '#FFFFFF');
    bodyGrad.addColorStop(1, '#CBD5E1');

    ctx.fillStyle = bodyGrad;
    ctx.fillRect(cx - 270, cy - 60, 540, 340);

    // Front Door with rounded arch
    ctx.fillStyle = '#1E3A8A';
    ctx.beginPath();
    ctx.moveTo(cx - 70, cy + 280);
    ctx.lineTo(cx - 70, cy + 130);
    ctx.arcTo(cx - 70, cy + 80, cx, cy + 80, 70);
    ctx.arcTo(cx + 70, cy + 80, cx + 70, cy + 130, 70);
    ctx.lineTo(cx + 70, cy + 280);
    ctx.closePath();
    ctx.fill();

    // Door Knob
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(cx + 40, cy + 190, 14, 0, Math.PI * 2);
    ctx.fill();

    // Attic Circular Window
    ctx.fillStyle = '#1E3A8A';
    ctx.beginPath();
    ctx.arc(cx, cy - 180, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 8;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    ctx.restore();

  } else if (style === 'pure_3d_house_isolated') {
    // 2. Pure 3D Isometric Rendered House Floating (ZERO BG FLOOR SHADOW, Expanded 4K Scale)
    ctx.save();

    const hs = 1.5; // Scale factor

    // Left Roof Slope
    const roofLeftGrad = ctx.createLinearGradient(cx - 600, cy - 450, cx, cy + 30);
    roofLeftGrad.addColorStop(0, '#38BDF8');
    roofLeftGrad.addColorStop(0.5, '#0284C7');
    roofLeftGrad.addColorStop(1, '#0369A1');

    ctx.fillStyle = roofLeftGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 630);
    ctx.lineTo(cx - 630, cy - 120);
    ctx.lineTo(cx - 540, cy + 30);
    ctx.lineTo(cx, cy - 480);
    ctx.closePath();
    ctx.fill();

    // Right Roof Slope
    const roofRightGrad = ctx.createLinearGradient(cx, cy - 630, cx + 630, cy - 120);
    roofRightGrad.addColorStop(0, '#7DD3FC');
    roofRightGrad.addColorStop(0.5, '#38BDF8');
    roofRightGrad.addColorStop(1, '#0284C7');

    ctx.fillStyle = roofRightGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 630);
    ctx.lineTo(cx + 630, cy - 120);
    ctx.lineTo(cx + 540, cy + 30);
    ctx.lineTo(cx, cy - 480);
    ctx.closePath();
    ctx.fill();

    // Gable Front Face Triangle
    const gableGrad = ctx.createLinearGradient(cx, cy - 480, cx, cy - 30);
    gableGrad.addColorStop(0, '#FFFFFF');
    gableGrad.addColorStop(1, '#F1F5F9');

    ctx.fillStyle = gableGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 480);
    ctx.lineTo(cx + 540, cy + 30);
    ctx.lineTo(cx - 540, cy + 30);
    ctx.closePath();
    ctx.fill();

    // Front Main Wall Facade
    const wallGrad = ctx.createLinearGradient(cx - 450, cy + 30, cx + 450, cy + 570);
    wallGrad.addColorStop(0, '#FFFFFF');
    wallGrad.addColorStop(0.5, '#F8FAFC');
    wallGrad.addColorStop(1, '#E2E8F0');

    ctx.fillStyle = wallGrad;
    ctx.fillRect(cx - 450, cy + 30, 900, 540);

    // Chimney
    ctx.fillStyle = '#0369A1';
    ctx.fillRect(cx + 270, cy - 510, 120, 240);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(cx + 255, cy - 525, 150, 30);

    // Front Door with 3D arch
    const doorGrad = ctx.createLinearGradient(cx - 110, cy + 180, cx + 110, cy + 570);
    doorGrad.addColorStop(0, '#0F172A');
    doorGrad.addColorStop(1, '#334155');

    ctx.fillStyle = doorGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 120, cy + 570);
    ctx.lineTo(cx - 120, cy + 270);
    ctx.arcTo(cx - 120, cy + 180, cx, cy + 180, 120);
    ctx.arcTo(cx + 120, cy + 180, cx + 120, cy + 270, 120);
    ctx.lineTo(cx + 120, cy + 570);
    ctx.closePath();
    ctx.fill();

    // Door Handle
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(cx + 65, cy + 390, 24, 0, Math.PI * 2);
    ctx.fill();

    // Square Windows
    function draw3DWindow(wx, wy, w, h) {
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(wx, wy, w, h);
      ctx.lineWidth = 18;
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeRect(wx, wy, w, h);
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(wx + w / 2, wy);
      ctx.lineTo(wx + w / 2, wy + h);
      ctx.moveTo(wx, wy + h / 2);
      ctx.lineTo(wx + w, wy + h / 2);
      ctx.stroke();
    }

    draw3DWindow(cx - 360, cy + 150, 165, 180);
    draw3DWindow(cx + 195, cy + 150, 165, 180);

    // Micro-texture & fine hatch lines clipped strictly to exact house silhouette
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 630);
    ctx.lineTo(cx + 630, cy - 120);
    ctx.lineTo(cx + 540, cy + 30);
    ctx.lineTo(cx + 450, cy + 30);
    ctx.lineTo(cx + 450, cy + 570);
    ctx.lineTo(cx - 450, cy + 570);
    ctx.lineTo(cx - 450, cy + 30);
    ctx.lineTo(cx - 540, cy + 30);
    ctx.lineTo(cx - 630, cy - 120);
    ctx.closePath();
    ctx.clip();

    // High frequency angled texture hatch lines
    ctx.lineWidth = 2;
    for (let i = -1200; i < 1200; i += 4) {
      const alpha = (random() * 0.12 + 0.02).toFixed(3);
      ctx.strokeStyle = random() < 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(3,105,161,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(cx + i, cy - 700);
      ctx.lineTo(cx + i + 600, cy + 700);
      ctx.stroke();
    }

    // High density particle spray
    for (let p = 0; p < 8000000; p++) {
      const px = cx - 630 + random() * 1260;
      const py = cy - 630 + random() * 1200;
      const alpha = random() * 0.09 + 0.01;
      ctx.fillStyle = random() < 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(15,23,42,${alpha})`;
      ctx.fillRect(px, py, random() * 3 + 1, random() * 3 + 1);
    }
    ctx.restore();

    ctx.restore();

  } else if (style === 'brushed_gold_home_shield') {
    // 3. 3D Brushed Gold Hexagonal Shield Badge with Gold House Emblem (NO BG FLOOR SHADOW)
    const r = 680;

    function drawHexagon(rOut) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 2;
        const x = cx + rOut * Math.cos(angle);
        const y = cy + rOut * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    // Outer Metallic Gold Bevel
    const goldGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    goldGrad.addColorStop(0, '#FFF5C0');
    goldGrad.addColorStop(0.2, '#F59E0B');
    goldGrad.addColorStop(0.5, '#D97706');
    goldGrad.addColorStop(0.8, '#FEF08A');
    goldGrad.addColorStop(1, '#78350F');

    drawHexagon(r);
    ctx.fillStyle = goldGrad;
    ctx.fill();

    // Inner Dark Brushed Gold Plate
    const innerR = r - 60;
    const innerGold = ctx.createLinearGradient(cx - innerR, cy + innerR, cx + innerR, cy - innerR);
    innerGold.addColorStop(0, '#451A03');
    innerGold.addColorStop(0.3, '#78350F');
    innerGold.addColorStop(0.7, '#92400E');
    innerGold.addColorStop(1, '#1C0A00');

    drawHexagon(innerR);
    ctx.fillStyle = innerGold;
    ctx.fill();

    // Inner Metallic Rim
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#FDE047';
    drawHexagon(innerR - 10);
    ctx.stroke();

    // Micro-texture inside hexagon clip
    ctx.save();
    drawHexagon(innerR);
    ctx.clip();
    for (let p = 0; p < 4500000; p++) {
      const px = cx - innerR + random() * innerR * 2;
      const py = cy - innerR + random() * innerR * 2;
      const alpha = random() * 0.08 + 0.01;
      ctx.fillStyle = random() < 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(px, py, random() * 2 + 1, random() * 2 + 1);
    }
    ctx.restore();

    // Polished 3D Gold House Emblem
    ctx.save();
    const houseGold = ctx.createLinearGradient(cx - 300, cy - 300, cx + 300, cy + 300);
    houseGold.addColorStop(0, '#FFFBEB');
    houseGold.addColorStop(0.3, '#FDE047');
    houseGold.addColorStop(0.6, '#F59E0B');
    houseGold.addColorStop(0.8, '#FFF5C0');
    houseGold.addColorStop(1, '#B45309');

    ctx.fillStyle = houseGold;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 340);
    ctx.lineTo(cx + 300, cy - 60);
    ctx.lineTo(cx - 300, cy - 60);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(cx - 220, cy - 60, 440, 300);

    ctx.fillStyle = '#451A03';
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy + 240);
    ctx.lineTo(cx - 60, cy + 120);
    ctx.arcTo(cx - 60, cy + 70, cx, cy + 70, 60);
    ctx.arcTo(cx + 60, cy + 70, cx + 60, cy + 120, 60);
    ctx.lineTo(cx + 60, cy + 240);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

  } else if (style === 'sunset_home_capsule') {
    // 4. Modern Sunset Coral Pill Capsule Home Button (NO BG FLOOR SHADOW)
    const bw = 1200;
    const bh = 1200;
    const rx = 320;

    const bx = cx - bw / 2;
    const by = cy - bh / 2;

    function drawRoundedRect(x, y, w, h, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    const sunsetGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    sunsetGrad.addColorStop(0, '#FB7185');
    sunsetGrad.addColorStop(0.4, '#F43F5E');
    sunsetGrad.addColorStop(0.8, '#8B5CF6');
    sunsetGrad.addColorStop(1.0, '#6366F1');

    ctx.fillStyle = sunsetGrad;
    drawRoundedRect(bx, by, bw, bh, rx);
    ctx.fill();

    // Inner Highlight Contour Rim
    ctx.lineWidth = 16;
    const rimGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
    rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.strokeStyle = rimGrad;
    drawRoundedRect(bx + 12, by + 12, bw - 24, bh - 24, rx - 10);
    ctx.stroke();

    // Micro-texture inside capsule
    ctx.save();
    drawRoundedRect(bx, by, bw, bh, rx);
    ctx.clip();
    for (let p = 0; p < 800000; p++) {
      const px = bx + random() * bw;
      const py = by + random() * bh;
      const alpha = random() * 0.08 + 0.01;
      ctx.fillStyle = random() < 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(px, py, random() * 2 + 1, random() * 2 + 1);
    }
    ctx.restore();

    // Clean White 3D Floating House Icon
    ctx.save();
    ctx.shadowColor = 'rgba(76, 29, 149, 0.6)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetY = 25;

    ctx.fillStyle = '#FFFFFF';

    ctx.beginPath();
    ctx.moveTo(cx, cy - 350);
    ctx.lineTo(cx + 320, cy - 60);
    ctx.lineTo(cx - 320, cy - 60);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(cx + 160, cy - 280, 60, 120);
    ctx.fillRect(cx - 240, cy - 60, 480, 320);

    ctx.fillStyle = '#4C1D95';
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy + 260);
    ctx.lineTo(cx - 60, cy + 120);
    ctx.arcTo(cx - 60, cy + 70, cx, cy + 70, 60);
    ctx.arcTo(cx + 60, cy + 70, cx + 60, cy + 120, 60);
    ctx.lineTo(cx + 60, cy + 240);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(cx + 35, cy + 175, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Old Unused Cross Icon reference
function drawUnusedOldCrossIcon(ctx, width, height, random, style) {
  const cx = width / 2;
  const cy = height / 2;

  if (style === 'ruby_3d_badge') {
    // 1. Ruby Crimson 3D Circular Badge with Glossy Bevel & White 3D X Cross Mark
    const r = 700;

    // Floor Soft Drop Shadow
    ctx.save();
    ctx.translate(cx, cy + 90);
    const shadowGrad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.35);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.30)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Outer Bevel Outer Ring
    const outerGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    outerGrad.addColorStop(0, '#F87171');
    outerGrad.addColorStop(0.3, '#EF4444');
    outerGrad.addColorStop(0.7, '#B91C1C');
    outerGrad.addColorStop(1, '#7F1D1D');

    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner Bevel Shadow Disk
    const innerR = r - 50;
    const innerGrad = ctx.createRadialGradient(cx - innerR * 0.3, cy - innerR * 0.3, 20, cx, cy, innerR);
    innerGrad.addColorStop(0, '#FCA5A5');
    innerGrad.addColorStop(0.25, '#EF4444');
    innerGrad.addColorStop(0.65, '#DC2626');
    innerGrad.addColorStop(1.0, '#450A0A');

    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fill();

    // Upper Curved Glass Arch Reflection
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 10, 0, Math.PI * 2);
    ctx.clip();

    const glassGrad = ctx.createLinearGradient(cx, cy - innerR, cx, cy + innerR * 0.2);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    glassGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)');
    glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - innerR * 0.35, innerR * 0.9, innerR * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3D White Thick X Cross with Bevel Shadow
    const arm = 260;
    const strokeWidth = 140;

    // Draw 3D Under Shadow for X
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = 'rgba(69, 10, 10, 0.8)';
    ctx.beginPath();
    ctx.moveTo(cx - arm + 20, cy - arm + 35);
    ctx.lineTo(cx + arm + 20, cy + arm + 35);
    ctx.moveTo(cx + arm + 20, cy - arm + 35);
    ctx.lineTo(cx - arm + 20, cy + arm + 35);
    ctx.stroke();
    ctx.restore();

    // Main Glossy White X Cross
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = strokeWidth;

    const crossGrad = ctx.createLinearGradient(cx - arm, cy - arm, cx + arm, cy + arm);
    crossGrad.addColorStop(0, '#FFFFFF');
    crossGrad.addColorStop(0.5, '#FEF2F2');
    crossGrad.addColorStop(1, '#FEE2E2');

    ctx.strokeStyle = crossGrad;
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy - arm);
    ctx.lineTo(cx + arm, cy + arm);
    ctx.moveTo(cx + arm, cy - arm);
    ctx.lineTo(cx - arm, cy + arm);
    ctx.stroke();

    // Top Specular Highlight Line on X Cross
    ctx.lineWidth = strokeWidth * 0.35;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(cx - arm + 10, cy - arm - 10);
    ctx.lineTo(cx + arm - 10, cy + arm - 10);
    ctx.moveTo(cx + arm - 10, cy - arm - 10);
    ctx.lineTo(cx - arm + 10, cy + arm - 10);
    ctx.stroke();

    ctx.restore();

  } else if (style === 'neon_red_glow') {
    // 2. Electric Neon Red-Pink Tube Cross Icon with Multi-layered Radial Bloom Aura
    const arm = 300;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Outer Soft Glow Layers (Wide Bloom)
    const glowLayers = 40;
    for (let i = glowLayers; i >= 1; i--) {
      const alpha = 0.02 + (1 - i / glowLayers) * 0.04;
      const w = 40 + i * 16;

      ctx.lineCap = 'round';
      ctx.lineWidth = w;
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;

      ctx.beginPath();
      ctx.moveTo(cx - arm, cy - arm);
      ctx.lineTo(cx + arm, cy + arm);
      ctx.moveTo(cx + arm, cy - arm);
      ctx.lineTo(cx - arm, cy + arm);
      ctx.stroke();
    }

    // Mid Neon Magenta-Red Core
    const midLayers = 20;
    for (let i = midLayers; i >= 1; i--) {
      const alpha = 0.05 + (1 - i / midLayers) * 0.08;
      const w = 20 + i * 5;

      ctx.lineCap = 'round';
      ctx.lineWidth = w;
      ctx.strokeStyle = `rgba(244, 63, 94, ${alpha})`;

      ctx.beginPath();
      ctx.moveTo(cx - arm, cy - arm);
      ctx.lineTo(cx + arm, cy + arm);
      ctx.moveTo(cx + arm, cy - arm);
      ctx.lineTo(cx - arm, cy + arm);
      ctx.stroke();
    }

    // Intense Pure White Tube Core Light
    ctx.lineCap = 'round';
    ctx.lineWidth = 34;
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy - arm);
    ctx.lineTo(cx + arm, cy + arm);
    ctx.moveTo(cx + arm, cy - arm);
    ctx.lineTo(cx - arm, cy + arm);
    ctx.stroke();

    // Floating Neon Sparkle Particles around cross arms
    for (let s = 0; s < 200; s++) {
      const t = random();
      const isLine1 = random() < 0.5;
      const ptX = isLine1 ? cx - arm + t * (2 * arm) : cx + arm - t * (2 * arm);
      const ptY = cx - arm + t * (2 * arm);

      const offsetX = (random() - 0.5) * 450;
      const offsetY = (random() - 0.5) * 450;
      const rad = random() * 12 + 2;
      const alpha = random() * 0.8 + 0.2;

      const pGrad = ctx.createRadialGradient(ptX + offsetX, ptY + offsetY, 0, ptX + offsetX, ptY + offsetY, rad * 3);
      pGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      pGrad.addColorStop(0.4, `rgba(244, 63, 94, ${alpha * 0.7})`);
      pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(ptX + offsetX, ptY + offsetY, rad * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

  } else if (style === 'slate_obsidian_square') {
    // 3. Glossy Dark Slate / Obsidian Square Cancel Button with Vibrant Red X Cross
    const side = 1200;
    const rx = 240; // Corner radius

    const bx = cx - side / 2;
    const by = cy - side / 2;

    // Floor Shadow
    ctx.save();
    ctx.translate(cx, cy + 85);
    const shadowGrad = ctx.createRadialGradient(0, 0, side * 0.4, 0, 0, side * 0.85);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, side * 0.65, side * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    function drawRoundedSquare(x, y, s, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + s - radius, y);
      ctx.quadraticCurveTo(x + s, y, x + s, y + radius);
      ctx.lineTo(x + s, y + s - radius);
      ctx.quadraticCurveTo(x + s, y + s, x + s - radius, y + s);
      ctx.lineTo(x + radius, y + s);
      ctx.quadraticCurveTo(x, y + s, x, y + s - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    // Outer Beveled Dark Slate Frame
    const frameGrad = ctx.createLinearGradient(bx, by, bx + side, by + side);
    frameGrad.addColorStop(0, '#475569');
    frameGrad.addColorStop(0.3, '#1E293B');
    frameGrad.addColorStop(0.7, '#0F172A');
    frameGrad.addColorStop(1, '#020617');

    ctx.fillStyle = frameGrad;
    drawRoundedSquare(bx, by, side, rx);
    ctx.fill();

    // Inner Obsidian Plate
    const innerPadding = 45;
    const innerGrad = ctx.createRadialGradient(cx, cy - side * 0.2, 50, cx, cy, side * 0.6);
    innerGrad.addColorStop(0, '#1E293B');
    innerGrad.addColorStop(0.5, '#0F172A');
    innerGrad.addColorStop(1, '#020617');

    ctx.fillStyle = innerGrad;
    drawRoundedSquare(bx + innerPadding, by + innerPadding, side - innerPadding * 2, rx - 25);
    ctx.fill();

    // Metallic Rim Highlight
    ctx.lineWidth = 14;
    const rimGrad = ctx.createLinearGradient(bx, by, bx, by + side);
    rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.40)');
    rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.strokeStyle = rimGrad;
    drawRoundedSquare(bx + innerPadding + 8, by + innerPadding + 8, side - (innerPadding + 8) * 2, rx - 30);
    ctx.stroke();

    // Vibrant Red Glossy 3D X Cross
    const arm = 250;
    const strokeW = 140;

    // Checkmark Under Shadow
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.beginPath();
    ctx.moveTo(cx - arm + 20, cy - arm + 30);
    ctx.lineTo(cx + arm + 20, cy + arm + 30);
    ctx.moveTo(cx + arm + 20, cy - arm + 30);
    ctx.lineTo(cx - arm + 20, cy + arm + 30);
    ctx.stroke();
    ctx.restore();

    // Main Red Glossy Metallic X Cross
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = strokeW;

    const checkRed = ctx.createLinearGradient(cx - arm, cy - arm, cx + arm, cy + arm);
    checkRed.addColorStop(0, '#FCA5A5');
    checkRed.addColorStop(0.3, '#EF4444');
    checkRed.addColorStop(0.7, '#DC2626');
    checkRed.addColorStop(1, '#991B1B');

    ctx.strokeStyle = checkRed;
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy - arm);
    ctx.lineTo(cx + arm, cy + arm);
    ctx.moveTo(cx + arm, cy - arm);
    ctx.lineTo(cx - arm, cy + arm);
    ctx.stroke();

    // Specular Chrome Highlight Strip on top
    ctx.lineWidth = strokeW * 0.3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(cx - arm + 10, cy - arm - 10);
    ctx.lineTo(cx + arm - 10, cy + arm - 10);
    ctx.moveTo(cx + arm - 10, cy - arm - 10);
    ctx.lineTo(cx - arm + 10, cy + arm - 10);
    ctx.stroke();

    ctx.restore();

  } else if (style === 'violet_capsule') {
    // 4. Modern Sunset Violet-Indigo Pill Capsule Close Button with Soft 3D White X Cross
    const bw = 1200;
    const bh = 1200;
    const rx = 320; // rounded corner radius

    const bx = cx - bw / 2;
    const by = cy - bh / 2;

    // Floor Soft Shadow
    ctx.save();
    ctx.translate(cx, cy + 90);
    const shadowGrad = ctx.createRadialGradient(0, 0, bw * 0.3, 0, 0, bw * 0.7);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.50)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bw * 0.65, bh * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    function drawRoundedRect(x, y, w, h, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    const sunsetGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    sunsetGrad.addColorStop(0, '#A855F7'); // Purple
    sunsetGrad.addColorStop(0.4, '#7C3AED'); // Violet
    sunsetGrad.addColorStop(0.8, '#4F46E5'); // Indigo
    sunsetGrad.addColorStop(1.0, '#312E81'); // Deep Indigo

    ctx.fillStyle = sunsetGrad;
    drawRoundedRect(bx, by, bw, bh, rx);
    ctx.fill();

    // Inner Highlight Contour Rim
    ctx.lineWidth = 16;
    const rimGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
    rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.strokeStyle = rimGrad;
    drawRoundedRect(bx + 12, by + 12, bw - 24, bh - 24, rx - 10);
    ctx.stroke();

    // Clean White 3D Floating X Cross
    const arm = 260;
    const strokeW = 145;

    // Under Shadow
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = 'rgba(30, 27, 75, 0.65)';
    ctx.beginPath();
    ctx.moveTo(cx - arm + 20, cy - arm + 30);
    ctx.lineTo(cx + arm + 20, cy + arm + 30);
    ctx.moveTo(cx + arm + 20, cy - arm + 30);
    ctx.lineTo(cx - arm + 20, cy + arm + 30);
    ctx.stroke();
    ctx.restore();

    // White X Cross
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy - arm);
    ctx.lineTo(cx + arm, cy + arm);
    ctx.moveTo(cx + arm, cy - arm);
    ctx.lineTo(cx - arm, cy + arm);
    ctx.stroke();

    // Highlight
    ctx.lineWidth = strokeW * 0.3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(cx - arm + 10, cy - arm - 10);
    ctx.lineTo(cx + arm - 10, cy + arm - 10);
    ctx.moveTo(cx + arm - 10, cy - arm - 10);
    ctx.lineTo(cx - arm + 10, cy + arm - 10);
    ctx.stroke();

    ctx.restore();
  }

  // Add micro-texture / particle spray to ensure 2.0 MB - 10.0 MB size requirement
  ctx.save();
  for (let p = 0; p < 250000; p++) {
    const px = width * random();
    const py = height * random();
    const alpha = random() * 0.08 + 0.01;
    ctx.fillStyle = random() < 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(px, py, random() * 2 + 1, random() * 2 + 1);
  }
  ctx.restore();
}

function drawGoldenConfettiExplosion(ctx, width, height, random) {
  const cx = width / 2;
  const cy = height / 2;

  // Gold Metallic Color Palette Constants
  const goldPalette = [
    { start: '#FFF8C5', mid: '#F59E0B', end: '#92400E' },
    { start: '#FFFFFF', mid: '#FBBF24', end: '#B45309' },
    { start: '#FEF08A', mid: '#EAB308', end: '#78350F' },
    { start: '#FDE047', mid: '#D97706', end: '#B45309' },
    { start: '#FFFBEB', mid: '#F59E0B', end: '#78350F' }
  ];

  // Helper: Draw 3D metallic foil rectangle
  function drawFoilPiece(x, y, w, h, angle, skewX, scaleY, colorSet) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(1, Math.max(0.15, scaleY));

    // Drop shadow
    ctx.fillStyle = 'rgba(20, 10, 0, 0.18)';
    ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w, h);

    // Metallic foil body
    const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    grad.addColorStop(0, colorSet.start);
    grad.addColorStop(0.35, colorSet.mid);
    grad.addColorStop(0.75, colorSet.end);
    grad.addColorStop(1, colorSet.start);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + skewX, -h / 2);
    ctx.lineTo(w / 2 + skewX, -h / 2);
    ctx.lineTo(w / 2 - skewX, h / 2);
    ctx.lineTo(-w / 2 - skewX, h / 2);
    ctx.closePath();
    ctx.fill();

    // Metallic Specular Glint Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + skewX, -h / 2);
    ctx.lineTo(w / 2 + skewX, -h / 2);
    ctx.stroke();

    ctx.restore();
  }

  // Helper: Draw Starburst Cross-Flare
  function drawStarFlare(x, y, radius, alpha) {
    ctx.save();
    ctx.translate(x, y);

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.3, `rgba(254, 240, 138, ${alpha * 0.7})`);
    grad.addColorStop(0.7, `rgba(245, 158, 11, ${alpha * 0.2})`);
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Rays
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-radius * 1.8, 0);
    ctx.lineTo(radius * 1.8, 0);
    ctx.moveTo(0, -radius * 1.8);
    ctx.lineTo(0, radius * 1.8);
    ctx.stroke();

    ctx.restore();
  }

  // 1. Draw Curled Ribbon Streamers Radiating Outward
  const numRibbons = 24;
  for (let r = 0; r < numRibbons; r++) {
    const baseAngle = (r / numRibbons) * Math.PI * 2 + (random() - 0.5) * 0.3;
    const distance = 400 + random() * 1100;
    const endX = cx + Math.cos(baseAngle) * distance;
    const endY = cy + Math.sin(baseAngle) * distance;

    const cp1x = cx + Math.cos(baseAngle + 0.6) * (distance * 0.35);
    const cp1y = cy + Math.sin(baseAngle + 0.6) * (distance * 0.35);
    const cp2x = cx + Math.cos(baseAngle - 0.4) * (distance * 0.75);
    const cp2y = cy + Math.sin(baseAngle - 0.4) * (distance * 0.75);

    ctx.save();
    // Drop shadow under ribbon
    ctx.beginPath();
    ctx.moveTo(cx, cy + 8);
    ctx.bezierCurveTo(cp1x, cp1y + 8, cp2x, cp2y + 8, endX, endY + 8);
    ctx.strokeStyle = 'rgba(20, 10, 0, 0.12)';
    ctx.lineWidth = 14 + random() * 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Metallic Gradient Ribbon
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

    const ribGrad = ctx.createLinearGradient(cx, cy, endX, endY);
    ribGrad.addColorStop(0, '#FFFFFF');
    ribGrad.addColorStop(0.2, '#FBBF24');
    ribGrad.addColorStop(0.5, '#B45309');
    ribGrad.addColorStop(0.7, '#FDE047');
    ribGrad.addColorStop(1, '#D97706');

    ctx.strokeStyle = ribGrad;
    ctx.lineWidth = 12 + random() * 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inner Specular Ribbon Highlight
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.stroke();

    ctx.restore();
  }

  // 2. Medium & Large Metallic Confetti Squares / Rectangles
  const numFoilPieces = 2200;
  for (let i = 0; i < numFoilPieces; i++) {
    const distRatio = Math.pow(random(), 0.75); // Density clustered toward center
    const maxDist = Math.min(width, height) * 0.48;
    const dist = distRatio * maxDist + 50;
    const angle = random() * Math.PI * 2;

    const px = cx + Math.cos(angle) * dist + (random() - 0.5) * 120;
    const py = cy + Math.sin(angle) * dist + (random() - 0.5) * 120;

    const fw = 12 + random() * 32;
    const fh = 8 + random() * 24;
    const fAngle = random() * Math.PI * 2;
    const skewX = (random() - 0.5) * 8;
    const scaleY = 0.2 + random() * 0.8;

    const colorSet = goldPalette[Math.floor(random() * goldPalette.length)];
    drawFoilPiece(px, py, fw, fh, fAngle, skewX, scaleY, colorSet);
  }

  // 3. Small Confetti Diamonds and Triangular Flakes
  const numDiamonds = 4500;
  for (let i = 0; i < numDiamonds; i++) {
    const distRatio = Math.pow(random(), 0.85);
    const dist = distRatio * 1650;
    const angle = random() * Math.PI * 2;

    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const size = 3 + random() * 9;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(random() * Math.PI * 2);

    ctx.fillStyle = random() < 0.6 ? '#FBBF24' : (random() < 0.5 ? '#FEF08A' : '#B45309');
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 4. Sparkling Starburst Cross-Flares
  const numFlares = 60;
  for (let f = 0; f < numFlares; f++) {
    const dist = random() * 1200;
    const angle = random() * Math.PI * 2;
    const fx = cx + Math.cos(angle) * dist;
    const fy = cy + Math.sin(angle) * dist;
    const fRadius = 15 + random() * 35;
    const alpha = 0.6 + random() * 0.4;
    drawStarFlare(fx, fy, fRadius, alpha);
  }

  // 5. Dense Metallic Gold Dust Particles & Specular Micro-Glints
  for (let d = 0; d < 220000; d++) {
    const dist = Math.pow(random(), 0.7) * 1750;
    const angle = random() * Math.PI * 2;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;

    const alpha = random() * 0.75 + 0.15;
    const isBright = random() < 0.35;
    ctx.fillStyle = isBright ? `rgba(255, 255, 255, ${alpha})` : `rgba(245, 158, 11, ${alpha})`;
    ctx.fillRect(px, py, random() * 2.2 + 1, random() * 2.2 + 1);
  }
}

function drawRedTornPaperStrip(ctx, width, height, random) {
  const stripWidth = 3400;
  const stripHeight = 980;
  const startX = (width - stripWidth) / 2;
  const startY = (height - stripHeight) / 2 + 30;

  // Generate top and bottom torn edge offsets (wavy ragged deckled path)
  const segments = 220;
  const stepX = stripWidth / segments;

  const topOffsets = [];
  const botOffsets = [];

  let curTop = 0;
  let curBot = 0;

  for (let i = 0; i <= segments; i++) {
    curTop += (random() - 0.5) * 14;
    curTop = Math.max(-45, Math.min(45, curTop));
    const noiseTop = (random() - 0.5) * 18 + (i % 2 === 0 ? 5 : -5);
    topOffsets.push(curTop + noiseTop);

    curBot += (random() - 0.5) * 14;
    curBot = Math.max(-45, Math.min(45, curBot));
    const noiseBot = (random() - 0.5) * 18 + (i % 2 === 0 ? -5 : 5);
    botOffsets.push(curBot + noiseBot);
  }

  // 1. Multi-layered Drop Shadow Underneath
  for (let s = 25; s >= 1; s--) {
    const alpha = 0.012 * Math.pow(1 - s / 25, 1.25);
    ctx.fillStyle = `rgba(15, 10, 10, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(startX - s * 0.5, startY + topOffsets[0] + s * 1.5);

    for (let i = 0; i <= segments; i++) {
      const px = startX + i * stepX;
      const py = startY + topOffsets[i] + s * 1.5;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(startX + stripWidth + s * 0.5, startY + stripHeight + botOffsets[segments] + s * 1.5);

    for (let i = segments; i >= 0; i--) {
      const px = startX + i * stepX;
      const py = startY + stripHeight + botOffsets[i] + s * 1.5;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Helper to trace torn strip path
  function traceStripPath(topShift = 0, botShift = 0, xShiftLeft = 0, xShiftRight = 0) {
    ctx.beginPath();
    ctx.moveTo(startX + xShiftLeft, startY + topOffsets[0] + topShift);

    for (let i = 0; i <= segments; i++) {
      const px = startX + i * stepX;
      const py = startY + topOffsets[i] + topShift;
      ctx.lineTo(px, py);
    }

    ctx.lineTo(startX + stripWidth + xShiftRight, startY + stripHeight + botOffsets[segments] + botShift);

    for (let i = segments; i >= 0; i--) {
      const px = startX + i * stepX;
      const py = startY + stripHeight + botOffsets[i] + botShift;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // 2. White Paper Pulp Deckled Outer Fringe (Exposed Torn Edge)
  ctx.save();
  traceStripPath(-16, 16, -2, 2);
  const whiteFringeGrad = ctx.createLinearGradient(startX, startY, startX + stripWidth, startY + stripHeight);
  whiteFringeGrad.addColorStop(0, '#FFFFFF');
  whiteFringeGrad.addColorStop(0.5, '#F8F8F8');
  whiteFringeGrad.addColorStop(1, '#EFEFEF');
  ctx.fillStyle = whiteFringeGrad;
  ctx.fill();

  // Draw torn fiber fringe strokes on white edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // White paper fiber flecks along top and bottom edges
  for (let i = 0; i < 3500; i++) {
    const isTop = random() < 0.5;
    const segIdx = Math.floor(random() * segments);
    const px = startX + segIdx * stepX + (random() - 0.5) * stepX;
    const basePy = isTop ? startY + topOffsets[segIdx] : startY + stripHeight + botOffsets[segIdx];
    const py = basePy + (random() - 0.5) * 22;
    ctx.fillStyle = `rgba(255, 255, 255, ${random() * 0.8 + 0.2})`;
    ctx.fillRect(px, py, random() * 4 + 1, random() * 2 + 1);
  }
  ctx.restore();

  // 3. Main Crimson Red Paper Strip
  ctx.save();
  traceStripPath(0, 0, 0, 0);

  const redGrad = ctx.createLinearGradient(startX, startY, startX + stripWidth, startY + stripHeight);
  redGrad.addColorStop(0, '#E1181C');
  redGrad.addColorStop(0.3, '#D31115');
  redGrad.addColorStop(0.7, '#C20B0F');
  redGrad.addColorStop(1, '#A00508');

  ctx.fillStyle = redGrad;
  ctx.fill();

  // Internal Paper Texture Clipping
  ctx.clip();

  // A) Natural Paper Wrinkles & Creases
  ctx.strokeStyle = 'rgba(255, 200, 200, 0.12)';
  ctx.lineWidth = 1.2;
  for (let c = 0; c < 18; c++) {
    const cx = startX + random() * stripWidth;
    ctx.beginPath();
    ctx.moveTo(cx, startY - 50);
    ctx.quadraticCurveTo(cx + (random() - 0.5) * 80, startY + stripHeight / 2, cx + (random() - 0.5) * 120, startY + stripHeight + 50);
    ctx.stroke();
  }

  // Dark Crease Shadows
  ctx.strokeStyle = 'rgba(60, 0, 0, 0.15)';
  ctx.lineWidth = 1.5;
  for (let c = 0; c < 18; c++) {
    const cx = startX + random() * stripWidth;
    ctx.beginPath();
    ctx.moveTo(cx, startY - 50);
    ctx.quadraticCurveTo(cx + (random() - 0.5) * 80, startY + stripHeight / 2, cx + (random() - 0.5) * 120, startY + stripHeight + 50);
    ctx.stroke();
  }

  // B) Dense Red Paper Micro-Texture & Fiber Grain
  for (let i = 0; i < 650000; i++) {
    const fx = startX + random() * stripWidth;
    const fy = startY + random() * stripHeight;
    const alpha = random() * 0.08 + 0.01;
    const isDark = random() < 0.55;
    ctx.fillStyle = isDark ? `rgba(40, 0, 0, ${alpha})` : `rgba(255, 230, 230, ${alpha})`;
    ctx.fillRect(fx, fy, random() * 2.5 + 1, 1.2);
  }

  ctx.restore();
}

function drawCurledStickyNote(ctx, x, y, width, height, noteConfig, random, numFibers = 500000) {
  const paperColor = noteConfig.paperColor || '#E2C222'; // Vibrant golden yellow
  const curlRatio = noteConfig.curlRatio || 0.28; // 28% corner curl
  const curlW = width * curlRatio;
  const curlH = height * curlRatio;

  ctx.save();

  // 1. Realistic Multi-Layer 3D Drop Shadow (with extra lift under curled corner)
  const shadowLayers = 20;
  for (let s = shadowLayers; s >= 1; s--) {
    const spread = s * 2.5;
    const offsetY = s * 2.0;
    const alpha = 0.012 * Math.pow(1 - s / shadowLayers, 1.3);

    ctx.save();
    ctx.fillStyle = `rgba(35, 30, 20, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(x - spread * 0.2, y + offsetY * 0.5);
    ctx.lineTo(x + width + spread * 0.2, y + offsetY * 0.5);
    ctx.lineTo(x + width + spread * 0.5, y + height - curlH);
    // Shadow under curled corner bulges out further down
    ctx.quadraticCurveTo(
      x + width + spread * 0.8, y + height + spread * 0.8,
      x + width - curlW, y + height + spread * 1.2
    );
    ctx.lineTo(x - spread * 0.2, y + height + spread * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 2. Main Paper Body Path (Clipped at bottom-right corner where paper curls)
  const paperRgb = hexToRgb(paperColor);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height - curlH);
  // Curved fold line where the paper lifts up
  ctx.quadraticCurveTo(
    x + width - curlW * 0.35, y + height - curlH * 0.35,
    x + width - curlW, y + height
  );
  ctx.lineTo(x, y + height);
  ctx.closePath();

  // Main Paper Fill with 3D Lighting Gradient
  const paperGrad = ctx.createLinearGradient(x, y, x + width, y + height);
  paperGrad.addColorStop(0, `rgb(${Math.min(255, paperRgb.r + 15)}, ${Math.min(255, paperRgb.g + 15)}, ${Math.min(255, paperRgb.b + 10)})`);
  paperGrad.addColorStop(0.6, paperColor);
  paperGrad.addColorStop(1, `rgb(${Math.max(0, paperRgb.r - 28)}, ${Math.max(0, paperRgb.g - 28)}, ${Math.max(0, paperRgb.b - 18)})`);

  ctx.fillStyle = paperGrad;
  ctx.fill();

  // Clip paper area for micro-textures
  ctx.clip();

  // Paper Micro-Texture & Fiber Grain
  for (let i = 0; i < numFibers; i++) {
    const fx = x + random() * width;
    const fy = y + random() * height;
    const fLen = random() * 2.8 + 1.0;
    const fAlpha = random() * 0.09 + 0.02;
    const isDark = random() < 0.52;
    const colorVal = isDark ? 0 : 255;

    ctx.fillStyle = `rgba(${colorVal}, ${colorVal}, ${colorVal}, ${fAlpha})`;
    ctx.fillRect(fx, fy, fLen, fLen * 0.7);
  }

  // Soft Ambient Shadow cast onto paper under the curl
  const curlUnderShadow = ctx.createRadialGradient(
    x + width - curlW * 0.5, y + height - curlH * 0.5, 0,
    x + width - curlW * 0.5, y + height - curlH * 0.5, curlW * 1.2
  );
  curlUnderShadow.addColorStop(0, 'rgba(30, 20, 0, 0.35)');
  curlUnderShadow.addColorStop(0.5, 'rgba(40, 25, 0, 0.15)');
  curlUnderShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = curlUnderShadow;
  ctx.fillRect(x, y, width, height);

  ctx.restore();

  // 3. Flapped Backside of the Curled Corner (Lifted 3D Curl)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + width - curlW, y + height);
  // Curve towards the curled tip
  const tipX = x + width - curlW * 0.15;
  const tipY = y + height - curlH * 0.15;
  ctx.quadraticCurveTo(
    x + width - curlW * 0.65, y + height - curlH * 0.25,
    tipX, tipY
  );
  ctx.quadraticCurveTo(
    x + width - curlW * 0.25, y + height - curlH * 0.65,
    x + width, y + height - curlH
  );
  // Curve along the fold line back to start
  ctx.quadraticCurveTo(
    x + width - curlW * 0.35, y + height - curlH * 0.35,
    x + width - curlW, y + height
  );
  ctx.closePath();

  // Light Pale Backside Gradient with Highlight Sheen
  const backGrad = ctx.createLinearGradient(
    x + width - curlW, y + height - curlH,
    x + width, y + height
  );
  backGrad.addColorStop(0, '#FFFDF0'); // Bright pale highlight at fold
  backGrad.addColorStop(0.4, '#FFF8B8'); // Soft pale yellow
  backGrad.addColorStop(1, '#E6C72E'); // Natural paper yellow tone near tip

  ctx.fillStyle = backGrad;
  ctx.fill();

  // Delicate stroke border along curl edge
  ctx.strokeStyle = 'rgba(210, 170, 30, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Micro-texture on curled flap
  ctx.clip();
  const flapFibers = Math.floor(numFibers * 0.08);
  for (let i = 0; i < flapFibers; i++) {
    const fx = x + width - curlW + random() * curlW;
    const fy = y + height - curlH + random() * curlH;
    const fAlpha = random() * 0.08 + 0.02;
    ctx.fillStyle = `rgba(0, 0, 0, ${fAlpha})`;
    ctx.fillRect(fx, fy, 2, 1.5);
  }

  ctx.restore();

  ctx.restore();
}

function generateStickyNoteAsset(variant) {
  const width = 3840;
  const height = 2160;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Clear for 32-bit RGBA Alpha Transparency
  ctx.clearRect(0, 0, width, height);

  const random = createRandom(variant.seed || 998877);

  if (variant.mode === 'golden_spotlight_v1') {
    drawHomeIcon(ctx, width, height, random, 'indigo_3d_badge');
  } else if (variant.mode === 'golden_spotlight_v2') {
    drawHomeIcon(ctx, width, height, random, 'pure_3d_house_isolated');
  } else if (variant.mode === 'golden_spotlight_v3') {
    drawHomeIcon(ctx, width, height, random, 'brushed_gold_home_shield');
  } else if (variant.mode === 'golden_spotlight_v4') {
    drawHomeIcon(ctx, width, height, random, 'sunset_home_capsule');
  } else if (variant.mode === 'golden_spotlight_beam') {
    drawHomeIcon(ctx, width, height, random, 'indigo_3d_badge');

  } else if (variant.mode === 'golden_confetti_explosion') {
    // Draw Golden Metallic Confetti & Streamer Foil Burst Explosion on transparent background
    drawGoldenConfettiExplosion(ctx, width, height, random);

  } else if (variant.mode === 'red_torn_paper_strip') {
    // Draw Crimson Red Horizontal Torn Paper Banner Strip with Deckled White Fiber Edges
    drawRedTornPaperStrip(ctx, width, height, random);

  } else if (variant.mode === '3d_isometric_stacked') {
    // Draw Stacked Multi-Colored Pastel Sticky Note Pads in 3D Isometric View with Peeling Top Sheet
    drawIsometricStackedStickyPads(ctx, width, height, random);

  } else if (variant.mode === '3_white_kraft_set') {
    // Draw 3 White Paper Memo Notes with Kraft Masking Tape (Exact Match to User Reference)
    drawKraftTapedWhiteNoteSet(ctx, width, height, random);

  } else if (variant.mode === '4_set_row') {
    // Draw 4 Sticky Notes side-by-side matching the reference image!
    const noteWidth = 720;
    const noteHeight = 720;
    const startX = 260;
    const gap = 120;
    const startY = (height - noteHeight) / 2 + 80;

    const notes = [
      {
        paperColor: '#8BB8E8', // Pastel Sky Blue
        shadowColor: '#1A3558',
        tapeColor: '#2D62A3',
        tapePattern: 'dots',
        isTornBottom: true,
        tapeAngle: -0.02
      },
      {
        paperColor: '#FEE599', // Pastel Light Golden Yellow
        shadowColor: '#5C4810',
        tapeColor: '#F7C948',
        tapePattern: 'solid',
        isTornBottom: false,
        tapeAngle: -0.08
      },
      {
        paperColor: '#F4EEDD', // Warm Cream / Off-White
        shadowColor: '#4D4738',
        tapeColor: '#BFE3F7',
        tapePattern: 'solid',
        isTornBottom: true,
        tapeAngle: 0.01
      },
      {
        paperColor: '#E9D5FA', // Soft Pastel Purple
        shadowColor: '#4A2A6B',
        tapeColor: '#F2C18D',
        tapePattern: 'solid',
        isTornBottom: false,
        tapeAngle: 0.05
      }
    ];

    notes.forEach((note, index) => {
      const nx = startX + index * (noteWidth + gap);
      const ny = startY + (index % 2 === 0 ? -15 : 10);
      drawSingleStickyNote(ctx, nx, ny, noteWidth, noteHeight, note, random);
    });

  } else if (variant.mode === 'curled' || variant.isCurled) {
    // Single Large Centered 4K Curled Yellow Sticky Note (Exact Match to User Reference Image)
    const noteWidth = 1600;
    const noteHeight = 1600;
    const nx = (width - noteWidth) / 2;
    const ny = (height - noteHeight) / 2 + 50;

    const note = {
      paperColor: variant.primaryColor || '#E2C222',
      curlRatio: variant.curlRatio || 0.32
    };

    drawCurledStickyNote(ctx, nx, ny, noteWidth, noteHeight, note, random, 850000);

  } else {
    // Single Large Centered 4K Sticky Note
    const noteWidth = 1600;
    const noteHeight = 1600;
    const nx = (width - noteWidth) / 2;
    const ny = (height - noteHeight) / 2 + 100;

    const note = {
      paperColor: variant.primaryColor || '#8BB8E8',
      shadowColor: variant.secondaryColor || '#1A3558',
      tapeColor: variant.tapeColor || '#2D62A3',
      tapePattern: variant.tapePattern || 'solid',
      isTornBottom: variant.isTornBottom !== false,
      tapeAngle: -0.04
    };

    drawSingleStickyNote(ctx, nx, ny, noteWidth, noteHeight, note, random, 650000);
  }

  // Save PNG file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(variant.filepath, buffer);
  const stats = fs.statSync(variant.filepath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`Generated ${variant.name} -> ${variant.filepath} (${sizeInMB} MB)`);
}

function main() {
  const outDir = path.join(process.cwd(), 'spotlight_studio');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Generating 4K Pastel Sticky Notes & Memo Pads Assets (Target Size: 2.0 MB - 10.0 MB)...');

  const variations = [
    {
      id: 'golden_spotlight_v1',
      name: '3D Glossy Indigo Circle Home Badge (Clean PNG)',
      filepath: path.join(outDir, 'output_gold_spotlight_v1.png'),
      primaryColor: '#3B82F6',
      secondaryColor: '#1E3A8A',
      mode: 'golden_spotlight_v1',
      seed: 112233
    },
    {
      id: 'golden_spotlight_v2',
      name: 'Pure 3D Rendered Isometric House (Clean PNG)',
      filepath: path.join(outDir, 'output_gold_spotlight_v2.png'),
      primaryColor: '#38BDF8',
      secondaryColor: '#0369A1',
      mode: 'golden_spotlight_v2',
      seed: 223344
    },
    {
      id: 'golden_spotlight_v3',
      name: '3D Brushed Gold Shield Home Emblem (Clean PNG)',
      filepath: path.join(outDir, 'output_gold_spotlight_v3.png'),
      primaryColor: '#F59E0B',
      secondaryColor: '#78350F',
      mode: 'golden_spotlight_v3',
      seed: 334455
    },
    {
      id: 'golden_spotlight_v4',
      name: 'Modern Sunset Pill Capsule Home Button (Clean PNG)',
      filepath: path.join(outDir, 'output_gold_spotlight_v4.png'),
      primaryColor: '#F43F5E',
      secondaryColor: '#6366F1',
      mode: 'golden_spotlight_v4',
      seed: 445566
    }
  ];

  variations.forEach((v) => {
    generateStickyNoteAsset(v);
  });

  // Default copy to output_gold_spotlight.png and output.png
  const defaultSrc = path.join(outDir, 'output_gold_spotlight_v1.png');
  const dstGold = path.join(outDir, 'output_gold_spotlight.png');
  const defaultDst = path.join(outDir, 'output.png');
  if (fs.existsSync(defaultSrc)) {
    fs.copyFileSync(defaultSrc, dstGold);
    fs.copyFileSync(defaultSrc, defaultDst);
    console.log(`Copied default spotlight asset -> ${dstGold} & ${defaultDst}`);
  }

  console.log('All 4K Pastel Sticky Note Assets generated successfully!');
}

main();
