FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --omit=dev
RUN cd client && npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 8080

CMD ["npm", "start"]
