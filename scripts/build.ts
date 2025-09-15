import { mkdirSync, rmSync } from 'node:fs';
import pkg from '../package.json';

rmSync('./out', { recursive: true, force: true });
mkdirSync('./out', { recursive: true, });

const platforms: Bun.CompileBuildOptions[] = [
  { target: 'bun-windows-x64', outfile: 'wag-windows.exe' },
  { target: 'bun-linux-x64', outfile: 'wag-linux' },
  // { target: 'bun-darwin-arm64', outfile: 'wag-macos' },
];

for (const platform of platforms) {
  const startTime = Date.now();
  await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './out',
    compile: platform,
    minify: true,
    define: {
      'BUILD_VERSION': pkg.version,
      'NODE_ENV': 'production',
      'TZ': 'Asia/Jakarta',
    }
  });

  const endTime = Date.now();
  console.log(
    `Built for ${platform.target} in ${(endTime - startTime) / 1000} seconds.`,
  );
}
