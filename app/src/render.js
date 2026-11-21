// The cover renderer: one function draws the whole poster at any size, so the editor
// preview and the exported PNG are the same drawing. Panels are clipped polygons;
// each holds a cover-fitted photo (or a sunset sky when empty), takes the grade, and
// is outlined with a bold keyline before the caption lettering goes on top.

import { layoutPanels } from './layouts.js';
import { gradeById } from './grades.js';

function tracePanelPath(ctx, panel, width, height) {
  ctx.beginPath();
  panel.points.forEach(([px, py], index) => {
    if (index === 0) ctx.moveTo(px * width, py * height);
    else ctx.lineTo(px * width, py * height);
  });
  ctx.closePath();
}

function drawPanelPhoto(ctx, panel, photo, slot, width, height) {
  const bb = panel.bbox;
  const bw = bb.w * width;
  const bh = bb.h * height;
  const scale = Math.max(bw / photo.width, bh / photo.height) * slot.zoom;
  const dw = photo.width * scale;
  const dh = photo.height * scale;
  // An offset may only spend the slack the cover fit leaves: spending more would
  // bare an edge of the panel, so the drawing clamps whatever the editor stored.
  const maxOx = Math.max(0, (dw - bw) / 2) / bw;
  const maxOy = Math.max(0, (dh - bh) / 2) / bh;
  const ox = Math.min(maxOx, Math.max(-maxOx, slot.ox));
  const oy = Math.min(maxOy, Math.max(-maxOy, slot.oy));
  const cx = (bb.x + bb.w / 2) * width + ox * bw;
  const cy = (bb.y + bb.h / 2) * height + oy * bh;
  ctx.drawImage(photo.img, cx - dw / 2, cy - dh / 2, dw, dh);
}

// An empty panel still earns its place on the poster: the grade's sunset sky, a low
// sun and retro stripes cut across it.
function drawPanelSky(ctx, panel, grade, width, height) {
  const bb = panel.bbox;
  const x = bb.x * width;
  const y = bb.y * height;
  const bw = bb.w * width;
  const bh = bb.h * height;
  const sky = ctx.createLinearGradient(0, y, 0, y + bh);
  grade.sky.forEach((stop, i) => sky.addColorStop(i / (grade.sky.length - 1), stop));
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, bw, bh);
  const sunR = Math.min(bw, bh) * 0.26;
  const sunX = x + bw * 0.5;
  const sunY = y + bh * 0.66;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grade.sun;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  ctx.fillStyle = 'rgba(10, 4, 24, 0.55)';
  for (let i = 0; i < 4; i++) {
    const stripeY = sunY + sunR * (0.08 + i * 0.22);
    ctx.fillRect(sunX - sunR, stripeY, sunR * 2, sunR * (0.05 + i * 0.03));
  }
  ctx.restore();
}

function applyPanelGrade(ctx, panel, grade, width, height) {
  const bb = panel.bbox;
  const x = bb.x * width;
  const y = bb.y * height;
  const bw = bb.w * width;
  const bh = bb.h * height;
  const wash = ctx.createLinearGradient(0, y, 0, y + bh);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(0.52, grade.mid);
  wash.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, bw, bh);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = grade.tint;
  ctx.fillRect(x, y, bw, bh);
  ctx.globalCompositeOperation = 'source-over';
  const shade = ctx.createRadialGradient(
    x + bw / 2, y + bh / 2, Math.min(bw, bh) * 0.42,
    x + bw / 2, y + bh / 2, Math.max(bw, bh) * 0.78,
  );
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.20)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, bw, bh);
}

function drawPanel(ctx, panel, slot, state, grade, width, height) {
  const photo = slot ? state.photos[slot.photo] : null;
  ctx.save();
  tracePanelPath(ctx, panel, width, height);
  ctx.clip();
  if (photo && photo.img) {
    ctx.filter = grade.filter;
    drawPanelPhoto(ctx, panel, photo, slot, width, height);
    ctx.filter = 'none';
  } else {
    drawPanelSky(ctx, panel, grade, width, height);
  }
  applyPanelGrade(ctx, panel, grade, width, height);
  ctx.restore();
}

function drawKeylines(ctx, panels, width, height) {
  const line = Math.max(4, width * 0.0065);
  ctx.strokeStyle = '#0a0a11';
  ctx.lineJoin = 'round';
  ctx.lineWidth = line;
  for (const panel of panels) {
    tracePanelPath(ctx, panel, width, height);
    ctx.stroke();
  }
  ctx.lineWidth = line * 1.5;
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);
}

function drawPosterFinish(ctx, width, height) {
  const sheen = ctx.createLinearGradient(0, 0, 0, height * 0.22);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, width, height * 0.22);
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.46,
    width / 2, height / 2, Math.max(width, height) * 0.74,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

// Bold stacked caption lettering, bottom-left like a poster should carry it: one
// shared size fitted to the widest line, a heavy dark outline, a hard shadow and an
// accent rule under the last line.
function drawCaption(ctx, state, grade, width, height) {
  const lines = state.captionLines.map((line) => line.trim().toUpperCase()).filter(Boolean);
  if (!lines.length) return;
  let fontSize = Math.round(width * 0.104 * state.captionScale);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const setFont = () => { ctx.font = `400 ${fontSize}px Anton, "Arial Narrow", sans-serif`; };
  setFont();
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  if (widest > width * 0.9) {
    fontSize = Math.floor(fontSize * ((width * 0.9) / widest));
    setFont();
  }
  const x = width * 0.048;
  const lineHeight = fontSize * 1.05;
  let baseline = height - height * 0.048;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(6, 0, 18, 0.55)';
  ctx.shadowOffsetY = fontSize * 0.055;
  ctx.shadowBlur = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.strokeStyle = '#0a0a12';
    ctx.lineWidth = fontSize * 0.15;
    ctx.strokeText(lines[i], x, baseline);
    ctx.fillStyle = grade.captionFill;
    ctx.fillText(lines[i], x, baseline);
    baseline -= lineHeight;
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetY = 0;
  const widestNow = Math.max(...lines.map((line) => ctx.measureText(line).width));
  ctx.fillStyle = grade.accent;
  ctx.fillRect(x + width * 0.002, height - height * 0.036, widestNow, fontSize * 0.085);
}

function drawSelection(ctx, panel, width, height) {
  ctx.save();
  tracePanelPath(ctx, panel, width, height);
  ctx.strokeStyle = '#2ee6c8';
  ctx.lineWidth = Math.max(3, width * 0.004);
  ctx.setLineDash([width * 0.016, width * 0.011]);
  ctx.stroke();
  ctx.restore();
}

export function drawCover(ctx, width, height, state, options = {}) {
  const grade = gradeById(state.gradeId);
  const panels = layoutPanels(state.layoutId, width / height);
  ctx.save();
  ctx.fillStyle = '#07070c';
  ctx.fillRect(0, 0, width, height);
  panels.forEach((panel, i) => drawPanel(ctx, panel, state.slots[i], state, grade, width, height));
  drawKeylines(ctx, panels, width, height);
  drawPosterFinish(ctx, width, height);
  drawCaption(ctx, state, grade, width, height);
  if (options.selected != null && panels[options.selected]) {
    drawSelection(ctx, panels[options.selected], width, height);
  }
  ctx.restore();
}

export function renderCoverDataURL(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas.getContext('2d'), width, height, state, {});
  return canvas.toDataURL('image/png');
}
