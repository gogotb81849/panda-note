# ============================================================
# 熊猫笔记 - 后端 Dockerfile
# 多阶段构建：node:20-alpine 构建 → node:20-alpine-slim 运行
# ============================================================

# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for Prisma and bcrypt
RUN apk add --no-cache openssl python3 make g++

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and config
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine-slim

WORKDIR /app

# Install runtime dependencies for bcrypt
RUN apk add --no-cache openssl

# Copy package files and install production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Copy .env.example for reference (actual .env should be mounted)
COPY .env.example ./

EXPOSE 3000

# Start the NestJS application
CMD ["node", "dist/main.js"]