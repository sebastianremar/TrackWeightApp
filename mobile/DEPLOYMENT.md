# Mobile Deployment Guide

## Workflows

All three workflows are **manual only** — trigger them from the GitHub Actions tab or with `gh workflow run`.

### 1. Preview (TestFlight)

**File:** `.github/workflows/mobile-preview.yml`

Builds the app on Expo's cloud and uploads it to TestFlight. Use this to test on real devices before going to the App Store. Takes ~15-30 min. **Counts as 1 of 30 free builds/month.**

### 2. Production (App Store)

**File:** `.github/workflows/mobile-production.yml`

Builds and submits to App Store Connect for review. Has an optional version bump input (patch/minor/major) that auto-commits the new version. **Counts as 1 of 30 free builds/month.**

### 3. OTA Update

**File:** `.github/workflows/mobile-ota-update.yml`

Pushes JS-only changes directly to users' phones — no native build, no App Store review, applies on next app launch. Choose the target branch (`preview` for TestFlight testers, `production` for App Store users). **Does NOT count toward the 30 builds/month limit.**

## When to Use What

| Scenario                        | Workflow       | App Store Review? | Uses a build? |
| ------------------------------- | -------------- | ----------------- | ------------- |
| Fix a JS bug / tweak UI         | OTA Update     | No                | No            |
| Add a new JS-only feature       | OTA Update     | No                | No            |
| Add/update a native library     | Preview        | TestFlight only   | Yes           |
| Update Expo SDK                 | Preview        | TestFlight only   | Yes           |
| New App Store release           | Production     | Yes               | Yes           |

## Version Bumps

| Bump  | When                              | Example           |
| ----- | --------------------------------- | ----------------- |
| Patch | Bug fixes, small tweaks           | `1.0.0` → `1.0.1` |
| Minor | New features, new screens         | `1.0.1` → `1.1.0` |
| Major | Breaking changes, major redesigns | `1.1.0` → `2.0.0` |

## Local Commands

```bash
# Native builds (interactive — for first-time setup or local testing)
npm run build:dev          # Dev build for your iPhone
npm run build:preview      # TestFlight build
npm run build:production   # App Store build

# OTA updates (no native build needed)
npm run update:preview     # Push JS changes to TestFlight testers
npm run update:production  # Push JS changes to App Store users

# Version bumps (updates package.json only, no git tag)
npm run version:patch
npm run version:minor
npm run version:major
```

## Prerequisites

1. Expo account + `eas login`
2. `eas init` run in `mobile/` (replace `<PROJECT_ID>` in `app.config.js`)
3. Apple placeholders filled in `eas.json`
4. `EXPO_TOKEN` added as a GitHub repo secret
5. First build run interactively (`npm run build:dev`) to set up iOS code signing
