# Multi-stage build for Continuum API and Web
# Stage 1: Build dependencies and apps
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy all source files
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm db:generate

# Build all packages and apps
RUN pnpm build

# Stage 2: Runtime for API
FROM node:24-alpine AS api-runtime

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY apps/api ./apps/api

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built API
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Expose API port
EXPOSE 3001

# Start API
CMD ["node", "apps/api/dist/main.js"]

# Stage 3: Runtime for Web
FROM node:24-alpine AS web-runtime

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files and built Next.js app
COPY package.json pnpm-lock.yaml ./
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY apps/web/package.json ./apps/web/

# Install production dependencies for web
RUN cd apps/web && pnpm install --frozen-lockfile --prod

# Expose web port
EXPOSE 3000

# Start web
CMD ["node", "--run", "pnpm", "-C", "apps/web", "start"]
