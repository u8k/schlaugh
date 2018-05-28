FROM node:7.7.2-alpine
WORKDIR /usr/app
COPY package.json .
RUN npm install --silent
COPY . .
RUN npm install -g nodemon --silent
EXPOSE 3000
