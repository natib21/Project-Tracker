FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
RUN npm ci
COPY apps/api ./apps/api
COPY apps/web ./apps/web
RUN npm run build --workspace=apps/web && npm run build --workspace=apps/api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
RUN npm ci --omit=dev --workspace=apps/api
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/api/public
COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
EXPOSE 3000
CMD ["sh", "./apps/api/docker-entrypoint.sh"]