#!/bin/bash
# Build and deploy script that passes git metadata to Docker

BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "🚀 Building with:"
echo "  📅 Date: $BUILD_DATE"
echo "  🔖 Commit: $GIT_COMMIT"
echo "  🌿 Branch: $GIT_BRANCH"
echo ""

# Check if we should deploy to Fly or build locally
if [ "$1" == "deploy" ]; then
  echo "🛫 Deploying to Fly.io..."
  fly deploy \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg GIT_COMMIT="$GIT_COMMIT" \
    --build-arg GIT_BRANCH="$GIT_BRANCH"
else
  echo "🐳 Building Docker image locally..."
  docker build \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg GIT_COMMIT="$GIT_COMMIT" \
    --build-arg GIT_BRANCH="$GIT_BRANCH" \
    -t tarot-tracker .
  
  echo ""
  echo "✅ Build complete! To run locally:"
  echo "   docker run -p 3000:8080 tarot-tracker"
fi

