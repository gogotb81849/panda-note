# ============================================================
# 熊猫笔记 - 前端 Dockerfile
# 多阶段构建：node:20-alpine 构建 → node:20-alpine-slim 运行
# ============================================================

# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and config
COPY nuxt.config.ts tsconfig.json ./
COPY pages ./pages
COPY components ./components
COPY composables ./composables
COPY layouts ./layouts
COPY middleware ./middleware
COPY plugins ./plugins
COPY stores ./stores
COPY assets ./assets
COPY public ./public
COPY server ./server
COPY app.vue ./

# Build Nuxt app
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine-slim

WORKDIR /app

# Copy package files and install production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/.output ./.output

EXPOSE 3000

# Start the Nuxt server
CMD ["node", ".output/server/index.mjs"]