#!/usr/bin/env node
const { spawn, execSync } = require('node:child_process');
const path = require('node:path');

const children = [];
let shuttingDown = false;
let electronStarted = false;
let viteUrl = '';

function runStep(label, cmd) {
  console.log(`[Dev Launch] ${label}`);
  execSync(cmd, { stdio: 'inherit' });
}

function track(child) {
  children.push(child);
  child.on('exit', (code) => {
    if (shuttingDown) return;
    if (code && code !== 0) {
      console.error(`[Dev Launch] Process exited with code ${code}. Shutting down...`);
      shutdown(code);
    }
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try { child.kill('SIGTERM'); } catch {}
  }
  setTimeout(() => process.exit(code), 300);
}

function launchElectron(url) {
  if (electronStarted) return;
  electronStarted = true;

  runStep('Preparing Electron SQLite runtime', 'npm run prepare:electron-runtime');
  runStep('Building latest main/preload bundle', 'npm run build:main');

  console.log(`[Dev Launch] Launching Electron with URL: ${url}`);
  const electronCmd = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
  const electron = spawn(electronCmd, ['.'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: url
    }
  });
  track(electron);
}

function parseViteUrl(line) {
  const match = line.match(/https?:\/\/[\w.-]+:\d+/);
  return match ? match[0] : '';
}

function start() {
  const tsc = spawn('npm', ['run', 'dev:main'], { stdio: 'inherit', shell: true });
  track(tsc);

  console.log('[Dev Launch] Starting Vite dev server (prefers 5173, auto-fallback enabled)...');
  const vite = spawn('npm', ['run', 'dev:renderer'], { shell: true });
  track(vite);

  const onViteOutput = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);

    if (!viteUrl) {
      const maybeUrl = parseViteUrl(text);
      if (maybeUrl) {
        viteUrl = maybeUrl;
        console.log(`[Dev Launch] Selected Vite URL: ${viteUrl}`);
        launchElectron(viteUrl);
      }
    }
  };

  vite.stdout.on('data', onViteOutput);
  vite.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    if (!viteUrl) {
      const maybeUrl = parseViteUrl(text);
      if (maybeUrl) {
        viteUrl = maybeUrl;
        console.log(`[Dev Launch] Selected Vite URL: ${viteUrl}`);
        launchElectron(viteUrl);
      }
    }
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start();
