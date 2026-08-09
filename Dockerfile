FROM node:24.19.0-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24.19.0-alpine

ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/LICENSE ./LICENSE
COPY --from=build /app/index.js ./index.js
COPY --from=build /app/public ./public
COPY --from=build /app/views ./views

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD ["wget", "--quiet", "--spider", "http://127.0.0.1:3000/health"]
CMD ["node", "index.js"]
