FROM node:20.11.0

COPY erasers-gui /erasers-gui
WORKDIR /erasers-gui

RUN npm install

RUN npm run build
CMD npm run start
