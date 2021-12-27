FROM node:14-slim

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install

COPY . /app
RUN npm run build

EXPOSE 6114
CMD exec npm start
