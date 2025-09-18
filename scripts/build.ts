import { mkdirSync, rmSync } from 'node:fs';
import { version } from '../package.json';

rmSync('./out', { recursive: true, force: true });
mkdirSync('./out', { recursive: true, });

const platforms: Bun.CompileBuildOptions[] = [
  { target: 'bun-windows-x64', outfile: `wag-windows-${version}.exe` },
  { target: 'bun-linux-x64', outfile: `wag-linux-${version}` },
  // { target: 'bun-darwin-arm64', outfile: 'wag-macos' },
];

for (const platform of platforms) {
  const startTime = Date.now();
  await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './out',
    compile: platform,
    minify: true,
    target: 'bun',
    define: {
      'BUILD_VERSION': version,
      'NODE_ENV': 'production',
      'TZ': 'Asia/Jakarta',
    }
  });

  const endTime = Date.now();
  console.log(
    `Built for ${platform.target} in ${(endTime - startTime) / 1000} seconds.`,
  );
}
