FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build
USER node
EXPOSE 3000
CMD ["node", "index.js"]
