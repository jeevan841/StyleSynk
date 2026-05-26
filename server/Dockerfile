# server/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src ./src

EXPOSE 5000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/app.js"]
