FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json packages/worker/package.json ./
RUN bun install --frozen-lockfile

COPY packages/worker/src ./src

CMD ["bun", "run", "src/index.ts"]