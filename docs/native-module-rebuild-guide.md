# Native Module Rebuild Guide

This guide explains how `better-sqlite3` native binaries are managed in this project and how to rebuild them if needed.

## The ABI Problem

`better-sqlite3` is a native Node.js addon (`.node` file) compiled against a specific Node.js ABI version (NODE_MODULE_VERSION).

- **Electron** has its own Node.js ABI (e.g., v121 for Electron 29)
- **System Node.js** has a different ABI (e.g., v115 for Node.js 20)
- Using the wrong binary causes: `NODE_MODULE_VERSION mismatch` error

## Pre-compiled Binaries (This Project's Approach)

This project ships **two pre-compiled binaries** in `database/bin/`:

| File | ABI Target | Used For |
|---|---|---|
| `better_sqlite3_electron.node` | Electron 29 ABI (v121) | Running the app (`dev`, `build`, `dist`) |
| `better_sqlite3_node.node` | Node.js 20 ABI (v115) | Running tests (`npm test` via Vitest) |

The `npm` scripts automatically swap the correct binary before each operation:

```bash
# Before dev/build — copies Electron binary
cp database/bin/better_sqlite3_electron.node \
   node_modules/better-sqlite3/build/Release/better_sqlite3.node

# Before test — copies Node.js binary
cp database/bin/better_sqlite3_node.node \
   node_modules/better-sqlite3/build/Release/better_sqlite3.node
```

## Verifying Binary ABI

```bash
# Check which ABI the current binary targets
node -e "require('better-sqlite3')" 2>&1 | head -5

# Check your system Node.js ABI
node -e "console.log(process.versions.modules)"

# Check Electron's ABI
npx electron -e "console.log(process.versions.modules)"
```

## Rebuilding for a New Electron Version

If you upgrade Electron, you must rebuild `better-sqlite3` for the new ABI:

```bash
# Install @electron/rebuild
npm install --save-dev @electron/rebuild

# Rebuild better-sqlite3 for the installed Electron version
npx @electron/rebuild -f -w better-sqlite3

# Copy the rebuilt binary to the database/bin/ folder
cp node_modules/better-sqlite3/build/Release/better_sqlite3.node \
   database/bin/better_sqlite3_electron.node

# Commit the new binary
git add database/bin/better_sqlite3_electron.node
git commit -m "chore: rebuild better-sqlite3 for Electron vX.Y.Z"
```

## Rebuilding for a New Node.js Version

```bash
# Ensure you're using the target Node.js version
node -v   # Should show desired version

# Rebuild
npm rebuild better-sqlite3

# Copy the rebuilt binary
cp node_modules/better-sqlite3/build/Release/better_sqlite3.node \
   database/bin/better_sqlite3_node.node

git add database/bin/better_sqlite3_node.node
git commit -m "chore: rebuild better-sqlite3 for Node.js vX.Y.Z"
```

## Troubleshooting

**Error: `NODE_MODULE_VERSION mismatch`**
- Run `npm test` — the test script copies the Node.js binary
- Run `npm run dev` — the dev script copies the Electron binary
- Never run `npx vitest run` directly without copying the correct binary first

**Error: `Cannot find module 'better-sqlite3'`**
- Run `npm install` to reinstall node_modules
- Then re-copy the correct binary

**Error: `database is not a function`**
- You may be mixing ESM and CJS. `better-sqlite3` requires CommonJS. Ensure `tsconfig.main.json` targets CommonJS.
