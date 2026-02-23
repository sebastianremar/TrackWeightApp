#!/bin/bash
# Deploy current code to TestFlight
# Usage: ./deploy-testflight.sh

set -e

cd "$(dirname "$0")"

echo "Building and submitting to TestFlight..."
npx eas-cli build --profile preview --platform ios --non-interactive --auto-submit

echo "Done! Build will appear in TestFlight in ~15-30 min."
