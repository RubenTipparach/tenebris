# Tenebris JS multiplayer server (server-js/). Build context: server-js/.
FROM node:20-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js admin.js admin.html geo.js status.js game-data.json ./
ENV PORT=8080 DATA_DIR=/data
EXPOSE 8080
CMD ["node", "server.js"]
