FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json packages/api/package.json ./
RUN bun install --frozen-lockfile

COPY packages/api/src ./src

EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]