FROM node:10.15.3-alpine

WORKDIR /app

COPY . .

RUN apk add --no-cache make gcc g++ python3 && \
  yarn && \
  yarn build && \
  apk del make gcc g++ python3

ENTRYPOINT ["yarn", "start"]
