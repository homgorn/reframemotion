FROM node:22-bookworm-slim

ARG HYPERFRAMES_VERSION=0.7.60
ENV NODE_ENV=production \
    REFRAMOTION_ROOT=/app \
    REFRAMOTION_DATA_DIR=/app/data \
    REFRAMOTION_TEMPLATES_DIR=/app/templates

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates dumb-init \
 && npm install --global "hyperframes@${HYPERFRAMES_VERSION}" \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /app/data /app/data/outputs /app/data/work \
 && chown -R node:node /app

USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/server.mjs"]
