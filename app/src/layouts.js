// Panel layouts for Vice Panels. Every panel is a polygon in unit space (0..1 on both
// axes); a rectangle is just a four-point polygon, which lets the diagonal layout share
// the same clipping, keyline and photo-fitting code as the rectangular ones.

function rectPanel(x, y, w, h) {
  return makePanel([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
}

function makePanel(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    points,
    bbox: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y },
  };
}

// The classic poster grid: one tall panel down the left, two stacked panels on the
// right. On a portrait canvas it turns into a wide hero over two square panels.
function classicGridPanels(aspect) {
  if (aspect >= 0.95) {
    return [
      rectPanel(0, 0, 0.4, 1),
      rectPanel(0.4, 0, 0.6, 0.56),
      rectPanel(0.4, 0.56, 0.6, 0.44),
    ];
  }
  return [
    rectPanel(0, 0, 1, 0.52),
    rectPanel(0, 0.52, 0.5, 0.48),
    rectPanel(0.5, 0.52, 0.5, 0.48),
  ];
}

// Three diagonal slices leaning like a slash through the poster; the lean softens on
// portrait canvases so faces are not cut too steeply.
function viceSlicePanels(aspect) {
  const lean = aspect >= 0.95 ? 0.17 : 0.1;
  return [
    makePanel([[0, 0], [0.46, 0], [0.46 - lean, 1], [0, 1]]),
    makePanel([[0.46, 0], [0.79, 0], [0.79 - lean, 1], [0.46 - lean, 1]]),
    makePanel([[0.79, 0], [1, 0], [1, 1], [0.79 - lean, 1]]),
  ];
}

// One wide hero panel over a strip of three equal panels, the magazine-cover rhythm.
function heroStripsPanels(aspect) {
  const heroH = aspect >= 0.95 ? 0.6 : 0.54;
  const third = 1 / 3;
  return [
    rectPanel(0, 0, 1, heroH),
    rectPanel(0, heroH, third, 1 - heroH),
    rectPanel(third, heroH, third, 1 - heroH),
    rectPanel(2 * third, heroH, third, 1 - heroH),
  ];
}

export const LAYOUTS = [
  { id: 'classic', name: 'Classic Grid', build: classicGridPanels },
  { id: 'slice', name: 'Vice Slice', build: viceSlicePanels },
  { id: 'hero', name: 'Hero Strips', build: heroStripsPanels },
];

export function layoutById(layoutId) {
  return LAYOUTS.find((layout) => layout.id === layoutId) || LAYOUTS[0];
}

export function layoutPanels(layoutId, aspect) {
  return layoutById(layoutId).build(aspect);
}

export function layoutPanelCount(layoutId, aspect) {
  return layoutPanels(layoutId, aspect).length;
}

export function pointInPanel(panel, ux, uy) {
  const pts = panel.points;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > uy) !== (yj > uy) && ux < ((xj - xi) * (uy - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
