export const DEFAULT_SETTINGS = Object.freeze({
  targetColor: "#808080",
  markerColor: "#ff3b30",
  tolerance: 4,
  noiseFilter: 2,
  grayscaleBackground: false
});

export function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255
  ];
}

export function rgbToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function matchesColor(red, green, blue, target, tolerance) {
  const redDelta = red - target[0];
  const greenDelta = green - target[1];
  const blueDelta = blue - target[2];
  const weightedDistance = Math.sqrt(
    0.299 * redDelta * redDelta
    + 0.587 * greenDelta * greenDelta
    + 0.114 * blueDelta * blueDelta
  );
  return weightedDistance <= tolerance;
}