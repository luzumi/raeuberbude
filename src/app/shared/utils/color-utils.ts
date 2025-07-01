// src/app/shared/utils/color-utils.ts
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(h => h + h).join('');
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff
  };
}

// Legete den Glowing-Alpha so, dass dunkle Farben weniger, helle mehr Aura bekommen
export function computeGlow(colorHex: string): string {
  const { r, g, b } = hexToRgb(colorHex);
  // relative Luminanz (0..1)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // wir wollen eine Aura in der gleichen Farbring-Farbe, aber mit variabler Alpha
  // je heller die Grundfarbe, desto stärker muss der Glow sein
  const alpha = Math.min(0.8, 0.4 + (lum * 0.6));
  return `0 0 ${20 + lum * 20}px ${5 + lum * 5}px rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}
