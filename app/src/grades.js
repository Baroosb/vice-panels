// Colour grades: a canvas filter for saturation/contrast/brightness, a warm-to-deep
// gradient laid over each panel in overlay blend, a soft tint, and the sky colours an
// empty panel falls back to. Each preset also names the accent the caption underlines.

export const GRADES = [
  {
    id: 'neon',
    name: 'Neon Sunset',
    filter: 'saturate(1.38) contrast(1.13) brightness(1.03)',
    top: 'rgba(255, 77, 121, 0.30)',
    mid: 'rgba(255, 166, 66, 0.10)',
    bottom: 'rgba(43, 0, 92, 0.45)',
    tint: 'rgba(255, 0, 128, 0.10)',
    accent: '#ff4d79',
    captionFill: '#ffffff',
    sky: ['#2a0a4a', '#b83a5e', '#ff9a5a', '#ffd76e'],
    sun: '#ffe9a8',
  },
  {
    id: 'midnight',
    name: 'Midnight Vice',
    filter: 'saturate(1.18) contrast(1.22) brightness(0.94)',
    top: 'rgba(0, 229, 255, 0.16)',
    mid: 'rgba(20, 0, 60, 0.12)',
    bottom: 'rgba(2, 0, 24, 0.55)',
    tint: 'rgba(0, 180, 255, 0.10)',
    accent: '#2ee6c8',
    captionFill: '#f4fffc',
    sky: ['#01021a', '#0b2a5b', '#14666b', '#19b3a6'],
    sun: '#c8fff4',
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    filter: 'saturate(1.28) contrast(1.08) brightness(1.06)',
    top: 'rgba(255, 166, 0, 0.20)',
    mid: 'rgba(255, 120, 40, 0.08)',
    bottom: 'rgba(80, 20, 0, 0.34)',
    tint: 'rgba(255, 140, 0, 0.10)',
    accent: '#ffb02e',
    captionFill: '#fffaf0',
    sky: ['#3a1c5e', '#c94f2e', '#ff8c42', '#ffd76e'],
    sun: '#fff3b0',
  },
];

export function gradeById(gradeId) {
  return GRADES.find((grade) => grade.id === gradeId) || GRADES[0];
}
