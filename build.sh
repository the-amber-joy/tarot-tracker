#!/bin/bash
# Build and deploy script that passes git metadata to Docker

BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Building with:"
echo "  Date: $BUILD_DATE"
echo "  Commit: $GIT_COMMIT"
echo "  Branch: $GIT_BRANCH"

# For local Docker build
docker build \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg GIT_COMMIT="$GIT_COMMIT" \
  --build-arg GIT_BRANCH="$GIT_BRANCH" \
  -t tarot-tracker .

# For Fly.io deployment, use:
# fly deploy --build-arg BUILD_DATE="$BUILD_DATE" --build-arg GIT_COMMIT="$GIT_COMMIT" --build-arg GIT_BRANCH="$GIT_BRANCH"
