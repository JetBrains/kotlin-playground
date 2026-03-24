import TargetPlatform from './TargetPlatform';

export const TargetPlatforms = {
  JS: new TargetPlatform('js', 'JavaScript'),
  WASM: new TargetPlatform('wasm', 'Wasm'),
  COMPOSE_WASM: new TargetPlatform('compose-wasm', 'Compose Wasm'),
  JAVA: new TargetPlatform('java', 'JVM'),
  JUNIT: new TargetPlatform('junit', 'JUnit'),
  CANVAS: new TargetPlatform('canvas', 'JavaScript(canvas)'),
  SWIFT_EXPORT: new TargetPlatform('swift-export', 'Swift export'),
} as const;

export type TargetPlatformsKeys = keyof typeof TargetPlatforms;
