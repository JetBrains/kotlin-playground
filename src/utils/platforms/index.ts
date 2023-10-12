import { isKeyOfObject } from '../types';

import TargetPlatform from './TargetPlatform';
import { TargetPlatforms } from './TargetPlatforms';

export function getTargetById(id?: string | null) {
  const key = id && id.toUpperCase();
  return key && isKeyOfObject(key, TargetPlatforms)
    ? TargetPlatforms[key]
    : TargetPlatforms.JAVA;
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
