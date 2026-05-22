#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const mode = process.argv[2];
const root = process.cwd();

const cacheNode = path.join(root, 'database/bin/better_sqlite3_node.node');
const cacheElectron = path.join(root, 'database/bin/better_sqlite3_electron.node');

const targets = [
  path.join(root, 'node_modules/better-sqlite3/build/Release/better_sqlite3.node'),
  path.join(root, 'node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3/build/Release/better_sqlite3.node')
];

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function copyToTargets(sourcePath, runtimeLabel) {
  ensureFile(sourcePath, `${runtimeLabel} cache binary`);
  for (const target of targets) {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) continue;
    fs.copyFileSync(sourcePath, target);
  }
  console.log(`[SQLite Runtime] Using ${runtimeLabel} SQLite runtime`);
}

function detectExistingBinaryPath() {
  for (const target of targets) {
    if (fs.existsSync(target)) return target;
  }
  throw new Error('No better-sqlite3 target binary found inside node_modules. Install dependencies first.');
}

function cacheFromCurrent(targetCachePath, label) {
  const existing = detectExistingBinaryPath();
  fs.mkdirSync(path.dirname(targetCachePath), { recursive: true });
  fs.copyFileSync(existing, targetCachePath);
  console.log(`[SQLite Runtime] Cached ${label} binary -> ${targetCachePath}`);
}

try {
  switch (mode) {
    case 'prepare-node':
      copyToTargets(cacheNode, 'Node');
      break;
    case 'prepare-electron':
      copyToTargets(cacheElectron, 'Electron');
      break;
    case 'cache-node':
      cacheFromCurrent(cacheNode, 'Node');
      break;
    case 'cache-electron':
      cacheFromCurrent(cacheElectron, 'Electron');
      break;
    default:
      throw new Error('Usage: node scripts/sqlite-runtime.cjs <prepare-node|prepare-electron|cache-node|cache-electron>');
  }
} catch (error) {
  console.error(`[SQLite Runtime] ${error.message}`);
  process.exit(1);
}
