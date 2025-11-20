# Use Bun's official image as base
FROM oven/bun:1.1.34-alpine AS base

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Install dependencies only when needed
FROM base AS deps

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies with Bun
RUN bun install --frozen-lockfile

# Build stage
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the NestJS application
RUN bun run build

# Install only production dependencies
RUN bun install --frozen-lockfile --production

# Production image
FROM base AS runner

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nestjs

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Switch to non-root user
USER nestjs

# Expose the port the app runs on
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Set environment variable
ENV NODE_ENV=production

# Start the application using the built main.js
CMD ["bun", "run", "dist/main.js"]