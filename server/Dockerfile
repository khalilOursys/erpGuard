# backend/Dockerfile
FROM node:18-alpine AS base
WORKDIR /usr/src/app

# system packages needed
RUN apk add --no-cache bash postgresql-client

# copy package json / lock first for caching
COPY package*.json ./
RUN npm ci

# copy source
COPY . .

# generate prisma client and build
RUN npx prisma generate
RUN npm run build

# production image (smaller)
FROM node:18-alpine AS runner
WORKDIR /usr/src/app
RUN apk add --no-cache bash postgresql-client

COPY --from=base /usr/src/app/package*.json ./
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=base /usr/src/app/dist ./dist
COPY --from=base /usr/src/app/prisma ./prisma
COPY --from=base /usr/src/app/.env ./

EXPOSE 3001
CMD ["node", "dist/main.js"]
