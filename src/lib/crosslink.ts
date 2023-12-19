import { compressToBase64 } from 'lz-string';

import { getTargetById, TargetPlatformsKeys } from '../utils/platforms';

import {
  escapeRegExp,
  MARK_PLACEHOLDER_CLOSE,
  MARK_PLACEHOLDER_OPEN,
  SAMPLE_END,
  SAMPLE_START,
} from '../utils/escape';

type LinkOptions = {
  targetPlatform?: TargetPlatformsKeys | Lowercase<TargetPlatformsKeys>;
  compilerVersion?: string;
};

/**
 * Assign the project to an employee.
 * @param {Object} code - The employee who is responsible for the project.
 * @param {Object} options - The employee who is responsible for the project.
 * @param {string} options.targetPlatform - The name of the employee.
 * @param {string} options.compilerVersion - The employee's department.
 */
export function generateCrosslink(code: string, options?: LinkOptions) {
  const opts: { code: string } & LinkOptions = {
    code: code
      .replace(new RegExp(escapeRegExp(MARK_PLACEHOLDER_OPEN), 'g'), '')
      .replace(new RegExp(escapeRegExp(MARK_PLACEHOLDER_CLOSE), 'g'), '')
      .replace(new RegExp(escapeRegExp(SAMPLE_START), 'g'), '')
      .replace(new RegExp(escapeRegExp(SAMPLE_END), 'g'), ''),
  };

  if (options && options.targetPlatform) {
    const target =
      options.targetPlatform && getTargetById(options.targetPlatform);
    if (!target) throw new Error('Invalid target platform');
    opts.targetPlatform = options.targetPlatform;
  }

  if (options && options.compilerVersion)
    opts.compilerVersion = options.compilerVersion;

  return `https://play.kotlinlang.org/editor/v1/${encodeURIComponent(
    compressToBase64(JSON.stringify(opts)),
  )}`;
}
