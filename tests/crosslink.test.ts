import { expect, test } from '@playwright/test';
import { promises as fs } from 'fs';
import { decompressFromBase64 } from 'lz-string';

const prefix = 'https://play.kotlinlang.org/editor/v1/' as const;

test.describe('crosslink: library', () => {
  test('exports', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('../dist/crosslink');
    expect(module).toBeDefined();

    const { generateCrosslink } = module;

    expect(typeof generateCrosslink).toEqual('function');

    // Pass just codeWithSample
    checkLink(generateCrosslink('simple'), { code: 'simple' });

    // Pass platforms with codeWithSample
    checkLink(generateCrosslink('platform', { targetPlatform: 'JAVA' }), {
      code: 'platform',
      targetPlatform: 'JAVA',
    });

    // Invalid target
    expect(() =>
      generateCrosslink('platform', { targetPlatform: 'NOT_A_PLATFORM' }),
    ).toThrow();

    // Pass compilerVersion with codeWithSample
    checkLink(generateCrosslink('version', { compilerVersion: '1.5.21' }), {
      code: 'version',
      compilerVersion: '1.5.21',
    });

    // Pass random with codeWithSample
    checkLink(generateCrosslink('random', { randomProperty: '1.5.21' }), {
      code: 'random',
    });

    //language=kotlin
    const codeWithSample = `fun main(args: Array<String>) {
      //sampleStart
      val (name, value) = Pair("Kitty", "Kiss")
      println(name)
      println(value)
      //sampleEnd
    }`;

    checkLink(generateCrosslink(codeWithSample), {
      //language=text
      code: `fun main(args: Array<String>) {
${'      '}
      val (name, value) = Pair("Kitty", "Kiss")
      println(name)
      println(value)
${'      '}
    }`,
    });

    //language=text
    const codeWithMark = `fun containsEven(collection: Collection<Int>): Boolean = collection.any {[mark]TODO()[/mark]}`;

    checkLink(generateCrosslink(codeWithMark), {
      //language=kotlin
      code: `fun containsEven(collection: Collection<Int>): Boolean = collection.any {TODO()}`,
    });
  });

  test('definition', async () => {
    test.fixme(true, "The definition isn't implemented yet");
    const stats = await fs.stat('../dist/crosslink.d.ts');
    expect(stats.size).toBeGreaterThan(0);
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkLink(link: string, expected: Record<string, any>) {
  expect(link.startsWith(prefix)).toBeTruthy();

  const output = decodeURIComponent(link.substring(prefix.length));
  const payload = JSON.parse(decompressFromBase64(output));

  expect(payload).toEqual(expected);
}
