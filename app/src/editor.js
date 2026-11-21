// The studio editor: owns the cover state, keeps the preview canvas honest, and wires
// every control — photo tray, layout and grade pickers, per-panel drag and zoom,
// caption fields, post-size picker and the one-click PNG export.

import { drawCover, renderCoverDataURL } from './render.js';
import { layoutPanels, layoutPanelCount, pointInPanel } from './layouts.js';
import { loadSamplePhotos, loadPhotoFiles } from './photos.js';

const EXPORT_SIZES = [
  { w: 1080, h: 1080 },
  { w: 1080, h: 1350 },
  { w: 1920, h: 1080 },
];

function defaultSlot(photoIndex) {
  return { photo: photoIndex, zoom: 1, ox: 0, oy: 0 };
}

export function createStudioState() {
  return {
    layoutId: 'classic',
    gradeId: 'neon',
    captionLines: ['VICE CITY', 'HEAT'],
    captionScale: 1,
    photos: [],
    slots: [],
    selected: 0,
    activePhoto: 0,
    size: { w: 1920, h: 1080 },
  };
}

// Slots follow the layout's panel count; a fresh slot cycles through the photos so a
// new layout opens already dressed, never half empty.
function ensureSlots(state) {
  const count = layoutPanelCount(state.layoutId, state.size.w / state.size.h);
  while (state.slots.length < count) {
    state.slots.push(defaultSlot(state.photos.length ? state.slots.length % state.photos.length : 0));
  }
  state.slots.length = count;
  if (state.selected >= count) state.selected = 0;
}

function previewDimensions(size) {
  const aspect = size.w / size.h;
  if (aspect >= 1) return { w: 920, h: Math.round(920 / aspect) };
  return { w: Math.round(920 * aspect), h: 920 };
}

