# FROM node:18-buster-slim
# RUN apt update
# RUN apt upgrade -y
# RUN apt install -y curl tar git openssl python3 make build-essential libssl-dev libsasl2-dev

FROM node:18-alpine

RUN apk add bash ca-certificates g++ make gcc python3
RUN set -ex; apk add --no-cache --virtual .fetch-deps curl tar git;
# RUN apk add curl tar git openssl python3 make gcc

WORKDIR /tmp/app

RUN npm install -g npm
RUN npm install -g node-gyp
# RUN npm install --production --no-audit

COPY package.json package.json

RUN npm i --production
RUN npm audit fix --production
RUN rm -rf /usr/local/lib/node_modules/npm/node_modules/node-gyp/test

COPY . .

ENV NODE_ENV='production'


CMD [ "node", "app.js" ]