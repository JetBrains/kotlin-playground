import { compressToBase64 } from 'lz-string';

const version = 'lz';

export function generateCrosslink(options) {
  const base = JSON.stringify(options);
  const compressed = compressToBase64(base);
  return `https://play.kotlinlang.org/${version}/${encodeURIComponent(compressed)}`;
}
