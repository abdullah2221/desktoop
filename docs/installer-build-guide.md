# Installer Build Guide

This guide explains how to build platform-specific installers for the Enterprise ERP application.

## Prerequisites

- Node.js v20.x LTS
- npm (comes with Node.js)
- Platform-specific requirements (see below)

## macOS Builds

Requires: macOS 11+ build machine

```bash
# Build macOS DMG + ZIP for both Intel and Apple Silicon
npm run build:mac
```

Output: `dist-releases/Enterprise ERP-1.0.0.dmg`

**Code Signing** (optional, required for Gatekeeper-free distribution):
```bash
# Set these environment variables before building
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="your-cert-password"
npm run build:mac
```

## Windows Builds

Requires: Windows 10+ or cross-compilation via Wine on macOS/Linux

```bash
# Build NSIS installer for x64 and ia32
npm run build:win
```

Output: `dist-releases/Enterprise ERP Setup 1.0.0.exe`

NSIS installer features:
- Custom installation directory selection
- Desktop shortcut creation
- Start menu entry
- Auto-launch after install

## Linux Builds

```bash
# Build AppImage and .deb package
npm run build:linux
```

Output: 
- `dist-releases/Enterprise ERP-1.0.0.AppImage`
- `dist-releases/Enterprise ERP_1.0.0_amd64.deb`

## All Platforms (from macOS host)

```bash
npm run dist
```

## Build Output Structure

```
dist-releases/
  Enterprise ERP-1.0.0.dmg          ← macOS installer
  Enterprise ERP-1.0.0-arm64.dmg    ← macOS Apple Silicon
  Enterprise ERP Setup 1.0.0.exe    ← Windows NSIS installer
  Enterprise ERP-1.0.0.AppImage     ← Linux portable
  Enterprise ERP_1.0.0_amd64.deb    ← Debian/Ubuntu package
```

## ASAR & Native Module Notes

The build config uses `asarUnpack` to extract `better-sqlite3.node` from the ASAR archive:

```json
"asarUnpack": [
  "**/better-sqlite3/build/Release/better_sqlite3.node",
  "database/bin/**"
]
```

This is **critical** — native `.node` files cannot be loaded from within ASAR.

## Clean Build

```bash
npm run clean     # Remove dist/ and dist-releases/
npm run build     # Recompile everything
npm run dist      # Package
```
