FROM node:24-bookworm-slim AS node
FROM postgres:17-bookworm
COPY --from=node /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY backup.mjs ./backup.mjs
USER postgres
ENTRYPOINT ["node", "/app/backup.mjs"]
CMD ["status"]
