FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Generate deployment info at build time
ARG BUILD_DATE
ARG GIT_COMMIT
ARG GIT_BRANCH
RUN BUILD_DATE_VAL="${BUILD_DATE:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}" && \
    GIT_COMMIT_VAL="${GIT_COMMIT:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}" && \
    GIT_SHORT_VAL="$(echo $GIT_COMMIT_VAL | cut -c1-7)" && \
    GIT_BRANCH_VAL="${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')}" && \
    echo "🚀 Deployment Information" > deploy.txt && \
    echo "═══════════════════════════════════════" >> deploy.txt && \
    echo "" >> deploy.txt && \
    echo "📅 Built: $BUILD_DATE_VAL" >> deploy.txt && \
    echo "🔖 Commit: $GIT_COMMIT_VAL" >> deploy.txt && \
    echo "✨ Short: $GIT_SHORT_VAL" >> deploy.txt && \
    echo "🌿 Branch: $GIT_BRANCH_VAL" >> deploy.txt && \
    echo "" >> deploy.txt && \
    echo "🔮 Ready to read some cards! 🃏" >> deploy.txt

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 8080

CMD ["npm", "start"]
