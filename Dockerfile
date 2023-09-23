FROM node:latest

ENV APP_DIR="/app"
WORKDIR $APP_DIR
COPY src package* "$APP_DIR/"
RUN npm i
CMD ["node", "./src/2_start_server.js"]
