FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
USER node
EXPOSE 3000
CMD ["node", "index.js"]
