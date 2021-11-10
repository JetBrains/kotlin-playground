import { compressToBase64 } from 'lz-string';

export function generateCrosslink(options) {
  const base = JSON.stringify(options);
  const compressed = compressToBase64(base);
  return `https://play.kotlinlang.org/editor/v1/${encodeURIComponent(compressed)}`;
}