export async function initStudio(doc = document) {
  const state = createStudioState();
  const canvas = doc.getElementById('cover');
  const ctx = canvas.getContext('2d');

  function redraw() {
    ensureSlots(state);
    drawCover(ctx, canvas.width, canvas.height, state, { selected: state.selected });
    syncControls();
  }

  function fitPreview() {
    const dims = previewDimensions(state.size);
    canvas.width = dims.w;
    canvas.height = dims.h;
  }

  // ---- photo tray -------------------------------------------------------------
  const tray = doc.getElementById('tray');
  function renderTray() {
    tray.replaceChildren();
    state.photos.forEach((photo, index) => {
      const item = doc.createElement('button');
      item.type = 'button';
      item.className = 'tray-item' + (index === state.activePhoto ? ' active' : '');
      const img = doc.createElement('img');
      img.src = photo.url;
      img.alt = photo.name;
      const tag = doc.createElement('span');
      tag.className = 'tray-tag';
      tag.textContent = photo.name.replace(/\.[a-z0-9]+$/i, '');
      item.append(img, tag);
      item.addEventListener('click', () => assignPhotoToSelected(index));
      tray.append(item);
    });
  }

  function assignPhotoToSelected(photoIndex) {
    state.activePhoto = photoIndex;
    ensureSlots(state);
    if (state.slots[state.selected]) state.slots[state.selected].photo = photoIndex;
    redraw();
    renderTray();
  }

  async function addFiles(fileList) {
    const loaded = await loadPhotoFiles(fileList);
    if (!loaded.length) return;
    const firstNew = state.photos.length;
    state.photos.push(...loaded);
    assignPhotoToSelected(firstNew);
  }

  const fileInput = doc.getElementById('fileInput');
  doc.getElementById('addPhotosBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });
  doc.getElementById('fillAllBtn').addEventListener('click', () => {
    ensureSlots(state);
    state.slots.forEach((slot) => { slot.photo = state.activePhoto; });
    redraw();
  });

  const stage = doc.getElementById('stage');
  stage.addEventListener('dragover', (event) => {
    event.preventDefault();
    stage.classList.add('dragging');
  });
  stage.addEventListener('dragleave', () => stage.classList.remove('dragging'));
  stage.addEventListener('drop', (event) => {
    event.preventDefault();
    stage.classList.remove('dragging');
    if (event.dataTransfer) addFiles(event.dataTransfer.files);
  });

  // ---- panel selection, drag and zoom -----------------------------------------
  let drag = null;
  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      ux: (event.clientX - rect.left) / rect.width,
      uy: (event.clientY - rect.top) / rect.height,
    };
  }
  canvas.addEventListener('pointerdown', (event) => {
    const { ux, uy } = canvasPoint(event);
    const panels = layoutPanels(state.layoutId, state.size.w / state.size.h);
    const hit = panels.findIndex((panel) => pointInPanel(panel, ux, uy));
    if (hit >= 0) state.selected = hit;
    ensureSlots(state);
    const slot = state.slots[state.selected];
    if (slot) {
      drag = { startX: ux, startY: uy, ox: slot.ox, oy: slot.oy, panel: panels[state.selected] };
      canvas.setPointerCapture(event.pointerId);
    }
    redraw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const { ux, uy } = canvasPoint(event);
    const slot = state.slots[state.selected];
    slot.ox = clamp(drag.ox + (ux - drag.startX) / drag.panel.bbox.w, -0.75, 0.75);
    slot.oy = clamp(drag.oy + (uy - drag.startY) / drag.panel.bbox.h, -0.75, 0.75);
    redraw();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  const zoomRange = doc.getElementById('zoomRange');
  zoomRange.addEventListener('input', () => {
    ensureSlots(state);
    const slot = state.slots[state.selected];
    if (slot) slot.zoom = Number(zoomRange.value);
    redraw();
  });
  doc.getElementById('resetPanelBtn').addEventListener('click', () => {
    ensureSlots(state);
    const slot = state.slots[state.selected];
    if (slot) Object.assign(slot, { zoom: 1, ox: 0, oy: 0 });
    redraw();
  });

  // ---- pickers ------------------------------------------------------------------
  function wireSegment(id, attr, apply) {
    const seg = doc.getElementById(id);
    seg.querySelectorAll(`[data-${attr}]`).forEach((btn) => {
      btn.addEventListener('click', () => apply(btn.dataset[attr]));
    });
    return seg;
  }
  const layoutSeg = wireSegment('layoutSeg', 'layout', (id) => {
    state.layoutId = id;
    ensureSlots(state);
    redraw();
  });
  const gradeSeg = wireSegment('gradeSeg', 'grade', (id) => {
    state.gradeId = id;
    redraw();
  });
  const sizeSeg = wireSegment('sizeSeg', 'size', (value) => {
    const [w, h] = value.split('x').map(Number);
    state.size = { w, h };
    fitPreview();
    ensureSlots(state);
    redraw();
  });

  function markActive(seg, attr, value) {
    seg.querySelectorAll(`[data-${attr}]`).forEach((btn) => {
      btn.classList.toggle('active', btn.dataset[attr] === value);
    });
  }

  const selectedLabel = doc.getElementById('selectedLabel');
  function syncControls() {
    markActive(layoutSeg, 'layout', state.layoutId);
    markActive(gradeSeg, 'grade', state.gradeId);
    markActive(sizeSeg, 'size', `${state.size.w}x${state.size.h}`);
    selectedLabel.textContent = `panel ${state.selected + 1}`;
    const slot = state.slots[state.selected];
    if (slot && document.activeElement !== zoomRange) zoomRange.value = String(slot.zoom);
  }

  // ---- caption ------------------------------------------------------------------
  const caption1 = doc.getElementById('caption1');
  const caption2 = doc.getElementById('caption2');
  const onCaption = () => {
    state.captionLines = [caption1.value, caption2.value];
    redraw();
  };
  caption1.addEventListener('input', onCaption);
  caption2.addEventListener('input', onCaption);
  doc.getElementById('captionScale').addEventListener('input', (event) => {
    state.captionScale = Number(event.target.value);
    redraw();
  });

  // ---- export -------------------------------------------------------------------
  doc.getElementById('exportBtn').addEventListener('click', async () => {
    await document.fonts.ready;
    const out = doc.createElement('canvas');
    out.width = state.size.w;
    out.height = state.size.h;
    drawCover(out.getContext('2d'), out.width, out.height, state, {});
    out.toBlob((blob) => {
      if (!blob) return;
      const link = doc.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `vice-panels-${state.size.w}x${state.size.h}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    }, 'image/png');
  });

  // ---- first paint ---------------------------------------------------------------
  state.photos = await loadSamplePhotos();
  state.activePhoto = 0;
  ensureSlots(state);
  // Dress the default grid: boulevard tall on the left, pier up top, boulevard again
  // low on the right with its own crop.
  if (state.slots.length >= 3) {
    state.slots[0].photo = 0;
    state.slots[1].photo = 1;
    state.slots[1].oy = 0.12;
    state.slots[2].photo = 0;
    state.slots[2].oy = 0.18;
  }
  renderTray();
  fitPreview();
  try {
    await document.fonts.load('40px Anton');
  } catch { /* the canvas falls back to a condensed sans until the font lands */ }
  redraw();

  // A small handle for screenshots and tinkerers: drive the studio from the console.
  return {
    state,
    refresh: redraw,
    setLayout(id) { state.layoutId = id; ensureSlots(state); redraw(); },
    setGrade(id) { state.gradeId = id; redraw(); },
    setCaption(line1, line2) {
      state.captionLines = [line1, line2];
      caption1.value = line1;
      caption2.value = line2;
      redraw();
    },
    setSize(w, h) {
      state.size = { w, h };
      fitPreview();
      ensureSlots(state);
      redraw();
    },
    selectPanel(index) { state.selected = index; redraw(); },
    assignPhoto(panelIndex, photoIndex) {
      ensureSlots(state);
      if (state.slots[panelIndex]) state.slots[panelIndex].photo = photoIndex;
      redraw();
    },
    exportDataURL(w, h) { return renderCoverDataURL(state, w, h); },
    sizes: EXPORT_SIZES,
  };
}

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}
