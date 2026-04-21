FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json packages/mcp/package.json ./
RUN bun install --frozen-lockfile

COPY packages/mcp/src ./src

CMD ["bun", "run", "src/index.ts"]