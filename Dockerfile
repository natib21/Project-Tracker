# Build stage for frontend
FROM node:18-alpine AS web-builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm install

# Copy web app source
COPY apps/web ./apps/web

# Build frontend
RUN npm run build --workspace=apps/web

# Build stage for backend
FROM node:18-alpine AS api-builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm install

# Copy API source
COPY apps/api ./apps/api

# Build backend
RUN npm run build --workspace=apps/api

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install production dependencies only
RUN npm install --production --workspace=apps/api

# Copy built API
COPY --from=api-builder /app/apps/api/dist ./apps/api/dist
COPY --from=api-builder /app/apps/api/src/database/migrations ./apps/api/dist/database/migrations

# Copy built frontend into API's public directory
COPY --from=web-builder /app/apps/web/dist ./apps/api/public

# Copy startup script
COPY apps/api/docker-entrypoint.sh ./apps/api/
RUN chmod +x ./apps/api/docker-entrypoint.sh

EXPOSE 3000

CMD ["./apps/api/docker-entrypoint.sh"]
