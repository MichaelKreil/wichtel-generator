FROM node:latest

ENV APP_DIR="/app"
WORKDIR $APP_DIR
COPY bin data templates web package* "$APP_DIR/"
RUN npm i
CMD ["node", "./bin/2_start_server.js"]
