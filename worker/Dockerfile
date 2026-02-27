# worker/Dockerfile
FROM node:20-alpine

# Install Puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including dev for ts-node-dev)
RUN pnpm install --frozen-lockfile

# Copy source code (will be overridden by volume mount in dev)
COPY . .

# Create uploads directory
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

# Build TypeScript (optional in dev, required for prod)
RUN pnpm build

# Switch to non-root user
USER nodejs

EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5002/health || exit 1

# Default command (overridden by docker-compose in dev)
CMD ["pnpm", "start"]