FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
COPY . .

# build backend
WORKDIR /app/packages/backend
RUN mkdir empty
RUN mkdir empty/logs
RUN bun install
RUN bun build --compile --minify --sourcemap --target=bun-linux-x64 ./src/index.ts --outfile mnt

FROM base AS release

ENV PORT=3003
ENV DB_FILE_NAME=/app/data/local.db
ENV LOG_FILE_NAME=/app/data/logs/app.log

WORKDIR /app
COPY --from=install /app/packages/backend/mnt /app/mnt
COPY --from=install /app/packages/backend/empty /app/data

EXPOSE 3003/tcp
ENTRYPOINT ["./mnt"]