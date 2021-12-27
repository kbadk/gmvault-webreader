FROM node:14-slim

WORKDIR /app
COPY . /app
RUN npm install --production
RUN npm build

EXPOSE 6114

CMD exec npm start
