import TargetPlatform from './TargetPlatform';

export const TargetPlatforms = {
  JS: new TargetPlatform('js', 'JavaScript'),
  JS_IR: new TargetPlatform('js-ir', 'JavaScript IR'),
  WASM: new TargetPlatform('wasm', 'Wasm'),
  JAVA: new TargetPlatform('java', 'JVM'),
  JUNIT: new TargetPlatform('junit', 'JUnit'),
  CANVAS: new TargetPlatform('canvas', 'JavaScript(canvas)'),
} as const;

export type TargetPlatformsKeys = keyof typeof TargetPlatforms;
