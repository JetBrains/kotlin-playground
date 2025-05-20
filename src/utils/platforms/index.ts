import TargetPlatform from './TargetPlatform';
import { TargetPlatforms } from './TargetPlatforms';
import { isKeyOfObject } from '../types';

export function getTargetById(id?: string | null) {
  let key = id && id.toUpperCase().replace(/-/g, '_');

  if (key === 'JS_IR') {
    console.warn('JS_IR is deprecated, use JS + compiler-version instead');
    key = 'JS';
  }

  return isKeyOfObject(key, TargetPlatforms) ? TargetPlatforms[key] : null;
}

export function isJavaRelated(platform: TargetPlatform) {
  return (
    platform === TargetPlatforms.JAVA || platform === TargetPlatforms.JUNIT
  );
}

export function isJsRelated(platform: TargetPlatform) {
  return (
    platform === TargetPlatforms.JS ||
    platform === TargetPlatforms.CANVAS ||
    platform === TargetPlatforms.SWIFT_EXPORT
  );
}

export function isWasmRelated(platform: TargetPlatform) {
  return (
    platform === TargetPlatforms.WASM ||
    platform === TargetPlatforms.COMPOSE_WASM
  );
}

const MINIMAL_VERSION_IR = '1.5.0';

export function isJsLegacy(platform: TargetPlatform, compilerVersion: string) {
  return isJsRelated(platform) && compilerVersion < MINIMAL_VERSION_IR;
}

export * from './TargetPlatforms';
