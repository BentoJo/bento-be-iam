# ============================================
# Stage 1: Install production dependencies
# ============================================
FROM node:lts as alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:lts AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN npm run build

# ============================================
# Stage 3: Production image
# ============================================
FROM node:lts AS production

ENV NODE_ENV=production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy compiled output (includes .proto files via nest-cli assets)
COPY --from=build /app/dist ./dist

# Copy package.json for metadata
COPY package.json ./

# Switch to non-root user
USER appuser

EXPOSE 50052

CMD ["node", "dist/src/main.js"]
