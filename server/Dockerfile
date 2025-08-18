FROM node:18-alpine

WORKDIR /usr/src/app

# install packages required for waiting for postgres
RUN apk add --no-cache postgresql-client bash

# install deps
COPY package*.json ./
RUN npm ci --production=false

# copy rest of the code
COPY . .

# make entrypoint executable
RUN chmod +x ./entrypoint.sh

EXPOSE 3001

CMD ["./entrypoint.sh"]
