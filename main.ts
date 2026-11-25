// Chrono Kitchen entrypoint (Node 22, standard library only).
// The game itself is plain static files under game/ (game/index.html plus its ES
// modules and a vendored three.min.js, nothing fetched from the network), and this
// program is the hand-in: it copies game/ and screenshots/ from beside this file
// into /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library, so the sealed scorer
// and the judge can read exactly what was submitted.
//
// Run it locally to check the hand-in:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Caps the sealed scorer enforces (see the kit's RULES.txt): the dossier text is
// capped at 160 KiB, at most 4 screenshots of 256 KiB each, and game/ stays under
// 993 entries and 48 MiB, so the whole /output fits its 1000-entry / 64 MiB cap.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
