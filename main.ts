// Emberwake's hand-in program (Node 22, standard library only). It copies the static game in
// game/ and the screenshots in screenshots/ to the output directory, then writes dossier.json
// with the kit's vendored library, unchanged. The grader runs it with /output; outside the
// grader MAKEFUN_OUTPUT_DIR names the directory instead:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The scorer's caps, passed through so the library refuses what the gate would refuse. */
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyFolder(name: string): void {
  const from = join(root, name);
  const to = join(outputDir, name);
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

// Fail loudly rather than hand in an entry the gate would refuse.
if (!existsSync(join(root, 'game', 'index.html'))) throw new Error('game/index.html is missing');

mkdirSync(outputDir, { recursive: true });
copyFolder('game');
copyFolder('screenshots');
writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_LIMITS));
