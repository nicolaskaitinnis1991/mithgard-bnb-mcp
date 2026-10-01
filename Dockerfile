FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm ci --ignore-scripts
COPY src ./src
RUN npm run build && npm prune --omit=dev --ignore-scripts

FROM gcr.io/distroless/nodejs24-debian13:nonroot
WORKDIR /app
COPY --from=build --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=build --chown=nonroot:nonroot /app/dist ./dist
COPY --from=build --chown=nonroot:nonroot /app/package.json ./package.json
USER nonroot
ENTRYPOINT ["/nodejs/bin/node", "dist/index.js"]
