# Node 24 has no 32-bit ARM images, which the workflow also builds for.
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install

COPY . /app
RUN npm run build

EXPOSE 6114
CMD exec npm start
