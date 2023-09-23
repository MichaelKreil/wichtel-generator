FROM node:latest

ENV APP_DIR="/app"
EXPOSE 80
WORKDIR $APP_DIR

COPY src "$APP_DIR/src"
COPY package* "$APP_DIR/"

RUN npm i

CMD ["node", "./src/2_start_server.js"]
