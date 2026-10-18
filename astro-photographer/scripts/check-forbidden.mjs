#!/usr/bin/env node
/**
 * check-forbidden.mjs — CI/build guard for glammuse-design-import (task 12.2).
 *
 * Fails the build if forbidden artifacts from the dropped Codex design leak into
 * the Astro platform. Validates design Properties 2, 9, 10 and
 * Requirements 4.4, 8.4, 12.2, 12.3:
 *
 *   - `use.typekit.net/dis2zlj`  — the Codex Typekit kit must stay dropped
 *                                  (we keep only kit `mdr5myc`).
 *   - `assets/vendor/gsap`       — gsap is an npm dependency, never vendored.
 *
 * NOTE: the former `mailto:` ban was removed — a mailto inquire flow is now an
 * accepted part of this project (e.g. the /connect email button), so it is no
 * longer a forbidden artifact.
 *
 * Zero-false-positive scoping
 * ---------------------------
 * Source comments that merely *mention* these strings (e.g. "mailto not ported",
 * "dis2zlj dropped") must NOT trip the guard. We scope each pattern to where a
 * real usage would appear rather than a passing mention:
 *
 *   - dis2zlj (full `use.typekit.net/dis2zlj`): checked in src/ AND dist/. The
 *     full host+kit path is a real stylesheet/preconnect reference; a prose
 *     comment would not spell out the whole URL.
 *   - mailto: checked in dist/ ONLY. The built HTML has no source comments, so a
 *     real `href="mailto:…"` surfaces here while a `// mailto not ported` note in
 *     a .ts/.astro source file is intentionally ignored.
 *   - assets/vendor/gsap: checked in src/ AND dist/. A vendored-path reference is
 *     always a real import/asset path; this never appears as casual prose.
 *
 * Exit codes: 0 = clean, 1 = at least one forbidden artifact found.
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

// Directories we never descend into.
const SKIP_DIRS = new Set(['node_modules', '.git', '.astro', '.worktrees']);

// Only read text-like files; skip binaries (images, fonts, etc.).
const TEXT_EXT = new Set([
  '.astro', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx',
  '.css', '.scss', '.html', '.json', '.md', '.svg', '.txt', '.yml', '.yaml',
]);

/** Each check: a pattern plus the roots it applies to and a human message. */
const CHECKS = [
  {
    label: 'Codex Typekit kit (dis2zlj)',
    // Match the full host+kit path so a prose mention of "dis2zlj" alone is fine.
    pattern: /use\.typekit\.net\/dis2zlj/,
    roots: [SRC, DIST],
  },
  {
    label: 'vendored gsap (assets/vendor/gsap)',
    pattern: /assets\/vendor\/gsap/,
    roots: [SRC, DIST],
  },
];

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // dir does not exist — handled by caller
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile() && TEXT_EXT.has(extname(entry.name).toLowerCase())) {
      yield full;
    }
  }
}

async function scan() {
  const violations = [];

  for (const check of CHECKS) {
    for (const root of check.roots) {
      if (!existsSync(root)) continue;
      for await (const file of walk(root)) {
        let text;
        try {
          text = await readFile(file, 'utf8');
        } catch {
          continue;
        }
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          if (check.pattern.test(lines[i])) {
            violations.push({
              label: check.label,
              file: relative(ROOT, file),
              line: i + 1,
              text: lines[i].trim().slice(0, 160),
            });
          }
        }
      }
    }
  }

  return violations;
}

const violations = await scan();

if (violations.length > 0) {
  console.error('\n\u2717 Forbidden artifact(s) detected — build guard failed:\n');
  for (const v of violations) {
    console.error(`  [${v.label}] ${v.file}:${v.line}`);
    console.error(`      ${v.text}`);
  }
  console.error(
    '\nThese artifacts were intentionally dropped in glammuse-design-import.\n' +
      'Remove them, or (for a false positive) narrow the pattern in scripts/check-forbidden.mjs.\n'
  );
  process.exit(1);
}

console.log('\u2713 check:guards passed — no forbidden artifacts in src/ or dist/.');
process.exit(0);
