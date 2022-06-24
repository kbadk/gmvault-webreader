FROM node:14-slim

RUN apt-get update && apt-get install -y \
	python g++ make \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install

COPY . /app
RUN npm run build

EXPOSE 6114
CMD exec npm start
