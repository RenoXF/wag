import tailwindPlugin from 'bun-plugin-tailwind';
import { mkdirSync, rmSync } from 'node:fs';
import { version } from 'package.json';

rmSync('./out', { recursive: true, force: true });
mkdirSync('./out', { recursive: true });

const platforms: Bun.CompileBuildOptions[] = [
  { target: 'bun-windows-x64', outfile: `wag-windows-${version}.exe` },
  { target: 'bun-linux-x64', outfile: `wag-linux-${version}` },
  { target: 'bun-darwin-arm64', outfile: `wag-macos-${version}` },
];

for (const platform of platforms) {
  const startTime = Date.now();
  await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './out',
    compile: platform,
    minify: true,
    target: 'bun',
    env: 'inline',
    plugins: [tailwindPlugin],
  });

  const endTime = Date.now();
  console.log(
    `Built for ${platform.target} in ${(endTime - startTime) / 1000} seconds.`,
  );
}
