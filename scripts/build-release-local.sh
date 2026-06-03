#!/bin/bash
set -e
echo "Building mobile release..."
npm run build:mobile
cd android
./gradlew bundleRelease
echo "AAB output: android/app/build/outputs/bundle/release/app-release.aab"
