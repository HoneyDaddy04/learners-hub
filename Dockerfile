# API image for Cloud Run. The web app is built and hosted by Vercel.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.server.json ./
COPY server ./server
COPY shared ./shared
RUN npx tsc -p tsconfig.server.json

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist-server ./dist-server
COPY server/db/migrations ./server/db/migrations
USER node
CMD ["node", "dist-server/server/index.js"]
