FROM node:22

ENV APP_DIR="/app"
EXPOSE 8080
WORKDIR $APP_DIR

COPY src "$APP_DIR/src"
COPY package* "$APP_DIR/"

RUN npm i

CMD ["node", "./src/2_start_server.js"]
