/**
 * Builds the npm package into dist/ (run by `npm pack` / `npm publish` through `prepack`).
 *
 * dist/ mirrors the repository's layout under dist/packages/, so the paths the CLI computes from its own location
 * (the runtime, IR and JSX sources it bundles into a player, the Python scripts) hold in the repository
 * and in the package alike. The CLI, the IR and the exporter are bundled into one file; the runtime is shipped as
 * source because every document is bundled with it again (esbuild, in the user's project).
 */
import {build} from 'esbuild';
import {copyFileSync, cpSync, chmodSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(CLI, 'dist', 'packages');
const main = join(OUT, 'cli', 'src', 'main.js');

rmSync(join(CLI, 'dist'), {recursive: true, force: true});
await build({
  entryPoints: [join(CLI, 'src', 'main.ts')], outfile: main, bundle: true, platform: 'node', format: 'esm', target: 'node20',
  external: ['puppeteer-core', '@puppeteer/browsers', 'esbuild'], logLevel: 'warning',
});
// esbuild keeps the source's shebang, which asks for the flag that strips types; the bundle is plain JavaScript.
writeFileSync(main, readFileSync(main, 'utf8').replace(/^#!.*\n/, '#!/usr/bin/env node\n'));
chmodSync(main, 0o755);

for (const f of readdirSync(join(CLI, 'src')).filter((n) => n.endsWith('.py'))) copyFileSync(join(CLI, 'src', f), join(OUT, 'cli', 'src', f));
for (const pkg of ['ir', 'runtime']) cpSync(join(CLI, '..', pkg, 'src'), join(OUT, pkg, 'src'), {recursive: true});
// the tags a document imports (and the runtime reads the parts' children with) are one source file
mkdirSync(join(OUT, 'jsx'), {recursive: true});
copyFileSync(join(CLI, '..', 'jsx', 'index.ts'), join(OUT, 'jsx', 'index.ts'));
// packages/ir/src/spec.ts re-exports the spec's types from the repository root
mkdirSync(join(OUT, '..', 'spec', 'ir', '0.5'), {recursive: true});
copyFileSync(join(CLI, '..', '..', 'spec', 'ir', '0.5', 'ir.ts'), join(OUT, '..', 'spec', 'ir', '0.5', 'ir.ts'));
console.log(`built ${main}`);
