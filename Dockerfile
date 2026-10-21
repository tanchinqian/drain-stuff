FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
RUN npm ci
COPY app/package.json app/package-lock.json app/
RUN npm --prefix app ci
COPY . .
RUN npm run build:all && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 DB_PATH=/var/data/drain.sqlite
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/migrations ./server/migrations
COPY --from=build /app/server/ai ./server/ai
COPY --from=build /app/app/dist ./app/dist
RUN mkdir -p /var/data && chown -R node:node /var/data
USER node
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
