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
ARG BUILD_DATE="unknown"
ARG GIT_COMMIT="unknown"
ARG GIT_BRANCH="unknown"
ARG GIT_MESSAGE="unknown"
RUN GIT_SHORT_VAL="$(echo ${GIT_COMMIT} | cut -c1-7)" && \
    echo "🚀 Deployment Information" > deploy.txt && \
    echo "═══════════════════════════════════════" >> deploy.txt && \
    echo "" >> deploy.txt && \
    echo "📅 Built: ${BUILD_DATE}" >> deploy.txt && \
    echo "🔖 Commit: ${GIT_COMMIT}" >> deploy.txt && \
    echo "✨ Short: ${GIT_SHORT_VAL}" >> deploy.txt && \
    echo "🌿 Branch: ${GIT_BRANCH}" >> deploy.txt && \
    echo "💬 Message: ${GIT_MESSAGE}" >> deploy.txt && \
    echo "" >> deploy.txt && \
    echo "🔮 Ready to read some cards! 🃏" >> deploy.txt

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 8080

CMD ["npm", "start"]
