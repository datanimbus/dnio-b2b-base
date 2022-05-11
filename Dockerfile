FROM node:16.15-alpine3.15

RUN apk update
RUN apk upgrade

WORKDIR /app

COPY package.json package.json

RUN npm install -g npm
RUN npm install --production
RUN npm audit fix
RUN rm -rf /usr/local/lib/node_modules/npm/node_modules/node-gyp/test

COPY . .

ENV NODE_ENV='production'


CMD [ "node", "app.js" ]