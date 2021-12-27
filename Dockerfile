FROM node:14-slim

WORKDIR /app
COPY . /app

RUN npm install
RUN npm run build

EXPOSE 6114

CMD exec npm start
