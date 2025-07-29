FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build && npm prune --omit=dev
USER node
EXPOSE 3000
CMD ["node", "index.js"]
