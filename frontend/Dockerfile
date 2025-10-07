FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm install --only=production

COPY --from=builder /app/.next ./.next

# No public folder, so skipped

EXPOSE 3000

CMD ["npm", "run", "start"]
