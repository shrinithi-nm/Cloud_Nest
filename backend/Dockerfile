FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --chown=node:node src ./src
USER node
EXPOSE 5000
STOPSIGNAL SIGTERM
CMD ["node", "src/app.js"]
