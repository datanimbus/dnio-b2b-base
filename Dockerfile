FROM node:18-alpine

RUN apk update
RUN apk upgrade

WORKDIR /tmp/app

COPY package.json package.json

RUN npm install -g npm
RUN npm install --production
RUN npm audit fix --production
RUN rm -rf /usr/local/lib/node_modules/npm/node_modules/node-gyp/test

COPY LICENSE /tmp/app
COPY README.md /tmp/app
COPY app.js /tmp/app
COPY common.utils.js /tmp/app
COPY config.js /tmp/app
COPY db-factory.js /tmp/app
COPY flow.schema.json /tmp/app
COPY http-client.js /tmp/app
COPY lib.middlewares.js /tmp/app
COPY schema.utils.js /tmp/app
COPY state.utils.js /tmp/app

COPY generator/code.generator.js /tmp/app/generator
COPY generator/index.js /tmp/app/generator
COPY generator/schema.utils.js /tmp/app/generator
COPY generator/schema.validator.js /tmp/app/generator

ENV NODE_ENV='production'


CMD [ "node", "app.js" ]