import TargetPlatform from './TargetPlatform';
import { TargetPlatforms } from './TargetPlatforms';
import { isKeyOfObject } from '../types';

export function getTargetById(id?: string | null) {
  const key = id && id.toUpperCase().replace(/-/g, '_');

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
    platform === TargetPlatforms.JS_IR ||
    platform === TargetPlatforms.CANVAS ||
    platform === TargetPlatforms.WASM
  );
}

export * from './TargetPlatforms';
