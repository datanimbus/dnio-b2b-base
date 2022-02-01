FROM node:16-alpine

WORKDIR /app

COPY package.json package.json

RUN npm i

COPY . .