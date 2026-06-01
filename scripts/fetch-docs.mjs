#!/usr/bin/env node
// ---------------------------------------------------------------------------
// fetch-docs — lift each product repo's docs/ folder into external/<id>/docs
// so Docusaurus can render them as one unified site.
//
// Two sourcing modes:
//   local  (default when a sibling checkout exists) — copy from ../<repo-name>.
//          Lets you preview unpublished local edits. Great for authoring.
//   remote (CI, or when no sibling exists, or DOCS_SOURCE=remote) — git
//          sparse-checkout only the docs/ folder of each repo at the pinned ref.
//          Fast (blobless + sparse) and reproducible.
//
// This script reads docs.manifest.json and contains NO hosting/infra detail.
//
// Flags / env:
//   --remote            force remote sourcing for every product
//   --local             force local sourcing for every product
//   DOCS_SOURCE=remote  same as --remote (handy in CI)
//   CI=true             defaults to remote unless --local is given
// ---------------------------------------------------------------------------

import {execFileSync} from 'node:child_process';
import {existsSync, mkdtempSync, rmSync, cpSync, mkdirSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const externalDir = join(repoRoot, 'external');
const siblingRoot = resolve(repoRoot, '..'); // .../voidprojectssoftware

const args = new Set(process.argv.slice(2));
const forceRemote = args.has('--remote') || process.env.DOCS_SOURCE === 'remote';
const forceLocal = args.has('--local');
const ci = process.env.CI === 'true' || process.env.CI === '1';

function log(msg) {
  process.stdout.write(`[fetch-docs] ${msg}\n`);
}

function git(cwd, ...gitArgs) {
  return execFileSync('git', gitArgs, {cwd, stdio: ['ignore', 'pipe', 'inherit']})
    .toString()
    .trim();
}

function loadManifest() {
  const raw = readFileSync(join(repoRoot, 'docs.manifest.json'), 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.products)) {
    throw new Error('docs.manifest.json must contain a "products" array');
  }
  return parsed.products;
}

function repoName(repo) {
  return repo.split('/').pop();
}

// Decide where a product's docs come from. Local sibling wins for authoring
// unless we're in CI or remote is forced.
function resolveSource(product) {
  if (forceRemote) return {mode: 'remote'};
  if (forceLocal) {
    const local = join(siblingRoot, repoName(product.repo), product.docsPath);
    return {mode: 'local', local};
  }
  if (ci) return {mode: 'remote'};
  const local = join(siblingRoot, repoName(product.repo), product.docsPath);
  if (existsSync(local)) return {mode: 'local', local};
  return {mode: 'remote'};
}

function copyLocal(product, srcDocs, dest) {
  if (!existsSync(srcDocs)) {
    throw new Error(
      `local docs not found at ${srcDocs} — push the docs or run with --remote`,
    );
  }
  cpSync(srcDocs, dest, {recursive: true});
  log(`${product.id}: copied from local ${srcDocs}`);
}

// Blobless + sparse clone of just the docs path at the pinned ref. Avoids
// pulling the product's full history or source tree.
function fetchRemote(product, dest) {
  const tmp = mkdtempSync(join(tmpdir(), `protostar-docs-${product.id}-`));
  try {
    const url = `https://github.com/${product.repo}.git`;
    git(
      repoRoot,
      'clone',
      '--no-checkout',
      '--depth',
      '1',
      '--filter=blob:none',
      '--branch',
      product.ref,
      url,
      tmp,
    );
    git(tmp, 'sparse-checkout', 'set', '--no-cone', product.docsPath);
    git(tmp, 'checkout');
    const srcDocs = join(tmp, product.docsPath);
    if (!existsSync(srcDocs)) {
      throw new Error(
        `${product.repo}@${product.ref} has no '${product.docsPath}' folder yet`,
      );
    }
    cpSync(srcDocs, dest, {recursive: true});
    log(`${product.id}: sparse-checked-out ${product.repo}@${product.ref}/${product.docsPath}`);
  } finally {
    rmSync(tmp, {recursive: true, force: true});
  }
}

function main() {
  const products = loadManifest();

  // Start from a clean external/ every run so deleted docs don't linger.
  rmSync(externalDir, {recursive: true, force: true});
  mkdirSync(externalDir, {recursive: true});

  for (const product of products) {
    const dest = join(externalDir, product.id, 'docs');
    mkdirSync(dirname(dest), {recursive: true});
    const source = resolveSource(product);
    if (source.mode === 'local') {
      copyLocal(product, source.local, dest);
    } else {
      fetchRemote(product, dest);
    }
  }

  log(`done — ${products.length} product(s) lifted into external/`);
}

main();
